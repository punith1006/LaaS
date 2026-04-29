# Keycloak HTTPS Reverse Proxy Configuration - Technical Documentation

## Executive Summary

This document details the issues, conflicts, and resolution attempts for configuring Keycloak 26.2 behind an Nginx reverse proxy with HTTPS on AWS EC2 (Amazon Linux/CentOS).

**Date:** April 15, 2026  
**Environment:** AWS EC2 (Amazon Linux), Podman, Keycloak 26.2.5, Nginx 1.20, Let's Encrypt SSL

---

## System Architecture

```
Internet (HTTPS) 
    ↓
Nginx (Port 443 - Frontend) → Next.js (Port 3000)
    ↓
Nginx (Port 9443) → Keycloak Admin Console (HTTPS Proxy)
```

### Current Port Mapping

| Port | Service | Protocol |
|------|---------|----------|
| 80   | Nginx   | HTTP (redirect to HTTPS) |
| 443  | Nginx   | HTTPS - Frontend (Next.js) |
| 3000 | Next.js | HTTP - Frontend App |
| 3001 | Backend | HTTP - API Server |
| 9080 | Keycloak| HTTP (dev mode) |
| 9443 | Nginx   | HTTPS - Keycloak Proxy |
| 9444 | Keycloak| HTTPS (production mode) |

---

## Problem Statement

### Primary Issue: Mixed Content Errors

When accessing Keycloak Admin Console via `https://ksrceailab.com:9443/admin/`, the page loads but Keycloak generates **HTTP URLs** for its internal resources, causing browser security blocks:

```
Blocked: http://ksrceailab.com/resources/master/admin/en
Blocked: http://ksrceailab.com/realms/master/protocol/openid-connect/3p-cookies/step1.html
```

### Secondary Issue: Redirect Loop to HTTP

Keycloak redirects from `/admin/` to `/admin/master/console/` but the redirected URL uses HTTP instead of HTTPS.

---

## Keycloak URL Generation Issue

### Observed Behavior

Keycloak embeds URLs in the page HTML:

```json
{
  "serverBaseUrl": "http://ksrceailab.com",
  "adminBaseUrl": "http://ksrceailab.com",
  "authUrl": "http://ksrceailab.com",
  "authServerUrl": "http://ksrceailab.com",
  "realm": "master",
  "clientId": "security-admin-console"
}
```

**Problem:** All URLs are `http://` instead of `https://`

### Keycloak Redirect Response

```
HTTP/1.1 302 Found
Location: http://ksrceailab.com:9080/admin/
```

---

## Configuration Attempts

### Attempt 1: Keycloak Dev Mode with Nginx Proxy

```bash
podman run -d --name keycloak -p 9080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -e KC_PROXY=edge \
  -e KC_HOSTNAME=ksrceailab.com \
  -e KC_HTTP_RELATIVE_PATH=/ \
  quay.io/keycloak/keycloak:26.2 start-dev
```

**Result:** 
- Keycloak runs on HTTP port 8080
- Redirects to `http://ksrceailab.com:9080/admin/` (adds port 9080)
- Mixed content: YES (HTTP URLs in HTTPS page)
- **Status: FAILED**

### Attempt 2: Added KC_HOSTNAME_STRICT=false

```bash
podman run -d --name keycloak -p 9080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -e KC_PROXY=edge \
  -e KC_HOSTNAME=ksrceailab.com \
  -e KC_HOSTNAME_STRICT=false \
  -e KC_HTTP_RELATIVE_PATH=/ \
  quay.io/keycloak/keycloak:26.2 start-dev
```

**Result:**
- Still generates `http://` URLs
- Mixed content: YES
- **Status: FAILED**

### Attempt 3: Keycloak Production Mode with SSL Certificates

```bash
podman run -d --name keycloak -p 9444:8443 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -e KC_PROXY=edge \
  -e KC_HOSTNAME=ksrceailab.com \
  -e KC_HOSTNAME_STRICT=false \
  -e KC_HTTP_RELATIVE_PATH=/ \
  -v /etc/letsencrypt/live/ksrceailab.com:/etc/x509/https \
  -e KC_HTTPS_CERTIFICATE_FILE=/etc/x509/https/fullchain.pem \
  -e KC_HTTPS_CERTIFICATE_KEY_FILE=/etc/x509/https/privkey.pem \
  quay.io/keycloak/keycloak:26.2 start
```

**Result:**
- Keycloak terminates SSL internally
- Expected to generate HTTPS URLs
- **Status: IN PROGRESS**

---

## Nginx Configuration

### Current Nginx Config for Keycloak Proxy

```nginx
server {
    listen 9443 ssl;
    server_name ksrceailab.com;

    ssl_certificate /etc/letsencrypt/live/ksrceailab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ksrceailab.com/privkey.pem;

    location / {
        proxy_pass https://localhost:9444;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Nginx Config Load Order Issue

The Nginx configs are loaded alphabetically. To ensure Keycloak proxy loads first:

```bash
mv /etc/nginx/conf.d/keycloak-proxy.conf /etc/nginx/conf.d/00-keycloak.conf
```

---

## Root Cause Analysis

### Why Keycloak Generates HTTP URLs

1. **Keycloak Dev Mode Limitation**
   - `start-dev` command forces HTTP URLs regardless of environment variables
   - `KC_SERVER` is ignored in dev mode
   - Source: Keycloak documentation states dev mode is for local development only

2. **Proxy Mode Not Honoring Headers**
   - Even with `KC_PROXY=edge`, Keycloak doesn't respect `X-Forwarded-Proto` for generating internal URLs
   - Keycloak uses `KC_HOSTNAME` to generate URLs, which defaults to HTTP

3. **Port Preservation Issue**
   - When accessing via `localhost:9080`, Keycloak adds port 9080 to redirects
   - This happens because Keycloak thinks it's running on a different host than the proxy

### Keycloak Environment Variables Reference

| Variable | Purpose | Effect |
|----------|---------|--------|
| `KC_PROXY` | Proxy mode | `edge` = trust proxy headers |
| `KC_HOSTNAME` | Public hostname | Used for URL generation |
| `KC_HOSTNAME_STRICT` | Strict hostname validation | `false` = allow non-matching hosts |
| `KC_HOSTNAME_STRICT_HTTPS` | Force HTTPS URLs | `true` = always use https:// |
| `KC_HTTP_RELATIVE_PATH` | Base path | `/` = use root path |
| `KC_SERVER` | Server URL | Ignored in dev mode |
| `KC_HTTPS_CERTIFICATE_FILE` | SSL cert file | For production HTTPS |
| `KC_HTTPS_CERTIFICATE_KEY_FILE` | SSL key file | For production HTTPS |

---

## Known Keycloak Behaviors (v26+)

### Documented Issues

1. **Dev Mode Ignores KC_SERVER**
   - Source: Keycloak documentation
   - Workaround: Use production mode (`start` instead of `start-dev`)

2. **Hostname v1 Options Deprecated**
   - Warning in logs: `Hostname v1 options [proxy] are still in use`
   - New config uses v2 hostname provider

3. **Admin Credentials Deprecated**
   - `KEYCLOAK_ADMIN` → `KC_BOOTSTRAP_ADMIN_USERNAME`
   - `KEYCLOAK_ADMIN_PASSWORD` → `KC_BOOTSTRAP_ADMIN_PASSWORD`

4. **Database Warning**
   - `WARNING: Usage of the default value for the db option in the production profile is deprecated`
   - H2 database used by default (not production-ready)

---

## Container Runtime Conflicts

### Podman Container Name Conflict

When a container is stopped/removed but the name persists in storage:

```bash
# Error: container name "keycloak" is already in use
podman run -d --name keycloak ...

# Solution 1: Use --replace flag
podman run -d --replace --name keycloak ...

# Solution 2: Remove stale container
podman rm -f keycloak
```

### Port Binding Conflicts

```bash
# Error: bind: address already in use
podman run -d -p 9443:8443 ...

# Solution: Use different port mapping
podman run -d -p 9444:8443 ...
```

---

## Next Steps for Resolution

### Option A: Production Mode (Recommended)

1. Ensure Keycloak runs with SSL certificates mounted
2. Use `start` command (not `start-dev`)
3. Configure Nginx to proxy to Keycloak's HTTPS port (9444)

### Option B: Frontend Rewrite (Alternative)

1. Deploy a simple frontend that rewrites HTTP URLs to HTTPS
2. Use Nginx's `sub_filter` module to rewrite Keycloak responses

### Option C: Native Keycloak HTTPS (Production)

1. Use Keycloak's built-in HTTPS on port 8443
2. Proxy Nginx port 9443 to Keycloak port 8443 (HTTPS to HTTPS)
3. No URL rewriting needed

---

## References

- [Keycloak 26 Documentation](https://www.keycloak.org/docs/26.0/)
- [Keycloak Proxy Configuration](https://www.keycloak.org/server/reverseproxy)
- [Keycloak HTTPS Setup](https://www.keycloak.org/server/enabletls)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

## Logs and Diagnostics

### Keycloak Startup Log (Dev Mode)

```
2026-04-15 13:55:44,165 INFO  [io.quarkus] (main) Keycloak 26.2.5 on JVM (powered by Quarkus 3.20.1) started in 23.629s. Listening on: http://0.0.0.0:8080
2026-04-15 13:55:44,167 INFO  [io.quarkus] (main) Profile dev activated.
```

### Nginx Config Test

```bash
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Port Status Check

```bash
sudo ss -tlnp | grep -E '9443|9444|9080'
# LISTEN 0.0.0.0:9443 (Nginx)
# LISTEN 0.0.0.0:9444 (Keycloak - if running with SSL)
# LISTEN 0.0.0.0:9080 (Keycloak - if running with HTTP)
```

---

## Conclusion

The core issue is that **Keycloak dev mode does not support HTTPS URL generation** behind a reverse proxy. For production HTTPS access:

1. Use Keycloak production mode (`start`)
2. Mount SSL certificates for Keycloak's internal HTTPS
3. Proxy Nginx HTTPS to Keycloak HTTPS
4. OR use Keycloak with built-in HTTPS and proxy accordingly

**Status:** Awaiting verification of production mode configuration.
