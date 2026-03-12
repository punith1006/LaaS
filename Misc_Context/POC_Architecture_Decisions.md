# Architecture Decisions Document

## LaaS Platform Technical Choices

---

## Decision 1: WSL2 → Ubuntu Dual-Boot POC Approach

### Context

Need to validate HAMi-core VRAM enforcement + CUDA MPS on consumer GPU before committing to full infrastructure build.

### Decision

**Two-phase POC validation:**
- **Phase 1 (WSL2):** Quick baseline validation — hours, not days
- **Phase 2 (Ubuntu dual-boot):** Full production-representative testing

### Rationale

| Factor | WSL2 | Ubuntu Dual-Boot |
|--------|------|------------------|
| Time to start | ~30 mins | ~4 hours |
| Risk to Windows | Zero | Low (partition only) |
| GPU validation | Limited (no EGL/WebRTC) | Full stack |
| Prod-representative | No | Yes |

### Alternatives Considered

- **Bare-metal Ubuntu only:** Rejected — too risky, destroys Windows
- **VirtualBox/VM:** Rejected — can't passthrough RTX GPU reliably

### Outcome

If Phase 1 (WSL2) passes → Proceed to Phase 2. If HAMi-core fails on WSL2, architecture needs rethink before any hardware commitment.

---

## Decision 2: HAMi-core + MPS Dual-Layer VRAM Enforcement

### Context

Consumer GPUs (RTX 5090) lack hardware partitioning (no vGPU, no MIG). Need software-based VRAM limits for multi-tenant fractional GPU tiers.

### Decision

**Dual-layer enforcement combining:**
1. **HAMi-core (libvgpu.so):** CUDA API interception — hides real VRAM, enforces allocation limits
2. **CUDA MPS:** Driver-level enforcement + SM partitioning

### Why Both Layers?

| Layer | What It Does | Weakness |
|-------|--------------|----------|
| HAMi-core | Intercepts cuMemAlloc, shows limited VRAM in nvidia-smi | Can be bypassed by static binaries |
| CUDA MPS | Second enforcement at driver level | No VRAM visibility control |
| **Combined** | Defense-in-depth — bypass one, other catches | — |

### Alternative: Single-Layer Only

- HAMi-core alone: Risk of bypass via static CUDA binaries
- MPS alone: No VRAM visibility control (nvidia-smi shows full 24GB)
- **Verdict:** Dual-layer required for production

### Expected Behavior

| Config | Reported VRAM | Enforcement |
|--------|---------------|-------------|
| Pro (4GB) | 4 GB (not 24GB) | Hard limit |
| Power (8GB) | 8 GB | Hard limit |
| Max (16GB) | 16 GB | Hard limit |

---

## Decision 3: Proxmox VE vs. Bare-Metal for Node Management

### Context

Need host OS for 4 compute nodes. Options range from bare-metal to full hypervisor.

### Decision

**Proxmox VE 8.x** — even though user sessions run as containers, not VMs.

### Rationale

| Capability | Proxmox | Bare-Metal |
|------------|---------|------------|
| Cluster management | ✅ Built-in | ❌ Manual |
| Container orchestration | ✅ Docker + LXC | ❌ Manual |
| Network/VLAN config | ✅ GUI + CLI | ❌ Manual |
| Storage integration | ✅ ZFS, LVM, NFS | ❌ Manual |
| Updates | ✅ APT packages | ❌ Manual |
| Resource monitoring | ✅ Built-in | ❌ Scripts |
| **Overhead** | ~2GB RAM | None |

### Alternative: Bare-Metal Ubuntu

- Pros: Slightly more RAM for containers, less attack surface
- Cons: Manual cluster setup, no GUI management, harder updates
- **Verdict:** Proxmox worth overhead for operational simplicity

### Important Clarification

> **Proxmox manages nodes — NOT user sessions.**
> 
> User sessions run as Docker containers directly on each node. Proxmox provides: cluster formation, network/VLAN management, storage integration, updates. The orchestrator (FastAPI) talks to Docker API directly, not Proxmox.

---

## Decision 4: Architectural Pivot — VM → Container Model

### Context

Original design (v1) used KVM VMs with GPU passthrough for stateful GPU sessions. Three constraints forced a pivot.

### The Problem: Consumer GPU Limitations

| Constraint | Impact |
|------------|--------|
| **No hardware partitioning** | Can't split RTX 5090 across VMs |
| **D3cold reset bug** | GPU fails to wake after VM shutdown — needs host reboot |
| **Driver mutuality** | vfio-pci (VM) vs nvidia-driver (container) — mutually exclusive, reboot required to switch |

### The Pivot: Unified Container Architecture

| Before (v1) | After (Beta) |
|-------------|---------------|
| KVM VMs with GPU passthrough | Docker containers with Selkies |
| GPU = all-or-nothing (32GB) | GPU = fractional (4/8/16GB) |
| 2 concurrent GPU users | 4-8 concurrent GPU users |
| Static node roles | Dynamic placement |
| Reboot to switch GPU modes | No mode switching needed |

### Key Trade-offs

| Factor | VM Model | Container Model |
|--------|-----------|-----------------|
| GPU isolation | Hardware (IOMMU) | Software (HAMi+MPS) |
| Fault propagation | Contained to one VM | Affects co-tenant users |
| GPU concurrency | 1 per node | 4+ per node |
| Fractional tiers | Not possible | 4GB/8GB/16GB |
| D3cold risk | High | None |

### Decision

**Container model (Architecture A)** — enables fractional GPU tiers which is the core differentiator. VM passthrough retained as fallback (Architecture B) only if container approach fails burn-in.

---

## Decision 5: Storage Architecture — NVMe + NAS Split

### Context

Need to handle three data types: OS, container scratch, and user persistent storage. Must ensure ephemeral corruption doesn't affect stateful data.

### Decision

**Three-way storage split:**

| Location | Purpose | Protection |
|----------|---------|------------|
| **Local NVMe (per node)** | OS, Docker images, scratch | — |
| **NAS (centralized)** | User 15GB persistent | ZFS snapshots |
| **VLAN separation** | Network isolation | State/ephemeral on different VLANs |

### Per-Node NVMe Layout (2TB Samsung 990 EVO Plus)

| Partition | Size | What Lives Here |
|-----------|------|-----------------|
| p1 | 128GB | Proxmox OS |
| p2 | 500GB | Docker (/var/lib/docker) |
| p3 | 1100GB | Container scratch (ephemeral) |
| p4 | 240GB | Shared read-only datasets |

### NAS Design (5th Machine)

| Component | Spec |
|-----------|------|
| OS | TrueNAS Scale (free) |
| Storage | 4× 4TB HDD (RAIDZ1, ~12TB usable) |
| Protocol | NFS over 10GbE |
| User volumes | ZFS datasets with 15GB quota |
| Backup | ZFS auto-snapshots (6-hourly) |

### Why Separate?

| Scenario | Why Protected |
|----------|---------------|
| Ephemeral container corrupted | p3 (scratch) isolated from p2 (Docker) |
| Docker storage full | p3 separate, doesn't affect p2 |
| User data safe | Always on NAS, never on local NVMe |
| OS crash | p1 isolated, rebuild doesn't touch user data |

### Alternative Considered

- **Local storage only:** Rejected — no multi-node resilience, user files tied to one node
- **All on NAS:** Rejected — NFS latency unacceptable for container scratch/writable layers

---

## Summary: Key Architecture Decisions

| Decision | Choice | Why It Matters |
|----------|--------|----------------|
| POC approach | WSL2 → Dual-boot | Fast validation, low risk |
| GPU enforcement | HAMi-core + MPS | Enables fractional tiers |
| Node management | Proxmox VE | Operational simplicity |
| Session model | Containers not VMs | Core differentiator |
| Storage | NVMe + NAS split | Isolation + persistence |

---

## Open Decisions

| Item | Status | Notes |
|------|--------|-------|
| Video conferencing | Pending | Jitsi self-hosted vs Zoom SDK |
| Email delivery | Pending | SendGrid vs self-hosted Postfix |
| Container registry | Pending | Local on NAS vs GHCR |

---

*Decisions to be revisited after POC validation.*
