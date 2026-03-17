# Storage provision service (host)

Run this on the **host** (ZFS/NFS node, e.g. 100.100.66.101). The LaaS backend calls it over HTTP to provision 5GB ZFS datasets for institution users.

## Prerequisites on host

- Python 3.8+
- ZFS: `datapool` and `datapool/users` exist (see LaaS Node Setup Guide / Runbook)
- Install the provision script and allow the app user to run it with sudo:

```bash
# Copy script from repo (or from your dev machine) to the host
sudo cp /path/to/backend/scripts/provision-user-storage.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/provision-user-storage.sh

# Allow user (e.g. zenith) to run only this script without password
echo 'zenith ALL=(root) NOPASSWD: /usr/local/bin/provision-user-storage.sh' | sudo tee /etc/sudoers.d/laas-provision
sudo chmod 440 /etc/sudoers.d/laas-provision
```

## Environment

- **PROVISION_SECRET** (required) – Shared secret; must match `USER_STORAGE_PROVISION_SECRET` in the backend `.env`.
- **PORT** (optional) – Default `9999`.
- **PROVISION_SCRIPT_PATH** (optional) – Default `/usr/local/bin/provision-user-storage.sh`.
- **ENABLE_NFS_AUTOMOUNT** (optional) – When set to `true`, the service will also:
  - Ensure an NFS export for `/datapool/users/<storage_uid>` on this host
  - Ensure a mount at `/mnt/nfs/users/<storage_uid>` (or `NFS_MOUNT_ROOT/<storage_uid>`)
  - Ensure a matching `/etc/fstab` entry
- **NFS_EXPORT_CLIENT** (optional) – NFS client used in exports and mounts. Default `127.0.0.1` (single-host POC).
- **NFS_MOUNT_ROOT** (optional) – Root directory for mounts. Default `/mnt/nfs/users`.

## Run

```bash
cd host-services/storage-provision
pip install -r requirements.txt
export PROVISION_SECRET="your-shared-secret-here"
# Optional NFS automount (single-host POC):
# export ENABLE_NFS_AUTOMOUNT=true
# export NFS_EXPORT_CLIENT=127.0.0.1
python3 app.py
```

Or with a specific port:

```bash
PORT=9999 PROVISION_SECRET="your-shared-secret" python3 app.py
```

The service listens on `0.0.0.0:9999`. Restrict access with a firewall (e.g. allow only the backend IP or Tailscale subnet).

## Endpoints

- **GET /health** – Returns 200 if the service and ZFS pool `datapool` are available; 503 otherwise.
- **POST /provision** – Body: `{ "storageUid": "u_...", "quotaGb": 5 }`. Header: `X-Provision-Secret: <secret>`. Returns 200 on success, 400/401/507/500 with JSON `{ "error": "..." }` on failure.

## Backend configuration (dev machine)

In backend `.env`:

```
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision
USER_STORAGE_PROVISION_SECRET=your-shared-secret-here
```

Use the same secret value on host and backend.
