# Keycloak Production Setup — LaaS Platform

**Date:** April 15, 2026
**Platform:** LaaS (Lab-as-a-Service)
**Domain:** ksrceailab.com
**Keycloak Version:** 26.2.5

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Background & Stack](#2-background--stack)
3. [The Problem — What Failed & Why](#3-the-problem--what-failed--why)
4. [Root Cause Analysis](#4-root-cause-analysis)
5. [The Solution — Final Working Configuration](#5-the-solution--final-working-configuration)
   - [Step 1: PostgreSQL Database](#step-1-postgresql-database)
   - [Step 2: Podman Run Command](#step-2-podman-run-command-production-mode)
   - [Step 3: Nginx Configuration](#step-3-nginx-configuration)
   - [Step 4: Environment File Updates](#step-4-environment-file-updates-on-server)
   - [Step 5: Keycloak Realm Setup](#step-5-keycloak-realm-setup)
6. [Troubleshooting Issues Encountered](#6-troubleshooting-issues-encountered)
7. [Key Learnings Summary](#7-key-learnings-summary)
8. [URLs Reference](#8-urls-reference)
9. [Services & Ports](#9-services--ports-internal)

---

## 1. Overview & Architecture

Keycloak is deployed in **production mode** behind an Nginx reverse proxy using the **edge pattern**: Nginx terminates TLS, and Keycloak operates over plain HTTP internally. No SSL certificates are needed inside Keycloak.

```
Browser (HTTPS :443)
        │
        ▼
  Nginx (TLS Termination)
   ├── /         → Next.js Frontend   (localhost:3000)
   ├── /api/     → NestJS Backend     (localhost:3001)
   └── /auth     → Keycloak           (localhost:8080, HTTP)
                          │
                          ▼
                   PostgreSQL (localhost:5432)
                   [keycloak database]
```

Keycloak runs as a Podman container with `--network=host` so it can reach the host's PostgreSQL instance via `localhost:5432`.

---

## 2. Background & Stack

| Component | Details |
|-----------|---------|
| **Platform** | AWS EC2 (CentOS/RHEL) |
| **Domain** | ksrceailab.com |
| **Frontend** | Next.js on port 3000 |
| **Backend** | NestJS on port 3001 |
| **Database** | PostgreSQL 16 |
| **Identity Provider** | Keycloak 26.2.5 via Podman |
| **Reverse Proxy** | Nginx with Let's Encrypt SSL (port 443) |
| **Container Runtime** | Podman (rootless) |

---

## 3. The Problem — What Failed & Why

Keycloak worked perfectly in local development (`start-dev` on `localhost:8080`) but consistently failed on the AWS production server. The following approaches were attempted and **all failed**:

### Attempt 1: `start-dev` with `KC_PROXY=edge`
```bash
# FAILED
podman run ... -e KC_PROXY=edge quay.io/keycloak/keycloak:26.2 start-dev
```
**Why it failed:** `start-dev` mode explicitly ignores all proxy and hostname settings. It always generates HTTP URLs regardless of environment variables.

### Attempt 2: `start-dev` with `KC_HOSTNAME`
```bash
# FAILED
podman run ... -e KC_HOSTNAME=https://ksrceailab.com/auth ... start-dev
```
**Why it failed:** Same root cause — `start-dev` ignores hostname configuration entirely.

### Attempt 3: Production Mode with SSL Certs Mounted to Keycloak
Mounting Let's Encrypt certificates into the container and configuring Keycloak to serve HTTPS directly.
**Why it failed:** Unnecessarily complex. Keycloak doesn't need its own certs when it's behind a TLS-terminating proxy.

### Attempt 4: Separate Nginx on Port 9443 for Keycloak
Spinning up a second Nginx instance dedicated to proxying Keycloak traffic.
**Why it failed:** Port 9443 requires root privileges. Resulted in `bind() to 0.0.0.0:9443 failed (Permission denied)` errors. Also introduced conflicting server name warnings across multiple config files.

---

## 4. Root Cause Analysis

| Root Cause | Explanation |
|------------|-------------|
| **`start-dev` ignores proxy settings** | Keycloak's `start-dev` command bypasses all proxy/hostname configuration. It is strictly for local development without a reverse proxy. |
| **`KC_PROXY=edge` is deprecated** | In Keycloak 26.x, `KC_PROXY` (Hostname v1) is deprecated. The replacement is `KC_PROXY_HEADERS=xforwarded`. |
| **`KEYCLOAK_ADMIN` is deprecated** | The original admin credential env vars (`KEYCLOAK_ADMIN`, `KEYCLOAK_ADMIN_PASSWORD`) are deprecated. Replaced by `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`. |
| **Podman container can't reach host's `localhost`** | Inside a Podman container, `localhost` resolves to the container's own loopback, not the host. The `--network=host` flag is required for the container to share the host's network stack. |
| **Multiple Nginx config files conflicting** | Having `00-keycloak.conf`, `keycloak.conf`, `ksrceailab.conf`, and `laas.conf` all defining server blocks on port 443 causes `conflicting server name` errors and unpredictable routing. |

---

## 5. The Solution — Final Working Configuration

### Step 1: PostgreSQL Database

Create a dedicated `keycloak` database on the same PostgreSQL 16 instance used by the application:

```bash
sudo -u postgres psql -c "CREATE DATABASE keycloak;"
```

> Uses existing `postgres` superuser with password `root`. The `keycloak` database is isolated from the application database.

---

### Step 2: Podman Run Command (Production Mode)

```bash
podman run -d \
  --name keycloak \
  --replace \
  --network=host \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -e KC_HOSTNAME=https://ksrceailab.com/auth \
  -e KC_HTTP_RELATIVE_PATH=/auth \
  -e KC_PROXY_HEADERS=xforwarded \
  -e KC_HTTP_ENABLED=true \
  -e KC_HOSTNAME_STRICT=false \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://localhost:5432/keycloak \
  -e KC_DB_USERNAME=postgres \
  -e KC_DB_PASSWORD=root \
  -e KC_HEALTH_ENABLED=true \
  -e KC_HTTP_PORT=8080 \
  quay.io/keycloak/keycloak:26.2 \
  start
```

#### Key Flags Explained

| Flag | Value | Purpose |
|------|-------|---------|
| `start` | — | **Production mode** — respects all proxy/hostname settings. Do NOT use `start-dev`. |
| `--network=host` | — | Container shares the host network stack. Enables `localhost:5432` to reach PostgreSQL. |
| `KC_HOSTNAME` | `https://ksrceailab.com/auth` | Full public-facing URL including protocol and path prefix. |
| `KC_HTTP_RELATIVE_PATH` | `/auth` | Deploys Keycloak under the `/auth` subpath. |
| `KC_PROXY_HEADERS` | `xforwarded` | Replaces deprecated `KC_PROXY=edge`. Tells Keycloak to trust `X-Forwarded-*` headers from the proxy. |
| `KC_HTTP_ENABLED` | `true` | Enables HTTP since TLS is terminated by Nginx, not Keycloak. |
| `KC_HOSTNAME_STRICT` | `false` | Allows requests from both `ksrceailab.com` and `www.ksrceailab.com`. |
| `KC_BOOTSTRAP_ADMIN_USERNAME` | `admin` | Replaces deprecated `KEYCLOAK_ADMIN`. |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | `admin` | Replaces deprecated `KEYCLOAK_ADMIN_PASSWORD`. |
| `KC_DB` | `postgres` | Use PostgreSQL as the Keycloak database backend. |
| `KC_DB_URL` | `jdbc:postgresql://localhost:5432/keycloak` | JDBC connection string to the PostgreSQL instance. |
| `KC_HEALTH_ENABLED` | `true` | Enables `/auth/health` endpoint for container health checks. |

#### Useful Container Management Commands

```bash
# Check container logs
podman logs -f keycloak

# Check container status
podman ps -a

# Stop and remove
podman stop keycloak && podman rm keycloak

# Restart
podman restart keycloak
```

---

### Step 3: Nginx Configuration

Single config file at `/etc/nginx/conf.d/laas.conf`. **Remove all other config files** (`00-keycloak.conf`, `keycloak.conf`, `ksrceailab.conf`) — only `laas.conf` should exist in `conf.d/`.

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ksrceailab.com www.ksrceailab.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS — Main server block
server {
    listen 443 ssl;
    server_name ksrceailab.com www.ksrceailab.com;

    ssl_certificate     /etc/letsencrypt/live/ksrceailab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ksrceailab.com/privkey.pem;

    # ── Keycloak ─────────────────────────────────────────────────────────
    location /auth {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Port  443;

        # Keycloak sets large session cookies — must increase buffer size
        proxy_buffer_size       128k;
        proxy_buffers           4 128k;
        proxy_busy_buffers_size 256k;
    }

    # ── NestJS Backend API ────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;

        proxy_set_header Host            $host;
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── Next.js Frontend ──────────────────────────────────────────────────
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Critical Nginx Notes

- **`X-Forwarded-Proto https`** must be hardcoded (not `$scheme`) for the Keycloak location block. If `$scheme` is used, Nginx may forward `http` and Keycloak will generate HTTP URLs.
- **`X-Forwarded-Port 443`** must be hardcoded. Without this, Keycloak may append non-standard ports to redirect URLs.
- **`proxy_buffer_size 128k`** is required. Keycloak uses large session cookies; the default 4k/8k buffers cause `502 Bad Gateway` errors.
- All routing for a single domain must be in **one server block**. Multiple server blocks on the same port cause conflicts.

#### Apply and Verify Nginx Config

```bash
# Test configuration syntax
sudo nginx -t

# Reload (or restart if stale processes exist)
sudo systemctl reload nginx

# If reload fails due to stale processes:
sudo killall nginx
sudo systemctl start nginx

# Verify no config conflicts
sudo nginx -T | grep server_name
```

---

### Step 4: Environment File Updates (on Server)

#### Frontend — `frontend-new/.env.local`

```env
NEXT_PUBLIC_KEYCLOAK_URL=https://ksrceailab.com/auth
```

#### Backend — `backend-new/.env`

```env
KEYCLOAK_URL=https://ksrceailab.com/auth
FRONTEND_URL=https://ksrceailab.com
```

After updating environment files, restart the services:

```bash
# Restart frontend (Next.js)
pm2 restart frontend   # or however it's managed

# Restart backend (NestJS)
pm2 restart backend
```

---

### Step 5: Keycloak Realm Setup

Access the admin console at: **https://ksrceailab.com/auth/admin/**

Log in with `admin` / `admin` (bootstrap credentials).

#### Create the `laas` Realm

1. Click the realm dropdown (top-left) → **Create Realm**
2. Name: `laas`
3. Enabled: ON → **Create**

#### Client: `laas-frontend` (Public)

| Setting | Value |
|---------|-------|
| Client ID | `laas-frontend` |
| Client authentication | **OFF** (public client) |
| Root URL | `https://ksrceailab.com` |
| Valid redirect URIs | `https://ksrceailab.com/*` |
| Valid post logout redirect URIs | `https://ksrceailab.com/signin` |
| Web origins | `https://ksrceailab.com` |

#### Client: `laas-backend` (Confidential)

| Setting | Value |
|---------|-------|
| Client ID | `laas-backend` |
| Client authentication | **ON** (confidential client) |
| Service accounts enabled | ON |

Copy the **Client Secret** from the **Credentials** tab and add it to the backend `.env`.

#### Social Identity Providers

| Provider | Redirect URI to Register in Developer Console |
|----------|----------------------------------------------|
| **Google** | `https://ksrceailab.com/auth/realms/laas/broker/google/endpoint` |
| **GitHub** | `https://ksrceailab.com/auth/realms/laas/broker/github/endpoint` |

Configure via **Realm → Identity Providers → Add provider**.

---

## 6. Troubleshooting Issues Encountered

### Issue 1: `start-dev` Ignores Proxy Settings

**Symptom:** Keycloak generates `http://ksrceailab.com/auth` URLs even with `KC_PROXY=edge` and `KC_HOSTNAME` set. OAuth redirects fail with mixed content errors.

**Root Cause:** `start-dev` explicitly bypasses all proxy/hostname/TLS configuration. It is designed only for local development without any proxy in front of it.

**Fix:** Switch from `start-dev` to `start` (production mode).

```bash
# WRONG
quay.io/keycloak/keycloak:26.2 start-dev

# CORRECT
quay.io/keycloak/keycloak:26.2 start
```

---

### Issue 2: Podman Container Can't Reach Host PostgreSQL

**Symptom:**
```
FATAL: Connection to localhost:5432 refused
org.postgresql.util.PSQLException: Connection refused
```

**Root Cause:** Inside a Podman container, `localhost` resolves to the container's own loopback interface (`127.0.0.1` inside the container), not the host machine.

**Fix:** Add `--network=host` to the `podman run` command. This makes the container share the host's full network stack, so `localhost:5432` correctly reaches the host's PostgreSQL.

```bash
podman run --network=host ...
```

> Note: With `--network=host`, port mapping (`-p`) is not needed and will be ignored if specified.

---

### Issue 3: `KC_PROXY=edge` Deprecated in Keycloak 26.x

**Symptom:** Logs show warnings:
```
WARN  [o.k.s.Config] (main) Unrecognized configuration key "KC_PROXY"
WARN  Hostname v1 options are not supported
```

**Root Cause:** Keycloak 26.x replaced the "Hostname v1" API (`KC_PROXY`, `KC_HOSTNAME_URL`) with "Hostname v2" (`KC_PROXY_HEADERS`, `KC_HOSTNAME`).

**Fix:**
```bash
# DEPRECATED (Keycloak < 25)
-e KC_PROXY=edge

# CORRECT (Keycloak 26.x)
-e KC_PROXY_HEADERS=xforwarded
```

---

### Issue 4: `KEYCLOAK_ADMIN` Credentials Deprecated

**Symptom:** Logs show:
```
WARN  [o.k.s.Config] Unrecognized configuration key "KEYCLOAK_ADMIN"
```
Bootstrap admin account may not be created.

**Root Cause:** The original bootstrap admin env vars were renamed in Keycloak 26.x.

**Fix:**
```bash
# DEPRECATED
-e KEYCLOAK_ADMIN=admin
-e KEYCLOAK_ADMIN_PASSWORD=admin

# CORRECT (Keycloak 26.x)
-e KC_BOOTSTRAP_ADMIN_USERNAME=admin
-e KC_BOOTSTRAP_ADMIN_PASSWORD=admin
```

---

### Issue 5: Nginx Conflicting Server Name / Port Conflicts

**Symptom:**
```
nginx: [warn] conflicting server name "ksrceailab.com" on 0.0.0.0:443, ignored
nginx: [emerg] bind() to 0.0.0.0:9443 failed (13: Permission denied)
```

**Root Cause:** Multiple config files in `/etc/nginx/conf.d/` (`00-keycloak.conf`, `keycloak.conf`, `ksrceailab.conf`, `laas.conf`) all defined server blocks for `ksrceailab.com` on port 443. Nginx processes these in filename order and ignores duplicate server names.

Additionally, binding to port 9443 requires root privileges (ports below 1024 are privileged on Linux; actually ports 1-1023 are privileged, but 9443 needs CAP_NET_BIND_SERVICE or running as root).

**Fix:**
```bash
# Remove all conflicting config files
sudo rm /etc/nginx/conf.d/00-keycloak.conf
sudo rm /etc/nginx/conf.d/keycloak.conf
sudo rm /etc/nginx/conf.d/ksrceailab.conf

# Only laas.conf should remain
ls /etc/nginx/conf.d/
# → laas.conf

sudo nginx -t && sudo systemctl reload nginx
```

---

### Issue 6: Stale Nginx Processes After Config Cleanup

**Symptom:** `sudo systemctl start nginx` fails immediately after removing conflicting configs and even after `nginx -t` passes:
```
nginx: [emerg] bind() to 0.0.0.0:443 failed (98: Address already in use)
```

**Root Cause:** Old Nginx worker processes (from the previously broken state) are still running and holding ports 80 and 443.

**Fix:**
```bash
# Kill all nginx processes
sudo killall nginx

# Verify they're gone
ps aux | grep nginx

# Then start fresh
sudo systemctl start nginx
sudo systemctl status nginx
```

---

### Issue 7: PostgreSQL Service Name on CentOS/RHEL

**Symptom:**
```
Failed to reload postgresql.service: Unit postgresql.service not found.
```

**Root Cause:** On CentOS/RHEL, PostgreSQL 16 installs with a versioned systemd service name, not the generic `postgresql`.

**Fix:**
```bash
# WRONG (Debian/Ubuntu convention)
sudo systemctl reload postgresql

# CORRECT (CentOS/RHEL with PostgreSQL 16)
sudo systemctl reload postgresql-16

# Check actual service name if unsure
systemctl list-units | grep postgres
```

---

## 7. Key Learnings Summary

1. **Always use `start` (not `start-dev`) for production Keycloak behind a reverse proxy.** `start-dev` ignores all proxy and hostname settings by design.

2. **`KC_PROXY_HEADERS=xforwarded` replaces the deprecated `KC_PROXY=edge` in Keycloak 26.x.** Using the old flag results in silent misconfiguration.

3. **`KC_HOSTNAME` must include the full URL with protocol and path:** `https://ksrceailab.com/auth`. A bare hostname like `ksrceailab.com` is insufficient when running under a subpath.

4. **Podman needs `--network=host` to access host services via `localhost`.** Without it, database connections to `localhost:5432` will be refused.

5. **Single Nginx config file per domain.** Avoid multiple `.conf` files with overlapping server blocks on the same port — Nginx silently ignores duplicates, leading to unpredictable routing.

6. **Keycloak doesn't need its own SSL certificates when behind a TLS-terminating proxy.** The "edge" pattern (Nginx handles TLS, Keycloak gets plain HTTP) is simpler and the recommended approach.

7. **`proxy_buffer_size` must be at least `128k` for Keycloak.** Keycloak sets large session cookies that exceed Nginx's default 4k/8k buffer sizes, causing `502 Bad Gateway` errors after login.

8. **`X-Forwarded-Proto` must be hardcoded to `https`** in the Nginx Keycloak location block — not `$scheme`. If the upstream sees `http`, it generates HTTP redirect URLs.

9. **`X-Forwarded-Port 443` must be hardcoded.** Without it, Keycloak may generate redirect URLs with incorrect or missing port numbers.

10. **PostgreSQL 16 systemd service name is `postgresql-16` on CentOS/RHEL**, not `postgresql`. Always check with `systemctl list-units | grep postgres`.

11. **Kill stale Nginx processes before restarting** after config cleanup. Use `sudo killall nginx` if `systemctl start nginx` fails with "Address already in use".

12. **Post-logout redirect URIs must be explicitly whitelisted** in the Keycloak client settings. Without this, users see a "Invalid redirect_uri" error after logout.

---

## 8. URLs Reference

| Page | URL |
|------|-----|
| Landing Page | https://ksrceailab.com |
| Sign In | https://ksrceailab.com/signin |
| Keycloak Admin Console | https://ksrceailab.com/auth/admin/ |
| Keycloak Health Check | https://ksrceailab.com/auth/health |
| API Base | https://ksrceailab.com/api/ |
| OAuth Callback | https://ksrceailab.com/callback |
| Google IdP Redirect URI | https://ksrceailab.com/auth/realms/laas/broker/google/endpoint |
| GitHub IdP Redirect URI | https://ksrceailab.com/auth/realms/laas/broker/github/endpoint |

---

## 9. Services & Ports (Internal)

| Service | Port | Protocol | Access | Notes |
|---------|------|----------|--------|-------|
| Nginx | 443 | HTTPS | Public | TLS termination, main entry point |
| Nginx | 80 | HTTP | Public | Redirects to 443 |
| Next.js Frontend | 3000 | HTTP | Internal only | Proxied via Nginx `/` |
| NestJS Backend | 3001 | HTTP | Internal only | Proxied via Nginx `/api/` |
| Keycloak | 8080 | HTTP | Internal only | Proxied via Nginx `/auth` |
| PostgreSQL | 5432 | TCP | Internal only | Shared instance: `laas` + `keycloak` DBs |

> **Security Note:** Ports 3000, 3001, 8080, and 5432 should be blocked from public access via AWS Security Groups / firewall rules. Only ports 80 and 443 should be publicly accessible.

---

*Document maintained by the LaaS platform team. Last updated: April 15, 2026.*
