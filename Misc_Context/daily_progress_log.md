# Daily Progress Log — LaaS Infrastructure
**Date:** 11 March 2026  
**Author:** Punith  
**Sprint:** Infrastructure & Platform Core

---

## Today's Focus: Full Infrastructure Stack Validation

Wrapped up the complete infrastructure setup and validation cycle. The core GPU fractional sharing stack is now functional end-to-end on the POC machine (ProArt X670E / Ryzen 9 7950X3D / RTX 4090 / 64GB DDR5).

### What Got Done

**1. GPU Fractional Sharing — Validated ✅**
- HAMi-core (`libvgpu.so`) built from source, VRAM enforcement confirmed working on Ada architecture (sm_89)
- Containers correctly report capped VRAM (4GB / 8GB / 16GB) instead of the full 24GB
- Over-allocation attempts are rejected cleanly — PyTorch and raw CUDA both respect the limit
- Ran into two system crashes during early HAMi-core testing (incorrect `LD_PRELOAD` path + a cmake build flag issue). Both resolved. Documented the exact build flags that work.

**2. CUDA MPS Multi-Tenant Partitioning — Validated ✅**
- MPS control daemon running as a systemd service, auto-starts on boot
- 4 concurrent GPU containers running independently with individual VRAM caps (4+4+8+8 = 24GB total)
- SM partitioning via `CUDA_MPS_ACTIVE_THREAD_PERCENTAGE` confirmed functional — each container gets its compute slice
- Fault recovery tested: killed a CUDA process in container 1, MPS server auto-recovered, containers 2/3/4 continued unaffected

**3. Selkies EGL Desktop Streaming — Validated ✅**
- Built the custom Selkies EGL Desktop image (Ubuntu 22.04 + KDE Plasma + CUDA 12.8)
- Full GPU-accelerated KDE desktop renders inside a Docker container and streams to the browser via WebRTC
- NVENC hardware encoding active — confirmed `nvh264enc` in Selkies logs
- Ran 4 concurrent desktop sessions on a single 4090, each with its own VRAM limit. All 4 accessible simultaneously from different browser tabs.
- Desktop responsiveness is solid — feels like a local session, not a remote one

**4. Storage Layer — Simulated & Working ✅**
- ZFS pool created with per-user datasets and 15GB quotas
- NFS export + mount working (loopback for POC, production will be TrueNAS over 10GbE)
- Persistent home directories survive container restarts — files created in session 1 persist in session 2
- Verified: container stop → restart → NFS home intact. Container destroy → new container → same home directory, all files present.

**5. Container Isolation & Security Hardening — Applied ✅**
- `--read-only` base filesystem (no writes to image layers)
- `--security-opt no-new-privileges` on all containers
- PID namespace isolation, `--pids-limit 512`
- cgroups v2 enforced: `--cpus` and `--memory` caps confirmed working
- AppArmor default profile active
- No root/sudo access inside containers

**6. Monitoring Stack — Deployed ✅**
- DCGM Exporter collecting GPU metrics (utilization, VRAM usage, temperature, power draw)
- Prometheus scraping DCGM + node-exporter + Docker metrics
- Grafana dashboard live with per-container GPU utilization, VRAM allocation, thermal readings
- Alert rules configured: GPU temp > 80°C warning, > 90°C critical

---

### Known Issues Encountered & Resolved

| Issue | What Happened | Resolution |
|---|---|---|
| System crash #1 | Incorrect `LD_PRELOAD` path caused kernel panic during container startup | Fixed: must use absolute path inside container, not host path |
| System crash #2 | HAMi-core built with wrong cmake flags segfaulted on `cuMemAlloc` interception | Fixed: `-DCMAKE_BUILD_TYPE=Release` is mandatory. Debug build has symbol conflicts with CUDA driver |
| MPS single-user limitation | MPS server initially only accepted one UID | Fixed: all containers must run under the same UID when sharing a single MPS server, or run separate MPS servers per user |
| NVENC session limit | Default limit is 3 concurrent NVENC sessions on GeForce | Applied nvidia-patch (keylase). Verified 4+ concurrent NVENC streams working |
| Selkies WebRTC NAT issue | Browser couldn't connect to WebRTC stream on remote network | Expected for POC (no TURN server deployed). Production will have coturn. Local connections work fine. |

---

### Next Steps

**Kubernetes Cluster Setup**
- Transition from standalone Docker to a proper K8s cluster for container orchestration
- Deploy NVIDIA device plugin + HAMi scheduler for automated GPU VRAM accounting
- Implement pod-level resource quotas mirroring the tiered pricing model (Pro/Power/Max/Full)

**Monitoring & Observability Expansion**
- Add Loki for centralized container log aggregation
- Build GPU VRAM utilization heatmap dashboard (per-node, per-container view)
- Session lifecycle tracking: startup time, streaming quality metrics, idle detection

**Security Enforcement — Next Layer**
- Implement seccomp profiles restricting dangerous syscalls inside GPU containers
- Custom AppArmor profiles for the Selkies containers (restrict filesystem access to /home only)
- Network policies: container-to-container communication blocked at CNI level
- Egress filtering: containers can reach package repos and NFS only, no arbitrary internet access
- Session idle timeout: auto-pause after 30 min inactive, auto-terminate after 2 hours

---

### Metrics Snapshot (from today's test runs)

| Metric | Value |
|---|---|
| Concurrent GPU desktop sessions tested | 4 |
| VRAM enforcement accuracy | ✅ Exact (within 2MB of target) |
| Container cold start (to usable desktop) | ~12 seconds |
| WebRTC stream latency (local) | ~18ms frame-to-frame |
| GPU utilization (4 idle desktops) | ~8% |
| GPU utilization (4 desktops + 1 CUDA workload) | ~62% |
| MPS fault recovery time | < 3 seconds |
| NFS home directory mount time | < 1 second |
