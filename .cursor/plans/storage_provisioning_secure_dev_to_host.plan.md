---
name: ""
overview: ""
todos: []
isProject: false
---

# Storage provisioning: secure backend–host communication and validation

## Overview

Extend the storage provisioning flow so that (1) communication between the backend (dev machine) and the host (100.100.66.101) is **secure**, and (2) **success/failure, validation, and logs** are well-defined on both sides and usable for debugging and audit.

---

## 1. Secure communication

### 1.1 Transport: HTTP for now, HTTPS later

- **Current phase:** You can use **HTTP** (no TLS). The host service listens on e.g. `http://100.100.66.101:9999` and the backend sets `USER_STORAGE_PROVISION_URL=http://100.100.66.101:9999/provision`. No certificates required.
- **Important when using HTTP:** The shared secret (below) and network restrictions (binding/firewall) are your main protection. Keep the provision endpoint **off the public internet** (e.g. only Tailscale or a private LAN). Treat the link as trusted only within that network.
- **Later (recommended):** When you have a certificate (self-signed or from an internal CA / Let’s Encrypt), switch the host to **HTTPS** and the backend URL to `https://...`. Then the request/response are encrypted. If you use a self-signed cert, the backend will need to trust it (e.g. inject the CA or cert for that host only; avoid disabling TLS verification globally).

### 1.2 Authentication (mandatory shared secret)

- **Backend** must send a **shared secret** on every provision request so the host can reject calls from unknown clients.
- **Mechanism:** Backend reads `USER_STORAGE_PROVISION_SECRET` from env and sends it in a header, e.g. `X-Provision-Secret: <secret>` or `Authorization: Bearer <secret>`. The host service **must** require this header and return **401 Unauthorized** if it is missing or wrong.
- **Host:** Store the same secret in env (e.g. `PROVISION_SECRET`) or a restricted config file; compare against the incoming header before running any ZFS logic.
- **Secret rotation:** Document that rotating the secret requires updating both backend `.env` and host config and restarting both; no in-band rotation in this phase.

### 1.3 Network exposure

- **Host service** should bind only to interfaces that the backend can reach (e.g. Tailscale IP `100.100.x.x` or a private LAN IP), not necessarily `0.0.0.0`, to reduce exposure. If binding to all interfaces, rely on firewall rules to allow only the backend (or Tailscale subnet).
- **Firewall:** Allow the provision port (e.g. 9999) only from the backend’s IP or from the Tailscale subnet, and block it from the public internet.

---

## 2. Validation and observability

### 2.1 Request/response contract

**Request (backend → host):**

- Method: `POST`
- URL path: e.g. `/provision`
- Headers: `Content-Type: application/json`, `X-Provision-Secret: <secret>`, and optionally `X-Request-Id: <uuid>` for correlation
- Body: `{ "storageUid": "u_<24 hex>", "quotaGb": 15 }`

**Success (host → backend):**

- Status: **200**
- Body: optional JSON, e.g. `{ "ok": true, "path": "/datapool/users/u_xxx" }` or empty. Backend already treats any 2xx as success.

**Failure (host → backend):**

- Status: **4xx** or **5xx**
- Body: plain text or JSON. If JSON, use a single field for the message, e.g. `{ "error": "Insufficient space: 10GB free, 15GB required" }` so the backend can parse and store a clean string in `storageProvisioningError` (and still fall back to `res.text().slice(0, 500)` if not JSON).
- Suggested status codes:
  - **400** – Invalid input (bad `storageUid` format, invalid `quotaGb`)
  - **401** – Missing or invalid `X-Provision-Secret`
  - **403** – Forbidden (e.g. rate limited, or policy reject)
  - **507** – Insufficient storage (pool free space < required)
  - **500** – ZFS or system error (with `error` message in body)

### 2.2 Host-side validation (before running ZFS)

- **Auth:** Reject with 401 if `X-Provision-Secret` is missing or does not match the configured secret.
- **Input:**  
  - `storageUid`: must match `^u_[0-9a-f]{24}$`; else 400 with message e.g. `Invalid storageUid format`.  
  - `quotaGb`: optional; if present, must be in a sane range (e.g. 1–50); default 15. Else 400.
- **Pre-checks:**  
  - Pool `datapool` and dataset `datapool/users` exist; else 500 with message.  
  - Free space in pool ≥ required (e.g. 15GB); else **507** with a clear message (e.g. "Insufficient space: X GB free, 15 GB required").
- **Idempotency:** If `datapool/users/<storage_uid>` already exists, treat as success and return 200 (no duplicate create).
- **Execution:** Run `zfs create -o quota=15G datapool/users/<storage_uid>`, then `chown 1000:1000` on the dataset mount. On failure, return 500 with stderr or a short message in the response body.

### 2.3 Backend-side behaviour

- **Request:** Add optional `X-Request-Id` (UUID) header for every provision call; use the same id in backend logs (e.g. when logging success/failure). This allows correlating backend logs with host logs.
- **Response handling:**  
  - On 2xx: set user to `provisioned`, clear error (existing behaviour).  
  - On 4xx/5xx: set user to `failed`, set `storageProvisioningError` to the response body (or parsed `error` field if JSON), truncated to a safe length (e.g. 500 chars). Already largely in place; ensure the stored string is the one the dashboard will show.
- **Timeout:** Use a request timeout (e.g. 15 seconds) for the HTTP call so a hung host does not block the auth flow indefinitely; on timeout, treat as failure and store a message like "Provision request timed out".
- **Logging:** Log at least: requestId (if any), storageUid, HTTP status, and on failure the first N chars of the response body. Do not log the secret.

### 2.4 Host-side logging (audit and debugging)

- Log every request in a **structured** way (e.g. JSON lines to stdout or a file): timestamp (ISO8601), client IP, requestId (if provided), storageUid, outcome (success / failed), and if failed the error message or status code. Do not log the secret.
- On failure, log the ZFS/system error (e.g. stderr from `zfs create`) so ops can debug without re-running manually.
- Keep logs for a defined retention period (e.g. 30 days) for audit and troubleshooting.

### 2.5 Optional but recommended

- **Health check:** Host exposes `GET /health` (or `/`) that returns 200 if the service is up and the ZFS pool is available (e.g. `zpool list datapool` succeeds). Backend or monitoring can poll this to detect host or pool issues.
- **Rate limiting (host):** Limit how many provision requests per minute per client (or per secret) to avoid abuse; e.g. return 429 with message "Too many requests" when exceeded.
- **Correlation:** If the host returns a JSON success body, it can include `requestId` echoed back so the backend can log the same id for that request.

---

## 3. Things easily overlooked

- **HTTP vs HTTPS:** Without HTTPS, anyone on the same network could sniff the provision request (including storageUid and the secret). Mitigate by (1) using a strong shared secret and (2) restricting who can reach the host (Tailscale, firewall). Plan to add HTTPS when you have certs.
- **Secret storage:** The shared secret is in backend `.env` and host env/config. Restrict file permissions and avoid committing secrets; document where they live for rotation.
- **Binding and firewall:** Binding the host service to a specific IP (e.g. Tailscale) and allowing the provision port only from the backend/Tailscale reduces attack surface.
- **Timeout:** Without a timeout, a stuck host can leave the backend waiting; always set a finite timeout (e.g. 15s) and treat timeout as a failure with a clear message.
- **Idempotency:** Returning 200 when the dataset already exists avoids "already exists" being stored as a user-visible failure and allows safe retries from the dashboard.
- **Error message length:** Cap the length of the error string stored in `storageProvisioningError` (e.g. 500 chars) so the DB and dashboard stay usable.
- **Audit:** Structured logs on the host (with requestId and outcome) make it possible to trace which request failed and why, and to prove that provisioning was attempted.
- **Retry (future):** Optionally, the backend could retry once on 503 or timeout after a short delay, then persist failure if the retry also fails; not required for the first version but worth considering later.

---

## 4. Implementation checklist

**Host (100.100.66.101):**

- Provision service listens over **HTTP** for now (or HTTPS when you have a cert). Bind to a specific IP (e.g. Tailscale) if possible; otherwise rely on firewall.
- Require **X-Provision-Secret** (or Authorization); return **401** if missing/wrong.
- Validate **storageUid** (regex) and **quotaGb**; return **400** with message if invalid.
- Check pool/dataset existence and free space; return **507** with message if insufficient space.
- If dataset already exists, return **200** (idempotent).
- Run ZFS create + chown; on failure return **500** with error message in body (plain or JSON `error`).
- Log every request (timestamp, IP, requestId, storageUid, outcome, error if any); no secret in logs.
- Optional: `GET /health`, rate limiting, and JSON error body `{ "error": "..." }`.

**Backend (dev machine):**

- Add **USER_STORAGE_PROVISION_SECRET**; send it in **X-Provision-Secret** (or Authorization) for every provision request.
- Use **http://** in **USER_STORAGE_PROVISION_URL** for now (e.g. `http://100.100.66.101:9999/provision`). Switch to **https://** when the host has TLS.
- Add **X-Request-Id** (UUID) header; log it on success/failure for correlation.
- Set HTTP **timeout** (e.g. 15s); on timeout, set user to failed with message "Provision request timed out".
- On 4xx/5xx, parse JSON `error` if present and use it for `storageProvisioningError`, else use response text; cap length (e.g. 500 chars).
- Log requestId, storageUid, status, and truncated error (never log the secret).

**Both:**

- Document secret location and rotation procedure.
- Ensure firewall/network allows only the backend (or Tailscale) to the provision port.

This gives you secure communication, clear success/failure semantics, validation on both sides, and logs you can use for debugging and audit.