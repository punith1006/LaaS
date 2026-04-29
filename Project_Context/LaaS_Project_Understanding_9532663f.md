# LaaS — Complete Project Understanding

## 1. What LaaS Is

LaaS (Lab as a Service) is an **on-premises GPU computing platform** that monetizes 4 identical high-performance machines (AMD Ryzen 9 9950X3D + RTX 5090 32GB + 64GB DDR5 + 2TB NVMe each) by providing remote access to university students, researchers, and public users. The platform is built for **KSRCE-GKT AI Supercomputing Lab** and is a mission-critical revenue project.

**Revenue model:** University SSO subscriptions (primary), pay-as-you-go wallet credits, partner-college contracts, premium student packages.

**Unique differentiator:** Fractional GPU tiers on consumer hardware — no commercial provider (RunPod, Vast.ai, Lambda Labs, Colab) offers this. Achieved via the combination of **Selkies EGL Desktop** (WebRTC streaming) + **HAMi-core** (CUDA VRAM interception) + **CUDA MPS** (SM% partitioning).

---

## 2. Architecture at a Glance

```
Users (Browser)
  |
  v
Access Layer: Cloudflare Tunnel / Tailscale VPN / TURN
  |
  v
Frontend: Next.js 15 (App Router, React 19, Tailwind 4, shadcn/ui)
  |  (REST + JWT)
  v
Backend: NestJS 11 / Fastify + Prisma 6 + PostgreSQL
  |  (HTTP + shared secrets)
  v
Host Services (Python Flask on GPU node):
  - Session Orchestration (port 9998) — Docker container lifecycle
  - Storage Provision (port 9999) — ZFS dataset + NFS management
  |
  v
Compute Fleet: 4x identical nodes running Docker containers
  - Selkies EGL Desktop (KDE Plasma via WebRTC)
  - HAMi-core (VRAM enforcement) + CUDA MPS (SM% partitioning)
  - lxcfs (resource visibility spoofing)
  |
  v
Storage: Centralized NAS (TrueNAS, ZFS RAIDZ1, ~12TB)
  - Per-user ZFS datasets (5GB default, hard quota)
  - NFS export per user, mounted at /home/ubuntu in containers
  |
  v
Monitoring: Prometheus + Grafana + Loki + Alertmanager + custom exporters
  - 2 custom exporters: mps-exporter (port 9500), session-exporter (port 9501)
  - Alerts via Telegram/Email
```

**Key decision: Containers, NOT VMs** — eliminates RTX 5090 D3cold reset bug, enables 4-8 concurrent GPU users per node, 15-25s cold start.

---

## 3. Database Schema (Prisma — 60+ Models, 2084 Lines)

**File:** `backend/prisma/schema.prisma`

The schema spans 16 domains:

| Domain | Key Models | Purpose |
|--------|-----------|---------|
| Auth & Identity | User, Role, Permission, RefreshToken, LoginHistory | JWT + Keycloak SSO + RBAC |
| Universities | University, UniversityIdpConfig | Institution SSO (SAML/OIDC) |
| Departments & Groups | Department, UserGroup, UserProfile | Org hierarchy, onboarding |
| Storage | UserStorageVolume, StorageExtension, OsSwitchHistory, UserFile | ZFS/NFS per-user volumes |
| Infrastructure | Node, BaseImage, NodeBaseImage | Compute fleet management |
| Compute Configs | ComputeConfig, ComputeConfigAccess | Session templates + pricing |
| Sessions & Bookings | Booking, Session, SessionEvent, NodeResourceReservation | Container lifecycle + audit |
| Billing & Wallet | Wallet, WalletHold, WalletTransaction, BillingCharge, CreditPackage, Subscription, Invoice | Pay-as-you-go + subscriptions |
| Payments | PaymentTransaction | Razorpay integration |
| Academic/LMS | Course, Lab, LabAssignment, LabSubmission, LabGrade | Educational content |
| Mentorship | MentorProfile, MentorBooking, MentorReview | Mentor marketplace |
| Community | Discussion, ProjectShowcase, Achievement | Gamification |
| Notifications | NotificationTemplate, Notification | Email/SMS delivery |
| Audit | AuditLog, UserDeletionRequest | Immutable compliance trail |
| Platform Config | SystemSetting, FeatureFlag, Announcement | Runtime configuration |
| Support | SupportTicket, TicketMessage, UserFeedback | Help desk |

**Critical design patterns:**
- Immutable audit tables (BillingCharge, WalletTransaction, AuditLog — NEVER deleted)
- Denormalized `Session.cumulativeCostCents` for fast queries
- Resource snapshots at launch (prevents config changes mid-session affecting billing)
- Serializable transaction isolation for session launch (prevents double-allocation)
- Wallet holds (pre-authorization before session launch)

---

## 4. Backend (NestJS 11 + Fastify)

**File:** `backend/src/` — 10 modules

| Module | Key File (Lines) | Purpose |
|--------|-----------------|---------|
| auth | auth.service.ts (722) | JWT, OTP, Keycloak SSO, password reset |
| compute | compute.service.ts (2702) | Session launch/terminate, resource validation, cost tracking |
| storage | storage.service.ts (~600) | ZFS provisioning via host HTTP, quota management |
| billing | billing.service.ts (557) | Hourly storage billing, spend limits, runway warnings |
| payment | payment.service.ts (~400) | Razorpay orders, verification, PDF invoices |
| dashboard | dashboard.service.ts (~700) | Home/billing aggregations, platform health |
| user | user.service.ts | Onboarding profile |
| support | support.service.ts (159) | Ticket CRUD + email notifications |
| audit | audit.service.ts | Immutable event logging |
| mail | mail.service.ts | Handlebars email templates (8 templates) |

**Key API routes:**
- `POST /api/auth/verify-otp` — Register + issue tokens
- `POST /api/auth/oauth/callback` — Keycloak SSO
- `POST /api/compute/sessions` — Launch session (validates wallet, storage, resources)
- `POST /api/compute/sessions/:id/terminate` — End session
- `POST /api/payment/create-order` — Razorpay order
- `POST /api/payment/verify` — Payment verification + wallet credit
- `POST /api/support/tickets` — Support ticket

**Environment:** PostgreSQL, SMTP (Gmail), Razorpay, host services at `100.100.66.101:9998/9999` via Tailscale SSH.

---

## 5. Frontend (Next.js 15, React 19)

**File:** `frontend/src/` — App Router

**Routing structure:**
- `(auth)/` — signin, signup (3-step: email → details → OTP verify), callback, logout
- `(console)/` — home (dashboard), instances (GPU sessions), storage (file browser), billing

**Key components:**
- `app-shell.tsx` (565 lines) — Header, sidebar, proactive token refresh (<2 min), health polling (30s), sign-out with active instance check
- `api.ts` (1254 lines) — Centralized fetch wrapper with auto token refresh, 401 retry, mock mode fallback
- `billing-tab-content.tsx` (68KB) — Usage charts, spend limits, credit balance
- `instances/page.tsx` (51KB) — GPU session manager (partially complete)
- `storage/page.tsx` (114KB) — Full file browser with upload/download/mkdir/delete

**State:** Zustand (signup flow only) + localStorage (tokens) + component state (React hooks)

**Styling:** CSS variables for light/dark theming, Tailwind 4, shadcn/ui (Radix), Outfit + Geist Mono fonts. Design inspired by Lambda.ai — utilitarian minimalism, no gradients/decorations.

**Complete:** Auth flows, token management, dark mode, billing/payments (Razorpay), storage file browser, support tickets, platform health
**Partial:** Instances page, onboarding form, landing page (mostly commented)
**Missing:** Templates hub, profile page, SSH keys, API keys

---

## 6. Host Services (Python Flask on GPU Node)

### Session Orchestration (`host-services/session-orchestration/app.py`, port 9998)
- 9-step async launch: scheduling → port allocation → CPU allocation → NFS validation → container creation → start → desktop wait → health check → ready
- Resource tracking: CPU cores 2-15, ports 8100-8199, displays 20-99
- Tier slugs: spark, blaze, inferno, supernova
- Security: seccomp filter, capability dropping, sudoers deny-list, LD_PRELOAD stripping
- Bridge networking mode (production) vs host mode (legacy POC)

### Storage Provision (`host-services/storage-provision/app.py`, port 9999)
- ZFS dataset CRUD: provision, deprovision, upgrade quota
- File operations: list, mkdir, upload, download, delete (with directory traversal prevention)
- Optional NFS automount (exports + fstab management)
- Runs `provision-user-storage.sh` via sudo (NOPASSWD for zenith user)

### Config Files (`host-services/config/`)
- `bash.bashrc` — HAMi LD_PRELOAD injection, smart sudo wrapper
- `nvidia-smi-wrapper` — Shows per-container VRAM limit
- `seccomp-gpu-desktop.json` — Blocks dangerous syscalls
- `sudoers-laas-user` — Comprehensive deny-list (modules, fs, networking)
- `supervisord-hami.conf` — Process supervisor for container services

---

## 7. Monitoring Stack

**File:** `monitoring_setup_files/` — Docker Compose deployment

| Component | Port | Role |
|-----------|------|------|
| Prometheus | 9090 | Metrics (30-day retention, 20GB cap) |
| Grafana | 3000 | Dashboards |
| Alertmanager | 9093 | Telegram/Email alerts |
| Loki | 3100 | Log aggregation |
| Promtail | — | Log shipper (Docker + systemd) |
| node-exporter | 9100 | Host metrics |
| cAdvisor | 8999 | Container metrics |
| DCGM Exporter | 9400 | GPU telemetry |
| Blackbox | 9115 | Endpoint probing |
| mps-exporter | 9500 | **Custom** — MPS daemon state, NVENC count |
| session-exporter | 9501 | **Custom** — Session lifecycle metrics |
| Uptime Kuma | 3001 | Status page |

10 critical monitoring gaps addressed including nvidia-patch regression, lxcfs stoppage, ZFS mount health, per-user storage quota alerts, MPS fault frequency.

---

## 8. Authentication (Keycloak Dual-Realm)

- **laas realm** — Centralized broker for ALL auth (Google, GitHub, institution SSO). Issues tokens to frontend.
- **laas-academy realm** — Test institution IdP (simulates real university SAML/OIDC)
- **Flow:** University student authenticates at institution IdP → Keycloak brokers identity → backend creates/links user + provisions 15GB ZFS storage
- **Sign-out:** Must include `id_token_hint` to properly terminate laas realm session
- **Real-world integration:** Swap laas-academy with any university's SAML/OIDC endpoint

---

## 9. Current Project Status

### Complete
- POC validation (RTX 4090): Selkies, HAMi, MPS, NFS, lxcfs, NVENC all verified
- Database schema (60+ models, production-grade)
- Backend: Auth, compute, billing, storage, payments, support modules
- Frontend: Auth flows, dashboard, billing/Razorpay, storage file browser, dark mode
- Host services: Session orchestration + storage provisioning
- Monitoring stack: Full observability pipeline
- Documentation: POC Runbook v2, Node Setup Guide, Storage/Auth architecture guides

### Partially Complete
- Instances page UI (51KB, needs completion)
- Landing page (mostly commented out)
- Onboarding form

### Not Yet Implemented (Software)
- Templates hub, Profile page, SSH/API keys management
- Lab/Course LMS features (models exist, no endpoints)
- Mentorship booking (models exist)
- Community/gamification features (models exist)
- Admin panel

### Pending (Infrastructure/Hardware)
- RTX 5090 Blackwell validation (re-run all POC tests)
- 10GbE networking (NIC procurement, Mikrotik switch, VLANs)
- Cloudflare Tunnel + Tailscale VPN for production
- Bridge networking migration (from host mode)
- HTTPS/TLS for all HTTP APIs
- MATLAB network license resolution (BLOCKER)
- ISP 500Mbps+ symmetric upstream verification (BLOCKER)

---

## 10. Key Technical Decisions

1. **Containers over VMs** — Eliminates D3cold bug, enables fractional GPU, 4-8 concurrent users/node
2. **HAMi + MPS + Selkies stack** — First commercial implementation of fractional GPU desktops on consumer hardware
3. **Dual-realm Keycloak** — Identity brokering pattern, real-world institution integration tested
4. **Per-user ZFS datasets** — Individual NFS exports (not shared mount) for proper quota enforcement
5. **Selkies WebRTC over VNC/RDP** — Browser-native, NVENC-accelerated, no client install
6. **Fastify over Express** — Better performance for file uploads (500MB limit)
7. **Immutable audit tables** — BillingCharge, WalletTransaction, AuditLog never deleted
8. **Wallet holds pattern** — Pre-authorization prevents overdraft during sessions
