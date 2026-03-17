# Storage provisioning – step-by-step setup guide

Follow these steps in order to set up 5GB provisioning for institution (SSO) users. Start with **Step 0** (prerequisite checks), then **host** (Steps 1–4), then **backend** (Step 5), then **verify** (Step 6).

**Note:** Provisioning only creates the **ZFS dataset** (quota + chown). For containers to use that storage, you must also [export and mount each user’s subdataset in NFS](#after-provisioning-nfs-export-and-mount) (never the parent `datapool/users`). See [LaaS NFS/ZFS Fix Guide](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx).

---

## Step 0: Prerequisite checks

Run these **before** you start. Fix any failure before going to Step 1.

### 0.1 SSH access to the storage host

**Where:** Your dev machine (PowerShell or terminal).

```powershell
ssh zenith@100.100.66.101
```

- **Pass:** You get a shell on the host.
- **Fail:** Fix SSH keys or network; replace `zenith@100.100.66.101` with your user and host.

---

### 0.2 ZFS pool `datapool` exists

**Where:** On the host (after SSH).

```bash
sudo zpool list datapool
```

- **Pass:** A table with `datapool` and HEALTH e.g. `ONLINE`.
- **Fail:** Create the pool first (see [LaaS_Node_Setup_Guide_v1](Important_docs/LaaS_Node_Setup_Guide_v1.txt) or Runbook).

---

### 0.3 Parent dataset `datapool/users` exists

**Where:** On the host.

```bash
sudo zfs list datapool/users
```

- **Pass:** A line showing `datapool/users` and a MOUNTPOINT (e.g. `/datapool/users`).
- **Fail:** Create it: `sudo zfs create datapool/users`.

---

### 0.4 Enough space for at least one 5GB quota

**Where:** On the host.

```bash
sudo zfs list -H -p -o avail datapool/users
```

- **Pass:** The number is at least **5368709120** (5GB in bytes).
- **Fail:** Free space under the parent or add more disk; do not proceed until AVAIL ≥ 5GB.

---

### 0.5 NFS exports use subdatasets, not the parent

**Where:** On the host.

```bash
sudo exportfs -v
```

- **Pass:** Exports list **per-user paths** like `/datapool/users/testuser3` or `/datapool/users/u_xxx`, and **not** only `/datapool/users`.
- **Fail:** Follow [LaaS NFS/ZFS Fix Guide](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx); export each subdataset, not the parent.

---

### 0.6 Python 3.8+ on the host

**Where:** On the host.

```bash
python3 --version
```

- **Pass:** e.g. `Python 3.10.x`.
- **Fail:** Install Python 3.8+ (e.g. `sudo apt install python3 python3-pip`).

---

### 0.7 Shared secret and backend reachability

- **Secret:** Choose a strong secret (e.g. `openssl rand -hex 24` on Linux/macOS). You will set it on both host and backend.
- **Reachability:** From your **dev machine**, ensure you can reach the host on port **9999** (same LAN or Tailscale). You will open the firewall in Step 4 if needed.

---

## Step 1: Install the provision script on the host

### 1.1 Copy the script from dev machine to host

**Where:** Dev machine (PowerShell). Adjust path and host if needed.

```powershell
scp c:\Users\Punith\LaaS\backend\scripts\provision-user-storage.sh zenith@100.100.66.101:~/
```

### 1.2 Install it on the host

**Where:** On the host.

```bash
sudo mv ~/provision-user-storage.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/provision-user-storage.sh
```

### 1.3 Verify the script

**Where:** On the host.

```bash
/usr/local/bin/provision-user-storage.sh
```

- **Expected:** `Usage: /usr/local/bin/provision-user-storage.sh <storage_uid>` (and exit non-zero).
- If you see "Permission denied" or "not found", fix the path and permissions.

---

## Step 2: Allow the Flask user to run the script with sudo

**Where:** On the host. Replace `zenith` with the user that will run the Flask app.

```bash
echo 'zenith ALL=(root) NOPASSWD: /usr/local/bin/provision-user-storage.sh' | sudo tee /etc/sudoers.d/laas-provision
sudo chmod 440 /etc/sudoers.d/laas-provision
```

- **Verify:** `sudo visudo -c` (or `sudo cat /etc/sudoers.d/laas-provision`) to confirm the line is correct.

---

## Step 3: Deploy and run the Flask provision service on the host

### 3.1 Copy the Flask app to the host

**Where:** Dev machine.

```powershell
scp -r c:\Users\Punith\LaaS\host-services\storage-provision zenith@100.100.66.101:~/
```

### 3.2 Install dependencies and run the service

**Where:** On the host. Use the **same** secret you will put in the backend `.env`.

```bash
cd ~/storage-provision
pip install -r requirements.txt
export PROVISION_SECRET="YOUR_SHARED_SECRET_HERE"
python app.py
```

- Service listens on `0.0.0.0:9999`. Leave this terminal open, or run in background (next step).

### 3.3 (Optional) Run the service in the background

**Where:** On the host.

```bash
cd ~/storage-provision
nohup env PROVISION_SECRET="YOUR_SHARED_SECRET_HERE" python app.py > provision.log 2>&1 &
```

- To use a specific port: `PORT=9999 PROVISION_SECRET="YOUR_SHARED_SECRET_HERE" python app.py`

---

## Step 4: Open firewall for the provision port (recommended)

**Where:** On the host. Replace `YOUR_BACKEND_IP` with your dev machine IP or Tailscale subnet (e.g. `100.64.0.0/10`).

```bash
sudo ufw allow from YOUR_BACKEND_IP to any port 9999
sudo ufw reload
```

- Skip if the host has no firewall or you are only testing on the same machine.

---

## Step 5: Configure the backend (dev machine)

### 5.1 Set provision URL and secret in `.env`

**Where:** Dev machine. Edit `backend/.env`.

Add or set (use the **same** secret as on the host; replace the host IP if different):

```env
USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision
USER_STORAGE_PROVISION_SECRET=YOUR_SHARED_SECRET_HERE
```

### 5.2 Restart the backend

**Where:** Dev machine. Restart your NestJS backend so it reads the new env.

---

## Step 6: Verify the setup

### 6.1 Health check

**Where:** Dev machine or host.

```bash
curl -s -o /dev/null -w "%{http_code}" http://100.100.66.101:9999/health
```

- **Expected:** `200`. If `503`, the pool or service is not ready.

### 6.2 Test provision with a test storage_uid

**Where:** Dev machine. Use a valid format: `u_` + 24 hex characters.

```bash
curl -s -X POST http://100.100.66.101:9999/provision \
  -H "Content-Type: application/json" \
  -H "X-Provision-Secret: YOUR_SHARED_SECRET_HERE" \
  -H "X-Request-Id: test-request-001" \
  -d "{\"storageUid\":\"u_1234567890abcdef12345678\",\"quotaGb\":5}"
```

- **Expected:** `{"ok":true,"path":"/datapool/users/u_1234567890abcdef12345678"}` and HTTP 200.
- **401:** Wrong or missing secret.
- **507:** Insufficient space under `datapool/users`.
- **500:** Check host logs and script/sudoers.

**On the host, confirm the dataset exists:**

```bash
sudo zfs list datapool/users/u_1234567890abcdef12345678
```

- You should see the new dataset with quota 5G and USED small (e.g. 24K).

### 6.3 End-to-end test with a real SSO user

1. Sign in to the app with **institution SSO** (e.g. LaaS Academy) as a **new** user.
2. Check **backend logs** for “Storage provisioned via URL” or “Storage provision URL … status=…”.
3. Check the **dashboard**: storage should show as provisioned, or “Disk provisioning failed” with retry if something failed.

---

## After provisioning: NFS export and mount

Provisioning only creates the ZFS dataset. For containers to use it you must **export that subdataset in NFS** and mount it on the machine that runs containers (see [LaaS NFS/ZFS Fix Guide](Important_docs/LaaS_NFS_ZFS_Fix_Guide.docx)).

**For each newly provisioned user** (e.g. `u_1234567890abcdef12345678`):

### On the NFS server (storage host)

1. Append one line to `/etc/exports` (do **not** overwrite the file):

   ```bash
   echo '/datapool/users/u_1234567890abcdef12345678  127.0.0.1(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports
   ```

2. Apply exports:

   ```bash
   sudo exportfs -ra
   # If needed: sudo systemctl restart nfs-kernel-server
   ```

### On the machine that runs containers (same host or compute node)

3. Create mount point:

   ```bash
   sudo mkdir -p /mnt/nfs/users/u_1234567890abcdef12345678
   ```

4. Mount (use NFS server IP if not same host):

   ```bash
   sudo mount -t nfs4 127.0.0.1:/datapool/users/u_1234567890abcdef12345678 /mnt/nfs/users/u_1234567890abcdef12345678
   ```

5. Add to fstab so it survives reboot:

   ```bash
   echo '127.0.0.1:/datapool/users/u_1234567890abcdef12345678 /mnt/nfs/users/u_1234567890abcdef12345678 nfs4 defaults 0 0' | sudo tee -a /etc/fstab
   ```

Containers then use `-v /mnt/nfs/users/<storage_uid>:/home/ubuntu`. Rule: **export and mount each user subdataset, not the parent**.

---

## Quick reference

| Where   | What to set |
|--------|-------------|
| Host   | `PROVISION_SECRET` (env when running `app.py`) |
| Backend| `USER_STORAGE_PROVISION_URL`, `USER_STORAGE_PROVISION_SECRET` in `.env` |

- Full process: [ReadMe/Storage-Provisioning.md](Storage-Provisioning.md)
- Checklist style: [ReadMe/Storage-Provisioning-Setup.md](Storage-Provisioning-Setup.md)
