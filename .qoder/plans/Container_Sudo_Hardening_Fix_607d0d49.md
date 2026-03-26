# Container Sudo Hardening — Comprehensive Fix

## Root Cause Analysis

After thorough review of all config files (Full_Setup.txt, supervisord, sudoers, seccomp) and deep research into HAMi-core:

1. **HAMi-core libvgpu.so** uses aggressive `dlsym()` hooking that crashes ANY non-CUDA program calling `dlopen`/`dlsym` (apt-get, clear, dpkg, etc.). This is a **known unfixed issue** (GitHub #61, #1055, #461).
2. **The per-program wrapper approach failed** because python3 segfaulted — likely due to library load ordering differences or interaction with the parent shell's LD_PRELOAD.
3. **Full_Setup.txt documents the PROVEN working state**: global `LD_PRELOAD="/usr/lib/fake_sysconf.so /usr/lib/libvgpu.so"` (space-separated, fake_sysconf FIRST). CUDA/VRAM tests passed. Only system tools (apt-get) crashed.
4. **The supervisord config already isolates LD_PRELOAD per-process** — the desktop (entrypoint) gets only fake_sysconf.so, the video encoder (selkies-gstreamer) gets only libvgpu.so. This is correct and unchanged.

## Strategy: Global LD_PRELOAD + Targeted Wrappers

Return to the proven global injection (matching Full_Setup.txt exactly), and add bash function wrappers ONLY for the specific commands known to crash with libvgpu.so. This gives us:

- CUDA programs (python3, torch, nvcc): VRAM enforced via libvgpu.so (inherited from shell)
- System tools (apt, dpkg, clear, etc.): wrapped to strip LD_PRELOAD before execution
- Sudo: wrapped to strip LD_PRELOAD; sudoers deny list blocks host escape + GPU bypass
- Desktop: handled by supervisord (unchanged)

## Task 1: Rebuild `/etc/laas/bash.bashrc`

Extract clean base from Selkies image, append this EXACT LaaS block (matching Full_Setup.txt format + hardening wrappers):

```bash
# LaaS resource interceptors — applied to all bash terminal sessions
# HAMi: CUDA VRAM/SM limits  |  fake_sysconf: correct RAM in tools
if [ "${HAMI_INJECTED}" != "1" ]; then
  export LD_PRELOAD="/usr/lib/fake_sysconf.so /usr/lib/libvgpu.so"
  export HAMI_INJECTED=1
  export SYSCONF_INJECTED=1
  mkdir -p /tmp/vgpulock 2>/dev/null
fi

# Sudo wrapper: strip LD_PRELOAD so system tools run clean under sudo
# For interactive shells: also strip HAMI_INJECTED so root shell re-loads HAMi
sudo() {
    case "$1" in
        -i|-s|su|bash|sh|zsh|fish|login)
            env -u LD_PRELOAD -u HAMI_INJECTED /usr/bin/sudo "$@"
            ;;
        *)
            env -u LD_PRELOAD /usr/bin/sudo "$@"
            ;;
    esac
}

# System tools that crash with libvgpu.so dlsym hooks — strip LD_PRELOAD
clear()   { env -u LD_PRELOAD /usr/bin/clear "$@"; }
apt()     { env -u LD_PRELOAD /usr/bin/apt "$@"; }
apt-get() { env -u LD_PRELOAD /usr/bin/apt-get "$@"; }
dpkg()    { env -u LD_PRELOAD /usr/bin/dpkg "$@"; }
pip()     { env -u LD_PRELOAD /usr/bin/pip "$@"; }
pip3()    { env -u LD_PRELOAD /usr/bin/pip3 "$@"; }
```

Key differences from per-program approach:
- **Global LD_PRELOAD** (not per-program): `export LD_PRELOAD="/usr/lib/fake_sysconf.so /usr/lib/libvgpu.so"`
- **Exact match to Full_Setup.txt**: space-separated, fake_sysconf.so FIRST, libvgpu.so SECOND
- **HAMI_INJECTED guard**: prevents double-loading
- **Sudo -i strips HAMI_INJECTED**: so root shells re-load HAMi from bash.bashrc
- **Wrapper for `clear`**: added to fix the segfault on that command
- No changes to supervisord, nvidia-smi wrapper, passwd wrapper, seccomp, or AppArmor

## Task 2: Verify sudoers file is correct

Confirm `/etc/laas/sudoers-laas-user` matches the hardened version with:
- `Defaults env_reset` + `env_delete += "LD_PRELOAD LD_LIBRARY_PATH"`
- `ubuntu ALL=(ALL) NOPASSWD: ALL`
- Deny list for mount, insmod, iptables, nsenter, unshare, chroot
- Deny `sudo python3/python` (prevents VRAM bypass via sudo)
- Deny `sudo /home/ubuntu/*` (prevents user-compiled CUDA bypass)

## Task 3: Recreate container and run full validation

Stop, remove, and recreate the container with the hardened docker run command from `c1_hardened.txt`.

Validation checklist (all inside container Konsole):
1. `clear` — should work (no segfault)
2. `echo $LD_PRELOAD` — should show both libraries
3. `python3 -c "import torch; ..."` — VRAM should report ~8GB, 10GB alloc blocked
4. `sudo apt-get update` — should work (no segfault)
5. `sudo mount -t tmpfs tmpfs /tmp/test123` — should be blocked
6. `sudo modprobe dummy` — should be blocked
7. `sudo python3` — should be denied by sudoers
8. `sudo -i` then `python3 VRAM test` — root shell should re-load HAMi, VRAM enforced

## What This Does NOT Change (Unchanged from Full_Setup.txt)

- `supervisord-hami.conf` — per-process LD_PRELOAD isolation (entrypoint: fake_sysconf only, selkies-gstreamer: libvgpu only)
- `nvidia-smi-wrapper` — strips LD_PRELOAD, shows HAMi VRAM limit
- `passwd-wrapper` — strips LD_PRELOAD
- `seccomp-gpu-desktop.json` — blocks mount, unshare, setns, bpf, etc.
- AppArmor profile `laas-container`
- Docker run capabilities (cap-drop ALL + minimal adds)

## Known Limitations (Accepted Trade-offs)

1. **Some programs may still segfault**: Any program using `dlopen`/`dlsym` that we haven't wrapped. Fix: add a wrapper as discovered.
2. **Root shell VRAM enforcement depends on bash.bashrc**: If the user creates a non-bash root shell (e.g., `sudo dash`), HAMi won't load. Mitigated by sudoers blocking `sudo python3`.
3. **nvidia-smi always shows full GPU VRAM**: Kernel limitation (NVML bypasses user-space hooks). Our wrapper masks this cosmetically.
4. **--network=host and --ipc=host**: Required for Selkies WebRTC. Production will use bridge networking with Cloudflare Tunnel.
