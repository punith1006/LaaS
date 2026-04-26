# Smart Storage Upgrade with Cross-Node Migration

## Current State
- Upgrade flow calls Flask `/upgrade-storage` on the volume's current node without checking if the node has enough pool space for the expansion
- No cross-node migration exists — storage is locked to its provisioned node
- Delete + recreate loses all user data

## Design

### Decision Logic (in backend upgrade handler)
```
1. Calculate additionalGb = newQuotaGb - currentQuotaGb
2. Check current node's pool space via GET /host-space
3. If currentNode has (additionalGb + headroom) → IN-PLACE UPGRADE (existing flow)
4. Else → scan other nodes via selectStorageNode(newQuotaGb)
5. If another node found → CROSS-NODE MIGRATION
6. If no node found → FAIL with "insufficient space across all nodes"
```

### Cross-Node Migration Sequence
```
Source Node (old)                    Target Node (new)
─────────────────                    ─────────────────
                                     POST /provision (same storageUid, new quota)
                                       → creates zvol, formats ext4, mounts, NVMe-oF
POST /migrate-export                 
  → rsync /datapool/users/{uid}/  ──→  /datapool/users/{uid}/
  → returns {fileCount, totalBytes}
                                     POST /verify-migration
                                       → checks files, permissions, byte count
                                       → returns {fileCount, totalBytes, ok}
[Compare source vs target counts]
                                     
DB TRANSACTION:
  UPDATE user_storage_volumes SET nodeId = newNodeId, quota_bytes = newQuota
  INSERT storage_extensions (audit record)

POST /deprovision (on source)
  → tears down NVMe-oF, unmounts, zfs destroy
```

If ANY step fails, the target is deprovisioned and the source remains untouched.

---

## Task 1: Flask — Add migration endpoints to app.py

**File**: `host-services/storage-provision/app.py`

### 1a. `/migrate-export` (POST) — on SOURCE node
Copies data from local storage to target node via rsync over the storage network (10GbE `ipStorage`) with fallback to compute network.

```python
# Request:
{
  "storageUid": "u_xxx",
  "targetIp": "10.10.100.88",       # Target node's IP (prefer storage network)
  "targetPath": "/datapool/users/u_xxx"
}

# Executes:
rsync -avz --delete /datapool/users/{uid}/ {targetIp}:/datapool/users/{uid}/

# Response:
{
  "ok": true,
  "fileCount": 42,
  "totalBytes": 1048576,
  "rsyncStats": "..."
}
```

- Uses `rsync` with `-a` (archive: preserves permissions, ownership, timestamps)
- Auth: relies on SSH key-based auth between nodes (already set up for host services)
- Timeout: proportional to data size (base 60s + 30s per GB of used data)

### 1b. `/verify-migration` (POST) — on TARGET node
Validates data integrity after transfer.

```python
# Request:
{
  "storageUid": "u_xxx",
  "expectedFileCount": 42,      # From source's export response
  "expectedTotalBytes": 1048576
}

# Checks:
# 1. Mount exists and is accessible
# 2. File count matches (du --inodes or find | wc -l)
# 3. Total bytes within 5% tolerance (ext4 block alignment differences)
# 4. Permissions: root dir owned by 1000:1000
# 5. No permission errors on listing

# Response:
{
  "ok": true,
  "fileCount": 42,
  "totalBytes": 1050000,
  "permissionsOk": true
}
```

---

## Task 2: Backend — Enhanced upgrade flow with migration orchestration

**Files**: `backend-new/src/storage/storage.service.ts`, `backend-new/src/storage/storage.controller.ts`

### 2a. New method: `checkNodeSpace(nodeId, requiredGb)` in storage.service.ts
Queries a specific node's available space (reuses existing `/host-space` call pattern).

```typescript
async checkNodeSpace(nodeId: string, requiredGb: number): Promise<{
  hasSpace: boolean;
  availableGb: number;
  requiredGb: number;
}>
```

### 2b. New method: `migrateStorage(...)` in storage.service.ts
Orchestrates the full cross-node migration:

```typescript
async migrateStorage(
  storageUid: string,
  sourceNodeId: string,
  targetNode: Node,
  newQuotaGb: number,
  storageBackend: string,
): Promise<{ ok: boolean; error?: string }>
```

Steps:
1. Provision on target node (POST /provision with same storageUid, newQuotaGb)
2. Get source usage (file count + bytes) from source Flask
3. Trigger rsync export (POST /migrate-export on source, pointing to target's ipStorage or ipCompute)
4. Verify on target (POST /verify-migration with expected counts)
5. Return success/failure — DB update and source cleanup happen in the controller

Rollback on any failure: deprovision on target node, return error.

### 2c. Modified upgrade handler in storage.controller.ts (PATCH /api/storage/volumes/:id)

Current flow (lines 763-904) enhanced:

```
1. [EXISTING] Verify ownership, active sessions check
2. [NEW] Get volume's current node from DB
3. [NEW] Check current node space: GET /host-space on volume's node
4. [BRANCH A] If current node has space:
     → In-place upgrade (existing /upgrade-storage call)
     → Update DB: quota_bytes, storage_extensions
5. [BRANCH B] If current node lacks space:
     → Call nodeService.selectStorageNode(newQuotaGb) to find another node
     → If no node found → 400 "Insufficient space across all nodes"
     → If found → Call migrateStorage(...)
     → On success: DB TRANSACTION {
         UPDATE user_storage_volumes SET nodeId = newNodeId, quota_bytes = newQuota
         INSERT storage_extensions (audit trail)
       }
     → Deprovision on source node (POST /deprovision)
     → If deprovision fails: log warning but don't fail (source cleanup is best-effort after successful migration)
6. [EXISTING] Audit log, return response
```

Response adds migration info when applicable:
```json
{
  "id": "...",
  "quotaGb": 10,
  "previousQuotaGb": 8,
  "migrated": true,              // NEW: indicates cross-node migration occurred
  "previousNodeId": "...",       // NEW
  "newNodeId": "...",            // NEW
  "monthlyEstimate": 70.0,
  "hourlyRate": 0.095
}
```

---

## Task 3: Verification and testing

- Run `tsc --noEmit` on backend-new for TypeScript validation
- Upload updated `app.py` to both nodes
- Upload updated `provision-user-storage.sh` if changed
- Test scenarios:
  1. In-place upgrade (node has space) — should work as before
  2. Cross-node migration (fill node-01 to trigger migration to node-02)
  3. No space anywhere — should return clean error
  4. Migration failure mid-transfer — should rollback cleanly

---

## Prerequisites / Assumptions

- **SSH key auth between nodes**: rsync requires passwordless SSH from source to target. If not already set up, we need `ssh-copy-id zenith@{targetIp}` on each node pair.
- **rsync installed**: Should be available on Ubuntu by default.
- **Flask runs as zenith**: rsync will run as zenith user. Files in `/datapool/users/` must be readable by zenith (they're owned by 1000:1000, so `rsync` under sudo or the files need group-read).
- **Storage network preferred**: Migration should use `ipStorage` (10GbE) for speed when available, falling back to `ipCompute`.

## File Change Summary

| File | Changes |
|------|---------|
| `host-services/storage-provision/app.py` | Add `/migrate-export` and `/verify-migration` endpoints |
| `backend-new/src/storage/storage.service.ts` | Add `checkNodeSpace()`, `migrateStorage()` methods |
| `backend-new/src/storage/storage.controller.ts` | Enhance PATCH upgrade handler with space check + migration branch |
