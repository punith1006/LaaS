# Storage Upgrade Feature Implementation Plan

## Overview
This feature allows users to upgrade their File Store allocation from current size up to 10GB with:
- Zero data loss through ZFS snapshot/send-receive migration
- Active session protection (blocks upgrade if instances are running)
- Complete audit trail via StorageExtension records
- Automatic billing updates for future charges

---

## Key Findings from Codebase Analysis

### Existing Schema (Ready for Upgrade)
| Table | Relevant Fields |
|-------|-----------------|
| `UserStorageVolume` | `quotaBytes`, `pricePerGbCentsMonth`, `storageUid`, `status` |
| `StorageExtension` | `previousQuotaBytes`, `newQuotaBytes`, `extensionBytes`, `extensionType` |
| `BillingCharge` | `quotaGb`, `rateCentsPerHour` (auto-calculated from volume) |
| `Session` | `nfsMountPath`, `storageMode`, `status` |

### Billing Logic
- Current rate: Rs.7/GB/month (700 paise/GB)
- Future `BillingCharge` records will auto-use updated `quotaBytes` from volume
- No retroactive billing changes needed

---

## Phase 1: Python Host Service (ZFS Operations)

### 1.1 Add host space check endpoint
- File: `host-services/storage-provision/app.py`
- Endpoint: `GET /host-space`
- Response: `{ "availableBytes": number, "totalBytes": number }`
- Implementation: Run `zpool list -p -o size,free datapool`

### 1.2 Add upgrade-storage endpoint
- File: `host-services/storage-provision/app.py`
- Endpoint: `POST /upgrade-storage`
- Body: `{ "storageUid": string, "newQuotaGb": number }`

#### ZFS Upgrade Flow:
```
1. Validate newQuotaGb is valid
2. Create snapshot: datapool/users/{storageUid}@upgrade_temp
3. Create new dataset: datapool/users/{storageUid}_new with new quota
4. Send data: zfs send datapool/users/{storageUid}@upgrade_temp | zfs receive datapool/users/{storageUid}_new
5. Verify: Compare checksums of original and new datasets
6. On success:
   - Rename old dataset to datapool/users/{storageUid}_old
   - Rename new dataset to datapool/users/{storageUid}
   - Delete snapshot and old dataset
   - Update NFS export paths
7. On failure:
   - Rollback: delete new dataset, keep old
   - Return error with details
```

### 1.3 Add NFS path update support
- When upgrading, NFS export paths need to remain the same (for session compatibility)
- Only quota changes, paths stay constant

---

## Phase 2: Backend API Endpoints

### 2.1 Check active sessions (before upgrade/delete)
- File: `backend/src/storage/storage.controller.ts`
- Endpoint: `GET /api/storage/volumes/active-sessions-check`
- Query: Sessions where `storageMode = 'stateful'`, `status IN ('running','starting','reconnecting')`, `userId` matches
- Response: `{ hasActiveSessions: boolean, sessionCount: number, sessions: { id, instanceName, status }[] }`

### 2.2 Check host available space
- File: `backend/src/storage/storage.controller.ts`
- Endpoint: `GET /api/storage/volumes/host-space-check`
- Implementation: Call Python `/host-space` endpoint
- Response: `{ availableBytes: number, availableGb: number, totalGb: number }`

### 2.3 Upgrade storage volume
- File: `backend/src/storage/storage.controller.ts`
- Endpoint: `PATCH /api/storage/volumes/:id`
- Body: `{ newQuotaGb: number }`

#### Complete Upgrade Flow:
```
1. PRE-CHECKS (all must pass):
   a. Volume exists, belongs to user, status = 'active'
   b. User has no active sessions using this storage
   c. newQuotaGb > currentQuotaGb
   d. newQuotaGb <= 10
   e. Host has available space: (newQuotaGb - currentQuotaGb) GB free

2. ZFS OPERATION (via Python host service):
   Call POST /upgrade-storage with { storageUid, newQuotaGb }
   Handle: success, insufficient_space, migration_failed, timeout

3. DATABASE UPDATE (in Prisma transaction):
   a. Calculate previous/new quota in bytes
   b. Create StorageExtension record:
      - extensionType: 'user_upgrade'
      - previousQuotaBytes: old value
      - newQuotaBytes: new value
      - extensionBytes: difference
      - amountCents: 0 (paid by existing credits)
   c. Update UserStorageVolume:
      - quotaBytes: new value
      - updatedAt: NOW()
   d. Create AuditLog entry:
      - action: 'filestore.upgrade'
      - oldData: { quotaGb: old }
      - newData: { quotaGb: new }
   e. Calculate billing response:
      - monthlyEstimate = newQuotaGb * 7.00
      - hourlyRate = (newQuotaGb * 700) / 730 / 100

4. RESPONSE:
   Return updated volume with billing estimates
```

### 2.4 Update delete endpoint
- File: `backend/src/storage/storage.controller.ts`
- Modify `DELETE /api/storage/volumes`
- Add check: If active sessions exist, return 400 with list of active instances
- Error message: "Cannot delete storage while instances are running: {instanceNames}. Please stop all instances first."

### 2.5 Add backend service method
- File: `backend/src/storage/storage.service.ts`
- Method: `upgradeStorageQuota(storageUid: string, newQuotaGb: number)`
- Calls Python host service, handles responses, returns structured result

---

## Phase 3: Frontend Implementation

### 3.1 Storage Usage Card - Add Upgrade Button
- File: `frontend/src/app/(console)/storage/page.tsx`
- Location: Inside "Total Storage" card, right-aligned

Button styles (theme-aware):
- Light theme: white background, black border/text
- Dark theme: dark background, light border/text
- Disabled state (at max 10GB): grayed out with reduced opacity

### 3.2 Add Active Sessions Check on Delete
- Modify delete modal:
  - On open: Call `checkActiveSessions()`
  - If sessions active: Show warning, disable confirm button
  - Warning: "You have {n} active instance(s): {names}. Stop them before deleting storage."

### 3.3 Upgrade Storage Modal
- File: `frontend/src/app/(console)/storage/page.tsx`
- Component: `UpgradeStorageModal`

UI Layout:
- Title: "Upgrade File Store"
- Blue Info Banner (same as create modal)
- Name field: pre-filled, read-only, grayed out
- Size slider: min=currentQuotaGb, max=10GB
- Billing estimate updates on slider change
- Cancel button: outline style
- Upgrade button: primary style (enabled when size > current)

### 3.4 Add API Functions
- File: `frontend/src/lib/api.ts`
- `checkActiveSessions()`: Check if user has active sessions
- `checkHostSpace()`: Check available host storage
- `upgradeStorageVolume(volumeId, newQuotaGb)`: Perform upgrade

---

## Phase 4: Database Schema (Minimal Changes)

### No new tables needed!
The existing schema supports upgrades perfectly:

| Table | Usage for Upgrade |
|-------|------------------|
| `UserStorageVolume` | Update `quotaBytes` |
| `StorageExtension` | Record the upgrade with type 'user_upgrade' |
| `AuditLog` | Track old/new values for compliance |
| `BillingCharge` | Auto-uses new quota for future charges |

---

## Phase 5: Error Handling & Rollback

### ZFS Migration Failure
1. Python service attempts rollback (delete new dataset)
2. Returns error to backend
3. Backend returns 500 to frontend
4. User sees: "Upgrade failed: {reason}. Your storage is unchanged."

### Timeout Handling
- ZFS operations: 5 minute timeout
- Frontend shows progress: "Upgrading storage... This may take a few minutes."

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `host-services/storage-provision/app.py` | Add `/host-space`, `/upgrade-storage` endpoints |
| `backend/src/storage/storage.service.ts` | Add `upgradeStorageQuota()`, `getHostSpace()` |
| `backend/src/storage/storage.controller.ts` | Add GET `/active-sessions-check`, GET `/host-space-check`, PATCH `/:id` |
| `frontend/src/lib/api.ts` | Add 3 new API functions |
| `frontend/src/app/(console)/storage/page.tsx` | Add upgrade button, modal, active session checks |

---

## API Specifications

### GET /api/storage/volumes/active-sessions-check
```json
{
  "hasActiveSessions": true,
  "sessionCount": 2,
  "sessions": [
    { "id": "uuid1", "instanceName": "My GPU Instance", "status": "running" },
    { "id": "uuid2", "instanceName": "Dev Machine", "status": "starting" }
  ]
}
```

### GET /api/storage/volumes/host-space-check
```json
{
  "availableGb": 45.2,
  "totalGb": 100,
  "availableBytes": 48534556672
}
```

### PATCH /api/storage/volumes/:id

**Request:**
```json
{ "newQuotaGb": 8 }
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "name": "fs1",
  "storageUid": "u_abc123",
  "quotaGb": 8,
  "usedGb": 2.5,
  "status": "active",
  "allocationType": "user_created",
  "previousQuotaGb": 5,
  "monthlyEstimate": 56.00,
  "hourlyRate": 0.077,
  "provisionedAt": "2026-03-30T10:00:00Z",
  "createdAt": "2026-03-30T10:00:00Z"
}
```

**Error Responses:**
- 400: `{ "error": "Already at maximum storage (10GB)" }`
- 400: `{ "error": "Cannot upgrade while instances are running: My Instance, Dev Box" }`
- 400: `{ "error": "New size must be greater than current size (5GB)" }`
- 400: `{ "error": "Insufficient host storage space. Available: 2GB, Required: 3GB" }`
- 500: `{ "error": "Storage upgrade failed: Data migration error" }`
