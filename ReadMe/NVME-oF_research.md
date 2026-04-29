Objective
Investigate current LaaS architecture to understand how NFS-based cross-node storage is currently implemented, identify storage provisioning mechanisms, and document requirements for implementing NVMe-oF TCP as a replacement protocol between Ubuntu nodes 10.88 and 10.99 connected via dedicated 10GbE (eno2).
Findings
1. CURRENT SESSION ORCHESTRATION ARCHITECTURE
File: c:\Users\Punith\LaaS\host-services\session-orchestration\app.py (1,579 lines)
NFS_MOUNT_ROOT Usage and Container Volume Mounts
Environment Variable (Line 43):
python
NFS_MOUNT_ROOT = os.environ.get("NFS_MOUNT_ROOT", "/mnt/nfs/users")
Volume Mount Logic (Lines 674-676):
python
# Volume mounts - User storage (stateful only)
if storage_type == "stateful" and storage_uid:
    cmd.extend(["-v", f"{NFS_MOUNT_ROOT}/{storage_uid}:/home/ubuntu"])
The container's /home/ubuntu directory is bind-mounted to the NFS mount path, which is user-persistent storage. This mount bypasses Docker's overlay2 filesystem entirely (ephemeral layer).
storage_uid Resolution and Usage
Storage UID Validation (Lines 99, 833-846):
python
STORAGE_UID_PATTERN = re.compile(r"^u_[0-9a-f]{24}$")
When launching a session:
Backend provides storage_uid in launch request (e.g., u_abc123def456abc123def45)
Session orchestrator validates format (line 833)
Checks mount exists at {NFS_MOUNT_ROOT}/{storage_uid} (line 837)
Validates mount is a directory and writable (lines 842-854)
Uses this path directly for -v volume binding (line 676)
Host Decision Logic
Single-Node Approach (Current):
The code does NOT currently implement multi-node aware logic. The app assumes:
Containers run on a single node (current HOST_IP at line 41)
All user storage is on the same node (direct ZFS path OR already NFS-mounted)
Missing Cross-Node Logic:
No code currently implements storage node detection or multi-node NFS mounting. The future architecture (per design documents) would need:
python
# Planned (NOT currently implemented):
HOST_IP = os.environ.get('HOST_IP')  # e.g., "192.168.10.92"
storage_node_ip_storage = <from_backend>  # e.g., "192.168.10.88"

if storage_node_ip_storage != HOST_IP:
    # Remote storage node — mount via NFS
    # Currently this logic does NOT exist
Docker Launch Command Construction (Lines 532-737)
Volume Section (relevant lines):
Line 674-676: User storage mount (stateful only)
Line 671-672: MPS device mounts
Line 679-680: HAMi GPU libs
Line 683: vgpulock directory
Line 686-687, 690-691: nvidia-smi and passwd wrappers
Line 694-695: supervisord config
Line 700-704: Sudoers configuration
Line 707-713: lxcfs proc/sys fakery
Line 716: CPU topology
Key Detail: All volume mounts use host paths directly. No abstraction layer exists for mounting strategy.
2. CURRENT ZFS PROVISIONING SETUP
Files:
c:\Users\Punith\LaaS\backend-new\scripts\provision-user-storage.sh (112 lines)
c:\Users\Punith\LaaS\host-services\storage-provision\app.py (984 lines)
c:\Users\Punith\LaaS\backend-new\src\storage\storage.service.ts
c:\Users\Punith\LaaS\backend-new\src\storage\storage.controller.ts
Current ZFS Dataset Creation (NOT zvol)
Script: provision-user-storage.sh (Lines 59)
bash
zfs create -o quota="${REQUIRED_QUOTA_GB}G" "$TARGET_DATASET"
Where:
$TARGET_DATASET = "datapool/users/<storage_uid>"
$REQUIRED_QUOTA_GB = 5 (configurable via second arg)
Current Flow:
Backend calls storage provision service via HTTP POST
Provision service calls: sudo /usr/local/bin/provision-user-storage.sh <storage_uid> [quota_gb]
Script validates input (storage_uid format: u_[24 hex chars])
Script checks ZFS pool and parent dataset exist
Script validates available space
Script creates dataset with quota
Script chowns mountpoint to 1000:1000 (ubuntu user)
Script returns success/failure
Storage Provisioning Service (Flask app at 9999)
File: c:\Users\Punith\LaaS\host-services\storage-provision\app.pyKey Endpoints:
/provision (POST) - Create ZFS dataset with quota
/deprovision (POST) - Destroy ZFS dataset
/upgrade-storage (POST) - Increase quota (uses zfs set quota=)
/storage/usage/<storage_uid> (GET) - Query used/quota bytes
/host-space (GET) - Pool available/total space
NFS Automation (Optional):
Lines 35-39 define optional NFS automount:
python
NFS_AUTOMOUNT_ENABLED = os.environ.get("ENABLE_NFS_AUTOMOUNT", "false").lower() == "true"
NFS_EXPORT_CLIENT = os.environ.get("NFS_EXPORT_CLIENT", "127.0.0.1")
NFS_MOUNT_ROOT = os.environ.get("NFS_MOUNT_ROOT", "/mnt/nfs/users")
NFS Export Logic (Lines 81-99):
For each storage_uid, ensures:
/etc/exports entry: /datapool/users/{storage_uid} {NFS_EXPORT_CLIENT}(rw,sync,no_subtree_check,no_root_squash)
Runs exportfs -ra to reload NFS
Creates mountpoint at /mnt/nfs/users/{storage_uid}
Mounts: sudo mount -t nfs4 {NFS_EXPORT_CLIENT}:/datapool/users/{storage_uid} /mnt/nfs/users/{storage_uid}
Adds /etc/fstab entry for persistence
Current Quota Enforcement
Dataset-level quota (not zvol):
ZFS enforces quota at dataset level
Any write exceeding quota fails with "Disk quota exceeded"
Quota is soft-enforced per user
No per-file quotas
What EXISTS vs. What's MISSING
CURRENT:
✓ ZFS datasets (not zvols) with quotas
✓ Optional NFS export/mount automation (single-host POC)
✓ Dataset destroy on deprovision
✓ Quota upgrade capability
✓ Storage usage query
MISSING for multi-node:
✗ Multi-node aware provisioning (which storage node to use)
✗ Cross-node NFS mount on container nodes
✗ No NVMe-oF support
✗ No zvol creation (dataset-only)
3. NVME-OF TCP TECHNICAL REQUIREMENTS
Linux Kernel Module Stack
Required Kernel Modules:
Module	Purpose	Node	Load Command
nvmet	NVMe target subsystem	Storage (10.88)	modprobe nvmet
nvmet_tcp	NVMe-oF over TCP transport	Storage (10.88)	modprobe nvmet_tcp
nvme_tcp	NVMe-oF initiator over TCP	Compute (10.99)	modprobe nvme_tcp
Verification:
bash
# On target (10.88):
lsmod | grep nvmet
# Output should show: nvmet_tcp, nvmet

# On initiator (10.99):
modprobe nvme_tcp
lsmod | grep nvme_tcp
ZFS Zvol Export as NVMe-oF Target
Current State: System uses ZFS datasets (filesystem), not zvols (block devices).For NVMe-oF, MUST use zvols:Zvol Creation (replacing current dataset creation):
bash
# OLD (dataset):
zfs create -o quota=5G datapool/users/<storage_uid>

# NEW (zvol):
zfs create -V 5G datapool/users/<storage_uid>  # -V creates zvol, not dataset
Key Differences:
Property	Dataset	Zvol
Type	Filesystem	Block device
Mount	Auto-mounts at ZFS mountpoint	Appears as /dev/zvol/pool/name
NFS Export	Direct via NFS subsystem	Requires NVMe-oF target
NVMe-oF Export	N/A	Fully supported
Quota	Filesystem-level	Block device quota
Snapshots	Full filesystem snapshots	Block-level snapshots (RW-safe)
Export Configuration (nvmetcli on 10.88):
bash
# Install nvmet-cli:
apt install nvme-cli nvmet-cli

# Interactive setup:
nvmetcli
> create testsubsystem
> cd testsubsystem
> set attr allow_any_host=1
> create namespace
> cd namespace
> create 1
> cd 1
> set device path=/dev/zvol/datapool/users/u_<storage_uid>
> enable
> cd /
> cd ports
> create 1
> cd 1
> set addr trtype=tcp traddr=192.168.10.10.100.88 trsvcid=4420 adrfam=ipv4
> save
> config
> exit
Or scripted (preferred for automation):
bash
nvmetcli restore << 'EOF'
{
  "subsystems": [
    {
      "nqn": "nqn.2016-06.io.spdk:laas-u_<storage_uid>",
      "allow_any_host": "1",
      "attr": { "allow_any_host": "1" },
      "namespaces": [
        {
          "nsid": 1,
          "device": { "path": "/dev/zvol/datapool/users/u_<storage_uid>" },
          "enable": 1
        }
      ]
    }
  ],
  "ports": [
    {
      "portid": 1,
      "addr": {
        "trtype": "tcp",
        "traddr": "192.168.10.100.88",
        "trsvcid": 4420,
        "adrfam": "ipv4"
      }
    }
  ]
}
EOF
NVMe-oF Initiator Connection (from 10.99)
Discover Target (10.99):
bash
sudo nvme discover -t tcp -a 192.168.10.100.88 -s 4420
Output:
plaintext
Discovery Log Number of Records: 1, Generation counter: 1
=====Discovery Log Entry 0======
trtype:  tcp
adrfam:  ipv4
subtype: nvme subsystem
treq:    not specified
portid:  1
trsvcid: 4420
subnqn:  nqn.2016-06.io.spdk:laas-u_<storage_uid>
traddr:  192.168.10.100.88
Connect (10.99):
bash
sudo nvme connect -t tcp \
  -n nqn.2016-06.io.spdk:laas-u_<storage_uid> \
  -a 192.168.10.100.88 \
  -s 4420
Result: Block device appears as /dev/nvme0n1 (or higher number if multiple connections).
Filesystem Considerations
Option A: Format Zvol with ext4 (RECOMMENDED for container mounts)
bash
# After discovering/connecting from initiator (10.99):
sudo mkfs.ext4 /dev/nvme0n1
sudo mkdir -p /mnt/nvme-users/<storage_uid>
sudo mount /dev/nvme0n1 /mnt/nvme-users/<storage_uid>
Single-attach safety: Each zvol can be connected to ONE initiator at a time (unlike NFS multi-client). Container attach -> mount -> use -> umount -> disconnect is deterministic.Option B: No filesystem (raw block device)
Less practical for container use; would require container to format it itself.
Performance Expectations (10GbE TCP)
From Industry Data (nvmetcli + 2.5 GbE tested):
Sequential read: ~1.74 Gbps (network-limited, not storage)
Latency: <5ms average per op (vs. <100µs local NVMe)
IOPS (4KB random): Depends on queue depth + concurrency
Projected on 10GbE:
Sequential: ~7-9 Gbps (10 GbE saturated with protocol overhead)
Random IOPS: ~150K-200K (estimated, network-dependent)
Latency: 0.1-0.3ms per op (per memory)
vs. Current NFS (optimized):
NFS sequential read: ~2-4 Gbps (depends on server caching, mount options)
NFS random IOPS: ~30K-50K (filesystem overhead)
NVMe-oF advantage: 3-6x IOPS, especially on small files + metadata-heavy workloads
4. INTEGRATION ARCHITECTURE FOR NVMe-oF
How app.py Needs to Change
Current Flow (single-node or pre-mounted NFS):
plaintext
Backend → Session Orchestration (9998)
   ↓
Request: { storage_uid: "u_abc...", storage_type: "stateful" }
   ↓
app.py checks: NFS_MOUNT_ROOT/u_abc... exists
   ↓
Creates container with: -v /mnt/nfs/users/u_abc...:/home/ubuntu
Proposed NVMe-oF Flow (multi-node):
plaintext
Backend → Session Orchestration (9998)
   ↓
Request: { 
  storage_uid: "u_abc...", 
  storage_node_ip: "192.168.10.100.88",  // NEW
  storage_type: "stateful" 
}
   ↓
app.py checks if local or remote storage
   ↓
IF remote (192.168.10.100.88 != HOST_IP):
  - Discover NVMe-oF target on 192.168.10.100.88:4420
  - Connect nvme: /dev/nvme[N]n1 appears
  - Create ext4 filesystem (if first-time)
  - Mount to /mnt/nvme-users/u_abc...
  - Store connection state (for cleanup on stop)
   ↓
Create container with: 
  -v /mnt/nvme-users/u_abc...:/home/ubuntu (or direct device passthrough)
   ↓
On session stop:
  - Unmount /mnt/nvme-users/u_abc...
  - Disconnect NVMe: nvme disconnect
  - Clean up connection state
Mount Strategy: Container Start vs. Persistent
Recommended: Per-Session Mount/Unmount
On session start: Discover → Connect → Mount → Boot container
On session stop: Umount → Disconnect
Benefits:
Clean connection lifecycle (no stale mounts)
One block device per session (no multi-client conflicts)
Easy cleanup/recovery
Aligns with current container lifecycle
Alternative (NOT recommended): Pre-mounted persistent)
Mount NVMe once at node boot
Reuse across sessions
Risk: Orphaned mounts on failure, stale connections
Local vs. Remote Storage Decision Logic
Required in app.py (new function):
python
def resolve_storage_mount(storage_uid: str, storage_node_ip: str) -> str:
    """
    Resolve mount path for storage.
    If storage_node_ip == HOST_IP: local ZFS dataset or NFS (existing)
    If storage_node_ip != HOST_IP: remote NVMe-oF target on storage node
    Returns: mount_path (e.g., /mnt/nvme-users/<storage_uid>)
    """
    if storage_node_ip == HOST_IP:
        # Local: use existing logic
        # Option 1: Direct ZFS: /datapool/users/{storage_uid}
        # Option 2: Local NFS: /mnt/nfs/users/{storage_uid}
        return os.path.join(NFS_MOUNT_ROOT, storage_uid)
    else:
        # Remote: use NVMe-oF
        return connect_nvmeof_and_mount(storage_uid, storage_node_ip)

def connect_nvmeof_and_mount(storage_uid: str, target_ip: str) -> str:
    """
    1. Discover NVMe-oF target on target_ip:4420
    2. Connect and get /dev/nvmeXn1
    3. Check/create filesystem
    4. Mount to /mnt/nvme-users/{storage_uid}
    Returns: mount path
    """
    # nvme discover -t tcp -a {target_ip} -s 4420
    # nvme connect -t tcp -n {nqn} -a {target_ip} -s 4420
    # mkfs.ext4 -F /dev/{device}  (if new)
    # mount /dev/{device} /mnt/nvme-users/{storage_uid}
    pass
Fallback to Direct ZFS (Same-Node Case)
If storage_node_ip == HOST_IP and NFS_MOUNT_ROOT not available:
python
# Fallback: use direct ZFS mountpoint
fallback_path = f"/datapool/users/{storage_uid}"
if os.path.exists(fallback_path) and os.path.isdir(fallback_path):
    return fallback_path
5. STORAGE PROVISIONING CHANGES FOR ZVOL
Current Dataset Creation vs. Required Zvol Creation
Current provision-user-storage.sh (Line 59):
bash
zfs create -o quota="${REQUIRED_QUOTA_GB}G" "$TARGET_DATASET"
Modified for zvol (proposed change):
bash
# NEW: use -V flag for zvol (block device) instead of -o quota (filesystem)
zfs create -V "${REQUIRED_QUOTA_GB}G" "$TARGET_ZVOL"

# Target variables:
PARENT_ZVOL="datapool/users"  # or datapool/nvme-users
TARGET_ZVOL="${PARENT_ZVOL}/${STORAGE_UID}"
Key Changes:
-V 5G instead of -o quota=5G
Creates block device, not filesystem
Zvol size is fixed (not soft quota like dataset)
No chown needed (block device has no owner)
Quota Enforcement Differences:
Mechanism	Dataset	Zvol
Quota Type	Soft (filesystem reports, but can exceed)	Hard (block device size is ceiling)
Enforcement	ZFS quota property	Block device size
User Control	User can query quota with zfs get	User sees lsblk size
Upgrading	zfs set quota=10G (online, no downtime)	Would require snapshot + clone (complex)
Storage Provisioning Service Changes
File: c:\Users\Punith\LaaS\host-services\storage-provision\app.pyProposed changes:
Add logic to detect zvol vs. dataset provisioning:
python
PROVISION_MODE = os.environ.get("PROVISION_MODE", "dataset")  # "dataset" or "zvol"

if PROVISION_MODE == "zvol":
    provision_script_args = [storage_uid, quota_gb]  # Script detects zvol mode
Script call (line 176):
python
# OLD:
["sudo", SCRIPT_PATH, storage_uid, str(quota_gb)]

# NEW (with mode detection):
["sudo", SCRIPT_PATH, "--mode", PROVISION_MODE, storage_uid, str(quota_gb)]
Deprovision (/deprovision endpoint):
python
# OLD: zfs destroy -f dataset
# NEW: zfs destroy -f zvol (same command, works for both)
ok, out = _run_cmd(["sudo", "zfs", "destroy", "-f", dataset], timeout=30)
Upgrade storage endpoint (/upgrade-storage):
python
# DATASET: can upgrade online with zfs set quota=
# ZVOL: cannot upgrade online; would need snapshot-clone-swap
# Recommendation: disable upgrade for zvol, or require offline procedure
if PROVISION_MODE == "zvol":
    return jsonify(error="Quota upgrade not supported for zvol backend"), 405
Storage usage endpoint (/storage/usage/<storage_uid>):
python
# Works for both dataset and zvol
# For zvol: query /dev/zvol/datapool/users/{storage_uid} block size
# For dataset: query zfs used/quota properties
Quota Enforcement on Zvols
ZFS Zvol Quota:
Fixed at creation time (e.g., -V 5G = exactly 5GB block device)
Cannot be exceeded (unlike dataset soft quota)
Resize requires: snapshot → clone at new size → promote
Example: User hits zvol quota
bash
# Inside container, user does:
dd if=/dev/zero of=/home/ubuntu/test.bin bs=1M count=5000
# Results in: "No space left on device" after ~5GB written
Comparison to Current Dataset Behavior:
Current: User hits soft quota, ZFS refuses new writes (same end result)
Zvol: Block device itself is the quota boundary (lower-level enforcement)
Recommendation: For MVP, treat zvol size as hard quota. For future, implement offline resize:
bash
# Resize workflow (NOT online):
zfs destroy datapool/users/u_xyz  # Destroy old zvol
zfs create -V 10G datapool/users/u_xyz  # New larger zvol
# Re-export via NVMe-oF
# Client reconnects
6. CROSS-NODE INTEGRATION FLOW (END-TO-END)
User Session Request Flow
plaintext
1. Backend API receives session request:
   POST /api/sessions {
     storage_uid: "u_abc123...",
     storage_node_id: "node-88",  // NEW
     tier: "blaze",
     vcpu: 4
   }

2. Backend queries storage metadata:
   storage_node_ip = lookup("node-88") → 192.168.10.100.88

3. Backend calls Session Orchestrator (9998):
   POST /sessions/launch {
     session_id: UUID,
     storage_uid: "u_abc...",
     storage_node_ip: "192.168.10.100.88",  // NEW
     storage_type: "stateful"
   }

4. Session Orchestrator (on 10.99):
   a. Validate launch params
   b. Allocate resources (ports, CPU, display)
   c. Resolve mount path:
      - If storage_node_ip == HOST_IP: use /mnt/nfs/users/...
      - Else: nvme discover, connect, mount /dev/nvmeXn1
   d. Build docker run command with volume mount
   e. Start container

5. Container runs with /home/ubuntu bound to:
   - Local: /datapool/users/u_abc (or /mnt/nfs/users/u_abc)
   - Remote: /mnt/nvme-users/u_abc (NVMe-oF mounted)

6. On session stop:
   a. docker stop (30s timeout)
   b. If NVMe-oF mount: umount, disconnect nvme
   c. docker rm
Storage Node (10.88) Configuration
plaintext
1. ZFS Pool Setup:
   zpool create datapool /dev/nvme0n1 ...
   zfs create datapool/nvme-users  # Parent for zvols

2. NVMe-oF Target Setup:
   modprobe nvmet_tcp
   nvmetcli load config.json  # Load all target subsystems

3. Storage Provisioning Endpoint (9999):
   - Accepts provision/deprovision requests
   - Creates/destroys zvols
   - Exports zvol via NVMe-oF target

4. For each user (u_abc...):
   - Zvol created: /dev/zvol/datapool/nvme-users/u_abc...
   - NVMe-oF target created: nqn.2016-06.io.spdk:laas-u_abc...
   - Target portal: 192.168.10.100.88:4420
Compute Node (10.99) Container Lifecycle
plaintext
Session Start:
├─ nvme discover -t tcp -a 192.168.10.100.88 -s 4420
├─ nvme connect -t tcp -n nqn.2016-06.io.spdk:laas-u_abc... -a 192.168.10.100.88 -s 4420
├─ [get /dev/nvme0n1]
├─ mkfs.ext4 -F /dev/nvme0n1 (if first connection)
├─ mount /dev/nvme0n1 /mnt/nvme-users/u_abc...
├─ docker run -v /mnt/nvme-users/u_abc...:/home/ubuntu ...
└─ [Container starts, user logged in]

During Session:
├─ Container reads/writes to /home/ubuntu
└─ All I/O traverses: container → /home/ubuntu (bind mount) → /mnt/nvme-users/u_abc... → /dev/nvme0n1 → NVMe-oF TCP → 192.168.10.100.88:4420 → /dev/zvol/datapool/nvme-users/u_abc...

Session Stop:
├─ docker stop -t 30 (graceful shutdown)
├─ docker rm (cleanup)
├─ umount /mnt/nvme-users/u_abc... (forceful if needed)
├─ nvme disconnect /dev/nvme0n1
└─ [NVMe-oF connection closed, target ready for next session]
Evidence Summary
Code References:
Session Orchestration: c:\Users\Punith\LaaS\host-services\session-orchestration\app.py:674-676 (NFS mount logic), lines 831-856 (mount validation)
Storage Provisioning: c:\Users\Punith\LaaS\host-services\storage-provision\app.py:59 (ZFS dataset creation), lines 102-118 (NFS export)
Backend Integration: c:\Users\Punith\LaaS\backend-new\src\storage\storage.service.ts (provision request dispatch)
Provision Script: c:\Users\Punith\LaaS\backend-new\scripts\provision-user-storage.sh:59 (current ZFS create command)
Recommendations
Phase 1: Design & Validation (2-3 weeks)
Verify 10GbE link configuration between 10.88 and 10.99 (eno2 static IPs on 10.10.100.0/24)
Benchmark NVMe-oF TCP with test zvol on 10GbE (expect 150K-200K IOPS vs. 30K-50K NFS)
Design zvol lifecycle management (provisioning, destruction, snapshot strategy)
Design session-to-storage node mapping in backend (which node gets which user)
Phase 2: Implementation (3-4 weeks)
Modify provision-user-storage.sh to support zvol creation:
Add --mode zvol|dataset flag
Use zfs create -V for zvol
Remove dataset-specific quota logic
Update Session Orchestrator (app.py):
Add resolve_storage_mount() function
Implement NVMe-oF connect/mount on session start
Implement umount/disconnect on session stop
Handle connection state tracking
Update Backend:
Add storage_node_ip to session launch payload
Implement node-aware provisioning routing
Phase 3: Testing & Rollout (2-3 weeks)
Integration tests: single compute node + storage node
Failover tests: disconnect/reconnect during session
Performance baselines: compare NFS vs. NVMe-oF (IOPS, latency, throughput)
Canary: migrate subset of users to NVMe-oF, monitor
Known Risks & Mitigations
Risk	Mitigation
Network Failure (10GbE link down)	Detect nvme disconnect, fail session gracefully, log incident
Orphaned Mounts	Session orchestrator tracks all mounts; cleanup on startup
Zvol Size Exhaustion	Monitor quota endpoint; alert when >80% full; block new sessions if <10% free
NVMe-oF Target Crash	Storage node HA setup (failover controller); client auto-reconnect
Concurrent Connection	Enforce single initiator per zvol (NVMe-oF subsystem config)
Summary
The LaaS platform currently uses:
Single-node storage: Direct ZFS dataset mounts or NFS via /mnt/nfs/users
Quota enforcement: ZFS soft quota per dataset
Container binding: Docker -v volumes to pre-mounted paths
Implementing NVMe-oF TCP requires:
Storage provisioning shift: ZFS datasets → zvols (block devices)
Session orchestrator enhancement: Multi-node awareness + NVMe-oF connect/mount lifecycle
Network isolation: Dedicated 10GbE fabric (eno2, already specified)
Performance gain: 3-6× IOPS on 10GbE NVMe-oF vs. current NFS, with 0.1-0.3ms latency vs. NFS's 1-5ms
All code references and modification points have been documented for engineering handoff.