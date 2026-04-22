# LaaS POC Setup Plan
### Machine: ASUS ProArt X670E | Ryzen 9 7950X3D | RTX 4090 | 64GB DDR5 | 2TB NVMe
### Windows 11 Pro (preserved) → WSL2 validation → Ubuntu 22.04 dual-boot full POC

---

## Overview of the Two Phases

| | Phase 1 — WSL2 | Phase 2 — Ubuntu Dual-Boot |
|---|---|---|
| **Goal** | Validate HAMi-core VRAM limits + MPS + Docker GPU baseline | Full production-representative stack |
| **Risk to Windows** | Zero | Low (partitioning only, no data touched) |
| **What you CAN test** | HAMi-core LD_PRELOAD, CUDA MPS, VRAM limits, Docker GPU containers, CUDA workloads, basic orchestrator logic | Everything above PLUS Selkies EGL WebRTC desktop, NVENC streaming, full container isolation, NFS simulation, Keycloak, Prometheus |
| **What you CANNOT test** | Selkies EGL WebRTC desktop (EGL needs real GPU display path, not WSL stub), NVENC reliably | Blackwell-specific behavior (still 4090, but architecture is representative) |
| **Duration** | 2–4 hours | 1–2 days |

---

## PRE-FLIGHT CHECKS (Do These Before Either Phase)

### Step 0A — BIOS Update (Critical, Do First)
Your BIOS is from April 2023 (version 1710). ASUS has released multiple updates since then fixing:
- AMD AGESA microcode updates for Zen 4 (memory stability, IOMMU fixes)
- PCIe and IOMMU group improvements
- USB and stability fixes

```
1. Go to: https://www.asus.com/motherboards-components/motherboards/proart/proart-x670e-creator-wifi/helpdesk_bios/
2. Download the latest BIOS
3. Use ASUS EZ Flash 3 (inside BIOS) or AI Suite 3 in Windows to flash
4. After update: re-enter BIOS and verify settings
   - AMD-Vi (IOMMU): Enabled
   - SVM Mode (AMD-V): Enabled  
   - Resizable BAR / SAM: Enabled
   - XMP/EXPO: Check if your RAM profile is stable (if you've had crashes, disable it)
```
**Do not skip this.** The BIOS version affects IOMMU grouping which matters for Phase 2.

---

### Step 0B — Check Your Disk Layout
Open PowerShell as Administrator and run:
```powershell
Get-Disk | Select Number, Size, PartitionStyle
Get-Partition | Select DiskNumber, PartitionNumber, DriveLetter, Size, Type
```
Share the output if you need help interpreting it. You need to know:
- How many physical disks (is it 1× 2TB or 2× 1TB?)
- How much free unallocated space exists
- Whether Windows is on a single large partition or split across multiple

### Step 0C — Check App Control for Business (Potential Blocker)
Your system shows **App Control for Business: Enforced**. This can block Docker Desktop and unsigned binaries.
```powershell
# Run in PowerShell as Admin:
Get-CIPolicy -FilePath "$env:SystemRoot\System32\CodeIntegrity\SiPolicy.p7b" 2>$null
```
If this errors, you're fine. If it returns policy details, note it — we may need to work around it for Docker Desktop.

---

## PHASE 1 — WSL2 VALIDATION

### What You'll Prove in This Phase
1. HAMi-core libvgpu.so intercepts CUDA on your 4090 and enforces VRAM limits inside Docker containers
2. CUDA MPS partitions GPU compute across multiple containers simultaneously
3. Multiple containers can run independent GPU workloads with individual VRAM caps
4. The core fractional GPU billing model is technically viable

### Step 1.1 — Enable WSL2 with Ubuntu 22.04

Open PowerShell as Administrator:
```powershell
# Enable WSL2 (if not already enabled)
wsl --install --no-distribution
# Reboot if prompted, then:
wsl --install -d Ubuntu-22.04
wsl --set-default-version 2
wsl --set-version Ubuntu-22.04 2
```

Verify after reboot:
```powershell
wsl --status
# Must show: Default Version: 2
wsl -d Ubuntu-22.04 -- uname -r
# Should show kernel version 5.15.x or higher
```

### Step 1.2 — Install Docker Desktop with WSL2 Backend

Download Docker Desktop for Windows: https://docs.docker.com/desktop/install/windows-install/

During install:
- ✅ Use WSL2 instead of Hyper-V backend
- ✅ Enable integration with Ubuntu-22.04 (in Docker Desktop Settings → Resources → WSL Integration)

Verify inside WSL2:
```bash
# Open Ubuntu-22.04 terminal
docker run hello-world
# Should print Hello from Docker!
```

> **Note on App Control for Business**: If Docker Desktop fails to install due to policy, you may need to temporarily set it to Audit mode in Windows Security → App Control. We'll address this if it blocks you.

### Step 1.3 — Verify GPU Access in WSL2

IMPORTANT: In WSL2, you do NOT install NVIDIA drivers inside WSL. The Windows NVIDIA driver exposes GPU to WSL2 via a kernel shim (`libcuda.so` stub in WSL2 maps to your Windows driver). Your existing Windows NVIDIA driver handles this automatically.

```bash
# In Ubuntu-22.04 WSL2 terminal:
nvidia-smi
# Must show your RTX 4090, driver version, CUDA version
# If this fails, your Windows NVIDIA driver may need updating to 527.x+
```

Install CUDA toolkit inside WSL2 (toolkit only — NOT the driver):
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt install -y cuda-toolkit-12-8
echo 'export PATH=/usr/local/cuda-12.8/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64:$PATH' >> ~/.bashrc
source ~/.bashrc
nvcc --version
# Must show CUDA 12.8
```

Install nvidia-container-toolkit for Docker:
```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU in Docker:
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu22.04 nvidia-smi
# Must show RTX 4090 inside the container
```

### Step 1.4 — Build HAMi-core (libvgpu.so) — The Critical Test

This is the most important test of the entire POC. If this works on your 4090, the architecture is validated.

```bash
# Install build dependencies
sudo apt install -y build-essential cmake git

# Clone and build HAMi-core
git clone https://github.com/Project-HAMi/HAMi-core.git
cd HAMi-core
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

# Check the output
ls -la libvgpu.so
# You should see libvgpu.so created

# Copy to system lib
sudo cp libvgpu.so /usr/local/lib/libvgpu.so
sudo ldconfig
```

### Step 1.5 — VRAM Limit Test (The Core Validation)

Create a test script that tries to allocate more VRAM than allowed:
```bash
cat > /tmp/vram_test.py << 'EOF'
import torch
import sys

limit_gb = float(sys.argv[1]) if len(sys.argv) > 1 else 4.0
limit_bytes = int(limit_gb * 1024 * 1024 * 1024)

print(f"Reported total VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
print(f"Attempting to allocate {limit_gb * 1.5:.1f}GB (should fail)...")
try:
    t = torch.zeros(int(limit_bytes * 1.5 / 4), dtype=torch.float32, device='cuda')
    print("FAIL: Allocated beyond limit — HAMi-core not intercepting")
except RuntimeError as e:
    print(f"SUCCESS: Allocation rejected — '{e}'")
    print("HAMi-core VRAM enforcement is WORKING")
EOF
```

Run a container WITH HAMi-core limit enforcement (4GB limit):
```bash
docker run --rm --gpus all \
  -e CUDA_DEVICE_MEMORY_LIMIT_0=4096m \
  -e LD_PRELOAD=/usr/local/lib/libvgpu.so \
  -v /tmp/vram_test.py:/test.py \
  -v /usr/local/lib/libvgpu.so:/usr/local/lib/libvgpu.so \
  nvidia/cuda:12.8.0-runtime-ubuntu22.04 bash -c "
    pip install torch --quiet &&
    python /test.py 4.0
  "
```

**Expected output:**
```
Reported total VRAM: 4.0 GB        ← HAMi-core hides the real 24GB, shows 4GB
Attempting to allocate 6.0GB (should fail)...
SUCCESS: Allocation rejected — 'CUDA out of memory...'
HAMi-core VRAM enforcement is WORKING
```

If you see `Reported total VRAM: 24.0 GB` → HAMi-core is not intercepting correctly. This means it's broken on your CUDA version. **Stop and raise a GitHub issue with HAMi-core before proceeding.**

### Step 1.6 — CUDA MPS Multi-Container Test

Start the MPS daemon:
```bash
# In WSL2:
sudo mkdir -p /tmp/nvidia-mps /tmp/nvidia-log
export CUDA_VISIBLE_DEVICES=0
sudo nvidia-cuda-mps-control -d
echo "get_server_list" | sudo nvidia-cuda-mps-control
# Should show "MPS Server" is running
```

Run 4 containers simultaneously with different VRAM limits:
```bash
# Run all 4 in background, collect results
for config in "4096m:4" "8192m:8" "4096m:4" "8192m:8"; do
  LIMIT=$(echo $config | cut -d: -f1)
  GB=$(echo $config | cut -d: -f2)
  docker run --rm --gpus all \
    -e CUDA_DEVICE_MEMORY_LIMIT_0=$LIMIT \
    -e CUDA_MPS_PINNED_DEVICE_MEM_LIMIT="0=${GB}G" \
    -e LD_PRELOAD=/usr/local/lib/libvgpu.so \
    -v /usr/local/lib/libvgpu.so:/usr/local/lib/libvgpu.so \
    nvidia/cuda:12.8.0-runtime-ubuntu22.04 \
    bash -c "nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits && sleep 30" &
done
wait
```

**Expected:** Each container prints its VRAM limit (4096 or 8192 MB), not the real 24GB. All 4 containers run concurrently.

### Step 1.7 — Phase 1 Go/No-Go Criteria

| Test | Pass Condition | Status |
|---|---|---|
| WSL2 GPU access | `nvidia-smi` works inside WSL2 | ☐ |
| Docker GPU access | `nvidia-smi` works inside Docker container | ☐ |
| HAMi-core VRAM reporting | Container reports limited VRAM (not 24GB) | ☐ |
| HAMi-core VRAM enforcement | Allocation beyond limit fails with OOM error | ☐ |
| MPS daemon | `nvidia-cuda-mps-control` starts without error | ☐ |
| 4 concurrent containers | All 4 run GPU workloads simultaneously | ☐ |

**If all 6 pass:** The core GPU fractional sharing architecture is VALIDATED. Proceed to Phase 2.
**If HAMi-core tests fail:** Do not proceed. Investigate before Phase 2.

---

## PHASE 2 — UBUNTU 22.04 DUAL-BOOT (Full POC)

### Step 2.1 — Disk Preparation (Windows Side, Before Booting Ubuntu)

**First: Back up your data.** Even though we won't touch the Windows partition data, always back up before repartitioning.

Check current disk usage precisely:
```powershell
# PowerShell as Admin
Get-Partition -DiskNumber 0 | Select PartitionNumber, DriveLetter, @{N='Size(GB)';E={[math]::Round($_.Size/1GB,1)}}, Type
```

Shrink the Windows partition to free space for Ubuntu. Assuming you have 1TB–1.5TB free:
```powershell
# Shrink C: drive to free up 600GB for Ubuntu
# Adjust the ShrinkTargetSize based on your actual free space
Resize-Partition -DriveLetter C -Size (Get-Partition -DriveLetter C).Size - 650GB
```

Or use Disk Management GUI: Windows key → "Create and format hard disk partitions" → Right-click C: → Shrink Volume → Enter 665600 MB (650GB) → Shrink.

**Target partition layout after shrink:**
```
[Windows C: ~500-900GB EXT4/NTFS] [FREE 650GB] [Recovery partition if any]
```

Leave the 650GB as unallocated — Ubuntu installer will partition it.

### Step 2.2 — Create Ubuntu 22.04.x LTS Bootable USB

```
1. Download Ubuntu 22.04.4 LTS: https://releases.ubuntu.com/22.04/
   File: ubuntu-22.04.4-desktop-amd64.iso (or server ISO — either works)
   
2. Flash to USB (8GB+) using Balena Etcher:
   https://etcher.balena.io/
   
3. Verify SHA256 checksum of the ISO before flashing
```

### Step 2.3 — Ubuntu Installation

Boot from USB (F8 on ASUS ProArt for boot menu).

During installation:
- Choose **"Install Ubuntu alongside Windows Boot Manager"** — this preserves Windows
- When prompted for partition: select the 650GB unallocated space
- Manual partition layout (choose "Something else" for control):

```
/dev/nvme0n1pX  50GB   EXT4  → mount: /          (Ubuntu OS)
/dev/nvme0n1pX  8GB    swap  → swap              (8GB for 64GB RAM)
/dev/nvme0n1pX  150GB  EXT4  → mount: /var/lib/docker  (Docker images + overlays)
/dev/nvme0n1pX  440GB  EXT4  → mount: /vg_containers   (Container scratch, ephemeral data)
```

> This mirrors the production NVMe layout from the infra plan, minus the NAS (which we'll simulate locally).

Install bootloader to: `/dev/nvme0n1` (the full disk, not a partition)

### Step 2.4 — Post-Install Ubuntu Configuration

Boot into Ubuntu. Open terminal:

```bash
# Update everything first
sudo apt update && sudo apt full-upgrade -y

# Essential tools
sudo apt install -y \
  build-essential cmake git curl wget \
  lm-sensors htop iotop nvme-cli smartmontools \
  net-tools nmap iperf3 \
  zfsutils-linux nfs-kernel-server \
  apparmor apparmor-utils \
  python3 python3-pip python3-venv

# Set kernel parameters (IOMMU for future reference)
sudo nano /etc/default/grub
# Change GRUB_CMDLINE_LINUX_DEFAULT to:
# "quiet splash amd_iommu=on iommu=pt"
sudo update-grub
```

### Step 2.5 — NVIDIA Driver + CUDA (Bare Metal)

This is the critical difference from WSL2 — you're installing the FULL NVIDIA driver directly on Linux metal:

```bash
# Remove any existing drivers
sudo apt purge nvidia* libnvidia* -y
sudo apt autoremove -y

# Add NVIDIA driver repo
sudo add-apt-repository ppa:graphics-drivers/ppa -y
sudo apt update

# Install latest production driver (check https://www.nvidia.com/drivers for current version)
# As of early 2026, driver 570.x or 575.x branch supports Ada (RTX 4090, sm_89)
sudo apt install -y nvidia-driver-570 nvidia-utils-570

# Reboot required after driver install
sudo reboot
```

After reboot:
```bash
nvidia-smi
# Must show: RTX 4090, 24GB VRAM, driver 570.x
# Check compute capability (should be 8.9 for Ada / RTX 4090)
nvidia-smi --query-gpu=compute_cap --format=csv,noheader
```

Install CUDA Toolkit 12.8 (native, not WSL stub):
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt install -y cuda-toolkit-12-8

echo 'export PATH=/usr/local/cuda-12.8/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
nvcc --version
```

### Step 2.6 — Docker CE + NVIDIA Container Toolkit

```bash
# Install Docker CE (not Docker Desktop)
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER
newgrp docker

# NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Verify
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu22.04 nvidia-smi
```

### Step 2.7 — CUDA MPS Daemon (Systemd Service)

```bash
# Set GPU to persistence mode (keeps driver loaded always)
sudo nvidia-smi -pm 1

# Create MPS daemon directories
sudo mkdir -p /tmp/nvidia-mps /tmp/nvidia-log

# Create systemd service
sudo tee /etc/systemd/system/cuda-mps.service > /dev/null << 'EOF'
[Unit]
Description=CUDA MPS Control Daemon — Static SM Partitioning
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

sudo systemctl enable --now cuda-mps
sudo systemctl status cuda-mps
# Should show: Active (running)
```

### Step 2.8 — Build HAMi-core (libvgpu.so) on Bare Metal

```bash
git clone https://github.com/Project-HAMi/HAMi-core.git
cd HAMi-core
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
sudo cp libvgpu.so /usr/lib/libvgpu.so
sudo ldconfig
```
Do this as well
    sudo cp ~/HAMi-core/build/libvgpu.so /usr/lib/libvgpu.so
    sudo chmod 755 /usr/lib/libvgpu.so
    sudo ldconfig


docker run --rm --gpus all \
  -e CUDA_DEVICE_MEMORY_LIMIT_0=4096m \
  -e LD_PRELOAD=/usr/lib/libvgpu.so \
  -v /usr/lib/libvgpu.so:/usr/lib/libvgpu.so:ro \
  nvidia/cuda:12.8.0-runtime-ubuntu22.04 bash -c "
    apt-get update -qq && apt-get install -y -qq python3 python3-pip > /dev/null 2>&1 &&
    pip3 install torch --index-url https://download.pytorch.org/whl/cu128 &&
    python3 -c \"
import torch
print(f'VRAM reported: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
try:
    t = torch.zeros(int(6 * 1024**3 / 4), dtype=torch.float32, device='cuda')
    print('FAIL: Allocated 6GB beyond 4GB limit')
except RuntimeError as e:
    print(f'SUCCESS: HAMi enforcement working - {e}')
\"
  "

Run the same VRAM limit test from Phase 1, Step 1.5. On bare metal the results should be cleaner and faster.

### Step 2.9 — Simulate NFS Persistent Storage (Local)

In production, this is TrueNAS over 10GbE. For the POC, we simulate it locally using the same ZFS + NFS stack:

```bash
# Install ZFS
sudo apt install -y zfsutils-linux

# Create a ZFS pool using a file-backed vdev (POC only — simulates NAS)
sudo truncate -s 100G /vg_containers/nas_pool.img
sudo zpool create -f datapool /vg_containers/nas_pool.img

# Create user volumes (same as production)
sudo zfs create datapool/users
sudo zfs create -o quota=15G datapool/users/testuser1
sudo zfs create -o quota=15G datapool/users/testuser2

# Verify quotas
zfs list -o name,quota,used datapool/users/testuser1

# Export via NFS (loopback — POC only)
sudo apt install -y nfs-kernel-server
echo '/datapool/users  127.0.0.1(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server

# Mount on same machine (simulating node mounting NAS)
sudo mkdir -p /mnt/nfs/users
sudo mount -t nfs4 127.0.0.1:/datapool/users /mnt/nfs/users
df -h /mnt/nfs/users
```

### Step 2.10 — Build the Selkies EGL Desktop Base Image

This is the biggest build step. The image takes 20–40 minutes to build:

```bash
# Install Docker buildx for multi-stage builds
docker buildx install

# Clone Selkies project
git clone https://github.com/selkies-project/docker-nvidia-egl-desktop.git
cd docker-nvidia-egl-desktop

# Build Ubuntu 22.04 base image
# (check the repo for the correct Dockerfile path and build args)
docker build \
  --build-arg DISTRIB_RELEASE=22.04 \
  --build-arg CUDA_VERSION=12.8.0 \
  -t selkies-egl-desktop:ubuntu2204-poc \
  -f Dockerfile .

# This will take 20-40 minutes
# Monitor: docker build ... 2>&1 | tee build.log
```

> **Checkpoint**: If the build fails, note the exact error. Common failure points: CUDA version mismatch in Dockerfile args, KDE Plasma package not found, NVENC library missing. Each has a specific fix.

### Step 2.11 — Launch First Selkies Desktop Session

```bash
# Create user home directory on simulated NAS
sudo mkdir -p /mnt/nfs/users/testuser1
sudo chown 1000:1000 /mnt/nfs/users/testuser1

# Generate a session token
SESSION_TOKEN=$(openssl rand -hex 16)
echo "Session token: $SESSION_TOKEN"

# Launch the Selkies desktop container
docker run -d \
  --name selkies-test-1 \
  --gpus all \
  --cpus=4 \
  --memory=8g \
  --memory-swap=8g \
  -e CUDA_DEVICE_MEMORY_LIMIT_0=4096m \
  -e CUDA_DEVICE_SM_LIMIT=25 \
  -e LD_PRELOAD=/usr/lib/libvgpu.so \
  -e CUDA_MPS_PINNED_DEVICE_MEM_LIMIT="0=4G" \
  -e CUDA_MPS_ACTIVE_THREAD_PERCENTAGE=25 \
  -e SELKIES_ENCODER=nvh264enc \
  -e SELKIES_BASIC_AUTH_PASSWORD=$SESSION_TOKEN \
  -e DISPLAY_SIZEW=1920 \
  -e DISPLAY_SIZEH=1080 \
  -e DISPLAY_REFRESH=60 \
  -v /mnt/nfs/users/testuser1:/home/user \
  -v /usr/lib/libvgpu.so:/usr/lib/libvgpu.so \
  --security-opt no-new-privileges \
  --pids-limit 512 \
  -p 8080:8080 \
  selkies-egl-desktop:ubuntu2204-poc

# Wait ~15-20 seconds for startup
sleep 20
docker logs selkies-test-1 | tail -20
```

Open browser: `http://localhost:8080` — enter your session token.

**You should see:** A full KDE Plasma desktop running inside your browser, rendered by your RTX 4090.

### Step 2.12 — Multi-Container Concurrent Session Test

The production-defining test: 4 concurrent desktop sessions on one GPU:

```bash
# Launch 4 containers with different VRAM allocations (total: 4+4+8+8 = 24GB = full 4090)
declare -A CONFIGS=(
  [1]="4096m:25:8081"
  [2]="4096m:25:8082"
  [3]="8192m:35:8083"
  [4]="8192m:35:8084"
)

for i in 1 2 3 4; do
  IFS=: read VRAM SM PORT <<< "${CONFIGS[$i]}"
  TOKEN=$(openssl rand -hex 16)
  echo "Container $i token: $TOKEN (port $PORT)"
  
  docker run -d \
    --name selkies-test-$i \
    --gpus all \
    --cpus=4 --memory=8g \
    -e CUDA_DEVICE_MEMORY_LIMIT_0=$VRAM \
    -e CUDA_DEVICE_SM_LIMIT=$SM \
    -e LD_PRELOAD=/usr/lib/libvgpu.so \
    -e CUDA_MPS_PINNED_DEVICE_MEM_LIMIT="0=$(echo $VRAM | sed 's/m/M/')" \
    -e CUDA_MPS_ACTIVE_THREAD_PERCENTAGE=$SM \
    -e SELKIES_BASIC_AUTH_PASSWORD=$TOKEN \
    -v /mnt/nfs/users/testuser$i:/home/user \
    -v /usr/lib/libvgpu.so:/usr/lib/libvgpu.so \
    --security-opt no-new-privileges \
    --pids-limit 512 \
    -p $PORT:8080 \
    selkies-egl-desktop:ubuntu2204-poc
done

# Open 4 browser tabs:
# http://localhost:8081  http://localhost:8082  http://localhost:8083  http://localhost:8084
```

Run inside each session simultaneously: open a terminal → `nvidia-smi` — each should show its individual VRAM limit.

### Step 2.13 — Phase 2 Full Validation Checklist

| Component | Test | Pass Condition |
|---|---|---|
| **GPU Driver** | `nvidia-smi` on bare metal | RTX 4090, 24GB, driver 570.x |
| **CUDA** | `nvcc --version` | 12.8.x |
| **Docker GPU** | Docker container `nvidia-smi` | Same as host |
| **HAMi-core** | VRAM limit test | Container reports limited VRAM |
| **HAMi-core** | Over-allocation test | OOM error returned |
| **MPS Daemon** | `systemctl status cuda-mps` | Active/running |
| **MPS Partitioning** | 4 concurrent GPU containers | All run independently |
| **Selkies Build** | Docker image builds successfully | Image exists in `docker images` |
| **Single Selkies Session** | Browser connects to desktop | KDE Plasma appears |
| **GPU in Selkies** | `nvidia-smi` inside desktop container | Shows 4GB VRAM limit |
| **NVENC Encoding** | Selkies logs show encoder | `nvh264enc` active |
| **NFS Home Dir** | File created in session persists after container stop | File on NAS survives |
| **Session Isolation** | 4 concurrent sessions | All 4 accessible independently |
| **Container Restart** | Stop and restart container | NFS home intact |
| **Fault Injection** | Crash kernel in container 1 | Containers 2/3/4 survive |

---

## Phase 2 BONUS: Deploy Monitoring Stack

Once sessions are running, add observability:

```bash
# Prometheus + Grafana + DCGM Exporter via Docker Compose
cat > docker-compose-monitoring.yml << 'EOF'
version: '3.8'
services:
  dcgm-exporter:
    image: nvcr.io/nvidia/k8s/dcgm-exporter:latest
    runtime: nvidia
    environment:
      NVIDIA_VISIBLE_DEVICES: all
    ports:
      - "9400:9400"
    restart: always

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    restart: always

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    restart: always
EOF

docker compose -f docker-compose-monitoring.yml up -d
# Grafana: http://localhost:3000  (admin/admin)
# Add Prometheus datasource, import DCGM dashboard (ID: 12239)
```

---

## Key Differences: POC vs Production

| Aspect | This POC | Production |
|---|---|---|
| GPU | RTX 4090 (Ada, sm_89, 24GB) | RTX 5090 (Blackwell, sm_120, 32GB) |
| CUDA | sm_89 support | Needs CUDA 12.8+ for sm_120 |
| HAMi-core | Confirmed working on sm_89 | **Must verify on sm_120 — Day 1 of prod Phase 0** |
| NFS | Local loopback (POC simulation) | TrueNAS NAS over 10GbE |
| Node count | 1 node | 4-node cluster |
| Proxmox | Not used (bare Ubuntu) | Proxmox VE cluster |
| Power limits | Not critical (4090, 450W TDP) | CRITICAL — 5090 must be capped at 450W |
| NVENC limit | 12 sessions (RTX 40xx) | 12 sessions (RTX 50xx — verify) |

---

## What to Document from This POC

Keep a log of:
1. Exact HAMi-core build commands that worked
2. Exact docker run flags that produced correct VRAM limiting
3. VRAM allocation combinations that coexisted stably (your tested pricing configs)
4. MPS behavior during fault injection
5. Selkies image build args that worked on Ubuntu 22.04 + CUDA 12.8
6. NFS mount options that gave stable performance

This becomes your **runbook** for the production Phase 0.