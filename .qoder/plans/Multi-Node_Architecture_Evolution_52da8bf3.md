# Multi-Node Architecture Evolution

## Architecture Overview

**Current**: Single-node (10.99) hosts everything. Backend has one hardcoded URL for session-orchestration and storage-provision.

**Target**: App server (UI, Backend, DB) on 10.99. Compute + storage distributed across N nodes (starting with 10.99 + 10.88). Each node runs session-orchestration (port 9998) and storage-provision (port 9999) services locally.

**Storage Strategy**:
- **Same-node** (storage + compute on same machine): Direct ZFS dataset bind-mount (`/datapool/users/<uid>:/home/ubuntu`) -- current behavior, zero overhead
- **Cross-node** (storage on node A, compute on node B): NVMe-oF over 10GbE -- near-local performance (validated by POC)

**Storage Node Selection**: Sequential fill -- fill one node (maintain 15GB headroom), then overflow to next.

**Key Design Principle**: Node fleet is a database-driven registry. Adding a new node = inserting a row in `Node` table + deploying host services on the machine. No hardcoded node IPs in application code.

---

## Affected Files Summary

| Layer | File | Change Type |
|-------|------|-------------|
| Database | `backend-new/prisma/schema.prisma` | Schema additions |
| Backend | `backend-new/src/compute/compute.service.ts` | Multi-node compute selection |
| Backend | `backend-new/src/compute/compute.dto.ts` | New fields in orchestration payload |
| Backend | `backend-new/src/storage/storage.service.ts` | Multi-node storage routing |
| Backend | `backend-new/src/storage/storage.controller.ts` | Minor updates |
| Backend | `backend-new/.env` | Remove single-node URLs |
| Host Service | `host-services/storage-provision/app.py` | ZFS zvol + NVMe-oF target setup |
| Host Service | `host-services/session-orchestration/app.py` | NVMe-oF initiator + cross-node mount |
| Script | `backend-new/scripts/provision-user-storage.sh` | Zvol creation mode |
| Frontend | `frontend-new/src/app/(console)/storage/page.tsx` | Show storage node |
| Frontend | `frontend-new/src/app/(console)/instances/page.tsx` | Show storage node in details |

---

## Task 1: Database Schema Migration

**File**: `backend-new/prisma/schema.prisma`

### 1a. Add fields to Node model
```prisma
model Node {
  // ... existing fields ...
  sessionOrchestrationPort  Int       @default(9998)
  storageProvisionPort      Int       @default(9999)
  nvmeOfPort                Int       @default(4420)    // NVMe-oF TCP listener port
  storageHeadroomGb         Int       @default(15)      // Min free space before overflow
}
```

### 1b. Add `nodeId` to UserStorageVolume
```prisma
model UserStorageVolume {
  // ... existing fields ...
  nodeId            String?         // FK to Node -- which node hosts this storage
  node              Node?           @relation(fields: [nodeId], references: [id])
  storageBackend    StorageBackend  @default(zfs_dataset)  // zfs_dataset or zfs_zvol
}

enum StorageBackend {
  zfs_dataset    // Direct ZFS dataset (legacy, same-node only)
  zfs_zvol       // ZFS zvol (supports NVMe-oF cross-node)
}
```

### 1c. Add `storageNodeId` to Session
```prisma
model Session {
  // ... existing fields ...
  storageNodeId     String?         // FK to Node -- where user's storage lives
  storageNode       Node?           @relation("SessionStorageNode", fields: [storageNodeId], references: [id])
  storageTransport  StorageTransport?  // How storage reaches this session
}

enum StorageTransport {
  local_zfs       // Same-node: direct /datapool bind-mount
  nvmeof_tcp      // Cross-node: NVMe-oF over 10GbE
}
```

### 1d. Seed second node
Migration seed script to insert node `laas-node-02`:
```sql
INSERT INTO "Node" (id, hostname, "displayName", "ipManagement", "ipCompute", "ipStorage",
  "totalVcpu", "totalMemoryMb", "totalGpuVramMb", "gpuModel", "nvmeTotalGb",
  "maxConcurrentSessions", status)
VALUES (gen_random_uuid(), 'laas-node-02', 'Node 10.88',
  '192.168.10.88', '192.168.10.88', '10.10.100.88',
  16, 65536, 24576, 'NVIDIA RTX 4090', 300, 3, 'healthy');
```
And update existing node `laas-node-01` to have correct `ipStorage`:
```sql
UPDATE "Node" SET "ipStorage" = '10.10.100.99' WHERE hostname = 'laas-node-01';
```

### 1e. Backfill existing UserStorageVolume
```sql
UPDATE "UserStorageVolume"
SET "nodeId" = (SELECT id FROM "Node" WHERE hostname = 'laas-node-01')
WHERE "nodeId" IS NULL;
```

---

## Task 2: Backend - Node Service (New Module or Extension)

**Purpose**: Centralized node fleet management -- selection, health, routing.

### 2a. Node helper methods in compute.service.ts (or new node.service.ts)

**`selectStorageNode(quotaGb: number)`** -- Sequential fill algorithm:
1. Query all nodes with status `healthy`, ordered by hostname (deterministic)
2. For each node, call `GET http://{node.ipManagement}:{node.storageProvisionPort}/host-space` to get real-time available space
3. Select first node where `availableGb - quotaGb >= node.storageHeadroomGb` (15GB default)
4. If no node has space, throw error

**`selectComputeNode(vcpu, memoryMb, vramMb)`** -- Resource-based selection:
1. Query all nodes with status `healthy`
2. Calculate available resources: `total - allocated` for CPU, RAM, VRAM
3. Filter nodes that can fit the requested config
4. Select node with most available VRAM (GPU-first scheduling)
5. If no node fits, throw error

**`getNodeEndpoint(nodeId, service: 'orchestration' | 'storage')`** -- URL builder:
```typescript
const node = await prisma.node.findUnique({ where: { id: nodeId } });
if (service === 'orchestration')
  return `http://${node.ipManagement}:${node.sessionOrchestrationPort}`;
if (service === 'storage')
  return `http://${node.ipManagement}:${node.storageProvisionPort}`;
```

### 2b. Remove hardcoded single-node env vars
**File**: `backend-new/.env`
- Remove `SESSION_ORCHESTRATION_URL` (now derived from Node table)
- Remove `USER_STORAGE_PROVISION_URL` (now derived from Node table)
- Keep secrets (shared across all nodes): `SESSION_ORCHESTRATION_SECRET`, `USER_STORAGE_PROVISION_SECRET`

---

## Task 3: Backend - Storage Service Multi-Node

**File**: `backend-new/src/storage/storage.service.ts`

### 3a. Provision flow changes
Current: Calls single `USER_STORAGE_PROVISION_URL`.
New:
1. Call `selectStorageNode(quotaGb)` to pick target node
2. Build URL: `http://{selectedNode.ipManagement}:{selectedNode.storageProvisionPort}/provision`
3. POST `{ storageUid, quotaGb, storageBackend: 'zfs_zvol' }` -- new field tells host service to create zvol
4. On success, save `UserStorageVolume` with `nodeId = selectedNode.id`, `storageBackend = 'zfs_zvol'`

### 3b. Storage health/usage routing
Current: Calls single URL for `/storage/usage/{uid}`, `/host-space`, `/files/{uid}`.
New: Look up `UserStorageVolume.nodeId`, resolve to node's storage provision URL, route call there.

### 3c. Deprovision routing
Current: Calls single URL for `/deprovision`.
New: Look up storage volume's `nodeId`, route deprovision to that node. Include NVMe-oF target teardown.

---

## Task 4: Backend - Compute Service Multi-Node

**File**: `backend-new/src/compute/compute.service.ts`

### 4a. Session launch flow changes
Current (line ~311): `Node.findFirst({ status: 'healthy' })` -- always picks first node.
New:
1. Call `selectComputeNode(vcpu, memoryMb, vramMb)` -- picks node with most available GPU
2. Look up user's `UserStorageVolume` to find `storageVolume.nodeId` (storage node)
3. Determine transport:
   ```typescript
   const storageTransport = (computeNode.id === storageVolume.nodeId)
     ? 'local_zfs' : 'nvmeof_tcp';
   ```
4. Build orchestration payload with new fields:
   ```json
   {
     "session_id": "...",
     "storage_uid": "u_...",
     "storage_type": "stateful",
     "storage_transport": "local_zfs | nvmeof_tcp",
     "storage_node_ip": "10.10.100.99",
     "storage_node_mgmt_ip": "192.168.10.99",
     "storage_node_nvme_port": 4420,
     "compute_node_ip": "192.168.10.88",
     ...existing fields...
   }
   ```
5. Route orchestration call to compute node's URL: `http://{computeNode.ipManagement}:{computeNode.sessionOrchestrationPort}/sessions/launch`
6. Save in Session: `nodeId`, `storageNodeId`, `storageTransport`

### 4b. Session URL construction
Current: Uses hardcoded `HOST_IP` env var for session URLs.
New: Use `computeNode.ipCompute` for the session URL: `http://{computeNode.ipCompute}:{nginxPort}/`

### 4c. Session termination routing
Current: Calls single orchestration URL.
New: Look up `session.nodeId`, resolve to that node's orchestration URL, send terminate command. The orchestration service handles NVMe-oF cleanup if `storage_transport === 'nvmeof_tcp'`.

---

## Task 5: Host Service - Storage Provision Evolution

**File**: `host-services/storage-provision/app.py`

### 5a. Support zvol creation mode
New parameter in `/provision` endpoint: `storageBackend` (default: `zfs_dataset` for backward compat).

When `storageBackend === 'zfs_zvol'`:
1. `sudo zfs create -V {quotaGb}G datapool/users/{storageUid}`
2. Wait for block device: `ls /dev/zvol/datapool/users/{storageUid}` (retry loop)
3. Format: `sudo mkfs.ext4 -L {storageUid} /dev/zvol/datapool/users/{storageUid}`
4. Verify: `blkid /dev/zvol/datapool/users/{storageUid}`

### 5b. NVMe-oF target auto-setup
After zvol creation, automatically set up NVMe-oF target so it's connectable from any compute node:

```python
subsystem_name = f"laas-{storage_uid}"   # e.g., laas-u_abc123def456

# 1. Create subsystem
mkdir_p(f"/sys/kernel/config/nvmet/subsystems/{subsystem_name}")
write(f"/sys/kernel/config/nvmet/subsystems/{subsystem_name}/attr_allow_any_host", "1")

# 2. Create namespace backed by zvol
mkdir_p(f"/sys/kernel/config/nvmet/subsystems/{subsystem_name}/namespaces/1")
write(f".../namespaces/1/device_path", f"/dev/zvol/datapool/users/{storage_uid}")
write(f".../namespaces/1/enable", "1")

# 3. Link to shared port (create port 1 if not exists)
ensure_nvmet_port(storage_ip, nvme_port=4420)
symlink(f"/sys/kernel/config/nvmet/subsystems/{subsystem_name}",
        f"/sys/kernel/config/nvmet/ports/1/subsystems/{subsystem_name}")

# 4. Verify target is discoverable
verify: ss -tlnp | grep 4420
```

### 5c. NVMe-oF target persistence
Create `/etc/laas/nvmet-targets.json` to track active targets. On storage-provision service startup, re-create all configfs entries from this file (since configfs is RAM-based and lost on reboot).

### 5d. New endpoints
- `POST /nvme/verify-target` -- check if a specific subsystem is active and discoverable
- `POST /deprovision` (updated) -- tear down NVMe-oF target before destroying zvol

### 5e. Deprovision with NVMe-oF cleanup
```python
# 1. Remove subsystem from port
os.remove(f"/sys/kernel/config/nvmet/ports/1/subsystems/{subsystem_name}")
# 2. Disable namespace
write(f".../namespaces/1/enable", "0")
# 3. Remove namespace dir
rmdir(f".../namespaces/1")
# 4. Remove subsystem dir
rmdir(f"/sys/kernel/config/nvmet/subsystems/{subsystem_name}")
# 5. Destroy zvol
subprocess.run(["sudo", "zfs", "destroy", "-f", f"datapool/users/{storage_uid}"])
# 6. Remove from persistence file
```

---

## Task 6: Host Service - Session Orchestration Evolution

**File**: `host-services/session-orchestration/app.py`

This is the most critical change -- the orchestration service must handle cross-node NVMe-oF.

### 6a. Accept new launch parameters
```python
storage_transport = data.get("storage_transport", "local_zfs")   # local_zfs | nvmeof_tcp
storage_node_ip = data.get("storage_node_ip")                    # 10GbE IP (10.10.100.x)
storage_node_nvme_port = data.get("storage_node_nvme_port", 4420)
```

### 6b. Storage mount logic (new function: `prepare_storage_mount`)

**Case 1 -- local_zfs** (same-node):
```python
mount_path = f"/datapool/users/{storage_uid}"
# Verify: os.path.isdir(mount_path)
# Verify: os.stat(mount_path).st_uid == 1000
```

**Case 2 -- nvmeof_tcp** (cross-node):
```python
subsystem_name = f"laas-{storage_uid}"
mount_path = f"/mnt/nvme/{storage_uid}"

# Step 1: Discover target
result = run(["nvme", "discover", "-t", "tcp", "-a", storage_node_ip, "-s", str(nvme_port)])
verify(subsystem_name in result.stdout)

# Step 2: Connect
run(["nvme", "connect", "-t", "tcp", "-n", subsystem_name, "-a", storage_node_ip, "-s", str(nvme_port)])

# Step 3: Find device (parse nvme list, match by subsystem NQN)
device_path = find_nvme_device(subsystem_name)  # e.g., /dev/nvme1n1
verify(device_path is not None)

# Step 4: Mount
os.makedirs(mount_path, exist_ok=True)
run(["mount", device_path, mount_path])
verify(os.path.ismount(mount_path))

# Step 5: Verify permissions
stat = os.stat(mount_path)
verify(stat.st_uid == 1000)  # ubuntu user
```

Each step emits events to the backend polling endpoint, e.g.:
- `nvme_discovering` -> `nvme_connecting` -> `nvme_mounting` -> `nvme_verified`

If ANY step fails: clean up partial state (disconnect if connected, unmount if mounted), emit `nvme_mount_failed` event with error details.

### 6c. Docker volume mount change
```python
# In build_docker_command():
if storage_transport == "local_zfs":
    cmd.extend(["-v", f"/datapool/users/{storage_uid}:/home/ubuntu"])
elif storage_transport == "nvmeof_tcp":
    cmd.extend(["-v", f"/mnt/nvme/{storage_uid}:/home/ubuntu"])
```

### 6d. Session URL construction
Replace hardcoded `HOST_IP` with the compute node's actual IP (passed from backend or read from env):
```python
HOST_IP = os.environ.get("HOST_IP", "192.168.10.99")
# Session URL: http://{HOST_IP}:{nginx_port}/
```
Each node sets its own `HOST_IP` env var when deploying the service.

### 6e. Session cleanup on stop/terminate
```python
def cleanup_session(container_name, storage_transport, storage_uid):
    # 1. Docker stop + rm
    run(["docker", "stop", container_name])
    run(["docker", "rm", container_name])

    # 2. NVMe-oF cleanup (cross-node only)
    if storage_transport == "nvmeof_tcp":
        mount_path = f"/mnt/nvme/{storage_uid}"
        subsystem_name = f"laas-{storage_uid}"
        run(["umount", mount_path])
        run(["nvme", "disconnect", "-n", subsystem_name])
        os.rmdir(mount_path)
```

---

## Task 7: Frontend - Minimal UI Updates

### 7a. Storage page: show node hostname
**File**: `frontend-new/src/app/(console)/storage/page.tsx`
- Add "Storage Node" badge next to storage status
- Source: backend returns `node.hostname` in storage volume response

### 7b. Instance details: show storage node
**File**: `frontend-new/src/app/(console)/instances/page.tsx`
- In "Infrastructure" section, add row: "Storage Node" showing hostname
- Add row: "Storage Transport" showing "Local ZFS" or "NVMe-oF (10GbE)"

### 7c. No changes needed for launch flow
Backend handles node selection automatically. Users don't pick nodes.

---

## Implementation Order and Dependencies

```
Task 1 (DB Schema) ─────────────────────────────────┐
                                                      │
Task 2 (Backend Node Service) ── depends on Task 1 ──┤
                                                      │
Task 3 (Backend Storage Multi-Node) ── depends on 2 ─┤
Task 4 (Backend Compute Multi-Node) ── depends on 2 ─┤
                                                      │
Task 5 (Host Storage Provision) ── independent ───────┤
Task 6 (Host Session Orchestration) ── independent ───┤
                                                      │
Task 7 (Frontend) ── depends on 3, 4 ────────────────┘
```

**Parallelizable**: Tasks 5 and 6 (host services) can be developed independently of backend tasks.

**Recommended execution order**:
1. Task 1 (DB) + Task 5 (Host Storage) in parallel
2. Task 2 (Node Service) + Task 6 (Host Orchestration) in parallel
3. Task 3 (Backend Storage) + Task 4 (Backend Compute)
4. Task 7 (Frontend)
5. Integration testing: end-to-end session launch with cross-node storage

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New storage provisions | ZFS zvol (not dataset) | Enables NVMe-oF for cross-node. Same-node mounts zvol directly. |
| Existing storage | Keep as ZFS dataset | No disruption. Works for same-node. Migration to zvol if user needs cross-node. |
| NVMe-oF port | Single port 4420 per node, multiple subsystems | Standard NVMe-oF pattern. Each user gets unique subsystem name. |
| Node selection | Automatic (no user choice) | Users don't need to know infrastructure topology. |
| Storage fill strategy | Sequential with 15GB headroom | Simple, predictable, easy to monitor. |
| NVMe-oF lifecycle | Target persists; initiator connects per-session | Storage always available; compute connects on demand. |
| Config persistence | `/etc/laas/nvmet-targets.json` + startup restore | Survives reboots. |
