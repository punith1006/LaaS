#!/usr/bin/env bash
# Provision 5GB ZFS dataset for an institution member (university_sso).
# Safe, read-only checks first; only creates after all validations pass.
# Does not modify or destroy existing datasets or quotas.
#
# Usage: provision-user-storage.sh <storage_uid>
# Exit codes: 0 = success, 1 = invalid args, 2 = insufficient space, 3 = zfs/system error
#
# Requires: datapool and datapool/users already exist (see LaaS_Node_Setup_Guide / Runbook).

set -e
STORAGE_UID="${1:?Usage: $0 <storage_uid>}"
REQUIRED_QUOTA_GB=5
REQUIRED_BYTES=$(( REQUIRED_QUOTA_GB * 1024 * 1024 * 1024 ))
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

# --- 4) Idempotent: existing dataset — do not modify quota or destroy ---
if zfs list -H "$TARGET_DATASET" &>/dev/null; then
  echo "Dataset already exists for $STORAGE_UID" >&2
  exit 0
fi

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

echo "Created ${REQUIRED_QUOTA_GB}GB quota for $STORAGE_UID at $MOUNT"
