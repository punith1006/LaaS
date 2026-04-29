# Stateful Desktop Persistence via Docker Commit

## Problem

Currently, only `/home/ubuntu` is persisted (via ZFS zvol bind-mount). Everything outside the home directory — apt packages, pip system packages, `/etc` configs, systemd units, cron jobs, `/opt` installs — lives in Docker's ephemeral overlay layer and is destroyed on `docker rm`. Users must re-install everything after each session restart or cross-node migration.

## Approach: Docker Commit + NFS-Backed Export/Import

This is the **only approach that captures 100% of system state transparently** while remaining compatible with the existing Docker + Selkies + NVIDIA architecture. Seven alternatives were evaluated and rejected in the prior research (`ReadMe/Docker-Commit-Cross-Node-Plan.md`).

**How it works:**
- On session stop: `docker commit` saves the container's full filesystem (including all system changes) as a local Docker image, then `docker save` exports it to a `.tar` on the user's NFS-mounted storage.
- On session start: Check local daemon first (fast path, ~0s), then NFS tar (cross-node path, +25-70s), then fall back to base `SELKIES_IMAGE` (first launch).
- Factory reset: Delete committed image + NFS tar; next launch starts fresh.

**Performance trade-offs:**
| Metric | Value |
|--------|-------|
| Session stop overhead | +30-120s (docker save to NFS) |
| Same-node start overhead | ~0s (image already in daemon) |
| Cross-node start overhead | +25-70s (docker load from NFS) |
| Storage per user | 2-10GB (single .tar per user) |

## Scope

**Single file to modify:** `host-services/session-orchestration/app.py`
**No backend or database changes required** — the backend already sends `storage_uid` and `storage_type` to the orchestrator.

---

## Task 1: Add `get_user_image()` function

**File:** `host-services/session-orchestration/app.py`
**Location:** After `check_selkies_image()` (~line 870)

Add a function that resolves which Docker image to use for a user's session:
1. Check local daemon for `laas-user-<storage_uid>:latest` (fast path)
2. Check NFS tar at `<NFS_MOUNT_ROOT>/<storage_uid>/.system/container-image.tar` — if found, `docker load` it
3. Fall back to `SELKIES_IMAGE` (first launch or factory reset)

Handle edge cases: corrupted tar (delete and fall back), `docker load` failure, missing NFS mount.

## Task 2: Add `commit_container_state()` function

**File:** `host-services/session-orchestration/app.py`
**Location:** Near `get_user_image()`

Add a function that persists the container's full filesystem state:
1. `docker commit --change "LABEL laas.committed=true" <container> laas-user-<uid>:latest`
2. Create `<NFS_MOUNT_ROOT>/<uid>/.system/` directory
3. `docker save -o .system/container-image.tar.tmp laas-user-<uid>:latest`
4. Atomic rename: `os.rename(container-image.tar.tmp, container-image.tar)`

Handle edge cases: NFS mount not available (commit locally only, log warning), `docker save` timeout (600s max, degrade gracefully), disk space check before export.

## Task 3: Add `reset_user_image()` function + API endpoint

**File:** `host-services/session-orchestration/app.py`

Add a function for factory reset:
1. `docker rmi laas-user-<uid>:latest` (local daemon)
2. Delete `<NFS_MOUNT_ROOT>/<uid>/.system/container-image.tar` (NFS)

Add a new Flask endpoint `POST /images/reset` (protected by SESSION_SECRET) that accepts `storage_uid` in the JSON body and calls `reset_user_image()`.

## Task 4: Modify `build_docker_command()` to use committed image

**File:** `host-services/session-orchestration/app.py`
**Location:** Line ~1097-1098

Replace:
```python
cmd.append(SELKIES_IMAGE)
```
With:
```python
cmd.append(get_user_image(storage_uid))
```

The `storage_uid` parameter must be threaded through from `launch_session_worker()` into `build_docker_command()`.

## Task 5: Modify `stop_session()` to commit before remove

**File:** `host-services/session-orchestration/app.py`
**Location:** Lines ~1785-1803

Insert commit step between `docker stop` and `docker rm`:
1. `docker stop -t 30 <container>` (existing)
2. **NEW:** Retrieve `storage_uid` from session metadata (move `pop_session_metadata()` earlier)
3. **NEW:** If `storage_type == "stateful"` and `storage_uid` exists, call `commit_container_state(container_name, storage_uid)`
4. `docker rm <container>` (existing)
5. Storage cleanup (existing)

Skip commit entirely for ephemeral sessions.

## Task 6: Deploy updated app.py to 10.99 and test

After implementation:
1. SCP updated `app.py` to 10.99
2. Restart session orchestration
3. **Single-node test:** Launch session -> `sudo apt install htop` -> stop -> start on same node -> verify `htop` available
4. **Cross-node test:** Launch on Node 1 -> install packages -> stop -> force launch on Node 2 -> verify packages persist via NFS tar
5. **Factory reset test:** Call `/images/reset` -> verify next launch starts fresh
6. **Ephemeral test:** Launch ephemeral session -> verify no commit on stop

## Key Implementation Notes

- **Atomic writes:** Always save to `.tmp` then `os.rename()` to prevent partial reads during concurrent access.
- **Disk space check:** Use `shutil.disk_usage()` before `docker save`; require at least 2x image size free.
- **NFS mount validation:** Check `os.path.ismount()` before export; if stale, commit locally only and log warning.
- **Timeout:** `docker commit` timeout=120s, `docker save` timeout=600s. On timeout, local commit is still valid.
- **Compression (optional):** `docker save | gzip` could save ~50% storage at the cost of CPU time. Profile before enabling.
- **Existing env vars used:** `NFS_MOUNT_ROOT` (line 44) and `SELKIES_IMAGE` (line 43) — no new env vars needed.

## Future Phase 2: Docker Registry

When the POC approach hits scaling limits (>15 users, NFS latency >60s average), deploy Harbor/Docker Registry with layer deduplication, reducing pull latency to 5-10s and storage by ~50%. This is a separate effort and not in scope for this plan.
