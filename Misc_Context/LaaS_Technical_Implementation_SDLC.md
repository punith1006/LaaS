# KSRCE-GKT AI Lab-as-a-Service (LaaS) Platform
## Technical Implementation Document & SDLC

---

## Document Overview

This document provides the technical implementation guide and SDLC for the KSRCE-GKT AI Lab-as-a-Service (LaaS) Platform — an on-premises cloud platform monetizing 4 high-performance compute nodes by delivering remote GPU-accelerated desktops and ephemeral compute sessions.

**Document Structure:**

- **Part A: Infrastructure Setup** — Hardware architecture, consumer GPU challenge, architectural pivots, procurement, storage, networking
- **Part B: Software Development** — Software stack, modules, features, integrations, sprint plan

---

# PART A: INFRASTRUCTURE SETUP

---

## 1. Hardware Overview

### 1.1 Existing Compute Nodes (4 Identical)

| Component | Specification |
|-----------|---------------|
| **CPU** | AMD Ryzen 9 9950X3D (16C/32T, 3D V-Cache) |
| **GPU** | Zotac RTX 5090 Solid OC 32GB |
| **RAM** | 64GB DDR5 6000MHz |
| **Storage** | 2TB NVMe Samsung 990 EVO Plus |
| **Fleet Total** | 64 cores, 256GB RAM, 128GB VRAM |

### 1.2 Required Procurement

| Item | Cost (₹) |
|------|----------|
| 4× Intel X550-T1 10GbE NIC | 26,000 |
| 1× Mikrotik CRS309-1G-8S+ Switch | 25,000 |
| 6× SFP+ DAC Cables | 5,000 |
| 4× HDMI 2.1 Dummy Dongles | 2,800 |
| NAS (TrueNAS/Synology) | 40,000–1,20,000 |
| 5kVA UPS | 40,000–80,000 |
| **Total** | **1,61,800 – 2,61,800** |

---

## 2. THE CONSUMER GPU CHALLENGE — Why This Matters

> ⚠️ **The RTX 5090 is a consumer GPU with fundamental limitations that shaped the entire architecture.**

### 2.1 Three Critical Constraints

| Constraint | Problem | Impact |
|------------|---------|--------|
| **No Hardware Partitioning** | No vGPU, No MIG, No SR-IOV | Cannot split GPU across VMs |
| **D3cold Reset Bug** | GPU fails to wake after VM shutdown | Requires host reboot |
| **Driver Mutuality** | vfio-pci vs nvidia-driver are mutually exclusive | Reboot needed to switch modes |

### 2.2 Architectural Pivot

| Approach | Description |
|----------|-------------|
| **Architecture A (PRIMARY)** | Unified container model — ALL sessions run as Docker containers with Selkies EGL Desktop. GPU tiers use HAMi-core + CUDA MPS for fractional VRAM (4GB/8GB/16GB). |
| **Architecture B (FALLBACK)** | Static node roles — 2 nodes VM passthrough, 2 nodes container-only. Only if A fails burn-in. |

> 🔄 **Decision Gate:** Phase 0 Week 3 validates Architecture A.

---

## 3. Breakthrough Technologies Enabling This Platform

### 3.1 Selkies EGL Desktop Containers

- Full KDE Plasma desktop inside Docker
- VirtualGL EGL backend for GPU-accelerated rendering
- Shares one GPU across multiple containers simultaneously
- WebRTC streaming to browser — no client install
- NVENC hardware encoding

### 3.2 HAMi-core (libvgpu.so)

- Intercepts CUDA API to enforce VRAM limits (4GB, 8GB, 16GB)
- Shows limited VRAM in `nvidia-smi` inside container
- Works via LD_PRELOAD — no kernel changes

### 3.3 CUDA MPS

- Second-layer VRAM enforcement
- SM partitioning (170 SMs on RTX 5090)
- Isolated GPU virtual address spaces per client
- Auto-recovers from GPU faults

---

## 4. Storage Architecture

### 4.1 Per-Node NVMe Layout

| Partition | Size | Purpose |
|-----------|------|---------|
| p1 | 128GB | Proxmox OS |
| p2 | 500GB | Docker storage |
| p3 | 1100GB | Container scratch (ephemeral) |
| p4 | 240GB | Shared datasets |

### 4.2 Centralized NAS (5th Machine)

- TrueNAS Scale with 4×4TB HDD (RAIDZ1, ~12TB usable)
- Per-user ZFS datasets with 15GB quota
- NFS over 10GbE to all nodes
- ZFS auto-snapshots (6-hourly)

---

## 5. Networking

### 5.1 VLAN Layout

| VLAN | Subnet | Purpose |
|------|--------|---------|
| 10 | 10.10.10.0/24 | Management |
| 20 | 10.10.20.0/24 | Stateful containers |
| 30 | 10.10.30.0/24 | Ephemeral containers |
| 40 | 10.10.40.0/24 | NFS storage |
| 50 | 10.10.50.0/24 | Platform services |

### 5.2 External Access

- **Cloudflare Tunnel** — Primary (zero port-forwarding, DDoS protection)
- **Tailscale** — Secondary (SSH/Moonlight for power users)

---

## 6. Isolation & Risk

### 6.1 Isolation Layers

| Layer | Mechanism |
|-------|-----------|
| CPU/RAM | cgroups v2 (hard limit) |
| Filesystem | Docker overlay2 + NFS |
| GPU VRAM | HAMi-core + MPS (dual-layer) |
| GPU Compute | MPS SM% partitioning |

### 6.2 GPU Fault Mitigation

- MPS auto-recovery (Volta+)
- Watchdog service — 5-second polling
- Auto-restart in 30–60 seconds
- User data safe on NAS

---

## 7. Implementation Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 0 | Weeks 1–3 | Hardware burn-in, DECISION GATE |
| Phase 1 | Weeks 3–6 | Core infrastructure, base image |
| Phase 2 | Weeks 6–10 | Orchestrator, booking system |
| Phase 3 | Weeks 10–14 | Frontend portal |
| Phase 4 | Weeks 14–18 | Billing, monitoring |
| Phase 5 | Weeks 18–22 | Beta testing |
| Phase 6 | Week 22+ | Production launch |

### ⚠️ Blockers to Resolve NOW

1. **MATLAB Network License** — Contact MathWorks
2. **ISP Bandwidth** — Verify 500Mbps+ symmetric
3. **Dual ISP** — Obtain quotes from 2 providers

---

# PART B: SOFTWARE DEVELOPMENT

---

## 8. Software Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Python FastAPI |
| Auth | Keycloak (OIDC) |
| Database | PostgreSQL |
| State | Redis |
| Monitoring | Prometheus + Grafana + DCGM |

---

## 9. Module Breakdown

### 9.1 Authentication & Identity

- University SSO (Google Workspace / LDAP)
- Public users: Google OAuth
- Roles: Student, Faculty, Admin, Corporate Partner

### 9.2 User Management

- Registration with email verification
- Profile setup & preferences
- OS selection (Ubuntu 22.04 LTS)
- 15GB storage quota monitoring

### 9.3 Compute Tier Catalog

| Tier | vCPU | RAM | GPU | Price (₹/hr) |
|------|------|-----|-----|--------------|
| **Stateful** |||||
| Starter | 2 | 4GB | — | 15 |
| Standard | 4 | 8GB | — | 30 |
| Pro | 4 | 8GB | 4GB | 60 |
| Power | 8 | 16GB | 8GB | 100 |
| Max | 8 | 16GB | 16GB | 150 |
| Full Machine | 16 | 48GB | 32GB | 300 |
| **Ephemeral** |||||
| Ephemeral CPU | 2 | 4GB | — | 10 |
| Ephemeral GPU-S | 2 | 4GB | 4GB | 40 |
| Ephemeral GPU-M | 4 | 8GB | 8GB | 75 |
| Ephemeral GPU-L | 8 | 16GB | 16GB | 120 |

### 9.4 Booking & Scheduling

- Real-time fleet availability dashboard
- Time slot selection (immediate/scheduled)
- Booking confirmation workflow

### 9.5 Session Orchestrator (FastAPI)

- Fleet state tracking (CPU, RAM, VRAM)
- Container lifecycle management
- Dynamic node placement
- Graceful shutdown (15-min, 5-min warnings)

### 9.6 Wallet & Billing

- Prepaid credit system
- Razorpay/Stripe integration
- Subscription tiers (Bronze, Silver, Gold)
- Usage-based billing (per-minute)

### 9.7 Mentorship System

- Mentor availability calendar
- Video conferencing (Jitsi/Zoom)
- Session scheduling & reminders

### 9.8 Dashboards

**User Dashboard:** Active sessions, wallet balance, bookings, storage usage

**Admin Dashboard:** Fleet health, user management, analytics, audit logs

### 9.9 AI Chatbot (MVP)

- FAQ-driven responses
- Human escalation workflow

---

## 10. Third-Party Integrations

| Service | Purpose |
|---------|---------|
| Keycloak | Identity & Access |
| Razorpay/Stripe | Payments |
| Cloudflare | DNS, Tunnel, DDoS |
| Jitsi/Zoom | Video conferencing |
| NVIDIA DCGM | GPU monitoring |
| Tailscale | VPN access |

---

## 11. Security & Compliance

- TLS 1.3 everywhere
- No hardcoded credentials
- DPDPA 2023 compliance
- cgroups + namespaces + AppArmor isolation
- Anti-abuse: mining detection, rate limiting

---

## 12. Sprint Plan (Manager's Timeline)

> ⚠️ **Requirement:** Full development by March 7, 2026. Soft launch March 17, 2026.

### Sprint 1 (March 1–7, 2026) — MVP

**Deliverables:**

1. **User Authentication & Onboarding**
   - Signup/Login with email verification
   - Role-based access (Student, Faculty, Admin)
   - Freemium tier auto-assignment

2. **GPU Booking & Resource Management**
   - Real-time availability dashboard
   - Booking workflow with time slots
   - Basic wallet system

3. **Dashboard & Analytics (MVP)**
   - User: active jobs, balance, bookings
   - Admin: resource monitoring

4. **Responsive Web UI**
   - Mobile-friendly, dark-mode
   - Fast load times (<2s)

**Deferred to v2.0:**
- JupyterHub multi-user
- Mobile app
- Data annotation platform
- AI model marketplace
- Advanced gamification

---

## 13. Development Standards

| Aspect | Standard |
|--------|----------|
| Security | Encrypted data, no credentials in code, HTTPS |
| Performance | API <500ms (p95) |
| Uptime | 99% target, automated backups |
| Testing | Automated tests for critical paths |

---

## 14. Risk Register

| Risk | Mitigation |
|------|------------|
| GPU instability | MPS watchdog, auto-recovery |
| ISP outage | Dual ISP failover |
| MATLAB license | Contact MathWorks NOW |
| Thermal issues | DCGM monitoring, 80°C alerts |
| Bandwidth | 500Mbps+ symmetric |

---

## Document Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 8, 2026 | Initial release |

---

*This document serves as the single source of truth for LaaS platform implementation.*
