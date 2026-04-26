#!/usr/bin/env bash
# Provision ZFS storage for an institution member (university_sso).
# Supports two backends: zfs_dataset (default, quota-based) and zfs_zvol (fixed-size block device).
# Safe, read-only checks first; only creates after all validations pass.
# Does not modify or destroy existing datasets or quotas.
#
# Usage: provision-user-storage.sh <storage_uid> [quota_gb] [--storage-backend zfs_dataset|zfs_zvol]
# Exit codes: 0 = success, 1 = invalid args, 2 = insufficient space, 3 = zfs/system error
#
# Requires: datapool and datapool/users already exist (see LaaS_Node_Setup_Guide / Runbook).

set -e
STORAGE_UID="${1:?Usage: $0 <storage_uid> [quota_gb] [--storage-backend zfs_dataset|zfs_zvol]}"
REQUIRED_QUOTA_GB="${2:-5}"

# Parse optional --storage-backend flag
STORAGE_BACKEND="zfs_dataset"
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --storage-backend)
      STORAGE_BACKEND="${2:?--storage-backend requires a value (zfs_dataset or zfs_zvol)}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$STORAGE_BACKEND" != "zfs_dataset" && "$STORAGE_BACKEND" != "zfs_zvol" ]]; then
  echo "Invalid --storage-backend: $STORAGE_BACKEND (must be zfs_dataset or zfs_zvol)" >&2
  exit 1
fi
REQUIRED_BYTES=$(( REQUIRED_QUOTA_GB * 1024 * 1024 * 1024 ))
# Validate quota is a positive integer
if [[ ! "$REQUIRED_QUOTA_GB" =~ ^[0-9]+$ ]] || [[ "$REQUIRED_QUOTA_GB" -lt 1 ]]; then
  echo "Invalid quota_gb: $REQUIRED_QUOTA_GB (must be a positive integer)" >&2
  exit 1
fi
PARENT_DATASET="datapool/users"
TARGET_DATASET="${PARENT_DATASET}/${STORAGE_UID}"
EXPECTED_OWNER="1000:1000"

# --- 1) Input validation (no disk changes) ---
if [[ ! "$STORAGE_UID" =~ ^u_[0-9a-f]{24}$ ]]; then
  echo "Invalid storage_uid (expected u_ + 24 hex chars)" >&2
  exit 1
fi

# --- 2) Pool and parent dataset must exist (read-only checks) ---
if ! zpool list -H datapool &>/dev/null; then
  echo "ZFS pool datapool does not exist" >&2
  exit 3
fi
if ! zfs list -H "$PARENT_DATASET" &>/dev/null; then
  echo "ZFS dataset $PARENT_DATASET does not exist" >&2
  exit 3
fi

# --- 3) Available space check (read-only) ---
# ZFS quota does not pre-allocate: USED = actual data written; quota is a ceiling.
# We check space *available under the parent* (AVAIL) so the new user's quota is actually usable.
# Require parent AVAIL >= quota size so the user can write up to their full quota.
if ! AVAIL_BYTES=$(zfs list -H -p -o avail "$PARENT_DATASET" 2>/dev/null); then
  echo "Cannot get available space for $PARENT_DATASET" >&2
  exit 3
fi
if [[ ! "$AVAIL_BYTES" =~ ^[0-9]+$ ]]; then
  echo "Unexpected available space value" >&2
  exit 3
fi
if [[ "$AVAIL_BYTES" -lt "$REQUIRED_BYTES" ]]; then
  echo "Insufficient space: $(( AVAIL_BYTES / 1024 / 1024 / 1024 ))GB available under $PARENT_DATASET; ${REQUIRED_QUOTA_GB}GB required for new quota" >&2
  exit 2
fi

# --- 4) Idempotent: existing dataset/zvol — do not modify or destroy ---
if zfs list -H "$TARGET_DATASET" &>/dev/null; then
  echo "Dataset already exists for $STORAGE_UID" >&2
  exit 0
fi

if [[ "$STORAGE_BACKEND" == "zfs_dataset" ]]; then
  # ======================================================================
  # ZFS DATASET PATH (default, quota-based — original production path)
  # ======================================================================

  # --- 5) Create dataset with fixed quota (only write operation) ---
  if ! zfs create -o quota="${REQUIRED_QUOTA_GB}G" "$TARGET_DATASET"; then
    echo "ZFS create failed for $TARGET_DATASET" >&2
    exit 3
  fi

  # --- 6) Post-create validation: dataset exists and quota is correct ---
  QUOTA_VAL=""
  if ! QUOTA_VAL=$(zfs get -H -o value quota "$TARGET_DATASET" 2>/dev/null); then
    echo "Failed to verify dataset quota" >&2
    exit 3
  fi
  # Expect quota like 5G or exact bytes
  if [[ "$QUOTA_VAL" != "${REQUIRED_QUOTA_GB}G" && "$QUOTA_VAL" != "$REQUIRED_BYTES" ]]; then
    echo "Quota verification failed: got $QUOTA_VAL" >&2
    exit 3
  fi

  # --- 7) Safe path for chown: must be absolute and under datapool, no traversal ---
  MOUNT=""
  if ! MOUNT=$(zfs get -H -o value mountpoint "$TARGET_DATASET" 2>/dev/null); then
    echo "Failed to get mountpoint" >&2
    exit 3
  fi
  if [[ -z "$MOUNT" || "$MOUNT" != /* ]]; then
    echo "Invalid mountpoint" >&2
    exit 3
  fi
  if [[ "$MOUNT" == *".."* ]]; then
    echo "Invalid mountpoint (path traversal)" >&2
    exit 3
  fi
  if [[ ! -d "$MOUNT" ]]; then
    echo "Mount point is not a directory" >&2
    exit 3
  fi

  # --- 8) chown only the new dataset mount ---
  if ! chown 1000:1000 "$MOUNT"; then
    echo "chown failed on $MOUNT" >&2
    exit 3
  fi

  # --- 9) Final check: ownership verified ---
  CURRENT=""
  if ! CURRENT=$(stat -c '%u:%g' "$MOUNT" 2>/dev/null); then
    echo "Failed to verify ownership" >&2
    exit 3
  fi
  if [[ "$CURRENT" != "$EXPECTED_OWNER" ]]; then
    echo "Ownership verification failed: got $CURRENT" >&2
    exit 3
  fi

  echo "Created ${REQUIRED_QUOTA_GB}GB dataset quota for $STORAGE_UID at $MOUNT"

else
  # ======================================================================
  # ZFS ZVOL PATH (fixed-size block device for NVMe-oF)
  # ======================================================================

  # --- 5z) Create zvol (fixed-size block device) ---
  if ! zfs create -V "${REQUIRED_QUOTA_GB}G" "$TARGET_DATASET"; then
    echo "ZFS zvol create failed for $TARGET_DATASET" >&2
    exit 3
  fi

  # --- 6z) Wait for block device to appear (up to 10s) ---
  ZVOL_DEV="/dev/zvol/${TARGET_DATASET}"
  ZVOL_READY=false
  for i in $(seq 1 10); do
    if [ -b "$ZVOL_DEV" ]; then
      ZVOL_READY=true
      break
    fi
    sleep 1
  done
  if [[ "$ZVOL_READY" != "true" ]]; then
    echo "Zvol block device $ZVOL_DEV did not appear within 10s" >&2
    exit 3
  fi

  # --- 7z) Format ext4 ---
  if ! mkfs.ext4 -F "$ZVOL_DEV"; then
    echo "Failed to format zvol $ZVOL_DEV with ext4" >&2
    exit 3
  fi

  # --- 8z) Create temp mount, set ownership, unmount ---
  TEMP_MOUNT="/tmp/zvol-init-${STORAGE_UID}"
  mkdir -p "$TEMP_MOUNT"
  if ! mount "$ZVOL_DEV" "$TEMP_MOUNT"; then
    echo "Failed to mount zvol $ZVOL_DEV at $TEMP_MOUNT" >&2
    rmdir "$TEMP_MOUNT" 2>/dev/null || true
    exit 3
  fi
  if ! chown 1000:1000 "$TEMP_MOUNT"; then
    echo "chown failed on zvol temp mount $TEMP_MOUNT" >&2
    umount "$TEMP_MOUNT" 2>/dev/null || true
    rmdir "$TEMP_MOUNT" 2>/dev/null || true
    exit 3
  fi
  umount "$TEMP_MOUNT"
  rmdir "$TEMP_MOUNT" 2>/dev/null || true

  # --- 9z) Final check: zvol block device exists ---
  if [ ! -b "$ZVOL_DEV" ]; then
    echo "Zvol block device $ZVOL_DEV not found after setup" >&2
    exit 3
  fi

  echo "Created ${REQUIRED_QUOTA_GB}GB zvol for $STORAGE_UID at $ZVOL_DEV"
fi
