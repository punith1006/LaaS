# LaaS Platform — Critical Failure Point Analysis

This document identifies potential failure points, missing considerations, and critical dependencies that could derail the project if not addressed proactively.

---

## 1. LICENSING & LEGAL

### 🔴 CRITICAL: Software Licensing

| Software | Current Status | Action Required |
|----------|----------------|-----------------|
| **MATLAB** | ❌ NOT RESOLVED | Must procure Concurrent/Campus-Wide Network License from MathWorks. Per-seat license is NOT valid for multi-user hosting |
| **AutoCAD** | ⚠️ Needs audit | Requires Autodesk multi-user server subscription |
| **Blender** | ✅ OK | Free and open-source |
| **CUDA Toolkit** | ✅ OK | Free from NVIDIA |
| **Other ISV Software** | ⚠️ Needs audit | Review each vendor's licensing terms for shared hosting |

### 🟡 Legal & Compliance Gaps

| Item | Status | Notes |
|------|--------|-------|
| **Terms of Service** | ❌ Missing | Must define user agreements, liability, SLA |
| **Privacy Policy** | ❌ Missing | Required for DPDPA 2023 compliance |
| **GST Registration** | ⚠️ Need clarification | India: Need GST for charging users |
| **Payment Gateway Merchant Account** | ❌ Need to procure | Razorpay/Stripe require business registration |
| **Domain Registration** | ❌ Need to secure | lab.youragency.in or similar |

---

## 2. INFRASTRUCTURE PROCUREMENT GAPS

### 🟠 Missing from Current List

| Item | Estimated Cost | Priority |
|------|----------------|----------|
| **Server Rack/Cabinet** | ₹15,000–30,000 | HIGH |
| **Cat6a/Cat7 Cables for networking** | ₹3,000–5,000 | MEDIUM |
| **KVM Switch** | ₹5,000–10,000 | MEDIUM |
| **IPMI/Out-of-Band Management** | Already on ASUS board | ✅ OK |
| **Additional SSD for Docker registry** | ₹5,000–8,000 | MEDIUM |
| **Backup Internet Line** | ₹5,000–10,000/month | HIGH |

### 🟠 Physical Environment

| Item | Status | Notes |
|------|--------|-------|
| **Dedicated Room** | ⚠️ Need to confirm | Requires lockable server room |
| **Cooling (AC)** | ⚠️ Need to install | 3-4kW continuous heat load |
| **Power Infrastructure** | ⚠️ Need to verify | Can handle 4kW + UPS charging |
| **Fire Suppression** | ⚠️ Recommended | Consider ABC extinguishers |
| **Physical Security** | ⚠️ Need access control | Lock, CCTV recommended |

---

## 3. SOFTWARE INTEGRATIONS — MISSING DEPENDENCIES

### 🔴 Critical Integrations Not in Current Doc

| Service | Purpose | Status |
|---------|---------|--------|
| **SMTP Provider** | Transactional emails (verification, receipts) | ❌ Missing |
| **SMS Gateway** | OTP, notifications | ❌ Missing |
| **Push Notifications** | Web push for alerts | ❌ Missing |
| **Video Conferencing SDK** | Mentorship sessions (Jitsi/Zoom) | ⚠️ Need to decide |
| **Container Registry** | Store base Docker images | ❌ Missing solution |
| **Backup Service** | Database backup | ❌ Missing |

### 🟠 Third-Party Subscriptions Required

| Service | Monthly Cost (Est.) | Alternative |
|---------|---------------------|-------------|
| **Cloudflare Pro** | ₹2,000–5,000/mo | Free tier limited |
| **Razorpay/Stripe** | 2% transaction fee | Stripe (2.9% + fixed) |
| **SMTP (SendGrid/SES)** | ₹1,000–3,000/mo | Self-hosted (Postfix) |
| **SMS (Twilio/Msg91)** | ₹2,000–5,000/mo | — |
| **Monitoring Alerts** | ₹0–2,000/mo | Free tiers exist |
| **Domain (.in/.com)** | ₹500–1,000/yr | — |
| **SSL Certificate** | ₹0 (Let's Encrypt) | ✅ Free |

### 🟡 Decision Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Video Conferencing** | Jitsi (self-hosted) vs Zoom SDK | Jitsi for cost, Zoom for reliability |
| **Email Delivery** | SendGrid/SES vs Postfix on NAS | Postfix for control |
| **Container Registry** | Local (on NAS) vs Docker Hub vs GHCR | Local on NAS for speed |
| **Monitoring** | Prometheus self-hosted vs cloud | Prometheus + Grafana (free) |

---

## 4. TECHNICAL ARCHITECTURE GAPS

### 🟠 Missing Components

| Gap | Impact | Solution |
|-----|--------|----------|
| **Docker Registry** | Can't distribute base images | Set up local registry on NAS or use GitHub Container Registry |
| **Image Update Pipeline** | No way to update base software | CI/CD pipeline to rebuild and push images |
| **Database Backup** | Data loss risk | Automated pg_dump to NAS |
| **Redis Persistence** | Session state loss on crash | Redis RDB/AOF persistence |
| **Log Aggregation** | Can't debug issues | ELK Stack or Loki + Grafana |
| **Service Discovery** | How nodes find each other | Consul, etcd, or static config |

### 🟠 Base Image Build Pipeline

The current plan mentions building a custom Docker image but doesn't detail HOW:

| Step | Tool | Notes |
|------|------|-------|
| Build | Docker BuildKit | Enable cache sharing |
| Store | Local Registry | On NAS over 10GbE |
| Test | CI pipeline | Automated smoke tests |
| Deploy | Pull to nodes | Automated or manual |
| Rollback | Version tags | Keep v1, v2, etc. |

---

## 5. OPERATIONAL GAPS

### 🔴 Missing Operational Capabilities

| Gap | Risk | Recommendation |
|-----|------|----------------|
| **24/7 Support** | Users stranded at night | Define SLA, consider outsourced support |
| **On-call Rotation** | Slow incident response | Implement PagerDuty or similar |
| **Incident Response Plan** | No process when things break | Document runbooks |
| **User Documentation** | Support ticket flood | Create wiki/knowledge base |
| **Admin Training** | Can't manage platform | Train internal team before launch |
| **Runbook** | No deployment procedures | Document every procedure |

### 🟠 Monitoring & Observability Gaps

| What to Monitor | Current Status | Gaps |
|----------------|----------------|------|
| Node health | ✅ Covered (DCGM) | No alerting defined |
| Container health | ⚠️ Partial | Need container-level monitoring |
| API health | ⚠️ Partial | Need uptime checks |
| User activity | ❌ Missing | Need audit logging |
| Billing accuracy | ❌ Missing | Need reconciliation |
| Disk space | ⚠️ Need automation | Auto-cleanup not defined |

---

## 6. TIMELINE RISKS

### 🔴 Critical Path Items

| Task | Dependency | Risk |
|------|------------|------|
| MATLAB license procurement | MathWorks response time | **HIGH** — Could take weeks |
| ISP installation | Local ISP | **HIGH** — Could take 2-4 weeks |
| Hardware delivery | Vendor lead times | **MEDIUM** |
| Keycloak setup | University cooperation | **MEDIUM** — Need SSO federation |
| Payment gateway approval | Business docs | **HIGH** — Could take 1-2 weeks |

### ⚠️ Manager's 1-Week Timeline Risk

The Manager wants delivery by March 7, 2026. This is HIGHLY UNREALISTIC because:

| Reason | Impact |
|--------|--------|
| Hardware not procured | 2-4 weeks delivery |
| Infrastructure not set up | 8-12 weeks (Phases 0-1) |
| Software MVP needs development | 1-2 weeks (if cloud-hosted) |
| Payment integration needs approval | 1-2 weeks |
| University SSO needs coordination | 2-4 weeks |

**Recommendation:** Communicate realistic timeline to Manager. MVP (web portal only) possible in 1 week, but full platform (with infrastructure) takes 12+ weeks.

---

## 7. USER MANAGEMENT GAPS

### 🟠 Missing User Features

| Feature | Priority | Notes |
|---------|----------|-------|
| **Password Reset** | HIGH | Required for all users |
| **Email Verification** | HIGH | Before account activation |
| **Session Timeout** | HIGH | Auto-logout idle users |
| **Two-Factor Auth** | MEDIUM | For admin accounts minimum |
| **Profile Picture** | LOW | Optional |
| **Notification Preferences** | MEDIUM | Email/SMS/Push settings |

### 🟠 University SSO Complexity

The plan mentions Keycloak with university SSO federation, but:

| Challenge | Details |
|-----------|---------|
| **University IT Cooperation** | Need access to their IdP |
| **Multiple Universities** | Each may have different IdP |
| **Public Users** | Google OAuth is simpler |
| **Attribute Mapping** | How to map university groups to roles? |

---

## 8. BILLING & PAYMENT GAPS

### 🔴 Critical Gaps

| Gap | Issue | Solution |
|-----|-------|----------|
| **Merchant Account** | Need business registration | Razorpay requires GST, bank account |
| **GST Invoicing** | Legal requirement in India | Generate GST-compliant invoices |
| **Refund Policy** | Not defined | Must document |
| **Wallet Minimum Balance** | Prevent negative balance | Auto-debit with threshold |
| **Subscription Tiers** | Bronze/Silver/Gold defined but not implemented | Need plan management |

### 🟠 Pricing Model Complexity

| Consideration | Status |
|---------------|--------|
| Per-minute vs per-hour billing | Need decision |
| Idle time charges | What counts as "used"? |
| Session pause/resume | Complex to implement |
| Overage charges | What if user exceeds booked time? |
| Free tier (Freemium) | How funded? |

---

## 9. SECURITY GAPS

### 🟠 Missing Security Measures

| Measure | Priority | Implementation |
|---------|----------|-----------------|
| **Rate Limiting** | HIGH | On API gateway |
| **DDoS Protection** | HIGH | Cloudflare (covered) |
| **SQL Injection Protection** | HIGH | ORM + validation |
| **XSS Protection** | HIGH | Sanitization |
| **CSRF Tokens** | HIGH | Next.js + backend |
| **Input Validation** | HIGH | All user inputs |
| **Audit Logging** | MEDIUM | All admin actions |
| **Encryption at Rest** | MEDIUM | LUKS on NAS |
| **Network Segmentation** | HIGH | VLANs (covered) |

### 🟠 Access Control Gaps

| Concern | Status |
|---------|--------|
| Admin access to user sessions | Need audit trail |
| Support staff access levels | Define roles |
| API key management | Need rotation policy |
| SSH key management | For on-premises access |

---

## 10. NETWORKING GAPS

### 🟠 Missing Details

| Item | Status | Notes |
|------|--------|-------|
| **Static IP** | Need from ISP | For DNS + Cloudflare |
| **Reverse DNS** | Need to configure | For email deliverability |
| **Firewall Rules** | Need documentation | For each service |
| **NAT Configuration** | Need to document | Cloudflare Tunnel |
| **Load Balancing** | Not covered | Consider for future scaling |

---

## 11. FAILURE SCENARIOS — CRITICAL THINKING

### Scenario 1: GPU Fault Causes Multiple Session Crashes

**Likelihood:** Medium (during heavy GPU usage)

**Impact:** 4+ users lose work, support tickets flood in

**Current Mitigation:** MPS watchdog, 30-60s auto-restart

**What's Missing:**
- User notification system (email/SMS)
- Status page to communicate issues
- Compensation policy for affected users
- Escalation procedure for support team

### Scenario 2: NAS Goes Down

**Likelihood:** Low (hardware failure)

**Impact:** All users lose access to files, platform unusable

**Current Mitigation:** ZFS snapshots on NAS

**What's Missing:**
- Backup NAS or cold spare
- Procedure to restore from snapshot
- Alternative storage for new sessions (can't start without NAS)
- Communication plan for users

### Scenario 3: Internet Outage During Business Hours

**Likelihood:** Medium (ISP issues)

**Impact:** Platform offline, no revenue, user complaints

**Current Mitigation:** Dual ISP recommended but not implemented

**What's Missing:**
- Second ISP contracted
- Automatic failover configured
- Uptime SLA defined (is this covered?)

### Scenario 4: MATLAB License Server Down

**Likelihood:** Medium

**Impact:** Users can't use MATLAB, support tickets

**What's Missing:**
- License failover (if MathWorks supports)
- Alternative software notification
- Credit/refund policy for affected time

### Scenario 5: Database Corruption

**Likelihood:** Low

**Impact:** User accounts, bookings, billing data lost

**Current Mitigation:** None mentioned

**What's Missing:**
- PostgreSQL automated backups
- Point-in-time recovery
- Regular backup restore testing
- Offsite backup location

### Scenario 6: Billing Calculation Error

**Likelihood:** Medium (complexity)

**Impact:** Revenue leakage or overcharging users

**What's Missing:**
- Billing reconciliation reports
- Audit of billing calculations
- User-facing usage history
- Dispute resolution process

---

## 12. RECOMMENDED ACTION ITEMS

### Immediate (This Week)

| Priority | Action | Owner |
|----------|--------|-------|
| 🔴 | Contact MathWorks for MATLAB network license | Procurement |
| 🔴 | Verify ISP can provide 500Mbps+ symmetric | Procurement |
| 🔴 | Secure domain name | DevOps |
| 🔴 | Begin merchant account application (Razorpay) | Finance |
| 🟠 | Define Terms of Service & Privacy Policy | Legal |
| 🟠 | Confirm server room/cooling exists | Facilities |

### Before Phase 0

| Priority | Action | Owner |
|----------|--------|-------|
| 🟠 | Procure all hardware (NICs, switch, NAS, UPS) | Procurement |
| 🟠 | Install cooling infrastructure | Facilities |
| 🟠 | Set up SMTP for transactional emails | DevOps |
| 🟠 | Decide on video conferencing solution | Product |
| 🟠 | Audit all software licenses | Legal |

### Before Software Development

| Priority | Action | Owner |
|----------|--------|-------|
| 🟡 | Set up GitHub/GitLab repository | DevOps |
| 🟡 | Define CI/CD pipeline | DevOps |
| 🟡 | Set up staging environment | DevOps |
| 🟡 | Create API documentation standards | Tech Lead |

---

## 13. QUESTIONS FOR CLARIFICATION

1. **University SSO:** Have you contacted KSRCE IT about Keycloak federation?
2. **Multiple Universities:** Will this platform serve multiple universities or just KSRCE initially?
3. **Public Users:** How will you verify identity for public users (no university email)?
4. **Revenue Model:** Who pays for freemium tier — university or platform?
5. **Support Model:** Will there be dedicated support staff?
6. **Legal Entity:** Is the company registered for GST and business?
7. **Data Center:** Where will the machines be physically located?
8. **Power Backup:** How long should UPS sustain the platform?
9. **Acceptable Downtime:** What's the SLA you're committing to?
10. **Incident Response:** Who's on-call for critical issues?

---

## Summary

| Category | Critical Gaps | High Priority | Medium Priority |
|----------|---------------|---------------|-----------------|
| Licensing | MATLAB, AutoCAD | Terms of Service | Software audit |
| Procurement | — | Hardware, UPS, Cooling | Rack, Cables |
| Integrations | SMTP, SMS, Payment Gateway | Container Registry | Push Notifications |
| Operations | Support team, Documentation | Monitoring, Alerts | Backup automation |
| Timeline | Unrealistic 1-week goal | — | — |
| Security | Access control audit | Rate limiting | Encryption at rest |

---

*This analysis should be reviewed with stakeholders to prioritize addressing these gaps before launch.*
