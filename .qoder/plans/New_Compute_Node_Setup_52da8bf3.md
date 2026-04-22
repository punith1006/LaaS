# LaaS Compute Node Setup: 192.168.10.88

**Starting point:** HAMi-core (libvgpu.so) has just been built on 192.168.10.88 at step 2.8.
**Goal:** Fully operational compute node that can launch GPU desktop sessions, with all config files, services, and dependencies in place.
**Approach:** Copy proven binaries and configs from 192.168.10.99 (current host), then set up local ZFS/NFS and host services.

---

## Task 1: Install libvgpu.so and fake_sysconf.so

After HAMi-core build completes in `~/HAMi-core/build/`:

```bash
# On 192.168.10.88
sudo cp ~/HAMi-core/build/libvgpu.so /usr/lib/libvgpu.so
sudo ldconfig
```

Copy fake_sysconf.so from the current host:
```bash
# From dev machine or from .88:
scp zenith@192.168.10.99:/usr/lib/fake_sysconf.so /tmp/
sudo cp /tmp/fake_sysconf.so /usr/lib/fake_sysconf.so
sudo ldconfig
```

**Verify:** `ls -la /usr/lib/libvgpu.so /usr/lib/fake_sysconf.so`

---

## Task 2: Install lxcfs

lxcfs is required for resource visibility spoofing (/proc/meminfo, /proc/cpuinfo etc. show container limits, not host).

```bash
sudo apt install -y lxcfs
sudo systemctl enable --now lxcfs
```

**Verify:** `ls /var/lib/lxcfs/proc/` -- should show cpuinfo, meminfo, stat, uptime, loadavg, diskstats, swaps.

---

## Task 3: Set up CUDA MPS daemon (systemd service)

```bash
sudo nvidia-smi -pm 1
sudo mkdir -p /tmp/nvidia-mps /tmp/nvidia-log

sudo tee /etc/systemd/system/cuda-mps.service > /dev/null << 'EOF'
[Unit]
Description=CUDA MPS Control Daemon
After=nvidia-persistenced.service

[Service]
Type=forking
Environment=CUDA_VISIBLE_DEVICES=0
Environment=CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps
Environment=CUDA_MPS_LOG_DIRECTORY=/tmp/nvidia-log
ExecStartPre=/usr/bin/nvidia-smi -pm 1
ExecStart=/usr/bin/nvidia-cuda-mps-control -d
ExecStop=/bin/bash -c "echo quit | /usr/bin/nvidia-cuda-mps-control"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cuda-mps
```

**Verify:** `sudo systemctl status cuda-mps` shows Active (running).

---

## Task 4: Deploy config files to /etc/laas/

Copy the authoritative config files from the repo (`host-services/config/`) to the new node. These are bind-mounted into every container.

**Option A -- SCP from current host (guaranteed matching what's running):**
```bash
# From dev machine or .88:
scp -r zenith@192.168.10.99:/etc/laas/ /tmp/laas-config/
sudo mkdir -p /etc/laas
sudo cp /tmp/laas-config/* /etc/laas/
```

**Option B -- SCP from your dev machine (repo source of truth):**
```bash
# From your Windows dev machine:
scp -r c:\Users\Punith\LaaS\host-services\config\* zenith@192.168.10.88:/tmp/laas-config/
# Then on .88:
sudo mkdir -p /etc/laas
sudo cp /tmp/laas-config/* /etc/laas/
```

**Files and permissions:**
```bash
sudo chmod 644 /etc/laas/bash.bashrc
sudo chmod 644 /etc/laas/supervisord-hami.conf
sudo chmod 644 /etc/laas/sudoers
sudo chmod 644 /etc/laas/sudoers-laas-user
sudo chmod 644 /etc/laas/seccomp-gpu-desktop.json
sudo chmod 755 /etc/laas/nvidia-smi-wrapper
sudo chmod 755 /etc/laas/passwd-wrapper
```

Additionally, the session-orchestration mounts `/etc/laas/sudo-bin` (the real sudo binary) into containers. Copy it from the Selkies image:
```bash
docker run --rm --entrypoint cat ghcr.io/selkies-project/nvidia-egl-desktop:latest /usr/bin/sudo > /tmp/sudo-bin
sudo cp /tmp/sudo-bin /etc/laas/sudo-bin
sudo chmod 755 /etc/laas/sudo-bin
```

**Verify:** `ls -la /etc/laas/` shows all 8 files.

---

## Task 5: Create per-container runtime directories

These directories are bind-mounted per-container for GPU locking and CPU topology spoofing. The session-orchestration service uses display numbers 20-99.

```bash
# vgpulock directories (one per display number range)
for i in $(seq 20 99); do
  sudo mkdir -p /tmp/vgpulock-$i
  sudo chmod 777 /tmp/vgpulock-$i
done

# CPU topology directories (one per display number)
# These are generated dynamically by session-orchestration based on allocated cpuset,
# but we pre-create the MPS dirs:
sudo mkdir -p /tmp/nvidia-mps /tmp/nvidia-log
sudo chmod 777 /tmp/nvidia-mps /tmp/nvidia-log
```

**Note:** CPU topology files (`/tmp/container-<display>-cpu/`) are created dynamically by the session orchestration service during each launch -- no pre-creation needed.

---

## Task 6: Set up local ZFS + NFS storage

Create a local ZFS pool with NFS loopback (same pattern as 192.168.10.99).

```bash
# Install prerequisites
sudo apt install -y zfsutils-linux nfs-kernel-server

# Create file-backed ZFS pool (adjust size based on available disk space)
# Check available space first: df -h /vg_containers or df -h /
sudo mkdir -p /vg_containers
sudo truncate -s 20G /vg_containers/nas_pool.img
sudo zpool create -f datapool /vg_containers/nas_pool.img

# Create parent dataset
sudo zfs create datapool/users

# Configure NFS export (loopback)
echo '/datapool/users 127.0.0.1(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server

# Mount NFS locally
sudo mkdir -p /mnt/nfs/users
sudo mount -t nfs4 127.0.0.1:/datapool/users /mnt/nfs/users

# Persist in fstab
echo '127.0.0.1:/datapool/users /mnt/nfs/users nfs4 defaults 0 0' | sudo tee -a /etc/fstab
```

**Verify:** `sudo zpool list` shows datapool, `df -h /mnt/nfs/users` shows mounted.

---

## Task 7: Pull the Selkies container image

This image is ~15GB and takes time to download. Start early.

```bash
docker pull ghcr.io/selkies-project/nvidia-egl-desktop:latest
```

**Verify:** `docker images | grep selkies`

---

## Task 8: Create Docker bridge network

Production containers use an isolated bridge network.

```bash
docker network create -d bridge --subnet=172.18.0.0/16 laas-sessions
```

**Verify:** `docker network ls | grep laas-sessions`

---

## Task 9: Deploy host services (session-orchestration + storage-provision)

Copy the host-services directory to the new node and install dependencies.

```bash
# From dev machine:
scp -r c:\Users\Punith\LaaS\host-services zenith@192.168.10.88:/opt/laas/host-services

# On .88:
cd /opt/laas/host-services/session-orchestration
pip3 install -r requirements.txt

cd /opt/laas/host-services/storage-provision
pip3 install -r requirements.txt
```

Create the provision script (required by storage-provision service):
```bash
# Copy from current host:
scp zenith@192.168.10.99:/usr/local/bin/provision-user-storage.sh zenith@192.168.10.88:/tmp/
sudo cp /tmp/provision-user-storage.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/provision-user-storage.sh

# Allow passwordless sudo for the script:
echo 'zenith ALL=(root) NOPASSWD: /usr/local/bin/provision-user-storage.sh' | sudo tee /etc/sudoers.d/laas-provision
sudo chmod 440 /etc/sudoers.d/laas-provision
```

Start services (for now manually, later as systemd units):
```bash
# Terminal 1:
cd /opt/laas/host-services/session-orchestration
SESSION_SECRET="<same-secret-as-99>" HOST_IP="192.168.10.88" LAAS_NETWORK_MODE="bridge" python3 app.py

# Terminal 2:
cd /opt/laas/host-services/storage-provision
PROVISION_SECRET="<same-secret-as-99>" ENABLE_NFS_AUTOMOUNT=true python3 app.py
```

**Verify:**
```bash
curl http://localhost:9998/health
curl http://localhost:9999/health
```

---

## Task 10: Full verification and test launch

Run a comprehensive pre-flight check, then launch a test container.

```bash
# Pre-flight
echo "=== Docker ===" && docker info | head -5
echo "=== GPU ===" && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
echo "=== MPS ===" && sudo systemctl status cuda-mps | grep Active
echo "=== lxcfs ===" && ls /var/lib/lxcfs/proc/ | wc -l
echo "=== NFS ===" && df -h /mnt/nfs/users
echo "=== Config ===" && ls /etc/laas/
echo "=== Libraries ===" && ls -la /usr/lib/libvgpu.so /usr/lib/fake_sysconf.so
echo "=== Selkies ===" && docker images | grep selkies
echo "=== Network ===" && docker network ls | grep laas
```

Test session launch via curl to the orchestration API (same pattern the backend uses):
```bash
curl -X POST http://127.0.0.1:9998/sessions/launch \
  -H "X-Session-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-0001-0000-0000-000000000001",
    "user_id": "test-user-001",
    "user_email": "test@laas.local",
    "tier_slug": "blaze",
    "vcpu": 4,
    "memory_mb": 8192,
    "vram_mb": 4096,
    "hami_sm_percent": 17,
    "storage_type": "ephemeral",
    "node_hostname": "laas-node-02"
  }'
```

Then connect from browser: `http://192.168.10.88:<nginx_port>/`

---

## Execution Order

Tasks 1-3 can be done immediately (libraries + system services).
Task 4-5 can be done in parallel (config files + runtime dirs).
Task 6 depends on ZFS/NFS packages being installed.
Task 7 (image pull) should be started early -- it runs in background.
Task 8 is quick, do before Task 9.
Task 9 depends on Tasks 4-8 all being complete.
Task 10 depends on everything.
