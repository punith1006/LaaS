# Architecture Decisions — LaaS Platform
**Date:** 11 March 2026  
**Author:** Punith  
**Status:** Validated on POC hardware (RTX 4090), pending production deployment on RTX 5090 fleet

---

## 1. Why Containers Over VMs for GPU Tiers

The original architecture (v1) used KVM VMs with full GPU passthrough for every tier. This meant one GPU per user, period. That made Tier 1 (Full Machine) work, but completely killed the economics of Tier 2 — there's no way to charge ₹X/hour for 4GB VRAM when you're tying up a 32GB card per user.

**The pivot:** After fairly deep research into how university HPC clusters (NRP Nautilus, GPUnion) handle multi-tenant GPU access, I landed on a container-first architecture using Selkies EGL Desktop containers. The shift:

| | VM Passthrough (v1) | Selkies Containers (current) |
|---|---|---|
| GPU per user | 1:1 (exclusive) | N:1 (fractional) |
| Concurrent GPU users per node | 1 | 4-8 |
| VRAM tiers | Not possible | 4 / 8 / 16 / 32 GB (enforced) |
| Desktop streaming | xrdp (laggy) | WebRTC via NVENC (smooth, 60fps) |
| GPU driver mode | vfio-pci switching | Always nvidia-driver (stable) |

This also eliminated the D3cold power state bug on RTX GPUs, which was causing the GPU to become unreachable after VM shutdown. Spent a good amount of time chasing that one before realizing the entire VM passthrough path was architecturally wrong for what we needed.

---

## 2. Dual-Layer VRAM Enforcement (HAMi-core + MPS)

This was the hardest decision and the one with the least documentation to lean on. Essentially, we needed a way to tell a container "you have 4GB of VRAM" when the physical GPU has 32GB — and actually enforce it, not just suggest it.

**Why two layers, not one:**
- **HAMi-core (libvgpu.so):** Intercepts CUDA API calls at the driver level. When PyTorch calls `cuMemAlloc`, HAMi-core checks against the configured limit and returns OOM if exceeded. This is what makes `nvidia-smi` inside the container show 4GB instead of 32GB. Without this, frameworks auto-detect full VRAM and happily consume it all.
- **CUDA MPS:** NVIDIA's official multi-process service. Provides per-client GPU address space isolation (Volta+), compute partitioning via `ACTIVE_THREAD_PERCENTAGE`, and its own memory limit via `PINNED_DEVICE_MEM_LIMIT`.

Neither one alone is sufficient. HAMi-core handles the VRAM reporting trick (critical for PyTorch/TensorFlow auto-detection) but doesn't partition compute. MPS partitions compute but doesn't fake the VRAM total. Together, they cover both gaps.

**What I couldn't find documented anywhere:** Nobody seems to have combined these two in the same container stack. The HAMi project uses HAMi-core within their Kubernetes device plugin, and MPS is used in SLURM HPC clusters, but the dual-layer combination is — as far as I could find — novel to this deployment. Proceeded carefully because of that. The two system crashes during early testing were both related to getting the interception order right.

---

## 3. Selkies EGL Desktop — Why This and Not VNC/xrdp

Previous iterations used xrdp for remote desktop. It worked, but the experience was noticeably laggy and GPU acceleration wasn't available (xrdp renders in software by default).

Selkies EGL Desktop was discovered while researching how NRP Nautilus serves GPU desktops to researchers across 50+ universities. It solves three problems simultaneously:
- **GPU rendering without X11:** Uses EGL backend (direct GPU access via DRI device), no host-side X server needed
- **Multi-container GPU sharing:** Explicitly designed for it — "the EGL variant supports sharing one GPU with many containers" (from project README)
- **Browser delivery:** WebRTC streaming with NVENC encoding — no client install required, works on any modern browser

The tradeoff is that we need to apply nvidia-patch to remove the NVENC concurrent session limit (GeForce cards default to 3). This is a well-maintained community patch with years of track record in the media server community (Plex/Jellyfin users), but it is technically modifying the NVIDIA driver. Production will run with this patch applied.

---

## 4. Storage: ZFS + NFS (Not Ceph, Not Local)

Considered three options for persistent user storage:

| Option | Verdict | Why |
|---|---|---|
| Local disk per node | ❌ Rejected | User data tied to specific node. Can't migrate sessions. |
| Ceph distributed | ❌ Overkill | Needs 3+ nodes minimum, complex for this scale |
| **ZFS + NFS (TrueNAS)** | ✅ Selected | Simple, proven, per-user quotas built into ZFS, NFS over 10GbE is fast enough |

Each user gets a 15GB ZFS dataset with a hard quota. Mounted into every container at `/home/<uid>` via NFS. Base image is read-only — system software is immutable. User data persists across sessions, container restarts, even container destruction.

---

## 5. Why Not Kubernetes on Day 1

The current POC runs on standalone Docker with a FastAPI orchestrator managing container lifecycle via the Python Docker SDK. The argument for Kubernetes is obvious (scheduling, scaling, self-healing), but for Phase 0/1 validation:
- K8s adds a week of setup complexity that doesn't help validate the GPU sharing stack
- The HAMi Kubernetes device plugin exists but adds another variable to debug
- Standalone Docker lets us isolate HAMi-core + MPS issues from orchestration issues

K8s is the next step (it's already on the roadmap), but the validation had to happen with minimal moving parts first. Now that the core stack is proven, the migration to K8s with the HAMi scheduler is straightforward.

---

## 6. Known Limitations & Honest Tradeoffs

**GPU L2 Cache / Memory Bandwidth — Shared, Not Partitioned**  
Consumer RTX GPUs don't have MIG (Multi-Instance GPU). That means L2 cache and DRAM bandwidth are shared across all containers. In practice: if one user runs a bandwidth-heavy workload (large model training), others on the same GPU might see slightly degraded throughput. This is the same limitation every university HPC cluster with MPS faces. Mitigation: Tier 1 (Full Machine) gives exclusive GPU access for users who need guaranteed performance.

**GPU Fatal Fault Propagation**  
If a user writes a buggy CUDA kernel that crashes the GPU, MPS auto-recovers (Volta+ feature), but all co-resident containers get interrupted. It's a ~30 second disruption, not data loss (NFS home is safe). For the target audience (students running MATLAB, PyTorch, Blender), the probability of triggering a fatal GPU fault is very low. Raw CUDA kernel developers should use Tier 1.

**nvidia-patch Dependency**  
The NVENC session limit removal requires patching the driver after every update. If NVIDIA changes their driver architecture significantly, the patch might break temporarily. There's an active community maintaining it, but it's a dependency worth noting.

---

## 7. Architecture Evolution Timeline

```
v1 (Jan 2026)     → KVM VMs + GPU passthrough per user
                     Problem: 1 GPU per user, D3cold bug, no fractional tiers

v2 (Feb 2026)     → Hybrid: VMs for CPU-only, containers for GPU
                     Problem: vfio-pci mode switching still needed for Tier 1

v3 (Current)      → Unified container architecture
                     HAMi-core + MPS for VRAM enforcement
                     Selkies EGL for desktop streaming
                     All nodes in nvidia-driver mode (no vfio-pci, no D3cold)
                     All tiers from CPU-only to Full Machine handled
```

Each iteration was driven by hitting a wall in the previous one. The D3cold bug specifically forced the move from v1 to v2, and the economics of 1:1 GPU allocation forced the move from v2 to v3. The current architecture is the one that actually makes the pricing model work.

---

## 8. What's Genuinely Novel Here

After fairly extensive research (Selkies project, HAMi-core docs, NVIDIA MPS documentation, NRP Nautilus deployment, GPUnion academic papers, and every commercial GPU cloud I could find), I'm reasonably confident that:

- The individual technologies are all proven in production separately
- The dual-layer HAMi-core + MPS enforcement combination doesn't appear to be documented anywhere publicly
- No commercial GPU platform (RunPod, Vast.ai, Lambda, Google Colab) offers fractional VRAM desktop tiers
- The closest reference is NRP Nautilus (Selkies + GPU sharing for universities), but they don't enforce VRAM tiers

We're not inventing new technology — we're combining existing proven components in a configuration that hasn't been assembled before. Which means there are no reference implementations to copy from, and the validation had to be done from scratch. The two system crashes (and a few hours of head-scratching over MPS UID constraints) were the cost of treading new ground.

The POC has now validated that this combination works. The remaining risk is Blackwell-specific behavior on RTX 5090 (sm_120 vs the 4090's sm_89) — that's the first thing to verify when the production hardware arrives.
