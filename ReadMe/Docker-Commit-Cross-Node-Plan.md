# Docker Commit Cross-Node — Learnings, Design & Implementation Plan

> **Status:** Design complete — ready for implementation  
> **Scope:** `host-services/session-orchestration/app.py` (primary), no backend/schema changes required  
> **Prerequisite:** Multi-node NFS storage already functional (see `Multi-node-Analysis.txt`)

---

## 1. Background & Motivation

LaaS provides containerized GPU desktops that must feel like bare-metal to users. Users have full `sudo` access within containers (sandboxed to container scope). 

**The core problem:** `sudo apt install <package>` does not persist across sessions because Docker's `overlay2` writable layer is ephemeral. 

- **User files** (in `/home/ubuntu`) already persist via NFS-mounted ZFS volumes.
- **System-level changes** (apt packages, pip installs, `/etc` configs, systemd services, cron jobs) live in the overlay writable layer and die with the container.

This document describes the design to capture and persist the entire container filesystem state across compute nodes using `docker commit`, `docker save`, and `docker load` backed by the existing NFS storage layer.

---

## 2. Research: 7 Approaches Evaluated

### Option A: Overlay bind-mount — mount `/var/lib/dpkg` etc. on NFS
- **Mechanism:** Bind-mount package manager databases (`/var/lib/dpkg`, `/var/lib/apt`, `/usr/local`) onto the user's NFS volume so they survive container restarts.
- **Pros:** Fast; no image export overhead.
- **Cons:** Fragile — package manager state gets out of sync with actual installed files; `/etc` configs and systemd units still lost; not all software respects alternate install roots.
- **Verdict:** Rejected — incomplete coverage, high maintenance.

### Option B: Persistent overlay layer — store Docker overlay on NFS
- **Mechanism:** Configure Docker to place the container's writable layer on an NFS-mounted directory.
- **Pros:** Transparent to users; zero extra latency.
- **Cons:** Docker overlay2 on NFS is unsupported and known to corrupt; severe performance degradation; lock contention across nodes.
- **Verdict:** Rejected — unsafe and unsupported by Docker.

### Option C: Systemd-nspawn — replace Docker with nspawn
- **Mechanism:** Use systemd-nspawn with a rootfs stored on the user's NFS mount.
- **Pros:** Rootfs lives on NFS naturally; no export/import step.
- **Cons:** No native GPU passthrough (no `--gpus` equivalent); breaks Selkies-GStreamer container stack; loses Docker ecosystem (networking, port mapping, labels).
- **Verdict:** Rejected — incompatible with LaaS's GPU desktop architecture.

### Option D: Nix package manager — declarative reproducible packages
- **Mechanism:** Install Nix in the base image; users install via `nix-env` instead of `apt`; Nix store can be mounted on NFS.
- **Pros:** Reproducible; pure; can rollback.
- **Cons:** Forces users to learn Nix (steep curve); many ML/GPU packages lack Nix expressions; doesn't solve `/etc` or systemd persistence.
- **Verdict:** Rejected — user experience incompatible with non-technical audience.

### Option E: dpkg manifest + replay — snapshot dpkg state and replay on launch
- **Mechanism:** On stop, dump `dpkg --get-selections` and `/etc` tar to NFS. On start, replay `apt-get install` in a startup script.
- **Pros:** Small manifest files; fast export.
- **Cons:** Only covers apt packages; pip/npm/snap/manual builds lost; replay is slow and error-prone (network deps, PPA changes, version drift).
- **Verdict:** Rejected — incomplete coverage; unreliable replay.

### Option F: Full filesystem snapshot — ZFS snapshot of container rootfs
- **Mechanism:** Snapshot the container's merged rootfs via ZFS `zfs snapshot` and send/recv to the storage node.
- **Pros:** Fast (ZFS native); incremental possible.
- **Cons:** Requires Docker rootfs to live on ZFS (not overlay2); complex cross-node ZFS send/recv orchestration; not compatible with current Docker overlay2 setup.
- **Verdict:** Rejected — requires Docker storage driver migration; high infra complexity.

### Option G: Docker commit — commit container state as new image layer
- **Mechanism:** `docker commit` the running container into a new image tag (`laas-user-<uid>:latest`). Export via `docker save` to NFS; import via `docker load` on another node.
- **Pros:** Captures **all** system changes transparently; works with any package manager; preserves `/etc`, systemd, cron; simple Docker API; factory reset is trivial (`docker rmi`).
- **Cons:** Large image tars (2-10GB); +30-120s save/load overhead per session cycle.
- **Verdict:** **Accepted** — only approach that fully satisfies the bare-metal illusion.

---

## 3. Decision: Why Docker Commit Won

- **Only approach that captures ALL system changes transparently** — apt, pip, npm, snap, manual builds, `/etc` edits, systemd units, cron jobs.
- **Zero user awareness required** — no special install commands, no learning curve.
- **Works with any package manager** — not limited to apt manifest replays.
- **Preserves `/etc` modifications, systemd unit files, cron jobs** — complete system state.
- **Simple to implement with existing Docker API** — `docker commit`, `docker save`, `docker load`.
- **Factory reset is trivial** — delete committed image and NFS tar, next launch uses base `SELKIES_IMAGE`.

---

## 4. Current Single-Node Implementation

> **CRITICAL NOTE:** The current `app.py` (as of the latest codebase) does **not yet contain** `get_user_image()`, `commit_container_state()`, or `reset_user_image()`. These functions exist in design documents (`Multi-node-Analysis.txt`, lines 401-534) but have **not been merged** into the orchestrator. The current code always launches from the base `SELKIES_IMAGE`.
>
> The sections below reference both the **intended design** (from `Multi-node-Analysis.txt`) and the **actual current state** of `app.py` where functions must be added.

### 4.1 Image Selection (`get_user_image()`) — To Be Added

**Current state:** This function does not exist. The orchestrator always appends `SELKIES_IMAGE` directly.

**Where to add:** In `host-services/session-orchestration/app.py`, after the helper function block around line 870 (after `check_selkies_image()`).

**Intended logic (from `Multi-node-Analysis.txt`, lines 401-411):**
```python
def get_user_image(storage_uid: Optional[str]) -> str:
    if storage_uid:
        user_image = f"laas-user-{storage_uid}:latest"
        try:
            result = subprocess.run(
                ["docker", "image", "inspect", user_image],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                logger.info(f"Using committed user image: {user_image}")
                return user_image
        except Exception as e:
            logger.warning(f"Error checking user image {user_image}: {e}")
    return SELKIES_IMAGE
```

### 4.2 Container Launch (`build_docker_command()`)

**Location:** `host-services/session-orchestration/app.py`, lines 886-1100.

**Current image usage (line 1097-1098):**
```python
    # Image
    cmd.append(SELKIES_IMAGE)
```

**Required change:** Replace `cmd.append(SELKIES_IMAGE)` with a call to `get_user_image(storage_uid)`.

### 4.3 State Commit (`commit_container_state()`) — To Be Added

**Current state:** This function does not exist.

**Where to add:** In `host-services/session-orchestration/app.py`, near the other lifecycle helper functions (after `stop_session` or in a new "State Persistence" section).

**Intended logic (from `Multi-node-Analysis.txt`, lines 414-427):**
```python
def commit_container_state(container_name: str, storage_uid: Optional[str]) -> bool:
    if not storage_uid:
        logger.warning(f"No storage_uid for {container_name}, skipping commit")
        return False

    user_image = f"laas-user-{storage_uid}:latest"
    try:
        result = subprocess.run(
            ["docker", "commit",
             "--change", "LABEL laas.committed=true",
             "--change", f"LABEL laas.storage_uid={storage_uid}",
             container_name, user_image],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            logger.error(f"Docker commit failed: {result.stderr}")
            return False
        logger.info(f"Committed {container_name} -> {user_image}")
        return True
    except subprocess.TimeoutExpired:
        logger.error(f"Docker commit timed out for {container_name}")
        return False
    except Exception as e:
        logger.error(f"Docker commit error: {e}")
        return False
```

### 4.4 Session Stop Lifecycle (`stop_session()`)

**Location:** `host-services/session-orchestration/app.py`, lines 1757-1830+.

**Current sequence:**
1. **Line 1787:** `docker stop -t 30 <name>` (30s graceful timeout)
2. **Line 1799:** `docker rm <name>` (container removal)
3. **Lines 1806-1830:** Storage cleanup (NVMe-oF, zvol, ephemeral)

**Required change:** Insert `commit_container_state()` between Step 1 (stop) and Step 2 (rm). The new sequence must be:
1. `docker stop -t 30 <name>`
2. `commit_container_state(name, storage_uid)` ← NEW
3. `docker rm <name>`
4. Storage cleanup

> The `storage_uid` can be retrieved from session metadata (already popped at line 1807 via `pop_session_metadata(name)`).

### 4.5 Factory Reset (`reset_user_image()`) — To Be Added

**Current state:** This function does not exist.

**Where to add:** In `host-services/session-orchestration/app.py`, alongside `get_user_image()` and `commit_container_state()`.

**Intended logic:**
```python
def reset_user_image(storage_uid: Optional[str]) -> bool:
    if not storage_uid:
        return False
    user_image = f"laas-user-{storage_uid}:latest"
    try:
        subprocess.run(
            ["docker", "rmi", user_image],
            capture_output=True, text=True, timeout=30
        )
        logger.info(f"Removed committed image: {user_image}")
        return True
    except Exception as e:
        logger.warning(f"Failed to remove image {user_image}: {e}")
        return False
```

---

## 5. The Cross-Node Problem

### 5.1 Scenario Walkthrough

**Alice's Experience (Multi-Node):**

1. **Session 1 on Node 1:** Alice launches a session. Node 1 is selected as compute node. She runs `sudo apt install python3-pytorch` — the package lands in the container's ephemeral overlay layer. She saves `~/project/model.pth` — it lands on the NFS-mounted ZFS volume (persistent).
2. **Session 1 stops:** The orchestrator on Node 1 calls `docker commit laas-alice-session-1 laas-user-<alice_uid>:latest`. The image is saved to **Node 1's local Docker daemon only**.
3. **Session 2 on Node 2:** The backend selects Node 2 for better resource headroom. The orchestrator on Node 2 calls `docker image inspect laas-user-<alice_uid>:latest` — **image NOT found** (it's stranded on Node 1).
4. **Fallback:** Node 2 falls back to the base `SELKIES_IMAGE`. Alice's container starts from scratch.
5. **Result:** Alice loses all apt packages, pip packages, `/etc` configs, cron jobs, and systemd services. Her `~/project/model.pth` is still there (NFS), but the environment is reset.

### 5.2 What Users Lose vs Keep

| What Users Lose | What Users Keep |
|-----------------|-----------------|
| apt packages | All files in `/home/ubuntu` (NFS-mounted ZFS volume) |
| pip / conda packages | User data, code, notebooks |
| npm / snap packages | Git repositories |
| `/etc` configuration edits | SSH keys in `~/.ssh` |
| systemd service files | Custom dotfiles (`.bashrc`, `.vimrc`) |
| cron jobs | Downloads and datasets |
| Environment variables set system-wide | Anything in the NFS home directory |

### 5.3 Why This Is Critical

- **LaaS's value proposition is persistent stateful desktops.** Users expect their installed software to survive restarts.
- **Non-technical users won't understand why their software disappeared.** The platform appears broken.
- **Breaks trust in the platform.** Even one "factory reset" experience causes churn.
- **Multi-node makes this inevitable.** Without a cross-node image transport, any session landing on a different node from the previous one suffers data loss.

---

## 6. Solution Design: NFS-Backed Export/Import (POC Phase)

### 6.1 Architecture

```
SESSION STOP (on any node):
  Container Running
       |
  docker stop -t 30 <container>
       |
  docker commit <container> laas-user-<uid>:latest    ← save to LOCAL daemon
       |
  docker save -o <nfs_mount>/.system/container-image.tar laas-user-<uid>:latest
       |                                                    ↑
       |                                          This is on NFS — accessible from ANY node
  docker rm <container>

SESSION START (on any node):
  Check local daemon: docker image inspect laas-user-<uid>:latest
       |
  Found? ─── YES ──→ Use it (fast path, ~0s overhead)
       |
       NO
       |
  Check NFS: <nfs_mount>/.system/container-image.tar exists?
       |
  Found? ─── YES ──→ docker load -i <tar> → Use loaded image (+25-70s)
       |
       NO
       |
  Use base SELKIES_IMAGE (first launch or factory reset)
```

### 6.2 Modified `commit_container_state()` — Pseudocode

```python
def commit_container_state(container_name, storage_uid):
    # 1. Commit to local daemon (same as current design)
    docker commit \
        --change "LABEL laas.committed=true" \
        --change "LABEL laas.storage_uid=<uid>" \
        <container> laas-user-<uid>:latest
    
    # 2. Export to NFS (NEW)
    mount_path = f"{NFS_MOUNT_ROOT}/{storage_uid}"
    system_dir = f"{mount_path}/.system"
    os.makedirs(system_dir, exist_ok=True)
    
    tar_path = f"{system_dir}/container-image.tar"
    docker save -o {tar_path} laas-user-<uid>:latest
    
    # 3. Cleanup: optionally remove old tars, keep only latest
    # (Overwrite semantics — single tar per user)
```

### 6.3 Modified `get_user_image()` — Pseudocode

```python
def get_user_image(storage_uid):
    user_image = f"laas-user-{storage_uid}:latest"
    
    # 1. Check local daemon (fast path)
    if docker image inspect {user_image} succeeds:
        return user_image
    
    # 2. Check NFS tar (cross-node path)
    tar_path = f"{NFS_MOUNT_ROOT}/{storage_uid}/.system/container-image.tar"
    if os.path.exists(tar_path):
        docker load -i {tar_path}  # Import to local daemon
        return user_image
    
    # 3. Fallback to base image
    return SELKIES_IMAGE
```

### 6.4 Modified `reset_user_image()` — Pseudocode

```python
def reset_user_image(storage_uid):
    # 1. Remove from local daemon (same as current design)
    docker rmi laas-user-<uid>:latest
    
    # 2. Remove NFS tar (NEW)
    tar_path = f"{NFS_MOUNT_ROOT}/{storage_uid}/.system/container-image.tar"
    if os.path.exists(tar_path):
        os.remove(tar_path)
```

### 6.5 Performance Implications

| Metric | Value | Notes |
|--------|-------|-------|
| Session stop overhead | +30-120s | `docker save` to NFS; scales with image size |
| Session start overhead (cross-node) | +25-70s | `docker load` from NFS; one-time per node |
| Session start overhead (same-node) | ~0s | Image already in local daemon |
| Storage per user | 2-10GB | Single `.system/container-image.tar` |
| NFS bandwidth | High during save/load | 10GbE recommended; avoid during peak hours |

### 6.6 Storage Growth Management

- **Keep only the latest tar per user** — overwrite on each commit (`docker save -o` overwrites by default).
- **Consider compression:** `docker save <image> | gzip > image.tar.gz` yields ~50% size reduction at the cost of CPU time during save/load. Decompress with `gunzip -c image.tar.gz | docker load`.
- **Monitor `.system` directory sizes** via Grafana (add metric collection for `du -sh /mnt/nfs/users/*/.system`).
- **Alert threshold:** Warn when a user's `.system/` exceeds 15GB.

---

## 7. Solution Design: Docker Registry (Production Phase)

### 7.1 When to Upgrade

- When user count exceeds 10-15.
- When NFS export/import latency becomes unacceptable (>60s average).
- When storage growth from uncompressed image tars becomes a concern.
- When multiple compute nodes are permanently online (registry amortizes setup cost).

### 7.2 Architecture

- **Deploy Harbor or Docker Registry** on Node 1 (or a dedicated persistent backend) with a persistent volume.
- **On session stop:** `docker tag laas-user-<uid>:latest registry:5000/laas-user-<uid>:latest` → `docker push registry:5000/laas-user-<uid>:latest`
- **On session start:** `docker pull registry:5000/laas-user-<uid>:latest`
- **Benefits:**
  - **Layer deduplication:** Shared base layers (Selkies image) stored once → ~50% storage savings.
  - **Fast pull:** 5-10s latency (only new layers transferred).
  - **Standard workflow:** Industry-standard Docker registry pattern.
  - **Cleanup policies:** Harbor supports retention rules (keep N tags per repository).

---

## 8. Implementation Guide for AI Agents

### 8.1 Files to Modify

#### 1. `host-services/session-orchestration/app.py` — PRIMARY FILE

**Add three new functions** (recommended placement: after `check_selkies_image()` at line 870):

- **`get_user_image(storage_uid)`** — Check local daemon, then NFS tar, then fallback to `SELKIES_IMAGE`.
- **`commit_container_state(container_name, storage_uid)`** — Commit container to local daemon, then `docker save` to `<NFS_MOUNT_ROOT>/<uid>/.system/container-image.tar`.
- **`reset_user_image(storage_uid)`** — `docker rmi` the local image and delete the NFS tar.

**Modify `build_docker_command()` (line 1097-1098):**
```python
    # Image — WAS:
    # cmd.append(SELKIES_IMAGE)
    # IS:
    cmd.append(get_user_image(storage_uid))
```

**Modify `stop_session()` (lines 1785-1803):**
Insert commit step between `docker stop` and `docker rm`:
```python
    # Step 1: Docker stop (graceful 30s timeout)
    # ... existing code at lines 1786-1795 ...
    
    # Step 1b: Commit container state (NEW)
    meta = pop_session_metadata(name)  # or however storage_uid is obtained
    storage_uid = meta.get("storage_uid")
    if storage_uid and storage_type == "stateful":
        commit_container_state(name, storage_uid)
    
    # Step 2: Docker remove (best effort)
    # ... existing code at lines 1797-1802 ...
```

> Note: `stop_session` currently pops metadata at line 1807. Move the metadata retrieval earlier (before `docker rm`) so `storage_uid` is available for the commit step.

**Add a new API endpoint for factory reset** (optional but recommended):
```python
@app.route('/images/reset', methods=['POST'])
def reset_user_image_endpoint():
    # Validate SESSION_SECRET
    # Read storage_uid from JSON body
    # Call reset_user_image(storage_uid)
    # Return ok=True
```

#### 2. No backend changes needed for this feature specifically

The backend already sends `storage_uid` and `storage_type` to the orchestrator (see `compute.service.ts`, lines 570-601). The orchestrator can derive the NFS path from `NFS_MOUNT_ROOT` + `storage_uid`.

#### 3. No database changes needed

The `storageNodeId` field already exists on `Session` (line 1061) and `nodeId` on `UserStorageVolume` (line 698) for multi-node storage routing. These are used by the backend but do not need modification for the Docker commit feature.

### 8.2 Environment Variables

| Variable | Location | Purpose | Already Exists? |
|----------|----------|---------|-----------------|
| `NFS_MOUNT_ROOT` | `app.py` line 44 | Base path for user NFS mounts; used to construct `.system/` tar path | **Yes** |
| `SELKIES_IMAGE` | `app.py` line 43 | Base image fallback when no committed image exists | **Yes** |
| No new env vars needed for POC | — | — | — |

### 8.3 Testing Checklist

- [ ] **Single-node persistence:** Launch → install package → stop → start on same node → package present.
- [ ] **Cross-node persistence:** Launch on Node 1 → install package → stop → start on Node 2 → package present (via NFS tar load).
- [ ] **Factory reset:** Call reset API → next launch uses base `SELKIES_IMAGE`.
- [ ] **Concurrent sessions:** Two users committing simultaneously — no tar corruption.
- [ ] **NFS failure during stop:** NFS unmounted → commit succeeds locally, export skipped with warning, session still stops cleanly.
- [ ] **Large image test:** Install 5GB+ of packages → commit and export succeed within 600s timeout.
- [ ] **Timeout handling:** `docker save` exceeding timeout → abort export, log error, local commit remains valid.
- [ ] **Corrupted tar:** Manually corrupt `.system/container-image.tar` → next start falls back to base image gracefully.
- [ ] **Ephemeral session:** `storage_type == "ephemeral"` → skip commit entirely.

### 8.4 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| NFS mount not available during commit | Log warning; commit locally only (best-effort export). Next same-node start still works. |
| `docker save` timeout (>600s) | Abort export; local commit is still valid. Log error for ops review. |
| `docker load` fails (corrupted tar) | Delete corrupted tar, fall back to base `SELKIES_IMAGE`. Log error. |
| Disk full on NFS | Pre-check available space with `shutil.disk_usage()`; skip export if <2x image size free. |
| Race condition: session starting while previous session still committing | Use `.tmp` + rename pattern: save to `container-image.tar.tmp`, then `os.rename()` to `container-image.tar` (atomic on NFS). |
| User has no `storage_uid` (ephemeral session) | Skip commit entirely; always use `SELKIES_IMAGE`. |
| `docker rmi` fails during reset | Image may be in use by a running container; log warning and continue. |

---

## 9. Risks & Mitigations Table

| Risk | Severity | Mitigation |
|------|----------|------------|
| NFS mount stale during export | HIGH | Check `os.path.ismount(mount_path)` before save; remount via `_ensure_mount()` if stale. |
| Export timeout on slow network | HIGH | 600s timeout; log and degrade gracefully (local commit still valid). Consider async export as enhancement. |
| Image tar corrupted | MEDIUM | Atomic write (`.tmp` + `os.rename()`); verify with `docker load --dry-run` if available. |
| Disk space exhaustion on NFS | MEDIUM | Pre-check available space before save; alert at 80% NFS capacity. |
| Concurrent access to tar file | LOW | Atomic `.tmp` + rename pattern prevents partial reads during write. |
| User sees slow session start | LOW | Show progress indicator in UI during `docker load` (orchestrator can emit events). |
| Base image updated under committed layer | MEDIUM | If `SELKIES_IMAGE` changes, committed layers still apply on top. Test compatibility. |
| Image accumulation (old layers) | MEDIUM | `docker system prune -f` periodically; registry approach (Phase 2) solves this. |

---

## Appendix A: Exact File References

### `host-services/session-orchestration/app.py`

| Item | Line(s) | Notes |
|------|---------|-------|
| `SELKIES_IMAGE` | 43 | Base image env var |
| `NFS_MOUNT_ROOT` | 44 | NFS mount root env var |
| `check_selkies_image()` | 864-869 | Existing image inspection helper |
| `build_docker_command()` | 886-1100 | Launch command builder; image at line 1098 |
| `stop_session()` | 1757-1830+ | Stop lifecycle; insert commit between stop (1787) and rm (1799) |
| `get_user_image()` | — | **Does not exist — add** |
| `commit_container_state()` | — | **Does not exist — add** |
| `reset_user_image()` | — | **Does not exist — add** |

### `backend-new/prisma/schema.prisma`

| Item | Line(s) | Notes |
|------|---------|-------|
| `UserStorageVolume.nodeId` | 698 | Which node hosts the user's ZFS dataset |
| `Session.nodeId` | 1009 | Which compute node runs the session |
| `Session.storageNodeId` | 1061 | Which node hosts storage for this session |

### `backend-new/src/compute/compute.service.ts`

| Item | Line(s) | Notes |
|------|---------|-------|
| `callOrchestration()` | 74-100 | HTTP client to orchestrator |
| Launch payload | 570-601 | Sends `storage_uid`, `storage_type`, `node_hostname` |

### `host-services/storage-provision/app.py`

| Item | Line(s) | Notes |
|------|---------|-------|
| `NFS_EXPORT_CLIENT` | 37 | Single-client export (must be comma-separated for multi-node) |
| `_ensure_exports_line()` | 364-382 | Export line generation |

---

## Appendix B: Related Documents

- `Multi-node-Analysis.txt` — Full multi-node architecture analysis with node selection, storage routing, and NFS configuration (lines 396-548 cover Docker commit cross-node problem).
- `ReadMe/Storage-Provisioning-Setup.md` — ZFS and NFS setup procedures.
- `ReadMe/Storage-Provisioning.md` — Multi-node NFS export configuration.

---

*Document version: 1.0*  
*Last updated: 2026-04-29*  
*Author: LaaS Architecture Team*
