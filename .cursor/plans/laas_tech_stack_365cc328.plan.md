---
name: LaaS Tech Stack
overview: Complete tech stack recommendation for the LaaS platform covering authentication, RBAC, databases, backend/frontend frameworks, event bus, and monitoring -- grounded in the validated POC infrastructure, the monitoring gap analysis, and competitive research on similar GPU-sharing platforms (Coder, Eclipse Che, Lambda Labs, Paperspace).
todos:
  - id: confirm-stack
    content: Get user confirmation on the recommended tech stack (NestJS, Next.js, FastAPI, PostgreSQL, MongoDB, Keycloak, Redis)
    status: pending
  - id: setup-monorepo
    content: "Initialize monorepo structure from scratch: apps/web (Next.js), apps/api (NestJS), apps/orchestrator (FastAPI), packages/shared (Zod schemas), docker-compose for dev services"
    status: pending
  - id: setup-database
    content: Design and implement the PostgreSQL schema with Prisma (users, orgs, roles, sessions, bookings, billing, audit) + MongoDB for telemetry (session_events, webrtc_snapshots) -- greenfield
    status: pending
  - id: setup-keycloak
    content: Deploy Keycloak container and configure realms for university SSO and public users
    status: pending
  - id: build-nestjs
    content: "Build NestJS API gateway from scratch: Fastify adapter, Keycloak OIDC, RBAC guards, WebSocket gateway, Prisma integration"
    status: pending
  - id: build-fastapi
    content: Build FastAPI orchestrator from scratch with Docker SDK, session lifecycle, GPU budget tracking, ZFS provisioning
    status: pending
  - id: build-nextjs
    content: Build Next.js 15 frontend from scratch with shadcn/ui, auth flow, dashboard, session booking, WebRTC embedding
    status: pending
  - id: extend-monitoring
    content: Integrate app with existing monitoring stack -- add Tempo, OpenTelemetry, WebRTC telemetry, custom Prometheus metrics
    status: pending
isProject: false
---

# LaaS Platform -- Tech Stack Recommendation

## Current State -- Clean Slate

All previous application code (backend/frontend) has been deleted. We are building from scratch. The assets we have:

- **Documentation**: `[project_context_Beta.txt](project_context_Beta.txt)` (full project spec), `[Important_docs/](Important_docs/)` (POC Runbook v2, Node Setup Guide v1, monitoring gap analysis)
- **Monitoring stack**: `[monitoring_setup_files/](monitoring_setup_files/)` -- fully configured Prometheus + Grafana + DCGM + Loki + cAdvisor + Alertmanager + Uptime Kuma (Docker Compose-based, production-ready)
- **Validated POC infrastructure**: Docker containers, Selkies EGL Desktop, HAMi-core VRAM enforcement, CUDA MPS, ZFS/NFS storage, lxcfs resource spoofing -- all proven on RTX 4090 test node
- **Reference material**: `[LaaS_Comp/](LaaS_Comp/)` (prior architecture plans), `[Misc_Context/](Misc_Context/)` (research, progress logs)

No `package.json`, no `tsconfig.json`, no application code of any kind exists. Every line of application code will be written fresh.

---

## 1. Authentication and SSO -- Keycloak 26.x (Self-Hosted)

**Verdict: Keycloak. No alternative is close for this use case.**

**Why it wins over Auth0 or custom JWT:**

- **On-premises**: Your GPUs are on-prem; your identity system should be too. Auth0 is cloud-only SaaS (Okta-owned), creating an external dependency and data sovereignty concern
- **University LDAP federation**: Native first-class feature. Keycloak syncs users from university LDAP/AD, maps LDAP groups to Keycloak roles. No password stored in LaaS
- **Google Workspace SSO**: Built-in OIDC Identity Brokering. Users click "Sign in with Google," Keycloak maps the `hd` (hosted domain) claim to the correct university organization
- **InCommon/Shibboleth**: ~90% of universities use Shibboleth for SAML federation. Keycloak acts as a SAML 2.0 SP that can federate with InCommon IdPs -- critical for multi-university access
- **Multi-tenant isolation**: Each university gets its own Keycloak realm with separate user stores, IdP configurations, and policies
- **Public users**: Separate realm with local registration + email verification + Google social login (ephemeral-only access)
- **Eclipse Che** (the closest architectural analog to LaaS) uses Keycloak natively. Coder uses OIDC with Keycloak as a recommended IdP

**Deployment**: Run Keycloak as a Docker container alongside your monitoring stack on the management/NAS node. PostgreSQL as Keycloak's backing database (shared instance, separate schema).

**Version**: Keycloak 26.x (Quarkus-based distribution, latest stable 2026)

---

## 2. RBAC -- Application-Level + PostgreSQL Row-Level Security

**Hierarchical multi-tenant model (9 roles):**

```
Platform Level:  super_admin (platform operator)
                     |
Org Level:       org_admin (university IT admin)
                     |
         +-----------+-----------+--------------+
         |           |           |              |
      faculty   lab_instructor  billing_admin  mentor (Phase 3)
         |           |
      student   external_student
         |
    public_user (separate realm, ephemeral-only)
```


| Role               | Scope         | Key Capabilities                                                                     |
| ------------------ | ------------- | ------------------------------------------------------------------------------------ |
| `super_admin`      | Platform-wide | Full control: all orgs, all data, system settings, feature flags                     |
| `org_admin`        | Organization  | Manage users/roles/departments within their org, view org billing, configure IdPs    |
| `faculty`          | Organization  | Create courses, approve projects, track lab attendance and resource consumption      |
| `lab_instructor`   | Organization  | Create labs/assignments, assign to groups, grade submissions (academic LMS workflow) |
| `billing_admin`    | Organization  | Manage org wallet, view invoices, purchase credit packages, manage subscriptions     |
| `mentor`           | Organization  | Create profile, set availability/pricing, conduct booked guidance sessions (Phase 3) |
| `student`          | Organization  | Book sessions (stateful + ephemeral), submit assignments, wallet top-up              |
| `external_student` | Organization  | Same compute access as student, wallet-based only, partner college billing           |
| `public_user`      | Public realm  | Ephemeral instances only, wallet-based, no stateful desktops, no NAS storage         |


**Implementation strategy:**

- **Keycloak** handles authentication and maps university IdP groups to Keycloak roles, injecting roles into JWT claims
- **Application middleware** (NestJS Guards) validates JWT role claims against route permissions
- **PostgreSQL RLS** provides defense-in-depth -- rows are filtered at the database level even if application logic has bugs. Tenant isolation via `org_id` on every row

**Key design**: Roles are scoped to organizations. A user can be `faculty` at University A and `student` at University B simultaneously. This is a many-to-many relationship (`user_org_roles` table), not a single role column.

### Permission-based guard system

Roles alone are too coarse. The platform uses a **permission-based** authorization model backed by three database tables:

- `roles` -- the 9 roles above
- `permissions` -- granular actions (e.g., `session:create`, `lab:grade`, `billing:manage`, `user:invite`)
- `role_permissions` -- many-to-many mapping of which roles hold which permissions

**NestJS implementation:**

- `@Permissions('session:create', 'billing:read')` decorator on controller methods
- `PermissionGuard` resolves the user's org-scoped roles from the JWT -> collects all permissions via `role_permissions` -> checks against the route's required permissions
- This allows fine-grained control: e.g., `lab_instructor` gets `lab:create`, `lab:grade`, `assignment:manage` but NOT `billing:manage` or `user:invite`
- Permission sets are cached in Redis per `user_id:org_id` with a 15-minute TTL (invalidated on role change)

---

## 3. JWT -- RS256 with Short-Lived Access + Server-Tracked Refresh


| Token         | Lifetime   | Storage                                    | Purpose                 |
| ------------- | ---------- | ------------------------------------------ | ----------------------- |
| Access Token  | 15 minutes | Memory (JS variable, never localStorage)   | API authorization       |
| Refresh Token | 7 days     | httpOnly / Secure / SameSite=Strict cookie | Silent renewal          |
| Session Token | 24 hours   | Redis (server-side)                        | Real-time session state |


- **Algorithm**: RS256 (asymmetric). Keycloak signs with private key; all services verify with public key. No shared secrets across microservices
- **Token rotation**: New refresh token issued on every use. Old token invalidated in Redis
- **Revocation**: Hybrid -- delete refresh token from Redis (prevents renewal) + 15-minute max exposure window for access tokens + Redis blacklist for emergency revocation
- **"Logout everywhere"**: `token_version` counter in users table; all services check the claim against DB

---

## 4. Database -- PostgreSQL 17 (Primary) + MongoDB 8.x (Telemetry)

**Verdict: PostgreSQL as the system of record for all relational, ACID-critical data (63 tables). MongoDB for high-volume, append-only telemetry.**


| Data Type                     | Storage                            | Rationale                                                                        |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Users, Orgs, Roles            | PostgreSQL                         | Relational, ACID, foreign keys, RLS                                              |
| Sessions and Bookings         | PostgreSQL                         | Transactional integrity, complex scheduling queries                              |
| Billing and Payments          | PostgreSQL (append-only table)     | ACID critical, immutable audit trail, no UPDATE/DELETE                           |
| Audit Logs                    | PostgreSQL (append-only)           | Compliance, tamper evidence, complex queries                                     |
| Time-Series Metrics (billing) | PostgreSQL + TimescaleDB extension | 260x faster time-range queries vs vanilla PG                                     |
| Session Events (telemetry)    | MongoDB (TTL: 90 days)             | Container lifecycle events, idle heartbeats, reconnects -- high write throughput |
| WebRTC Snapshots (telemetry)  | MongoDB (TTL: 30 days)             | Client-side quality metrics every 5s during active sessions -- schema-flexible   |
| GPU Metrics (hot/real-time)   | Prometheus TSDB                    | Already collecting via DCGM exporter                                             |
| Cache + Session State         | Redis 7.4+                         | In-memory speed, TTL, pub/sub                                                    |
| Real-time Container Status    | Redis                              | Pub/sub for dashboard updates                                                    |


**Why MongoDB for telemetry (not PostgreSQL):**

- **Schema flexibility**: Event shapes change as new telemetry fields are added (e.g., new WebRTC stats, new container events). MongoDB documents evolve without schema migrations
- **Native TTL expiry**: MongoDB TTL indexes automatically purge documents after 30/90 days with zero application logic. PostgreSQL requires scheduled `DELETE` jobs or partitioned table management
- **Write throughput**: WebRTC snapshots arrive every 5 seconds per active session. At 100 concurrent sessions that is 1,200 writes/minute of append-only telemetry. MongoDB handles this without WAL pressure on the PostgreSQL primary
- **No relational integrity needed**: These collections are fire-and-forget telemetry. They reference `session_id` and `user_id` but never need foreign key constraints or JOINs with billing/booking data

**PostgreSQL JSONB** is still used for semi-structured fields on relational tables (e.g., `sessions.resource_snapshot`, `audit_log.old_data/new_data`, `nodes.hardware_specs`) -- these are fields that live alongside relational data and benefit from RLS and transactional guarantees.

**ORMs**: Prisma for PostgreSQL (TypeScript integration, migrations, type-safe queries). Mongoose for MongoDB (schema validation, TTL index management, connection pooling).

**Versions**: PostgreSQL 17, TimescaleDB 2.x, MongoDB 8.x, Redis 7.4+

---

## 5. Wallet, Billing, and Payment Gateway

**The platform's revenue engine. Covers all 5 revenue streams from the business model: academic integration fees, premium student passes, pay-as-you-go wallet, partner-college subscriptions, and mentor booking fees.**

### Payment Gateways


| Gateway      | Role                   | Integration                                                                          |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------ |
| **Razorpay** | Primary (INR domestic) | `razorpay` npm package -- server-side order creation, webhook signature verification |
| **Stripe**   | International (future) | `stripe` npm package -- card payments for partner colleges outside India             |


- Webhook endpoints in NestJS (`POST /api/webhooks/razorpay`, `POST /api/webhooks/stripe`) -- idempotent processing with `payment_gateway_ref` deduplication
- All webhook payloads verified via HMAC signature before processing

### Wallet Engine

- NestJS `BillingModule` with a **double-entry ledger** pattern
- Every wallet mutation is a `wallet_transactions` row (`credit`, `debit`, `refund`, `bonus`, `expired`) with a running `balance_after` field
- **Real-time session billing**: Redis caches the current wallet balance (`wallet:{user_id}:balance`). Active sessions debit from Redis every 60 seconds; a background job syncs debits to PostgreSQL `wallet_transactions` every 5 minutes
- **Low-balance alerts**: When Redis balance drops below threshold (configurable in `system_settings`), a `notification:send` event is published to Redis Streams
- **Billing rate**: Configurable per `compute_config` tier (stored in `compute_configs.price_per_hour` and `compute_config_access.override_price`)

### Credit Packages and Subscriptions

- **Credit packages**: Pre-defined recharge amounts with bonus credits (e.g., pay Rs.500 get Rs.550). Stored in `credit_packages` table
- **Subscription plans**: Tiered packages (Bronze, Silver, Gold) bundling GPU-hours, mentor sessions, and certification vouchers. Stored in `subscription_plans` with `features JSONB`
- **Organization contracts**: University-level pre-paid agreements with resource quotas and billing periods. Stored in `org_contracts` + `org_resource_quotas`

### Invoicing

- Automated monthly invoices generated from `billing_charges` + `wallet_transactions` for the period
- `invoices` table with `invoice_line_items` for itemized breakdown (per-session charges, subscription fees, mentor bookings)
- PDF generation via `@react-pdf/renderer` (React-based templates) or `pdfkit` (programmatic)
- Invoice delivery via the Notification Stack (email + in-app)

### Billing Immutability

- `billing_charges` table is append-only: `REVOKE UPDATE, DELETE ON billing_charges FROM laas_app`
- Each record includes a SHA-256 hash of its contents for tamper evidence
- Separate from Prometheus metrics -- Prometheus data has scrape failures and retention expiry; billing records are permanent

---

## 6. Notification Stack -- Email / SMS / Push

**Multi-channel notification system for transactional alerts, OTP delivery, and user engagement.**

### Email

- **Library**: `@nestjs-modules/mailer` (wraps Nodemailer) with Handlebars HTML templates
- **Transport**: Gmail SMTP for MVP (credentials in `.env`); upgrade to Amazon SES or Resend for production volume (>500 emails/day)
- **Triggers**: OTP verification, welcome email, low-balance alert, session reminders, invoice delivery, password reset, assignment graded, mentor booking confirmation

### SMS

- **Provider**: MSG91 (India-focused, cost-effective for OTP and transactional SMS) via REST API
- **Triggers**: OTP verification, low-balance critical alert, session auto-termination warning
- **Fallback**: Twilio (if international SMS needed for partner colleges outside India)

### Web Push

- **Library**: `web-push` npm library + Service Worker registered in the Next.js frontend
- **Triggers**: session ready, session auto-terminating in 5 minutes, low wallet balance, assignment graded, mentor booking confirmed
- **Storage**: Push subscriptions stored in `user_profiles.push_subscription_json` (JSONB)

### Orchestration

- NestJS `NotificationModule` with a channel-agnostic dispatcher
- Reads message template from `notification_templates` table, renders per channel (email/SMS/push), writes delivery record to `notifications` table
- **Async dispatch**: Events published to Redis Streams topic `notification:send` -- a dedicated consumer picks them up and dispatches. Non-blocking to the originating request path
- **Delivery tracking**: `notifications.status` (pending / sent / delivered / failed), `notifications.sent_at`, `notifications.retry_count`
- **Retry policy**: Exponential backoff (5s, 30s, 5min), max 3 attempts per notification

---

## 7. Backend -- NestJS 11 (API Gateway) + FastAPI (Infrastructure Orchestration)

**Replace the Express skeleton with NestJS. Keep FastAPI for infra orchestration.**

### Why NestJS over Express

The existing Express skeleton is ~50 lines of implemented code (a health check and middleware wiring). The route files are empty. Replacing it costs almost nothing and gains:

- **Structured architecture**: Modules, dependency injection, decorators. Essential for a platform with auth, billing, sessions, booking, admin, audit, and real-time features
- **Fastify adapter**: NestJS architecture with Fastify's 70-80K req/s performance (3-5x over Express)
- **Built-in WebSocket gateway**: Real-time session status, live GPU meters, monitoring dashboards -- all first-class
- **Guards and Interceptors**: Map directly to RBAC middleware, audit logging, rate limiting
- **Microservice transport**: Native NATS/Redis adapters for inter-service communication with FastAPI
- **OpenAPI generation**: Automatic Swagger docs from decorators

### Why FastAPI stays for infrastructure

- **Docker SDK for Python (docker-py 7.x)** is the most mature container orchestration library. No Node.js equivalent comes close for SSH-based remote Docker management across 4 nodes
- **SSH to remote nodes**: `docker.DockerClient(base_url="ssh://user@node1")` for managing containers
- **GPU management**: NVIDIA's Python libraries (pynvml) are Python-native
- **OpenTelemetry**: First-class tracing support for the session launch waterfall (the monitoring gap analysis identifies this as critical)
- **Already specified in project_context_Beta.txt**: "Implemented as a Python FastAPI microservice with Redis state store, talking to Docker API"

### Architecture split

```
                    +--------------------------+
                    |    Cloudflare Tunnel      |
                    +-----------+--------------+
                                |
                    +-----------v--------------+
                    |    Next.js Frontend       |
                    |    (App Router + SSR)      |
                    +-----------+--------------+
                                |
                    +-----------v--------------+
                    |    NestJS API Gateway     |
                    |  Auth, RBAC, Billing,     |
                    |  Booking, Admin, Audit    |
                    |  WebSocket Gateway        |
                    +-----------+--------------+
                          |            |
                   +------+----+------+------+
                   |           |      |      |
              +----v----+ +---v---+  | +----v-------+
              |PostgreSQL| | Redis |  | | FastAPI    |
              |+Timescale| |       |  | | Orchestrator|
              +---------+ +-------+  | +-----+------+
                                     |       |
                                +----v----+  |
                                | MongoDB |  |
                                |(telemetry) |
                                +---------+  |
                                      +------v------+
                                      | Docker API  |
                                      | (4 nodes)   |
                                      +-------------+
```

- **NestJS** handles everything user-facing: REST API, WebSocket, auth validation, billing logic, booking, admin UI endpoints, audit writes
- **FastAPI** handles everything infrastructure: container lifecycle (start/stop/health), ZFS provisioning, GPU budget tracking, node health, port registry. Communicates with NestJS via Redis pub/sub or NATS

### Session telemetry pipeline

- **Event writer**: NestJS `SessionEventConsumer` reads from the `session:lifecycle` Redis Streams topic and writes each event to MongoDB `session_events_mongo` (append-only, TTL 90 days). Critical events (session start/end, billing triggers) are also written to PostgreSQL `session_events` for permanent retention
- **WebRTC snapshot ingestion**: NestJS exposes `POST /api/sessions/:id/webrtc-snapshot` (called by the frontend every 5s during active sessions). The endpoint validates the session token and writes directly to MongoDB `webrtc_snapshots` (TTL 30 days). At session end, a `SessionCloseJob` aggregates the raw snapshots into `sessions.resource_snapshot` JSONB (average/peak packet loss, RTT, FPS, bitrate)
- **Resource snapshot aggregation**: When FastAPI publishes a `session:lifecycle` event with `eventType = 'ended'`, the NestJS consumer triggers a background job that: (1) queries MongoDB `webrtc_snapshots` for that session, (2) queries cAdvisor/DCGM metrics from Prometheus for the session time range, (3) writes the aggregated peak/average stats into `sessions.resource_snapshot` JSONB, (4) creates the immutable `billing_charges` row

### Idle detection and auto-termination

Enforced by the **FastAPI orchestrator** using a periodic polling loop:

1. **Heartbeat source**: The Selkies desktop sends keyboard/mouse activity events. The NestJS WebSocket gateway receives client heartbeats and updates Redis key `session:{id}:heartbeat` (60-second TTL)
2. **FastAPI idle monitor** (runs every 60s per active session): checks if the `session:{id}:heartbeat` key exists in Redis
3. **30 minutes idle**: Publish `session:lifecycle` event with `eventType = 'idle_detected'` -> NestJS sends warning notification (push + in-session banner)
4. **45 minutes idle**: Publish warning_5min event -> NestJS sends final warning notification
5. **60 minutes idle**: FastAPI terminates the container -> updates `sessions.status = 'terminated_idle'`, `sessions.termination_reason = 'idle_timeout'`, `sessions.ended_at = now()` -> publishes `session:lifecycle` event with `eventType = 'ended'`
6. **Thresholds configurable**: Stored in `system_settings` table (keys: `idle_warning_minutes`, `idle_suspend_minutes`, `idle_terminate_minutes`)

**Versions**: NestJS 11.x (Fastify 5.x adapter), FastAPI 0.115+ (Python 3.12+), Docker SDK 7.x

---

## 8. Frontend -- Next.js 15 (App Router) + shadcn/ui + Tailwind CSS 4

**Your plan for Next.js is the right call. Here's the specific stack:**


| Concern        | Technology                                    | Why                                                     |
| -------------- | --------------------------------------------- | ------------------------------------------------------- |
| Framework      | Next.js 15 (App Router, Server Components)    | SSR for auth pages, RSC for data-heavy dashboards       |
| UI Library     | shadcn/ui + Radix primitives + Tailwind CSS 4 | Accessible, customizable, no runtime CSS-in-JS          |
| State (client) | Zustand                                       | Lightweight, TypeScript-first, no boilerplate           |
| State (server) | TanStack Query 5                              | Cache, refetch, optimistic updates for API data         |
| Real-time      | Socket.io client                              | WebSocket connection to NestJS gateway for live updates |
| WebRTC Session | iframe embed or Selkies JS client             | Embed Selkies desktop stream in session page            |
| Charts         | Recharts or embedded Grafana panels           | GPU meters, usage graphs, billing charts                |
| Forms          | React Hook Form + Zod                         | Type-safe validation shared with backend                |
| Auth           | next-auth (Auth.js) v5 + Keycloak provider    | OIDC integration with Keycloak                          |


**Key architecture patterns:**

- **Server Components** for dashboard pages (session lists, billing summaries, user management) -- reduces client JS bundle
- **Client Components** for interactive elements: real-time GPU meters, session terminal, WebRTC viewer, booking calendar
- **Route groups** for multi-role layouts: `/(admin)/...`, `/(faculty)/...`, `/(student)/...` with layout-level auth guards
- **WebRTC telemetry collector** in the session page (the monitoring gap analysis identifies this as P0 -- client-side `getStats()` polling every 5s). Route: **browser `RTCPeerConnection.getStats()`** -> `**POST /api/sessions/:id/webrtc-snapshot**` (NestJS) -> **MongoDB `webrtc_snapshots`**. Fields collected: `packetLossRatio`, `rttMs`, `fps`, `bitrateBps`. At session end, aggregated into `sessions.resource_snapshot` JSONB
- **Activity heartbeat**: Client sends a WebSocket ping to NestJS every 30s while the user has keyboard/mouse focus. NestJS updates Redis `session:{id}:heartbeat` (60s TTL). Drives the idle detection workflow in the FastAPI orchestrator (see Section 7)

**Versions**: Next.js 15.x, React 19, Tailwind CSS 4, shadcn/ui (latest)

---

## 9. Event Bus -- Redis Streams + Pub/Sub (Keep It Simple for MVP)

**For the MVP, use Redis as the event bus. Evaluate NATS JetStream for v2.**

**Rationale**: You already need Redis for caching and session state. Adding a separate message broker (NATS/RabbitMQ) introduces another service to deploy, monitor, and maintain on your on-prem hardware. Redis Streams provide durable, ordered message delivery with consumer groups -- sufficient for the MVP event patterns.


| Pattern        | Mechanism              | Use Case                                                                       |
| -------------- | ---------------------- | ------------------------------------------------------------------------------ |
| Pub/Sub        | Redis pub/sub          | Ephemeral real-time: live GPU utilization to dashboard, session status changes |
| Durable Events | Redis Streams          | Session lifecycle (start/stop/error), billing charges, audit events            |
| Cache          | Redis GET/SET with TTL | JWT blacklist, session tokens, node resource budget                            |


**Event topics:**

- `session:lifecycle` -- start, stop, error, reconnect, idle_detected events. **Consumer group members**:
  - `SessionEventConsumer` -- writes to MongoDB `session_events_mongo` (all events) + PostgreSQL `session_events` (critical events only)
  - `BillingConsumer` -- on `ended` event: triggers resource aggregation + `billing_charges` row creation
  - `AuditConsumer` -- writes to PostgreSQL `audit_log`
  - `DashboardBroadcaster` -- pushes to WebSocket for real-time UI
  - `NotificationTrigger` -- on `idle_detected` / `warning_5min`: sends push + in-session notification
- `billing:charge` -- billing events (consumed by audit writer)
- `notification:send` -- multi-channel notification dispatch (consumed by NotificationModule workers)
- `monitoring:alert` -- GPU/node alerts (consumed by admin dashboard)
- `node:status` -- node health heartbeats from FastAPI orchestrator

**Upgrade path**: If the platform scales beyond 4 nodes or needs exactly-once delivery guarantees for billing, migrate to NATS JetStream. The event publisher interface stays the same; only the transport changes.

---

## 10. Monitoring -- Extend the Existing Prometheus + Grafana Stack

**The existing stack is solid. Extend it based on the gap analysis:**


| Component                                             | Status           | Action                                                        |
| ----------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| Prometheus + Node Exporter + cAdvisor + DCGM Exporter | Already deployed | Keep as-is                                                    |
| Grafana                                               | Already deployed | Add custom LaaS dashboards                                    |
| Loki + Promtail                                       | Already deployed | Add Keycloak events, auditd logs                              |
| Alertmanager (Telegram + email)                       | Already deployed | Add session-specific alerts                                   |
| Uptime Kuma                                           | Already deployed | Keep for basic uptime                                         |
| **Grafana Tempo**                                     | **NEW**          | Distributed tracing for session launch waterfall              |
| **coturn Prometheus**                                 | **NEW**          | TURN server metrics (trivial to enable)                       |
| **Gatus**                                             | **NEW**          | Public SLA status page for university clients                 |
| **NUT (UPS monitoring)**                              | **NEW**          | Power monitoring + graceful shutdown automation               |
| **Client WebRTC telemetry**                           | **NEW**          | Built into Next.js frontend, pushed to Prometheus Pushgateway |
| **OpenTelemetry in FastAPI**                          | **NEW**          | Trace every step of session launch                            |


**Custom Prometheus metrics from LaaS application:**

```
laas_active_sessions_total{node, tier, type}
laas_session_launch_duration_seconds{node, tier}
laas_session_launch_failures_total{node, reason}
laas_gpu_vram_allocated_mb{node}
laas_gpu_vram_available_mb{node}
laas_billing_charge_total{tier, org}
laas_active_users_24h / 7d / 30d
laas_webrtc_packet_loss_ratio{session_id, user_id, node}
laas_webrtc_fps_actual{session_id, user_id, node}
laas_webrtc_rtt_seconds{session_id, user_id, node}
```

---

## 11. Audit / Logging

**Three-layer approach:**

1. **Application audit log** (PostgreSQL append-only table): Every user action, session event, billing charge, admin operation. Immutable (REVOKE UPDATE, DELETE). Fields: `actor_id`, `org_id`, `action`, `resource_type`, `resource_id`, `old_data JSONB`, `new_data JSONB`, `client_ip`, `request_id`
2. **Structured application logs** (Pino for NestJS, structlog for FastAPI): JSON-formatted, every entry includes `request_id`, `user_id`, `org_id`. Shipped to Loki via Promtail
3. **Infrastructure audit** (auditd on hosts): Who ran Docker commands, who accessed container configs, who modified HAMi libraries. Shipped to Loki

**Billing-specific**: Every session produces an immutable billing record with: session duration, resources consumed (from cAdvisor/DCGM), connection events, WebRTC quality snapshot, SHA-256 hash for tamper evidence. This is separate from Prometheus metrics -- Prometheus data can have scrape failures and retention expiry; billing records are permanent.

---

## 12. Mentorship Platform -- Phase 3

**Phase 3 feature (post-MVP, post-Billing+Academic). DB tables already designed; this section identifies candidate technologies.**

### Video / Chat Integration

- **Primary**: Jitsi Meet (self-hosted, open-source, WebRTC-based) -- aligns with the on-prem philosophy. Deploy as a Docker container on the management node
- **Fallback**: Generate Google Meet or Zoom meeting links via their respective calendar/API integrations. Simpler to implement but introduces external dependency
- **In-app chat**: Socket.io rooms (already available via NestJS WebSocket Gateway) for text chat between mentor and student during a booking window

### Calendar Integration

- **Primary**: Google Calendar API -- automatic scheduling of booked mentor slots. Both mentor and student receive calendar invites with video call link
- **Alternative**: `ical` npm package for generating `.ics` file attachments in booking confirmation emails (no Google dependency, works with any calendar client)

### Data Model (already in DB design)


| Table                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `mentor_profiles`           | Skills, bio, hourly rate, average rating            |
| `mentor_availability_slots` | Recurring weekly availability with timezone support |
| `mentor_bookings`           | Booking records, wallet deduction at booking time   |
| `mentor_reviews`            | Post-session star rating + text review              |


### Booking + Payment Flow

1. Student browses mentor profiles filtered by skill/availability
2. Student selects a slot -> wallet balance checked -> `mentor_bookings` row created with `status = 'confirmed'` -> wallet debited
3. Both parties receive calendar invite + notification (email + push)
4. Post-session: student prompted for review -> `mentor_reviews` row created -> mentor's average rating recalculated
5. Cancellation within policy window -> refund to wallet -> `wallet_transactions` row with `type = 'refund'`

---

## 13. Complete Stack Summary


| Layer                   | Technology                                           | Version                       |
| ----------------------- | ---------------------------------------------------- | ----------------------------- |
| **Identity / SSO**      | Keycloak (self-hosted)                               | 26.x                          |
| **API Gateway**         | NestJS + Fastify adapter                             | 11.x                          |
| **Infra Orchestration** | Python FastAPI + Docker SDK                          | FastAPI 0.115+, docker-py 7.x |
| **Frontend**            | Next.js 15 (App Router) + shadcn/ui + Tailwind CSS 4 | 15.x, React 19                |
| **Primary Database**    | PostgreSQL + TimescaleDB                             | PG 17, TimescaleDB 2.x        |
| **Telemetry Database**  | MongoDB (session events, WebRTC snapshots)           | 8.x                           |
| **Cache / Event Bus**   | Redis                                                | 7.4+                          |
| **ORM (PostgreSQL)**    | Prisma                                               | 5.x+                          |
| **ODM (MongoDB)**       | Mongoose                                             | 8.x                           |
| **Validation**          | Zod (shared between frontend and backend)            | 3.x                           |
| **Payment Gateway**     | Razorpay (primary) + Stripe (international)          | Latest SDKs                   |
| **Email**               | @nestjs-modules/mailer (Nodemailer + Handlebars)     | Latest                        |
| **SMS**                 | MSG91 (India) / Twilio (international fallback)      | REST API                      |
| **Web Push**            | web-push npm + Service Worker                        | Latest                        |
| **Monitoring**          | Prometheus + Grafana + DCGM + Loki + Tempo           | Grafana 11.x                  |
| **Status Page**         | Gatus                                                | Latest                        |
| **Desktop Streaming**   | Selkies-GStreamer EGL Desktop (WebRTC)               | Latest                        |
| **Container Runtime**   | Docker + NVIDIA Container Toolkit                    | Docker 27.x                   |
| **Mentorship Video**    | Jitsi Meet (self-hosted) -- Phase 3                  | Latest                        |


**What stays from your original plan**: Next.js, Node.js, FastAPI, PostgreSQL, MongoDB

**What changes**: Express -> NestJS (structured architecture), MongoDB scoped to telemetry only (PostgreSQL is the system of record for all relational data), add Keycloak (essential for university SSO), add Redis (caching + events + session state), add Razorpay/Stripe (payment processing), add MSG91 (SMS), add Notification Stack (email/SMS/push)

---

## What to Drop and Why


| Dropped                          | Reason                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Express.js**                   | The existing skeleton has ~50 lines of real code. NestJS provides the structure, DI, guards, WebSocket gateway, and Fastify performance that a platform this complex demands. |
| **Custom JWT auth from scratch** | Keycloak handles token issuance, rotation, revocation, LDAP federation, SAML, OIDC -- all battle-tested. Building this from scratch is months of security-critical code.      |


