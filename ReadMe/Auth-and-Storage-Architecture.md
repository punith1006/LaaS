# LaaS Auth and Storage Architecture – Dev Overview

This document explains the current LaaS authentication and per-user storage design in your **dev** environment. It is intended as a starting point for other agents (or future you) to extend the system safely.

It covers:

- How users sign in (local, OAuth, SSO via Keycloak).
- How the backend models users and issues JWTs.
- How 5GB storage is provisioned **only** for institution SSO users.
- How ZFS + NFS are wired on the host.
- Where to extend or harden the design later.

---

## 1. Big picture

- **Frontend** (React/Next):
  - Auth UI (local login, Google, GitHub, institution SSO).
  - Dashboard that shows user info and storage status.

- **Backend** (NestJS + Prisma + Postgres):
  - Single auth pipeline for:
    - Local email/password.
    - Public OAuth (Google/GitHub).
    - Institution SSO via Keycloak.
  - Issues its **own JWTs** for API access.
  - Tracks per-user storage provisioning status in the `User` record.

- **Auth / IdP** (Keycloak):
  - Realm for LaaS with:
    - Backend client (confidential).
    - Frontend client (public).
  - Identity brokering for institution SSO (e.g. LaaS Academy).

- **Storage host**:
  - ZFS pool `datapool` with parent dataset `datapool/users`.
  - Per-user datasets `datapool/users/<storage_uid>` with **5GB quota**.
  - NFS server exporting those subdatasets.

- **Provision service** (`host-services/storage-provision`):
  - Flask app on the storage host.
  - Validates a shared secret and request body.
  - Calls a hardened shell script to create ZFS datasets.
  - Optionally manages NFS exports/mounts for dev (single-host automount).

**Key invariant:** Only **institution SSO** users get storage, and only at **first-time user creation**. Local and public OAuth users never get a dataset.

---

## 2. User model and auth types

File: `backend/prisma/schema.prisma` → `model User`

Important fields:

- **Identity and auth:**
  - `id` – UUID primary key.
  - `email` – unique.
  - `authType` (`auth_type`) – indicates how the user authenticates:
    - `local` – email/password.
    - `public_oauth` – Google/GitHub.
    - `university_sso` – institution SSO via Keycloak.
  - `keycloakSub` (`keycloak_sub`) – Keycloak user id (SSO users).
  - `oauthProvider` (`oauth_provider`) – e.g. `google`, `github`.

- **Org/role context:**
  - `defaultOrgId` (`default_org_id`) – FK to `Organization`.
  - Relations to `UserOrgRole`, `LoginHistory`, `RefreshToken`, etc.

- **Storage fields:**
  - `storageUid` (`storage_uid`) – unique identifier for user storage, e.g. `u_<24 hex>`; `NULL` if no storage.
  - `storageProvisioningStatus` (`storage_provisioning_status`) – e.g. `provisioned`, `failed`, `pending`.
  - `storageProvisioningError` (`storage_provisioning_error`) – last error string from host/script (truncated).
  - `storageProvisionedAt` (`storage_provisioned_at`) – when provisioning succeeded.

These fields allow the backend and UI to know:

- Whether a user has storage at all.
- Whether provisioning worked or failed.
- When it was done.

---

## 3. Auth flows and when storage is created

### 3.1 Local email/password

- User signs up via the app’s signup form.
- Backend creates a `User` with:
  - `authType = 'local'`.
  - Password hash populated.
  - `storageUid` left `NULL`.
- No provisioning: `StorageService.provisionUserQuota` is **never called**.
- UI: dashboard should not show a dedicated 5GB disk for this user.

### 3.2 Public OAuth (Google/GitHub)

- Frontend initiates OAuth; backend handles callback.
- Backend creates or updates a `User` with:
  - `authType = 'public_oauth'`.
  - `oauthProvider` set to `google` or `github`.
  - `storageUid` remains `NULL`.
- No provisioning; same behavior as local accounts regarding storage.

### 3.3 Institution SSO (Keycloak)

- Frontend redirects to Keycloak (LaaS realm, LaaS Academy broker).
- Backend receives a validated token from Keycloak:
  - If **user does not exist** yet:
    - Creates a `User` with `authType = 'university_sso'`.
    - Sets org/roles based on Keycloak groups/attributes.
    - Generates a `storageUid` like `u_<24 hex>`.
    - Calls `StorageService.provisionUserQuota(storageUid)` once.
    - Sets storage fields based on result:
      - On success: `storageProvisioningStatus='provisioned'`, error `NULL`, `storageProvisionedAt` set.
      - On failure: `storageProvisioningStatus='failed'`, `storageProvisioningError` set from host.
  - If **user already exists** (same Keycloak sub):
    - Updates profile as needed.
    - **Does NOT** call provisioning again.
    - `storageUid` is reused, and `storageProvisioningStatus`/`storageProvisionedAt` remain unchanged.

This guarantees that storage is created **exactly once** per SSO user, and never for other auth types.

---

## 4. Backend storage service

File: `backend/src/storage/storage.service.ts`

Key responsibilities:

- Validate the `storageUid` format (must start with `u_`).
- Decide provisioning backend:
  - Script-based: `USER_STORAGE_PROVISION_SCRIPT`.
  - HTTP-based: `USER_STORAGE_PROVISION_URL` + `USER_STORAGE_PROVISION_SECRET`.
- Enforce a 5GB quota for each SSO user.
- Capture errors and expose them via `ProvisionResult`.

### 4.1 HTTP-based provisioning (current dev path)

Env in `backend/.env`:

```env
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision
USER_STORAGE_PROVISION_SECRET=<same-as-host-PROVISION_SECRET>
```

Behavior:

- `provisionUserQuota(storageUid)`:
  - Rejects bad `storageUid` values early and returns `ok: false` + error.
  - Builds a POST request to the host:
    - Headers:
      - `Content-Type: application/json`
      - `X-Provision-Secret: USER_STORAGE_PROVISION_SECRET`
      - `X-Request-Id: random UUID`
    - Body:
      - `{ "storageUid": "u_...", "quotaGb": 5 }`.
  - 15 second timeout.
  - Interprets non-2xx responses:
    - Tries to parse JSON `{ "error": "..." }`.
    - Falls back to response text.
    - Truncates error to 500 chars.
  - Returns `{ ok: true }` or `{ ok: false, error }`.

The auth layer uses this to update `storageProvisioningStatus`, `storageProvisioningError`, and `storageProvisionedAt` on the `User`.

---

## 5. Host provision service (Flask + ZFS script)

Directory: `host-services/storage-provision`

### 5.1 HTTP service (`app.py`)

- Env:
  - `PROVISION_SECRET` – shared secret; must match backend env.
  - `PORT` – HTTP port (default 9999).
  - `PROVISION_SCRIPT_PATH` – script path (default `/usr/local/bin/provision-user-storage.sh`).
  - **Optional** (dev-only automount):
    - `ENABLE_NFS_AUTOMOUNT` – `true` to enable NFS export/mount/fstab management.
    - `NFS_EXPORT_CLIENT` – default `127.0.0.1`.
    - `NFS_MOUNT_ROOT` – default `/mnt/nfs/users`.

Endpoints:

- `GET /health`:
  - Runs `zpool list -H datapool`.
  - Returns 200 if pool is accessible, 503 otherwise.

- `POST /provision`:
  - Auth:
    - Checks `X-Provision-Secret` vs `PROVISION_SECRET`, else 401.
  - Body validation:
    - `storageUid` matches `^u_[0-9a-f]{24}$`.
    - `quotaGb` within `[1, 50]` (though script uses fixed 5G).
  - ZFS readiness:
    - `pre_check_zfs_ready()`:
      - Ensures `datapool` and `datapool/users` exist.
  - Runs the script:
    - `run_provision_script(storageUid)` → calls `sudo PROVISION_SCRIPT_PATH storageUid`.
  - Post-verification:
    - `post_verify_provisioned(storageUid)`:
      - Uses `zfs get quota` to ensure 5G (or exact bytes).
  - Optional NFS reconciliation (when `ENABLE_NFS_AUTOMOUNT=true`):
    - `reconcile_nfs_for(storageUid)`:
      - Ensure export line in `/etc/exports`.
      - `exportfs -ra`.
      - Ensure mount at `/mnt/nfs/users/<storage_uid>`.
      - Ensure fstab line for persistence.
  - Logs all outcomes as JSON:
    - `{"ts": ..., "request_id": ..., "client_ip": ..., "storage_uid": ..., "outcome": "success|failed", "error": "..."? }`.

### 5.2 Provision script (`provision-user-storage.sh`)

Path (on host): `/usr/local/bin/provision-user-storage.sh`  
Source: `backend/scripts/provision-user-storage.sh`

Behavior:

- Input validation:
  - Requires `storage_uid` argument.
  - Enforces `u_` + 24 hex characters.
- Read-only checks:
  - `zpool list -H datapool` → pool exists.
  - `zfs list -H datapool/users` → parent dataset exists.
- Available space:
  - Uses `zfs list -H -p -o avail datapool/users`.
  - Requires AVAIL ≥ **5GB in bytes**.
- Idempotency:
  - If `zfs list -H datapool/users/<storage_uid>` succeeds, exits 0 (no changes).
- Creation:
  - `zfs create -o quota=5G datapool/users/<storage_uid>`.
  - Confirms quota via `zfs get quota`.
  - Gets mountpoint via `zfs get mountpoint`.
  - Validates mountpoint is an absolute path under the expected tree (no `..`).
  - `chown 1000:1000 <mountpoint>`, then verifies owner via `stat`.

This guarantees:

- No accidental writes if pool or parent dataset are missing.
- No partial or mis-quota’d user datasets.
- Re-running provisioning for the same `storageUid` is safe.

---

## 6. NFS design and Fix Guide alignment

Earlier, the POC Runbook exported `datapool/users` as a single NFS share and mounted it once for all users. The **Fix Guide** (`Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx`) showed that:

- This breaks per-user quotas and isolation.
- All user data was landing in the parent dataset instead of each subdataset.

The **correct pattern**, which you now use, is:

- One ZFS dataset per user: `datapool/users/<storage_uid>`.
- One NFS export per user:
  - `/datapool/users/<storage_uid> <client>(rw,sync,no_subtree_check,no_root_squash)`
- One mountpoint per user on the container host:
  - `/mnt/nfs/users/<storage_uid>`
- One bind mount per container:
  - `-v /mnt/nfs/users/<storage_uid>:/home/ubuntu`

This ensures:

- Each user’s quota is enforced at ZFS level.
- `df -h /home/ubuntu` inside the container shows the user’s quota (5G), not full pool size.
- `USED` in `zfs list` grows in the user’s dataset, not in the parent.

For dev, the **automount** logic in `app.py` can maintain NFS exports/mounts automatically when `ENABLE_NFS_AUTOMOUNT=true`. In production, you will likely:

- Turn that off.
- Use an orchestrator (or config management like Ansible) to manage:
  - Exports on the NAS.
  - Mounts and fstab entries on each compute node.

---

## 7. Dev database cleanup

File: `backend/prisma/cleanup-dev-data.ts`

Purpose:

- Reset dev DB state so you can re-run end-to-end tests without leftover users or tokens.

What it deletes (in order):

1. `LoginHistory`
2. `RefreshToken`
3. `UserPolicyConsent`
4. `OtpVerification`
5. `UserOrgRole`
6. `User`

What it keeps:

- `Organization` and other shared reference data.

Usage:

```bash
cd backend
npx ts-node prisma/cleanup-dev-data.ts
```

or, for compiled JS:

```bash
cd backend
node dist/prisma/cleanup-dev-data.js
```

---

## 8. Where to extend next

When another agent continues this project, they should:

- **Read these files first:**
  - `backend/prisma/schema.prisma` – especially `User`, `Organization`, and relations.
  - `backend/src/storage/storage.service.ts` – storage provisioning surface.
  - `host-services/storage-provision/app.py` – host-side API and enforcement.
  - `backend/scripts/provision-user-storage.sh` – actual ZFS logic and safety checks.
  - `ReadMe/Storage-Provisioning.md` – conceptual overview.
  - `ReadMe/Storage-Provisioning-Setup.md` and `ReadMe/Storage-Provisioning-Step-by-Step.md` – how to bring it up.
  - `Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx` – background on the ZFS/NFS bug and fix.

- **Be mindful of:**
  - Sudoers configuration on the storage host (dev vs prod).
  - Deprovisioning logic (destroying ZFS datasets and cleaning NFS) when users are deleted.
  - Multi-node NFS scenarios (dedicated NAS + separate compute nodes).
  - Monitoring/alerting for provisioning failures and low disk space.

This setup gives a solid, **safe** foundation for SSO-bound storage in dev, with clear extension points for production hardening and scaling.

