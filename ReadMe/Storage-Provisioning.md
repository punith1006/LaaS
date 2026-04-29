# LaaS: 5GB Storage Provisioning for Institution Users

This document describes the end-to-end process for provisioning 5GB persistent ZFS storage when an **institution (university) SSO user** is created. The backend runs on your **dev machine**; ZFS and the provision service run on the **host** (e.g. 100.100.66.101).

---

## Table of contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Host setup](#host-setup)
5. [Backend configuration](#backend-configuration)
6. [Security](#security)
7. [Validation and logging](#validation-and-logging)
8. [Testing and troubleshooting](#testing-and-troubleshooting)
9. [Reference](#reference)

---

## Overview

- **Who gets storage:** Only users who sign in via **institution SSO** (e.g. LaaS Academy). Their first-time creation triggers one 5GB ZFS dataset on the host. Public (email/password or Google/GitHub) users do not get persistent storage.
- **When it runs:** Once, at **user creation** (not on login or update). If provisioning fails, the user record is still created; status is stored and shown on the dashboard (“Disk provisioning failed” with option to retry).
- **Flow:** Backend calls the host over HTTP (POST with shared secret). The host validates the request, checks pool space, runs the ZFS script, and returns success or a clear error. The backend updates the user’s `storageProvisioningStatus` and optional `storageProvisioningError`.

---

## Architecture

```
┌─────────────────────┐                    ┌──────────────────────────────┐
│  Dev machine       │                    │  Host (e.g. 100.100.66.101)   │
│  (LaaS backend)     │   HTTP POST        │  (ZFS / NFS / containers)      │
│                    │   /provision       │                                │
│  - User created    │ ─────────────────► │  - Flask app (port 9999)      │
│    (university_sso)│   X-Provision-     │  - Validates secret & body     │
│  - Calls provision │     Secret         │  - Runs provision script       │
│    URL with secret │   X-Request-Id     │  - ZFS create + chown          │
│  - 15s timeout     │   { storageUid }   │  - Returns 200 / 4xx / 5xx     │
│  - Persists status │                    │  - Structured logs            │
└─────────────────────┘                    └──────────────────────────────┘
```

- **Backend** (NestJS): [backend/src/storage/storage.service.ts](../backend/src/storage/storage.service.ts) — sends request with secret and request-id, handles timeout and response (including JSON `error`), updates user status.
- **Host service** (Python Flask): [host-services/storage-provision/](../host-services/storage-provision/) — auth, validation, runs [backend/scripts/provision-user-storage.sh](../backend/scripts/provision-user-storage.sh) via sudo, returns HTTP and JSON errors.
- **ZFS script**: [backend/scripts/provision-user-storage.sh](../backend/scripts/provision-user-storage.sh) — checks pool space, creates `datapool/users/<storage_uid>` with 5G quota, chown 1000:1000.

---

## Prerequisites

- **Host:** Ubuntu (or similar) with ZFS and NFS already set up per **LaaS Node Setup Guide** / **LaaS POC Runbook**: pool `datapool`, dataset `datapool/users`, NFS export. Python 3.8+ for the Flask service.
- **NFS:** Export **each user’s ZFS subdataset** in NFS (e.g. `/datapool/users/u_xxx`), not the parent `/datapool/users`, so quota and isolation work. The POC Runbook’s NFS section (exporting `/datapool/users`) is the wrong pattern; use [Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx](../Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx).
- **Network:** Backend (dev machine) can reach the host on the provision port (e.g. 9999) — same LAN or Tailscale. Firewall on the host should allow only the backend (or your Tailscale subnet), not the public internet.
- **Docs:** [Important_docs/LaaS_Node_Setup_Guide_v1.txt](../Important_docs/LaaS_Node_Setup_Guide_v1.txt), [Important_docs/LaaS_POC_Runbook_v2.txt](../Important_docs/LaaS_POC_Runbook_v2.txt).

---

## Host setup

Do this on the **host** (e.g. `ssh zenith@100.100.66.101`).

### Step 1: ZFS pool and dataset

Ensure `datapool` and `datapool/users` exist (see Node Setup Guide, Step 7). Example:

```bash
sudo zpool list datapool
sudo zfs list datapool/users
```

### Step 2: Install the provision script

Copy the script from the repo (or from your dev machine) to the host:

```bash
# From the host, if the repo is there; otherwise scp from dev machine
sudo cp /path/to/LaaS/backend/scripts/provision-user-storage.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/provision-user-storage.sh
```

Verify:

```bash
/usr/local/bin/provision-user-storage.sh
# Should print: Usage: ... <storage_uid>
```

### Step 3: Sudoers for the provision script

The Flask app runs as a normal user (e.g. `zenith`) and must run the script with sudo. Allow only that script, without a password:

```bash
echo 'zenith ALL=(root) NOPASSWD: /usr/local/bin/provision-user-storage.sh' | sudo tee /etc/sudoers.d/laas-provision
sudo chmod 440 /etc/sudoers.d/laas-provision
```

Replace `zenith` with the user that will run the Flask app.

### Step 4: Deploy and run the Flask provision service

Copy the `host-services/storage-provision` folder to the host (e.g. via git clone, scp, or rsync). Then:

```bash
cd host-services/storage-provision
pip install -r requirements.txt
export PROVISION_SECRET="your-shared-secret-here"
python app.py
```

Or with a specific port:

```bash
PORT=9999 PROVISION_SECRET="your-shared-secret" python app.py
```

The service listens on `0.0.0.0:9999`. To run it in the background or as a systemd service, see your usual process manager.

**Optional:** Bind only to a specific IP (e.g. Tailscale) by changing `app.run(host="0.0.0.0", ...)` to that IP, or rely on firewall rules.

### Step 5: Firewall

Allow the provision port only from the backend (or your Tailscale subnet):

```bash
# Example: allow from a specific IP (your dev machine or Tailscale subnet)
sudo ufw allow from <backend-ip> to any port 9999
sudo ufw reload
```

### After each provision: NFS export and mount

Provisioning creates only the ZFS dataset. For containers to use it: on the **NFS server** append an export for that subdataset and run `exportfs -ra`; on the **machine that runs containers** create the mount point, mount the subdataset, and add an fstab entry (never export or mount the parent `datapool/users`). See [ReadMe/Storage-Provisioning-Setup.md](Storage-Provisioning-Setup.md#post-provision-nfs-export-and-mount-host) and the [NFS/ZFS Fix Guide](../Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx).

---

## Backend configuration

On your **dev machine**, in the backend `.env`:

```bash
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision
USER_STORAGE_PROVISION_SECRET=your-shared-secret-here
```

- Use the **same** secret value as `PROVISION_SECRET` on the host.
- Replace `100.100.66.101` with your host’s IP or hostname if different.
- Restart the backend after changing these.

If you leave `USER_STORAGE_PROVISION_URL` (and the script option) unset, provisioning is skipped; institution users are still created but get `storageProvisioningStatus: 'failed'` and a message that provisioning was skipped.

---

## Security

- **Shared secret:** The backend sends `X-Provision-Secret` on every request; the host returns **401** if it is missing or wrong. Keep the secret strong and do not commit it.
- **HTTP (current):** Traffic is not encrypted. Use a **private network** (e.g. Tailscale or LAN) and restrict the provision port to the backend. Plan to move to **HTTPS** when you have a certificate (see plan doc).
- **Secret rotation:** Update `USER_STORAGE_PROVISION_SECRET` in the backend and `PROVISION_SECRET` on the host, then restart both.
- **Least privilege:** The host user that runs the Flask app only has sudo for the single provision script, not full root.

---

## Safety and validation (host disk and quotas)

Provisioning is designed **not** to corrupt the host disk or alter existing user quotas:

- **No destructive operations:** The script and host service never run `zfs destroy`, `zpool` modify, or any command that removes or resizes existing datasets. Only **new** datasets under `datapool/users/<storage_uid>` are created.
- **Idempotent for existing datasets:** If the dataset for a `storage_uid` already exists, the script exits success without changing its quota or properties.
- **Validation at each step (script):**  
  1) Input: `storage_uid` must match `u_` + 24 hex chars.  
  2) Read-only checks: pool `datapool` and parent `datapool/users` must exist.  
  3) Available space: space available under `datapool/users` (AVAIL) must be at least 5GB so the new quota is usable; else exit with clear message (ZFS quota does not pre-allocate — we ensure the user can actually use their quota).
  4) Create only after all checks pass.
  5) Post-create: verify dataset exists and quota is 5G.
  6) Mount path validated (absolute path, no `..`).
  7) `chown` only on that mount; ownership verified before reporting success.
- **Host service:** Before calling the script, verifies pool and `datapool/users` exist (returns 500 if not). After the script returns 0, verifies the dataset exists and has 5G quota; only then returns **200** to the backend. Any failure returns the appropriate HTTP status and a clear `error` message for the backend to log.

## Validation and logging

- **Host:** Validates `storageUid` format (`u_` + 24 hex chars) and `quotaGb` (1–50). Pre-check (ZFS ready) and post-check (dataset + quota) before reporting success. Logs one JSON line per request (timestamp, request_id, client_ip, storage_uid, outcome, error). Never logs the secret.
- **Backend:** Sends `X-Request-Id` (UUID), uses a 15s timeout, parses JSON `error` from failed responses and stores it in `storageProvisioningError` (capped at 500 chars). Logs requestId, storageUid, status, and truncated error; never logs the secret.
- **Dashboard:** For institution users, shows “Disk provisioning failed” and the stored error when status is `failed`, and “Retry storage setup” which calls the backend retry endpoint.

---

## Testing and troubleshooting

1. **Health check (on host):**
   ```bash
   curl -s http://localhost:9999/health
   ```
   Expect empty 200 if the pool is available, or 503 with JSON `error` if not.

2. **Provision (from dev machine):**
   ```bash
   curl -s -X POST http://100.100.66.101:9999/provision \
     -H "Content-Type: application/json" \
     -H "X-Provision-Secret: your-shared-secret" \
     -H "X-Request-Id: $(uuidgen)" \
     -d '{"storageUid":"u_1234567890abcdef12345678","quotaGb":5}'
   ```
   - 200: success (dataset created or already exists).
   - 401: wrong or missing secret.
   - 400: invalid storageUid or quotaGb.
   - 507: insufficient space in pool.
   - 500: script or ZFS error (check host logs and script path/sudoers).

3. **Backend logs:** Look for `Storage provisioned via URL requestId=...` on success, or `Storage provision URL ... status=... error=...` on failure.

4. **User status:** Call `GET /api/auth/me` (with the user’s JWT); response includes `storageProvisioningStatus` and `storageProvisioningError` for institution users.

5. **Retry:** From the dashboard, “Retry storage setup” triggers the backend’s storage-retry endpoint, which calls the host again and updates the user’s status.

---

## Reference

- **Plan (secure communication and validation):** [.cursor/plans/storage_provisioning_secure_dev_to_host.plan.md](../.cursor/plans/storage_provisioning_secure_dev_to_host.plan.md)
- **Host service README:** [host-services/storage-provision/README.md](../host-services/storage-provision/README.md)
- **Provision script:** [backend/scripts/provision-user-storage.sh](../backend/scripts/provision-user-storage.sh)
- **Backend storage service:** [backend/src/storage/storage.service.ts](../backend/src/storage/storage.service.ts)
- **Node Setup Guide:** [Important_docs/LaaS_Node_Setup_Guide_v1.txt](../Important_docs/LaaS_Node_Setup_Guide_v1.txt)
- **POC Runbook:** [Important_docs/LaaS_POC_Runbook_v2.txt](../Important_docs/LaaS_POC_Runbook_v2.txt)
