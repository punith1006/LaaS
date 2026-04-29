# File Store Provisioning Guide

## 1. Overview

**File Store** is LaaS's persistent, ZFS-backed network storage system that provides each user with dedicated storage attached to their compute instances.

### Core Principles

- **One-User-One-FileStore Rule**: Each user can have exactly one File Store allocation at a time
- **Persistent Storage**: Data persists across compute sessions and container restarts
- **Network-Attached**: Storage is NFS-mounted to compute containers for seamless access
- **ZFS-Backed**: Built on ZFS for data integrity, snapshots, and quota enforcement

### Allocation Types

| Type | Quota | Billing | Trigger |
|------|-------|---------|---------|
| `sso_default` | 5 GB | **Free** | Auto-created on first SSO login |
| `user_created` | 5-10 GB | **Billed** (Rs.7/GB/month) | User manually creates via modal |

---

## 2. Architecture

### Full Request Chain

```
Frontend (React) → NestJS Backend → Python Flask Service → ZFS/NFS on Host
```

### Components

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js / React | `frontend/src/app/(console)/storage/page.tsx` |
| API | NestJS | `backend/src/storage/storage.controller.ts` |
| Service | NestJS | `backend/src/storage/storage.service.ts` |
| Provisioner | Python Flask | `host-services/storage-provision/app.py` |
| Storage | ZFS + NFS | Host machine (`datapool/users/*`) |

### Host Configuration

- **Provisioning Host**: `zenith@100.100.66.101` (via Tailscale VPN)
- **Python Service**: Runs in tmux session on port `9999`
- **Authentication**: `X-Provision-Secret` header on all requests
- **ZFS Pool**: `datapool` with parent dataset `datapool/users`

### Starting the Service

```bash
# SSH into provisioning host
ssh zenith@100.100.66.101

# Start in tmux session
tmux new -s storage-provision
cd /path/to/host-services/storage-provision
PROVISION_SECRET=your-secret python3 app.py

# Detach with Ctrl+B, D
```

---

## 3. Provisioning Flow (Step-by-Step)

### 3.1 SSO Auto-Provisioning (5GB Free)

1. User authenticates via Keycloak SSO
2. Backend detects `authType: 'sso'` during login
3. Backend generates `storageUid` (format: `u_<24-hex-chars>`)
4. Backend calls Python service `POST /provision` with `{ storageUid, quotaGb: 5 }`
5. Python service executes `provision-user-storage.sh`
6. Backend creates `UserStorageVolume` record with `allocationType: 'sso_default'`
7. Backend updates `User.storageUid` and `storageProvisioningStatus`

### 3.2 Public User Manual Provisioning (5-10GB Billed)

#### Step 1: Frontend sends request
```typescript
// POST /api/storage/volumes
const response = await fetch('/api/storage/volumes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ name: 'my-storage', quotaGb: 10 }),
});
```

#### Step 2: Backend validates and provisions
```typescript
// storage.controller.ts - createVolume()
// 1. Validate DTO (name: 1-128 chars, quotaGb: 5-10)
// 2. Check for duplicate names
// 3. Generate storageUid: `u_${randomBytes(12).toString('hex')}`
// 4. Call storageService.provisionUserQuota()
```

#### Step 3: Python service creates ZFS dataset
```python
# app.py - provision()
# 1. Validate X-Provision-Secret header
# 2. Validate storageUid format (^u_[0-9a-f]{24}$)
# 3. Pre-check ZFS pool readiness
# 4. Run: sudo /usr/local/bin/provision-user-storage.sh <storageUid> <quotaGb>
# 5. Post-verify: zfs get quota datapool/users/<storageUid>
# 6. If ENABLE_NFS_AUTOMOUNT=true, reconcile NFS exports/mounts
```

#### Step 4: Shell script creates dataset
```bash
#!/bin/bash
# provision-user-storage.sh
STORAGE_UID="$1"
REQUIRED_QUOTA_GB="${2:-5}"  # Dynamic quota (default 5GB)

zfs create -o quota=${REQUIRED_QUOTA_GB}G datapool/users/${STORAGE_UID}
chown -R 1000:1000 /datapool/users/${STORAGE_UID}
```

#### Step 5: Backend creates database records
```sql
-- Insert UserStorageVolume
INSERT INTO user_storage_volumes (
  id, user_id, name, storage_uid, 
  zfs_dataset_path, nfs_export_path,
  quota_bytes, allocation_type, status
) VALUES (
  gen_random_uuid(), $userId, $name, $storageUid,
  'datapool/users/' || $storageUid, '/mnt/nfs/users/' || $storageUid,
  $quotaBytes, 'user_created', 'active'
);

-- Update User record
UPDATE users SET
  storage_uid = $storageUid,
  storage_provisioning_status = 'provisioned',
  storage_provisioned_at = NOW()
WHERE id = $userId;
```

#### Step 6: Frontend shows success
```typescript
// On success, navigate to storage page
router.push('/storage');
```

---

## 4. Host Setup Requirements

### 4.1 ZFS Configuration

```bash
# Create pool (if not exists)
sudo zpool create datapool /dev/sdX

# Create parent dataset
sudo zfs create datapool/users

# Set permissions
sudo chown -R 1000:1000 /datapool/users
```

### 4.2 Provisioning Script

Location: `/usr/local/bin/provision-user-storage.sh`

```bash
#!/bin/bash
set -e

STORAGE_UID="$1"
REQUIRED_QUOTA_GB="${2:-5}"  # IMPORTANT: Accept dynamic quota

if [[ ! "$STORAGE_UID" =~ ^u_[0-9a-f]{24}$ ]]; then
  echo "Invalid storageUid format" >&2
  exit 1
fi

DATASET="datapool/users/${STORAGE_UID}"

# Check if already exists
if zfs list "$DATASET" &>/dev/null; then
  echo "Dataset already exists"
  exit 0
fi

# Check available space
AVAIL=$(zfs get -Hp -o value available datapool)
REQUIRED=$((REQUIRED_QUOTA_GB * 1024 * 1024 * 1024))
if [ "$AVAIL" -lt "$REQUIRED" ]; then
  echo "Insufficient disk space" >&2
  exit 2
fi

# Create dataset with quota
zfs create -o quota=${REQUIRED_QUOTA_GB}G "$DATASET"
chown -R 1000:1000 "/datapool/users/${STORAGE_UID}"

echo "Created $DATASET with ${REQUIRED_QUOTA_GB}G quota"
exit 0
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/provision-user-storage.sh
```

### 4.3 NFS Configuration (Optional)

If `ENABLE_NFS_AUTOMOUNT=true`:

```bash
# Install NFS server
sudo apt install nfs-kernel-server -y

# Enable and start
sudo systemctl enable --now nfs-kernel-server

# Verify
systemctl status nfs-kernel-server
```

The Python service auto-manages `/etc/exports` entries.

---

## 5. Database Schema

### UserStorageVolume

```prisma
model UserStorageVolume {
  id                   String   @id @default(uuid()) @db.Uuid
  userId               String   @map("user_id") @db.Uuid
  name                 String   @db.VarChar(128)
  storageUid           String   @map("storage_uid") @db.VarChar(64)
  zfsDatasetPath       String?  @map("zfs_dataset_path")
  nfsExportPath        String?  @map("nfs_export_path")
  quotaBytes           BigInt   @map("quota_bytes")
  usedBytes            BigInt   @default(0) @map("used_bytes")
  allocationType       String   // 'sso_default' | 'user_created'
  pricePerGbCentsMonth Int      @default(700) // Rs.7 = 700 paise
  status               StorageVolumeStatus  // 'active' | 'wiped'
  provisionedAt        DateTime?
  
  @@unique([userId, name])
  @@map("user_storage_volumes")
}
```

### User (Storage Fields)

```prisma
model User {
  storageUid                String?   @unique @map("storage_uid")
  storageProvisioningStatus String?   @map("storage_provisioning_status")
  storageProvisioningError  String?   @map("storage_provisioning_error")
  storageProvisionedAt      DateTime? @map("storage_provisioned_at")
  
  storageVolumes UserStorageVolume[]
}
```

### BillingCharge (Storage)

```prisma
model BillingCharge {
  chargeType        String   @default("compute")  // 'compute' | 'storage'
  storageVolumeId   String?  @db.Uuid             // FK for storage charges
  quotaGb           Int?                          // Storage size charged
  durationSeconds   Int      @map("duration_seconds")
  rateCentsPerHour  Int      @map("rate_cents_per_hour")
  amountCents       BigInt   @map("amount_cents")
  
  storageVolume UserStorageVolume? @relation(...)
}
```

---

## 6. Billing

### Pricing Structure

| Metric | Rate |
|--------|------|
| Monthly | Rs. 7 per GB |
| Monthly (paise) | 700 paise per GB |
| Hourly | ~0.96 paise per GB (~Rs. 0.0096) |

**Formula**: `hourlyChargeCents = (pricePerGbCentsMonth * quotaGb) / 730`

### Billing Process

The billing service runs hourly via cron (`@Cron(CronExpression.EVERY_HOUR)`):

```typescript
// billing.service.ts
@Cron(CronExpression.EVERY_HOUR)
async processHourlyStorageBilling() {
  // 1. Find all active, chargeable volumes
  // EXCLUDE 'sso_default' (free for SSO students)
  const volumes = await prisma.userStorageVolume.findMany({
    where: {
      status: 'active',
      allocationType: { notIn: ['sso_default'] },
    },
  });
  
  // 2. Group by user, process each in isolated transaction
  for (const [userId, userVolumes] of volumesByUser) {
    await processUserStorageBilling(userId, userVolumes, billingHour);
  }
}
```

### Per-User Atomic Transaction

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Idempotency check (already charged this hour?)
  const existingCharge = await tx.billingCharge.findFirst({
    where: {
      userId,
      chargeType: 'storage',
      createdAt: { gte: billingHour, lt: nextHour },
    },
  });
  if (existingCharge) return 'skipped';
  
  // 2. Spend limit enforcement
  if (wallet.spendLimitEnabled) {
    const periodSpent = await tx.billingCharge.aggregate(...);
    if (totalSpent + newCharge > spendLimit) return 'skipped';
  }
  
  // 3. Insufficient balance check
  if (currentBalance < totalChargeCents) return 'skipped';
  
  // 4. Create WalletTransaction
  // 5. Create BillingCharge records (one per volume)
  // 6. Deduct from wallet
});
```

---

## 7. Health & Reachability Checks

### Service-Level Health Check

```bash
# Python Flask endpoint
GET http://100.100.66.101:9999/health

# Returns 200 if ZFS pool 'datapool' is available
# Returns 503 if ZFS is unavailable
```

### Per-User Dataset Check

```typescript
// GET /api/storage/status
{
  hasStorage: true,       // User has a storage volume in DB
  reachable: true,        // Dataset exists AND service healthy
  serviceHealthy: true,   // Flask service responding
  datasetExists: true     // Specific ZFS dataset exists
}
```

### Frontend Status Indicators

| Location | Indicator | Behavior |
|----------|-----------|----------|
| Header | STATUS pill | Polls every 30s; Green/Amber/Red |
| Home Storage Card | Badge | Live / Unreachable / Not Found / Inactive |
| Storage Page | Error Banner | Shows when unreachable, disables operations |

```typescript
// Frontend polling
useEffect(() => {
  const checkReachability = async () => {
    try {
      const status = await getStorageStatus();
      setStorageReachable(status.reachable);
    } catch {
      setStorageReachable(false);
    }
  };
  checkReachability();
}, []);
```

---

## 8. File Operations

All file operations are proxied: **Frontend → NestJS → Python Flask → Filesystem**

### Endpoints

| Operation | Frontend API | Backend Route | Python Route |
|-----------|--------------|---------------|--------------|
| List files | `getStorageFiles(path)` | `GET /api/storage/files` | `GET /files/<uid>` |
| Create folder | `createStorageFolder()` | `POST /api/storage/files/mkdir` | `POST /files/<uid>/mkdir` |
| Upload | `uploadStorageFiles()` | `POST /api/storage/files/upload` | `POST /files/<uid>/upload` |
| Download | `downloadStorageFile()` | `GET /api/storage/files/download` | `GET /files/<uid>/download` |
| Delete | `deleteStorageFile()` | `DELETE /api/storage/files` | `DELETE /files/<uid>/delete` |

### Security Features

- **Path Traversal Prevention**: Rejects `..` in paths
- **Normalized Path Validation**: Ensures path stays within `/datapool/users/<uid>`
- **Secure Filename**: Uses `werkzeug.utils.secure_filename()` for uploads

### Example: Upload Flow

```typescript
// Frontend
const formData = new FormData();
formData.append('path', currentPath);
files.forEach(file => formData.append('files', file));

await fetch('/api/storage/files/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

```python
# Python Flask
@app.route("/files/<storage_uid>/upload", methods=["POST"])
def upload_file(storage_uid: str):
    # Validate auth + storageUid
    # Build target path: /datapool/users/{storage_uid}/{path}
    # Save each file with secure_filename()
    return jsonify(success=True, uploaded=uploaded_files)
```

---

## 9. Cleanup & Troubleshooting

### Deleting a File Store from Host

```bash
# 1. Check if NFS mounted
mount | grep /mnt/nfs/users/<uid>

# 2. Unmount NFS first (if mounted)
sudo umount /mnt/nfs/users/<uid>

# 3. Verify dataset exists
sudo zfs list datapool/users/<uid>

# 4. Destroy ZFS dataset
sudo zfs destroy datapool/users/<uid>

# 5. Clean /etc/exports (remove stale entry)
sudo nano /etc/exports
# Remove line: /datapool/users/<uid> ...

# 6. Reload NFS exports
sudo exportfs -ra
```

### Database Cleanup Script

```bash
# Edit the TARGET_STORAGE_UID in the script first
cd backend
npx ts-node prisma/cleanup-storage.ts
```

The script:
1. Finds `UserStorageVolume` by `storageUid`
2. Deletes related `BillingCharge` records
3. Deletes related `StorageExtension` records
4. Deletes the `UserStorageVolume` record
5. Resets `User.storageUid` and related fields to `null`

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `exportfs -ra` fails | Stale entries in `/etc/exports` for deleted datasets | Remove stale lines from `/etc/exports`, then `exportfs -ra` |
| `nfs-kernel-server` not running | Service not installed/started | `apt install nfs-kernel-server && systemctl enable --now nfs-kernel-server` |
| "property name should not exist" | DTO missing `class-validator` decorators | Add `@IsString()`, `@IsNotEmpty()`, etc. to DTO class |
| `zfs_dataset_path` is null | Backend not populating paths after creation | Fixed in controller: builds paths from `storageUid` |
| `users.storage_uid` is null | Backend not linking user record | Fixed: controller now updates `User` record after provisioning |
| Quota mismatch | Shell script had hardcoded quota | Fixed: script now accepts `"${2:-5}"` for dynamic quota |
| Home shows INACTIVE | `users.storage_uid` not populated | Ensure controller updates User record on creation |
| Dataset not found (404) | Dataset was deleted from host | Re-provision or cleanup DB records |

---

## 10. Environment Variables

### Backend (.env)

```bash
# Full URL to Python provision endpoint
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision

# Shared secret (must match Python service)
USER_STORAGE_PROVISION_SECRET=your-secure-secret-here
```

### Python Service (Environment)

```bash
# Required: Shared secret for auth
export PROVISION_SECRET=your-secure-secret-here

# Optional: Path to provision script
export PROVISION_SCRIPT_PATH=/usr/local/bin/provision-user-storage.sh

# Optional: Service port (default 9999)
export PORT=9999

# Optional: Enable NFS automount (default false)
export ENABLE_NFS_AUTOMOUNT=true

# Optional: NFS client IP (default 127.0.0.1)
export NFS_EXPORT_CLIENT=127.0.0.1

# Optional: NFS mount root (default /mnt/nfs/users)
export NFS_MOUNT_ROOT=/mnt/nfs/users
```

---

## Quick Reference

### Key File Locations

| Component | Path |
|-----------|------|
| Python Service | `host-services/storage-provision/app.py` |
| NestJS Controller | `backend/src/storage/storage.controller.ts` |
| NestJS Service | `backend/src/storage/storage.service.ts` |
| Billing Service | `backend/src/billing/billing.service.ts` |
| Prisma Schema | `backend/prisma/schema.prisma` |
| Cleanup Script | `backend/prisma/cleanup-storage.ts` |
| Frontend Page | `frontend/src/app/(console)/storage/page.tsx` |
| Frontend API | `frontend/src/lib/api.ts` |

### API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/storage/volumes` | GET | List user's storage volumes |
| `/api/storage/volumes` | POST | Create new storage volume |
| `/api/storage/volumes/:id` | DELETE | Delete (wipe) storage volume |
| `/api/storage/status` | GET | Check storage reachability |
| `/api/storage/files` | GET | List files in storage |
| `/api/storage/files/mkdir` | POST | Create folder |
| `/api/storage/files/upload` | POST | Upload files |
| `/api/storage/files/download` | GET | Download file |
| `/api/storage/files` | DELETE | Delete file/folder |

### Python Service Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service + ZFS health check |
| `/provision` | POST | Create ZFS dataset |
| `/storage/usage/<uid>` | GET | Live ZFS usage stats |
| `/files/<uid>` | GET | List files |
| `/files/<uid>/mkdir` | POST | Create folder |
| `/files/<uid>/upload` | POST | Upload files |
| `/files/<uid>/download` | GET | Download file |
| `/files/<uid>/delete` | DELETE | Delete file/folder |
