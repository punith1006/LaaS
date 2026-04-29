# Storage provisioning – setup checklist

Use this to set up 5GB provisioning for institution users. Do **host** steps first, then **backend**, then **verify**.

**For a linear step-by-step guide starting from prerequisite checks,** see [ReadMe/Storage-Provisioning-Step-by-Step.md](Storage-Provisioning-Step-by-Step.md).

**Important:** Provisioning creates only the **ZFS dataset** (and quota, chown) for each user. For containers to use that storage, the host must **export each user’s subdataset in NFS** (not the parent `datapool/users`) and use per-user mount points. See [LaaS NFS/ZFS Fix Guide](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx) and the [Post-provision: NFS](#post-provision-nfs-export-and-mount-host) section below.

---

## Before you start

- **Host:** SSH access to the ZFS/NFS machine (e.g. `zenith@100.100.66.101`).
- **NFS architecture:** Host must export **per-user ZFS subdatasets** in NFS (e.g. `/datapool/users/u_xxx`), not the parent `/datapool/users`. Otherwise quota and isolation break. The **POC Runbook’s NFS section** (exporting `/datapool/users` and mounting it once) uses the wrong pattern; follow [Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx) instead.
- **Secret:** Choose a strong shared secret (e.g. `openssl rand -hex 24`). You’ll use it on both host and backend.
- **Backend:** Your LaaS backend runs on your dev machine and can reach the host on port 9999 (same LAN or Tailscale).

---

## Part 1: Host setup

SSH to the host and run these in order.

### 1.1 ZFS pool and parent dataset

```bash
# Check pool exists
sudo zpool list datapool

# Check parent dataset exists
sudo zfs list datapool/users
```

If either command fails, create the pool and dataset first (see [LaaS_Node_Setup_Guide_v1](Important_docs/LaaS_Node_Setup_Guide_v1.txt) or Runbook).

### 1.2 Copy and install the provision script

From your **dev machine** (PowerShell), copy the script to the host:

```powershell
scp c:\Users\Punith\LaaS\backend\scripts\provision-user-storage.sh zenith@100.100.66.101:~/
```

Then on the **host**:

```bash
sudo mv ~/provision-user-storage.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/provision-user-storage.sh
```

Verify:

```bash
/usr/local/bin/provision-user-storage.sh
# Expected: "Usage: ... <storage_uid>"
```

### 1.3 Sudoers (allow Flask user to run script as root)

Replace `zenith` with the user that will run the Flask app:

```bash
echo 'zenith ALL=(root) NOPASSWD: /usr/local/bin/provision-user-storage.sh' | sudo tee /etc/sudoers.d/laas-provision
sudo chmod 440 /etc/sudoers.d/laas-provision
```

### 1.4 Deploy and run the Flask provision service

Copy the Flask app to the host. From **dev machine**:

```powershell
scp -r c:\Users\Punith\LaaS\host-services\storage-provision zenith@100.100.66.101:~/
```

On the **host**:

```bash
cd ~/storage-provision
pip install -r requirements.txt
export PROVISION_SECRET="YOUR_SHARED_SECRET_HERE"
python app.py
```

Use the same secret you’ll set in the backend. To run in background:

```bash
nohup env PROVISION_SECRET="YOUR_SHARED_SECRET_HERE" python app.py > provision.log 2>&1 &
```

Optional: use port 9999 explicitly:

```bash
PORT=9999 PROVISION_SECRET="YOUR_SHARED_SECRET_HERE" python app.py
```

### 1.5 Firewall (recommended)

On the host, allow port 9999 only from your backend (or Tailscale subnet):

```bash
# Replace with your backend machine IP or subnet, e.g. 100.x.x.x for Tailscale
sudo ufw allow from YOUR_BACKEND_IP to any port 9999
sudo ufw reload
```

---

## Part 2: Backend configuration (dev machine)

In `backend/.env` add or set:

```env
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision
USER_STORAGE_PROVISION_SECRET=YOUR_SHARED_SECRET_HERE
```

- Use the **same** value for `USER_STORAGE_PROVISION_SECRET` as `PROVISION_SECRET` on the host.
- Replace `100.100.66.101` with your host IP if different.

Restart the backend after saving.

---

## Part 3: Verify

### 3.1 Health (on host or from dev)

```bash
curl -s http://100.100.66.101:9999/health
# Empty 200 = OK; 503 = pool not available
```

### 3.2 Provision (from dev machine)

Use a valid `storage_uid` (e.g. `u_` + 24 hex chars). Example:

```bash
curl -s -X POST http://100.100.66.101:9999/provision \
  -H "Content-Type: application/json" \
  -H "X-Provision-Secret: YOUR_SHARED_SECRET_HERE" \
  -H "X-Request-Id: $(uuidgen)" \
  -d "{\"storageUid\":\"u_1234567890abcdef12345678\",\"quotaGb\":5}"
```

- **200** + `{"ok":true,"path":"..."}` = success.
- **401** = wrong or missing secret.
- **507** = insufficient space in pool.

### 3.3 End-to-end

Create a new institution SSO user (e.g. sign in with LaaS Academy). Then:

- Backend logs: look for “Storage provisioned via URL” or “Storage provision URL … status=…”
- Dashboard: user should see storage as provisioned, or “Disk provisioning failed” with retry if something failed.

---

## Post-provision: NFS export and mount (host)

Provisioning only creates the ZFS dataset (`datapool/users/<storage_uid>`) with quota and chown. For containers to see that storage you must **export that subdataset in NFS** (never the parent `datapool/users`) and mount it on the machine that runs containers. Per [LaaS NFS/ZFS Fix Guide](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx).

**For each newly provisioned user** (e.g. `u_1234567890abcdef12345678`):

### On the NFS server (storage host where ZFS lives)

1. **Append** one line to `/etc/exports` for the subdataset (do **not** overwrite the file or you remove other users’ exports). Replace client/options with your setup (e.g. `127.0.0.1` for same-host, or compute-node IP/subnet):
   ```bash
   echo '/datapool/users/u_1234567890abcdef12345678  127.0.0.1(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports
   ```
2. **Apply exports** (and restart NFS server if your setup requires it):
   ```bash
   sudo exportfs -ra
   # If new exports are not picked up: sudo systemctl restart nfs-kernel-server
   ```

### On the machine that runs containers (same host or a compute node)

3. **Create mount point:**
   ```bash
   sudo mkdir -p /mnt/nfs/users/u_1234567890abcdef12345678
   ```
4. **Mount** the subdataset. Use `127.0.0.1` only if containers run on the **same** host as NFS; otherwise use the NFS server’s IP or hostname:
   ```bash
   sudo mount -t nfs4 127.0.0.1:/datapool/users/u_1234567890abcdef12345678 /mnt/nfs/users/u_1234567890abcdef12345678
   ```
5. **Persist in fstab** on that same machine (so the mount survives reboot). Replace `127.0.0.1` with NFS server IP if different:
   ```bash
   echo '127.0.0.1:/datapool/users/u_1234567890abcdef12345678 /mnt/nfs/users/u_1234567890abcdef12345678 nfs4 defaults 0 0' | sudo tee -a /etc/fstab
   ```

Containers then use this path (e.g. `-v /mnt/nfs/users/<storage_uid>:/home/ubuntu`). Rule: **export and mount each user subdataset, not the parent**.

---

## Quick reference

| Where   | What to set |
|--------|-------------|
| Host   | `PROVISION_SECRET` (env when running `app.py`) |
| Backend| `USER_STORAGE_PROVISION_URL`, `USER_STORAGE_PROVISION_SECRET` in `.env` |

Full process details: [ReadMe/Storage-Provisioning.md](Storage-Provisioning.md).
