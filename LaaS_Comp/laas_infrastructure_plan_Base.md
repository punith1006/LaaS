---
name: LaaS Infrastructure Plan
overview: Comprehensive infrastructure setup plan for the LaaS platform covering hardware preparation, Proxmox cluster configuration, dual-architecture approach (Selkies fractional GPU as primary, VM passthrough as fallback), storage (local NVMe + NAS), networking (10GbE, VLANs, remote access), GPU configuration, base image strategy, and remote desktop streaming -- with a Phase 0 burn-in decision gate to determine which GPU architecture to deploy.
todos:
  - id: procurement
    content: "Procure all additional hardware: 4x 10GbE NICs, Mikrotik switch, SFP+ cables, HDMI dongles, NAS hardware, UPS"
    status: pending
  - id: phase0-hardware
    content: "Phase 0 Week 1: BIOS config, memtest86+, Proxmox install, cluster formation, 10GbE + VLAN setup, NAS + ZFS + NFS"
    status: pending
  - id: phase0-archA
    content: "Phase 0 Week 2: Architecture A burn-in -- NVIDIA driver on host, Docker + nvidia-container-toolkit, Selkies EGL containers, HAMi-core + MPS, 48hr stress test"
    status: pending
  - id: phase0-archB
    content: "Phase 0 Week 2 (parallel): Architecture B burn-in -- vfio-pci binding, VM GPU passthrough, D3cold mitigations, 50+ VM start/stop cycles"
    status: pending
  - id: decision-gate
    content: "Phase 0 Week 3: DECISION GATE -- evaluate burn-in results, commit to Architecture A (Selkies fractional) or Architecture B (VM passthrough)"
    status: pending
  - id: phase1-nodes
    content: "Phase 1 Week 3-4: Apply chosen architecture to all 4 nodes, replicate configuration via Ansible playbooks"
    status: pending
  - id: phase1-images
    content: "Phase 1 Week 4-5: Build base VM template (Ubuntu 22.04 + all software) and/or custom Selkies Docker image"
    status: pending
  - id: phase1-storage
    content: "Phase 1 Week 5-6: NVMe partitioning (VG_STATEFUL/VG_EPHEMERAL), NAS user volume provisioning automation, NFS mount verification"
    status: pending
  - id: phase1-keycloak
    content: "Phase 1 Week 5-6: Deploy Keycloak on NAS/management LXC, configure realms and identity providers"
    status: pending
  - id: blocker-licenses
    content: "BLOCKER: Resolve MATLAB network license and audit all proprietary software licensing BEFORE building base images"
    status: pending
  - id: blocker-isp
    content: "BLOCKER: Verify ISP can provide 500Mbps+ symmetric upstream; obtain quotes from 2 ISPs for redundancy"
    status: pending
isProject: false
---

# LaaS Infrastructure Setup and Implementation Plan

---

## Part 1: Hardware Inventory and Procurement

### Existing Hardware (4 Identical Compute Nodes)

- CPU: AMD Ryzen 9 9950X3D (16C/32T, 3D V-Cache)
- Motherboard: ASUS ProArt X670E-Creator WiFi DDR5
- GPU: Zotac RTX 5090 Solid OC 32GB
- RAM: G.SKILL DDR5 Trident Z5 NEO 6000MHz 64GB (2x32GB) CL30
- Storage: Samsung 990 EVO Plus NVMe 2TB (7250 MB/s)
- PSU: Corsair AX1600i 1600W
- Cabinet: Corsair 3500X (3 ARGB fans)
- Cooler: Corsair Nautilus RS ARGB 360mm AIO

Fleet total: 64 cores, 256GB RAM, 128GB VRAM, 8TB NVMe

### Required Procurement (Before Phase 0)

**Networking:**

- 4x Intel X550-T1 10GbE PCIe NIC (~Rs 6,500 each, Rs 26,000 total) -- one per compute node
- 1x Mikrotik CRS309-1G-8S+ 10GbE SFP+ managed switch (~Rs 25,000) -- the backbone switch
- 6x SFP+ DAC cables (~Rs 800 each, Rs 5,000 total) -- 4 for compute nodes + 1 for NAS + 1 spare
- 1x TP-Link TL-SG108E 8-port 1GbE managed switch (~Rs 3,000) -- for management VLAN fallback

**GPU/Display:**

- 4x HDMI 2.1 4K dummy dongles (~Rs 700 each, Rs 2,800 total) -- required for headless GPU rendering and NVENC encoding

**NAS Hardware (5th Machine):**

- Option A (Build): Any budget ATX system + 4x4TB WD Red Plus HDDs (~Rs 40,000 for drives) + Intel X550-T1 10GbE NIC + 16GB RAM minimum
- Option B (Buy): Synology DS923+ or similar 4-bay NAS with 10GbE expansion card (~Rs 80,000-1,20,000)
- TrueNAS Scale (free) recommended over Synology for ZFS flexibility

**Power and Environment:**

- 1x 5kVA Online UPS (~Rs 40,000-80,000) -- 4 nodes at ~600-800W each + NAS + switch = ~3.5-4kW
- Dedicated cooling: mini-split AC or server room AC for the machine room (3-4kW continuous heat)
- Physical lock/access control for the server room

**Estimated total procurement: Rs 2,25,000 - 3,50,000 ($2,600 - $4,000)**

---

## Part 2: Known Hardware Constraints and Risks

### CONSTRAINT 1: RTX 5090 -- Consumer GPU Limitations

The RTX 5090 is a GeForce consumer GPU. The following enterprise GPU features are NOT available:

- No NVIDIA vGPU (requires RTX PRO 6000 / L40S / A100)
- No MIG (Multi-Instance GPU) -- only A100/H100/B200
- No SR-IOV GPU partitioning on GeForce cards
- No Hyper-V GPU-P support
- vgpu_unlock hack does NOT work on Blackwell architecture

**Impact**: GPU cannot be hardware-partitioned across VMs. All GPU sharing must be software-based (containers + CUDA MPS + HAMi-core) or all-or-nothing VM passthrough.

### CONSTRAINT 2: RTX 5090 D3cold Reset Bug (Confirmed by NVIDIA)

After a GPU-passthrough VM shuts down, the GPU can enter D3cold power state and fail to wake, causing host CPU soft lockups. Only a full machine reboot recovers.

Sources: Proxmox Forum, NVIDIA Developer Forums, Tom's Hardware, igor'sLAB

**Impact**: VM-based GPU passthrough (vfio-pci) is unreliable for production multi-tenant sequential sessions without extensive mitigation.

### CONSTRAINT 3: Ryzen 9950X3D + Proxmox Stability Reports

Multiple reports of VM instability on Zen 5 CPUs with Proxmox: VM reboots/hangs every 1.5-2 days, memory-related errors, kernel panics. ASUS ProArt X670E-Creator has reported IOMMU grouping issues.

**Mitigations**: Disable XMP/EXPO during burn-in, update BIOS + AMD microcode, pin to stable kernel (6.8.x LTS), memtest86+ for 48+ hours, ACS override patch if IOMMU groups are too large.

### CONSTRAINT 4: NVIDIA Driver Modes Are Mutually Exclusive

On each node, the GPU can be in ONE of two modes:

- **vfio-pci mode**: GPU bound to VFIO driver. ONE VM gets exclusive GPU passthrough. Host and containers CANNOT access GPU.
- **nvidia driver mode**: Host NVIDIA driver loaded. Containers share GPU. VMs CANNOT get GPU passthrough.

These modes require a reboot to switch. Runtime switching is fragile and unreliable.

---

## Part 3: The Two Architecture Options

This plan includes BOTH architectures. Phase 0 burn-in testing determines which is deployed.

### Architecture A: Selkies Fractional GPU (PRIMARY -- if burn-in succeeds)

All 4 nodes are identical. NVIDIA driver loaded on host at all times. No vfio-pci mode. No D3cold bug.

**GPU Tiers via Selkies EGL Desktop containers + HAMi-core + CUDA MPS:**

- Starter (2 vCPU, 4GB RAM, No GPU) -- KVM VM + xrdp/Guacamole
- Standard (4 vCPU, 8GB RAM, No GPU) -- KVM VM + xrdp/Guacamole
- Pro (4 vCPU, 8GB RAM, 4GB VRAM) -- Selkies EGL container + HAMi-core + MPS
- Power (8 vCPU, 16GB RAM, 8GB VRAM) -- Selkies EGL container + HAMi-core + MPS
- Max (8 vCPU, 16GB RAM, 16GB VRAM) -- Selkies EGL container + HAMi-core + MPS
- Full Machine (16 vCPU, 48GB RAM, 32GB VRAM exclusive) -- Selkies EGL container, sole GPU user on node

**Key technologies:**

- [Selkies docker-nvidia-egl-desktop](https://github.com/selkies-project/docker-nvidia-egl-desktop): Full KDE Plasma desktop in Docker, GPU-accelerated OpenGL/Vulkan via VirtualGL EGL backend, WebRTC streaming to browser via Selkies-GStreamer, NVENC hardware encoding
- [HAMi-core (libvgpu.so)](https://github.com/Project-HAMi/HAMi-core): CUDA API interception for hard VRAM limits (`CUDA_DEVICE_MEMORY_LIMIT_0`) and compute rate-limiting (`CUDA_DEVICE_SM_LIMIT`). Works on consumer GPUs.
- CUDA MPS: Per-client VRAM limits (`CUDA_MPS_PINNED_DEVICE_MEM_LIMIT`), SM partitioning (`CUDA_MPS_ACTIVE_THREAD_PERCENTAGE`), Volta+ isolated GPU virtual address spaces. Dual-layer enforcement with HAMi-core.

**Benefits:**

- Eliminates D3cold bug entirely (GPU never changes ownership)
- All 4 nodes are identical -- no static role assignment
- GPU utilization: 4-8 concurrent GPU users per node vs 1
- Original pricing table with fractional VRAM tiers becomes real
- No "VM passthrough nodes" vs "container shared nodes" split

**Isolation model for GPU sessions (container-based):**

- CPU/RAM: Hard (cgroups v2 --cpus/--memory)
- Filesystem: Hard (Docker read-only layers + overlay, user /home on NFS)
- Process: Strong (PID namespaces)
- Network: Strong (network namespaces + VLAN)
- GPU VRAM: Enforced/software (HAMi-core + MPS dual-layer)
- GPU compute: Enforced/software (HAMi-core + MPS SM partitioning)
- GPU virtual address space: Isolated (MPS Volta+ per-client)
- GPU L2 cache/DRAM bandwidth: Shared (cannot partition on consumer GPU -- noisy neighbor possible)
- GPU fatal fault: Propagates to co-resident users (MPS auto-recovers on Volta+; watchdog auto-restarts affected containers; user data safe on NAS)

### Architecture B: Conservative VM Passthrough (FALLBACK -- if burn-in fails)

Static node roles. 2 nodes in vfio-pci mode (GPU passthrough), 2 nodes in nvidia driver mode (container GPU sharing).

**Configs:**

- Starter (2 vCPU, 4GB, No GPU) -- KVM VM, any node
- Standard (4 vCPU, 8GB, No GPU) -- KVM VM, any node
- Pro/Power/Max GPU -- All get full 32GB GPU. KVM VM with vfio-pci passthrough. 1 GPU user per node at a time. Nodes 1-2.
- Full Machine -- 1 per node exclusive. Nodes 1-2 preferred.
- Ephemeral GPU -- Docker containers with CUDA MPS time-slicing on Nodes 3-4. No hard VRAM isolation.

**Drawbacks:**

- D3cold bug must be mitigated with 5-layer FLR stack
- Only 2 concurrent GPU GUI sessions fleet-wide (on passthrough nodes)
- No fractional VRAM tiers -- GPU is all-or-nothing for VMs
- Static node roles reduce scheduling flexibility

---

## Part 4: Proxmox VE Installation and Cluster Configuration

### 4.1 Pre-Installation BIOS Configuration (All 4 Nodes)

On each ASUS ProArt X670E-Creator:

- Enable AMD-Vi (IOMMU): Advanced -> AMD CBS -> NBIO -> IOMMU -> Enabled
- Enable ACS: Advanced -> AMD CBS -> NBIO -> ACS Enable -> Enabled
- Enable SVM (AMD-V): Advanced -> AMD CBS -> CPU -> SVM Mode -> Enabled
- Enable Resizable BAR / Smart Access Memory: leave enabled initially
- Disable CSM: Boot -> CSM -> Disabled (pure UEFI mode required for OVMF/Q35 VMs)
- RAM: Start at JEDEC defaults (no XMP/EXPO) for stability testing during Phase 0
- Enable EXPO/XMP only after 48+ hours of stable operation

### 4.2 Proxmox VE Installation

Install Proxmox VE 8.x (latest stable) on each node:

- Install target: `nvme0n1p1` (128GB partition, details in Part 6)
- Use the Proxmox ISO installer, UEFI boot
- Set static IP on management interface (onboard 2.5GbE)
- Hostname pattern: `pve-node-{1,2,3,4}.laas.internal`
- DNS: internal DNS server or `/etc/hosts` entries for all nodes

### 4.3 Post-Installation (Each Node)

```
# Add no-subscription repo
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list

# Disable enterprise repo (unless licensed)
# Comment out the line in /etc/apt/sources.list.d/pve-enterprise.list

apt update && apt full-upgrade -y

# Install essential tools
apt install -y lm-sensors htop iotop nvme-cli smartmontools pve-headers

# Update AMD microcode
apt install -y amd64-microcode
```

### 4.4 Kernel Parameters (All Nodes)

Edit `/etc/kernel/cmdline`:

**For Architecture A (Selkies -- primary):**

```
root=ZFS=rpool/ROOT/pve-1 boot=zfs amd_iommu=on iommu=pt
```

No vfio-pci binding. NVIDIA driver loads on host.

**For Architecture B (VM passthrough nodes 1-2):**

```
root=ZFS=rpool/ROOT/pve-1 boot=zfs amd_iommu=on iommu=pt vfio-pci.ids=10de:2b85,10de:22e8 disable_idle_d3=1
```

After editing: `proxmox-boot-tool refresh` then reboot.

### 4.5 Proxmox Cluster Formation

```
# On Node 1 (first node):
pvecm create laas-cluster

# On Nodes 2, 3, 4 (join cluster):
pvecm add <node-1-ip>

# If using NAS as QDevice (for 4-node quorum stability):
apt install corosync-qdevice  # on all nodes
# Set up QDevice on NAS (requires corosync-qnetd package)
pvecm qdevice setup <nas-ip>
```

### 4.6 IOMMU Grouping Validation

```
# Check IOMMU groups on each node:
for d in /sys/kernel/iommu_groups/*/devices/*; do
  n=${d#*/iommu_groups/*}; n=${n%%/*}
  printf "Group %s: %s\n" "$n" "$(lspci -nns ${d##*/})"
done
```

RTX 5090 (GPU + audio device) should ideally be in its own IOMMU group. If grouped with other devices, apply ACS override:

```
# Add to kernel cmdline (ONLY if needed):
pcie_acs_override=downstream
# DO NOT use pcie_acs_override=multifunction (security risk)
```

---

## Part 5: GPU Configuration

### 5.1 Architecture A: NVIDIA Driver on Host (Selkies Mode)

**Install NVIDIA driver on Proxmox host:**

```
# Blacklist nouveau
echo "blacklist nouveau" > /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf
update-initramfs -u

# Install NVIDIA driver (use NVIDIA's .run installer or Proxmox packages)
# Check https://www.nvidia.com/Download/index.aspx for latest production driver
# Requires pve-headers package installed
chmod +x NVIDIA-Linux-x86_64-*.run
./NVIDIA-Linux-x86_64-*.run --dkms

# Verify
nvidia-smi
```

**Install NVIDIA Container Toolkit:**

```
# Add NVIDIA container toolkit repo
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt update
apt install -y nvidia-container-toolkit

# Configure Docker runtime
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
```

**Install Docker CE:**

```
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**Start CUDA MPS Daemon (systemd service):**

Create `/etc/systemd/system/cuda-mps.service`:

```
[Unit]
Description=CUDA MPS Control Daemon
After=nvidia-persistenced.service

[Service]
Type=forking
ExecStartPre=/usr/bin/nvidia-smi -pm 1
ExecStart=/usr/bin/nvidia-cuda-mps-control -d
ExecStop=/bin/bash -c "echo quit | /usr/bin/nvidia-cuda-mps-control"
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```
systemctl enable --now cuda-mps
```

**Build HAMi-core (libvgpu.so):**

```
git clone https://github.com/Project-HAMi/HAMi-core.git
cd HAMi-core
mkdir build && cd build
cmake ..
make -j$(nproc)
# Output: libvgpu.so -- copy to /usr/lib/libvgpu.so on all nodes
```

**NVENC Concurrent Session Limit:**
Consumer GPUs limit NVENC to 5 concurrent encode sessions. For 4+ concurrent Selkies desktop streams, apply the `nvidia-patch`:

```
git clone https://github.com/keylase/nvidia-patch.git
cd nvidia-patch
bash patch.sh
# This removes the NVENC session limit from the driver
```

### 5.2 Architecture B: VFIO-PCI Mode (VM Passthrough Nodes)

Only applied to Nodes 1-2 if Architecture B is selected.

```
# /etc/modprobe.d/vfio.conf
options vfio-pci ids=10de:2b85,10de:22e8 disable_vga=1 disable_idle_d3=1

# /etc/modprobe.d/blacklist-nvidia.conf
blacklist nouveau
blacklist nvidia
blacklist nvidia_drm
blacklist nvidia_modeset

# /etc/udev/rules.d/99-vfio-gpu-pm.rules
ACTION=="add", SUBSYSTEM=="pci", ATTR{vendor}=="0x10de", ATTR{device}=="0x2b85", \
  ATTR{power/control}="on", ATTR{d3cold_allowed}="0"
ACTION=="add", SUBSYSTEM=="pci", ATTR{vendor}=="0x10de", ATTR{device}=="0x22e8", \
  ATTR{power/control}="on", ATTR{d3cold_allowed}="0"

update-initramfs -u && reboot
```

**GPU Hookscript for VM lifecycle** (pre-start validation, post-stop health check):

Create `/var/lib/vz/snippets/gpu-hookscript.pl`:

- Pre-start: verify GPU responds to `lspci` and is in D0 state
- Post-stop: check GPU health via PCI config space read, alert if unresponsive, attempt PCI rescan

### 5.3 GPU Health Monitoring (Both Architectures)

**NVIDIA DCGM Exporter** (Docker container for Prometheus scraping):

```
docker run -d --gpus all --restart always \
  -p 9400:9400 \
  --name dcgm-exporter \
  nvcr.io/nvidia/k8s/dcgm-exporter:latest
```

**GPU Watchdog Service** (systemd timer, runs every 2 minutes):

- Check `nvidia-smi` responsiveness (5-second timeout)
- Check GPU temperature (warning at 80C, emergency at 90C)
- Check for ECC errors (via DCGM)
- On failure: alert admin (Telegram/email), log incident, trigger recovery

**Dummy HDMI Dongle**: Plug one 4K HDMI 2.1 dummy dongle into each RTX 5090. Required for:

- Headless GPU rendering (VirtualGL EGL backend in Selkies)
- NVENC encoding of desktop streams
- GPU-accelerated OpenGL applications

---

## Part 6: Storage Architecture

### 6.1 Per-Node NVMe Partitioning (2TB Samsung 990 EVO Plus)

```
# Partition layout (GPT):
nvme0n1p1   128GB   EXT4    -> Proxmox OS + swap (8GB swap)
nvme0n1p2   900GB   LVM PV  -> VG_STATEFUL
nvme0n1p3   760GB   LVM PV  -> VG_EPHEMERAL
nvme0n1p4   212GB   EXT4    -> /shared (read-only datasets, software caches)
```

**Partitioning commands** (run during Proxmox install or post-install):

```
# If Proxmox installer used ZFS on full disk, re-partition post-install:
# Or use Proxmox installer's "advanced" disk option to partition manually

# Create LVM volume groups:
pvcreate /dev/nvme0n1p2
vgcreate VG_STATEFUL /dev/nvme0n1p2

pvcreate /dev/nvme0n1p3
vgcreate VG_EPHEMERAL /dev/nvme0n1p3

# Create thin pools:
lvcreate -L 850G --thinpool tp_stateful VG_STATEFUL
lvcreate -L 720G --thinpool tp_ephemeral VG_EPHEMERAL
```

**VG_STATEFUL contains:**

- `lv_base_linux` (~60GB): Ubuntu 22.04 LTS base VM template (read-only)
- Active thin clone deltas: ~20GB per active session
- With thin pool, 850GB supports ~40 concurrent session deltas comfortably

**VG_EPHEMERAL contains:**

- Docker images and container layers for Selkies and ephemeral containers
- Container scratch/tmp volumes (auto-wiped on session end)

**Hard isolation**: VG_STATEFUL and VG_EPHEMERAL are on separate NVMe partitions. Even if VG_EPHEMERAL is corrupted or fills completely, VG_STATEFUL is untouched -- separate LVM Physical Volumes on non-overlapping partition extents.

**LVM thin pool monitoring**: Alert at 80% utilization. At 100%, ALL VMs/containers on that pool pause. Auto-cleanup of orphaned clones must be built into the orchestrator.

### 6.2 Centralized NAS

**Hardware**: 5th machine running TrueNAS Scale (Debian-based, ZFS native).

**ZFS Pool Setup:**

```
# 4x4TB HDDs in RAIDZ1 (~12TB usable):
zpool create -f -o ashift=12 datapool raidz1 /dev/sda /dev/sdb /dev/sdc /dev/sdd

# Create user volume parent dataset:
zfs create datapool/users

# Per-user provisioning (automated by orchestrator):
zfs create -o quota=15G datapool/users/<uid>
```

**NFS Export Configuration** (`/etc/exports` on TrueNAS or via TrueNAS GUI):

```
/mnt/datapool/users  10.10.40.0/24(rw,sync,no_subtree_check,no_root_squash,crossmnt)
```

**NFS Mount on Each Compute Node** (`/etc/fstab`):

```
nas.laas.internal:/mnt/datapool/users  /mnt/nfs/users  nfs4  rw,hard,intr,nfsvers=4.2,rsize=1048576,wsize=1048576,nconnect=4,async  0  0
```

Key: `nconnect=4` multiplexes NFS connections over 10GbE for higher throughput.

**ZFS Snapshots (Automated Backup):**

```
# Auto-snapshot every 6 hours, retain 7 daily + 4 weekly:
zfs set com.sun:auto-snapshot=true datapool/users
# Configure zfs-auto-snapshot package on TrueNAS
```

Users can access `.zfs/snapshot/` within their mounted home directory for self-service file recovery.

**NAS Networking**: Intel X550-T1 10GbE NIC connected to Mikrotik switch on VLAN 40 (Storage).

### 6.3 Base Image Strategy

**One base image for now** (Linux only, per user's latest requirement):

- `base-linux-ubuntu2204` (~60GB qcow2/raw)
- Contents: Ubuntu 22.04 LTS + XFCE desktop + MATLAB + Python (Anaconda) + CUDA toolkit 12.x + Blender + development tools (gcc, git, vim, VS Code) + xrdp + qemu-guest-agent

**Base image creation process:**

1. Create a full KVM VM in Proxmox with 60GB disk
2. Install Ubuntu 22.04 LTS, install all software, configure desktop
3. Install xrdp (for CPU-only VM access via Guacamole)
4. Install qemu-guest-agent (for lifecycle management from host)
5. Shut down cleanly
6. Convert to template in Proxmox: `qm template <vmid>`
7. Replicate template to all 4 nodes via Proxmox Storage Replication or manual copy

**For Architecture A (Selkies)**: Additionally build a custom Docker image based on `selkies-project/docker-nvidia-egl-desktop`:

```
FROM ghcr.io/selkies-project/nvidia-egl-desktop:latest
# Install MATLAB, Blender, CUDA toolkit, Python, dev tools
# Install HAMi-core libvgpu.so
# Configure KDE Plasma desktop
```

**Template updates (zero-downtime):**

1. Clone current template as `base-linux-v2`
2. Boot v2, apply updates, shut down, re-template
3. New sessions use v2. Existing sessions continue on v1.
4. Once all v1 sessions end naturally, delete v1.

---

## Part 7: Networking Architecture

### 7.1 Physical Network Topology

```
                    Internet
                       |
                 [ISP Router/Firewall]
                       |
              [TP-Link 1GbE Switch]  (Management VLAN 10)
              /    |    |    |    \
         Node1  Node2  Node3  Node4  NAS  (onboard 2.5GbE)
              \    |    |    |    /
              [Mikrotik CRS309-1G-8S+]  (10GbE SFP+ Switch)
              /    |    |    |    \
         Node1  Node2  Node3  Node4  NAS  (Intel X550-T1 10GbE)
```

Each compute node has TWO network interfaces:

- **Onboard 2.5GbE**: Management VLAN 10 only (Proxmox UI, SSH, admin)
- **Intel X550-T1 10GbE**: All production traffic (VM/container networking, NFS storage, remote desktop streaming)

### 7.2 VLAN Layout

- **VLAN 10 (Management)**: Proxmox Web UI, SSH, node-to-node cluster comms. Subnet: `10.10.10.0/24`. On onboard 2.5GbE.
- **VLAN 20 (VM Traffic)**: Stateful VM network (RDP/Selkies streams, internet access for VMs). Subnet: `10.10.20.0/24`. On 10GbE.
- **VLAN 30 (Container Traffic)**: Ephemeral container traffic (Jupyter, Code-Server, Selkies GPU containers). Subnet: `10.10.30.0/24`. On 10GbE.
- **VLAN 40 (Storage)**: NFS traffic between nodes and NAS. Subnet: `10.10.40.0/24`. On 10GbE. Isolated -- no internet access.
- **VLAN 50 (Services)**: Platform services (web portal, Keycloak, Guacamole, reverse proxy). Subnet: `10.10.50.0/24`. On 10GbE.

### 7.3 Proxmox Network Configuration (Per Node)

```
# /etc/network/interfaces (example for Node 1)

# Management (onboard 2.5GbE)
auto eno1
iface eno1 inet static
    address 10.10.10.11/24
    gateway 10.10.10.1

# 10GbE NIC -- trunk port (VLAN-aware bridge)
auto enp5s0
iface enp5s0 inet manual

auto vmbr0
iface vmbr0 inet manual
    bridge-ports enp5s0
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 20 30 40 50

# VLAN interfaces on the bridge
auto vmbr0.40
iface vmbr0.40 inet static
    address 10.10.40.11/24
```

### 7.4 Mikrotik Switch Configuration

Configure bridge VLAN filtering with tagged trunk ports to each node. The switch must support IEEE 802.1Q VLAN tagging. Each port connected to a compute node is a trunk port carrying VLANs 20, 30, 40, 50.

### 7.5 External Access

**Cloudflare Tunnel** (primary -- for browser-based access):

- Run `cloudflared` daemon on a management LXC or NAS
- Routes `lab.youragency.in` to internal reverse proxy
- Zero open inbound ports on firewall
- Built-in DDoS protection
- WebSocket support (required for Guacamole and Selkies WebRTC)
- Cloudflare Access policies for additional auth layer

**Tailscale** (secondary -- for SSH/Moonlight power users):

- Install Tailscale on a management LXC as subnet router
- Advertise internal subnets (`10.10.20.0/24`, `10.10.30.0/24`) to authorized users
- Works through university firewalls via DERP relay
- For direct SSH access and Sunshine/Moonlight ultra-low-latency streaming

**Reverse Proxy** (Traefik or Caddy on management LXC):

- TLS termination (Cloudflare origin certificates)
- Path-based routing to: Guacamole, Selkies signaling, JupyterHub, Code-Server, web portal, Keycloak
- WebSocket passthrough (critical for remote desktop protocols)

### 7.6 Bandwidth Requirements

- **Upstream internet**: Minimum 500Mbps symmetric for 20+ concurrent remote desktop streams
- Indian business internet at this tier: Rs 30,000-80,000/month depending on location
- **Dual ISP recommended**: Single ISP failure = platform offline. DNS or BGP failover.
- **Internal 10GbE**: NFS with nconnect=4 achieves 3-4 Gbps throughput -- sufficient for 20+ concurrent user home directories

---

## Part 8: Remote Desktop and Streaming Stack

### 8.1 Protocol Matrix


| Session Type                              | Streaming Protocol             | Technology                                          | Client Requirement |
| ----------------------------------------- | ------------------------------ | --------------------------------------------------- | ------------------ |
| CPU-only GUI VM (Starter/Standard)        | RDP via Guacamole              | xrdp inside VM + Apache Guacamole gateway           | Browser only       |
| GPU GUI session (Pro/Power/Max) -- Arch A | WebRTC via Selkies             | Selkies-GStreamer + VirtualGL EGL + NVENC           | Browser only       |
| GPU GUI session (Pro/Power/Max) -- Arch B | WebRTC via Selkies or Sunshine | Selkies in VM, or Sunshine in VM + Moonlight client | Browser or client  |
| Full Machine (exclusive)                  | Sunshine + Moonlight preferred | NVFBC capture, NVENC encode, ultra-low latency      | Moonlight client   |
| Ephemeral Jupyter                         | Direct HTTP                    | JupyterHub reverse-proxied                          | Browser only       |
| Ephemeral Code-Server                     | Direct HTTP                    | Code-Server reverse-proxied                         | Browser only       |
| Ephemeral SSH                             | SSH via Guacamole              | Guacamole SSH gateway                               | Browser only       |


### 8.2 Apache Guacamole Deployment

Deploy as Docker Compose on management LXC or NAS:

- `guacamole/guacd` (connection proxy daemon)
- `guacamole/guacamole` (web application)
- PostgreSQL backend for connection records

Integrates with Keycloak via OIDC for SSO. Supports session recording (`.guac` files) for academic integrity and dispute resolution.

### 8.3 Selkies-GStreamer (Architecture A)

Runs inside each GPU container. Key configuration:

- Encoder: `nvh264enc` (NVENC hardware encoding)
- Resolution: 1080p default, configurable up to 4K
- Frame rate: 60fps target
- Bitrate: adaptive based on network quality
- Authentication: per-session token generated by orchestrator

### 8.4 TURN Server for WebRTC

Deploy coturn TURN server on NAS or management LXC:

- Required for WebRTC NAT traversal when users are behind university firewalls
- TLS-encrypted TURN relay
- Bandwidth: allocate 50Mbps for TURN relay traffic

---

## Part 9: Phase 0 Burn-In Protocol (Weeks 1-3)

This is the DECISION GATE that determines which architecture is deployed.

### 9.1 Hardware Validation (Week 1)

- Assemble all 4 machines, connect power and networking
- BIOS configuration on all 4 nodes (per Part 4.1)
- memtest86+ on each node: 48+ hours minimum
- Install Proxmox VE on each node
- Form Proxmox cluster
- Install 10GbE NICs, connect to Mikrotik switch
- Configure VLANs on switch
- Verify 10GbE link speed (`ethtool enp5s0`)
- Set up NAS, create ZFS pool, configure NFS exports
- Verify NFS mount from all nodes, benchmark I/O (`fio` over NFS)

### 9.2 Architecture A Testing: Selkies Fractional GPU (Week 2)

- Install NVIDIA driver on host on Node 1
- Verify `nvidia-smi` shows RTX 5090 correctly
- Install Docker + nvidia-container-toolkit
- Start CUDA MPS daemon
- Build custom Selkies EGL Desktop Docker image (Ubuntu 22.04 + basic software)
- Launch 1 Selkies container, verify GPU-accelerated desktop in browser
- Launch 2 concurrent containers, verify both have GPU acceleration
- Launch 4 concurrent containers (target: 4x 8GB VRAM each = 32GB total)
- Integrate HAMi-core: verify `nvidia-smi` inside container shows limited VRAM (e.g., 8GB)
- Run MATLAB/Blender GPU workloads in each container under VRAM limits
- Verify NVENC encoding works for 4 concurrent desktop streams (apply nvidia-patch if needed)
- 48-hour stress test: 4 containers with fractional VRAM, continuous GPU workloads
- Fault injection: trigger GPU fault in one container (bad CUDA kernel), verify MPS auto-recovers, other containers unaffected

### 9.3 Architecture B Testing: VM GPU Passthrough (Week 2, Parallel)

- On Node 2: bind GPU to vfio-pci, apply D3cold mitigations
- Create a KVM VM with GPU passthrough (OVMF + Q35 + vfio-pci)
- Boot VM, verify GPU visible inside VM via `nvidia-smi`
- Test remote desktop (Selkies or Sunshine) inside VM
- Graceful shutdown: verify GPU releases cleanly
- Run 50+ VM start/stop cycles over 48 hours
- Track: how many cycles cause GPU lockup requiring host reboot?
- Test GPU watchdog: detect unresponsive GPU, alert, attempt recovery

### 9.4 Decision Gate (End of Week 3)

**If Architecture A burn-in succeeds** (4 concurrent Selkies containers stable for 48+ hours, HAMi-core VRAM limits working, MPS fault recovery demonstrated):

- Deploy Architecture A on all 4 nodes
- Original fractional GPU pricing table is valid
- Proceed with Selkies-based compute configs

**If Architecture A fails** (containers crash, VRAM limits unreliable, VirtualGL rendering broken):

- Deploy Architecture B (static node roles)
- GPU configs are all-or-nothing (full 32GB per user)
- Fractional GPU tiers removed from pricing
- Accept lower GPU concurrency (2 GPU sessions fleet-wide instead of 16+)

**If BOTH fail** (GPU passthrough also unstable due to D3cold):

- Consider purchasing 1-2 enterprise GPUs (NVIDIA L4 or T4) for reliable vGPU
- Or pivot to container-only GPU sharing without desktop streaming

---

## Part 10: Critical Considerations

### 10.1 Software Licensing

**MUST resolve before building base images:**

- MATLAB: Requires network license (Concurrent or Campus-Wide) for shared hosting. Per-seat license is NOT valid for multi-user VM deployment. Contact MathWorks or the university's license coordinator.
- AutoCAD: Autodesk subscription licensing. Multi-user server license needed.
- Blender: Free and open-source. No licensing concerns.
- CUDA Toolkit: Free. No licensing concerns.
- Other proprietary software: Verify ISV hosting agreements for each.

### 10.2 Physical Environment

- 4 machines at ~~600-800W each + NAS (~~200W) + switch (~30W) = ~3.5-4kW continuous
- Requires dedicated cooling (mini-split AC or server room AC)
- 5kVA online UPS minimum for graceful shutdown time (~10-15 minutes)
- Locked, access-controlled room
- Fire suppression considerations

### 10.3 Internet Connectivity

- Minimum 500Mbps symmetric upstream for 20+ concurrent remote desktop streams
- Verify ISP can provide this at the deployment location
- Obtain quotes from 2 ISPs for redundancy
- Budget: Rs 30,000-80,000/month for business-grade symmetric fiber

### 10.4 Data Protection

- India's Digital Personal Data Protection Act (DPDPA) 2023 applies to user data
- Ensure consent, data minimization, and breach notification procedures
- ZFS snapshots provide data recovery capability
- No user data should be stored unencrypted at rest (consider LUKS on NAS)

### 10.5 Thermal Management

- RTX 5090 is a consumer card, not rated for 24/7 datacenter operation
- Active temperature monitoring via DCGM Exporter
- Warning alerts at 80C, emergency throttling/shutdown at 90C
- Ensure cabinet airflow is adequate (3 ARGB fans in Corsair 3500X may need supplementation)
- Consider replacing case fans with Noctua industrial fans for sustained operation

### 10.6 Anti-Abuse

- GPU utilization pattern monitoring for crypto mining detection
- Block outbound connections to known mining pools via iptables/nftables
- Rate-limit network egress per VM/container
- Kill sessions exhibiting mining signatures (sustained >95% GPU utilization with no legitimate CUDA context)

### 10.7 Session Idle Management

- 30 minutes no keyboard/mouse input -> warning notification
- 45 minutes idle -> session suspended (resources held, user can resume)
- 60 minutes idle -> session terminated, resources freed
- Exception: active GPU/CPU workload above threshold -> never considered idle
- QEMU guest agent heartbeat every 60 seconds for VM health monitoring

### 10.8 Scaling Beyond 4 Nodes

The architecture naturally supports adding nodes:

- New node joins Proxmox cluster
- Replicate base images to new node
- NAS already serves any node via NFS
- Orchestrator discovers new node capacity automatically
- No redesign needed

---

## Part 11: Implementation Timeline Summary


| Phase                           | Duration    | Focus                                                                                                                      |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Phase 0: Burn-in                | Weeks 1-3   | Hardware assembly, Proxmox install, GPU burn-in testing (both architectures), NAS setup, networking, DECISION GATE         |
| Phase 1: Core Infrastructure    | Weeks 3-6   | Apply chosen architecture to all nodes, build base VM/container images, NFS user storage provisioning, Keycloak deployment |
| Phase 2: Orchestration          | Weeks 6-10  | FastAPI orchestrator, Guacamole/Selkies integration, Cloudflare Tunnel, booking system, ephemeral container lifecycle      |
| Phase 3: Web Portal             | Weeks 10-14 | Next.js frontend, Keycloak auth integration, admin panel, user registration flow                                           |
| Phase 4: Billing and Monitoring | Weeks 14-18 | Razorpay billing, Prometheus + Grafana + DCGM, audit logging, session warnings, anti-abuse                                 |
| Phase 5: Beta                   | Weeks 18-22 | 10-20 beta users, load testing, security audit, documentation                                                              |
| Phase 6: Launch                 | Week 22+    | Production launch, gradual university rollout, public user access                                                          |


Note: Only Phase 0 and Phase 1 are infrastructure-focused. Phases 2-6 are backend/frontend/operations and will be planned separately as requested.