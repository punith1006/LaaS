# Container Sudo Hardening — Implementation Plan

## Context
Users need full sudo inside Selkies GPU desktop containers (apt install, pip, systemctl, etc.) while being completely isolated from: the host, other sessions, other users' NFS storage, and shared GPU infrastructure.

## Critical Pre-requisite (Host-side verification)
Before any code changes, two things must be verified on the actual host:
1. **cgroups v2** is active (`stat -fc %T /sys/fs/cgroup` → must say `cgroup2fs`)
2. **Docker daemon TCP listener is disabled** (`ss -tlnp | grep 2375` → must be empty)
3. **Test Selkies boot without SYS_ADMIN** — if it works, skip AppArmor mount restrictions

---

## Task 1: Create seccomp profile for GPU containers
**File:** `host-services/session-orchestration/seccomp-gpu-desktop.json`

Allowlist-based seccomp profile that:
- Allows all syscalls needed for GPU/CUDA/WebRTC/X11/desktop operations
- Blocks: `kexec_load`, `kexec_file_load`, `init_module`, `finit_module`, `delete_module`, `bpf`, `process_vm_writev`, `process_vm_readv`, `add_key`, `keyctl`, `request_key`, `reboot`, `swapon`, `swapoff`, `pivot_root`, `acct`
- Restricts `mount` via args filtering if possible (FUSE-only)
- Restricts `unshare` to block `CLONE_NEWUSER` flag

## Task 2: Create AppArmor profile template for containers
**File:** `host-services/session-orchestration/apparmor-laas-container`

AppArmor profile that:
- Denies mount of `nfs`, `nfs4`, `cifs`, `ext4`, `xfs` filesystem types (only allows `fuse`, `tmpfs`, `proc`, `devpts`)
- Denies write to `/tmp/nvidia-mps/control`
- Denies access to `/proc/sysrq-trigger`, `/proc/kcore`, `/proc/keys`
- Allows normal desktop operations (read/write /home, /tmp, X11 sockets, GPU devices)

## Task 3: Create sudoers injection config
**File:** `host-services/session-orchestration/sudoers-laas-user`

Sudoers file that:
- Grants `ubuntu ALL=(ALL) NOPASSWD: ALL` (full sudo)
- Explicitly denies dangerous commands: `mount`, `umount`, `insmod`, `modprobe`, `rmmod`, `mkfs`, `fdisk`, `ip route`, `iptables`, `nft`
- This file gets bind-mounted into containers at `/etc/sudoers.d/laas-user`

## Task 4: Update docker run command — hardened c1.txt
**File:** `tests/c1.txt`

Update the docker run command with:
- `--cap-drop=ALL` then `--cap-add` only what's needed (SYS_ADMIN if required, CHOWN, DAC_OVERRIDE, FOWNER, SETUID, SETGID, NET_BIND_SERVICE, KILL, SYS_CHROOT)
- `--security-opt seccomp=<path>` pointing to seccomp profile
- `--security-opt apparmor=laas-container` pointing to AppArmor profile
- `--pids-limit=512`
- Change `--network=host` → `--network=bridge` with explicit `-p` port mappings
- Change `--ipc=host` → `--ipc=private`
- Mount nvidia-mps as `:ro`
- Remove nvidia-smi.real mount entirely
- Add sudoers config bind mount
- Unique per-session SELKIES_BASIC_AUTH_PASSWORD
- Add `--tmpfs /dev/shm:rw,nosuid,nodev,noexec,size=2g` (sized for WebRTC)

## Task 5: Update session orchestration app.py
**File:** `host-services/session-orchestration/app.py`

Update the Python orchestration code to:
- Generate unique per-session basic auth password
- Generate per-session TURN credentials (time-limited)
- Apply all security flags from Task 4
- Add seccomp and AppArmor profile paths
- Switch to bridge networking with port mapping logic
- Mount sudoers config
- Mount nvidia-mps as read-only
- Remove nvidia-smi.real mount

## Task 6: Create NFS hardening guide (as comments in app.py)
Add inline comments in app.py documenting the required NFS server-side changes:
- Enable `root_squash` on exports
- Per-user exports (not parent directory)
- Firewall NFS port to only host IPs (not container bridge IPs)

## Task 7: Create host-side setup script
**File:** `host-services/session-orchestration/setup-host-security.sh`

Shell script that an admin runs once on each host node to:
- Load the AppArmor profile
- Place the seccomp JSON in `/etc/laas/`
- Place the sudoers config in `/etc/laas/`
- Verify cgroups v2
- Verify Docker TCP is disabled
- Create per-session bridge network template

---

## Execution Order
Tasks 1-3 are independent (parallel). Task 4 depends on 1-3. Task 5 depends on 1-3. Task 7 depends on 1-2.
