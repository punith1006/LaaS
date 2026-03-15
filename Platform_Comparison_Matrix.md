# Platform Comparison Quick Reference
## Compute-on-Demand Market Analysis

---

## Quick Comparison: GPU Cloud Providers

| Provider | Min Price/hr | Max GPU | Serverless | Spot/Preempt | Marketplace | Best For |
|----------|--------------|---------|------------|--------------|-------------|----------|
| **AWS EC2** | $0.526 | H100 | ✗ | ✓ (90% off) | ✗ | Enterprise, ecosystem |
| **Azure** | $0.90 | H100 | ✗ | ✓ | ✗ | Microsoft shops |
| **GCP** | $0.35 | H100, TPU | ✗ | ✓ | ✗ | Flexibility, TPUs |
| **CoreWeave** | $2.21 | H100 SXM | ✗ | ✗ | ✗ | Enterprise AI, HPC |
| **Lambda Labs** | $1.10 | A100 | ✗ | ✗ | ✗ | ML researchers |
| **RunPod** | $0.44 | H100, MI300X | ✓ | ✓ | ✗ | Developers, variety |
| **Paperspace** | $0.51 | A100 | Notebooks | ✗ | ✗ | ML workflows |
| **Vast.ai** | $0.15 | H100 | ✗ | ✓ | ✓ (P2P) | Budget-conscious |
| **Salad Cloud** | $0.05 | Consumer GPUs | ✓ | N/A | ✓ (Distributed) | Inference at scale |
| **Modal** | Pay per use | A100, H100 | ✓ | N/A | ✗ | Serverless ML |
| **Together AI** | Per token | Cluster | ✓ | N/A | ✗ | Inference, LLMs |
| **Lightning AI** | $0.40 | Multi-provider | ✓ | ✓ | ✓ (Aggregator) | PyTorch teams |
| **Replicate** | Per prediction | A100 | ✓ | N/A | ✗ | Model deployment |
| **Latitude.sh** | $1.50 | Bare metal | ✗ | ✗ | ✗ | Performance |

---

## Quick Comparison: Desktop as a Service

| Provider | GPU Support | Persistence | Browser Access | Linux | Multi-OS | Target |
|----------|-------------|-------------|----------------|-------|----------|--------|
| **Citrix DaaS** | Limited | ✓ (VHD layers) | ✓ | ✓ | ✓ | Enterprise |
| **Azure AVD** | ✓ | ✓ (FSLogix) | ✓ | ✗ | Windows only | Enterprise |
| **VMware Horizon** | ✓ | ✓ | ✓ | ✓ | ✓ | Enterprise |
| **Amazon WorkSpaces** | Limited | ✓ | ✓ | ✓ | ✓ | AWS customers |
| **Kasm** | ✗ | ✗ (Container) | ✓ (Native) | ✓ | ✓ | Security, DevOps |
| **Shadow PC** | ✓ (Gaming) | ✓ | ✓ | ✗ | Windows only | Gamers |
| **Shells** | ✗ | ✓ | ✓ | ✓ | 18+ OS | Education, consumers |
| **Apporto** | Limited | ✓ | ✓ | ✓ | ✓ | Higher Ed |
| **V2 Cloud** | ✗ | ✓ | ✓ | Limited | Windows focus | SMB |

---

## Quick Comparison: Lab as a Service (Academic)

| Platform | GPU Access | Auto-Shutdown | Cost Control | LMS Integration | Free Tier |
|----------|------------|---------------|--------------|-----------------|-----------|
| **Azure Lab Services** | Limited | ✓ | ✓ | ✓ | Credits |
| **CloudLabs** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Vocareum** | ✓ | ✓ | ✓ | ✓ (deep) | ✗ |
| **Apporto** | Limited | ✓ | ✓ | ✓ | ✗ |
| **ACCESS/XSEDE** | ✓ (HPC) | N/A | Allocation | ✗ | ✓ |
| **NRP Nautilus** | ✓ (HPC) | N/A | Allocation | ✗ | ✓ |
| **Google Colab** | Limited free | ✓ | N/A | ✗ | ✓ |

---

## Quick Comparison: Development Environments

| Platform | Self-Hosted | GPU Support | Collaboration | AI Features | Pricing |
|----------|-------------|-------------|---------------|-------------|---------|
| **GitHub Codespaces** | ✗ | Limited | VS Code Live | Copilot | Per-hour |
| **Gitpod** | ✓ | Limited | Shared workspaces | ✗ | Per-hour |
| **Coder** | ✓ | ✓ | Enterprise | Agent support | Self-hosted free |
| **DevPod** | ✓ | Provider-dependent | ✗ | ✗ | Open-source |
| **Replit** | ✗ | Limited | Real-time | AI assistant | Freemium |
| **Saturn Cloud** | ✗ | ✓ (Excellent) | Team features | ✗ | Per-hour |
| **Deepnote** | ✗ | ✓ | Real-time | ✓ | Freemium |
| **Lightning AI** | ✗ | ✓ (Excellent) | Studios | ✓ | Per-hour |

---

## Feature Gap Analysis: Your Platform Opportunities

### Unserved Market Needs

| Need | Current Solutions | Gap | Your Opportunity |
|------|-------------------|-----|------------------|
| GPU + Persistent Desktop | None combined | Complete | First mover advantage |
| Dynamic compute attachment | None | Complete | Unique selling point |
| Multi-mode (GUI/CLI/Notebook) | Fragmented | Significant | Unified experience |
| Integrated mentoring | None | Complete | New revenue stream |
| Academic GPU access (simple) | Complex allocation | Significant | Simplified onboarding |
| Real-time collaboration | Limited in compute | Moderate | Google Docs for compute |

### Competitor Weaknesses to Exploit

| Competitor | Weakness | Your Strategy |
|------------|----------|---------------|
| RunPod | No GUI desktop mode | Offer full desktop experience |
| Kasm | No GPU support | GPU-accelerated containers |
| Azure Labs | Limited GPU options | Full GPU portfolio |
| Shadow PC | Windows only, no flexibility | Multi-OS, dynamic compute |
| Shells | No GPU compute | GPU desktop option |
| Lambda | Availability issues | Multi-cloud sourcing |
| Codementor | No compute integration | Mentor + compute bundle |

---

## Technology Stack Recommendations

### Core Infrastructure

| Component | Recommended | Alternative | Rationale |
|-----------|-------------|-------------|-----------|
| Orchestration | Kubernetes | Nomad | Industry standard, GPU operator |
| GPU Sharing | NVIDIA MIG + MPS | Time-slicing | Hardware isolation + efficiency |
| Desktop Streaming | Selkies-GStreamer | Apache Guacamole | WebRTC, GPU encoding |
| Storage | Longhorn + NFS | Ceph, Rook | Kubernetes-native, replicated |
| User Profiles | Overlay FS + VHD | FSLogix-like | Thin provisioning, persistence |
| Billing | Lago | OpenMeter | Open-source, event-driven |
| Auth | Keycloak | Auth0, Okta | Self-hosted, OIDC/SAML |

### Streaming Protocol Comparison

| Protocol | Latency | GPU Encoding | Browser Native | Complexity |
|----------|---------|--------------|----------------|------------|
| Selkies WebRTC | ~16ms | NVENC | ✓ | Medium |
| Parsec | ~8ms | Proprietary | ✗ | Low |
| VNC (noVNC) | ~50-100ms | ✗ | ✓ | Low |
| RDP (Guacamole) | ~30-50ms | Optional | ✓ | Medium |
| NICE DCV | ~16ms | NVENC | ✓ | High |

---

## Pricing Benchmarks

### GPU Compute (Per Hour)

| GPU | Lowest Market | Average Market | Your Target |
|-----|---------------|----------------|-------------|
| RTX 4090 | $0.44 | $0.74 | $0.50-0.60 |
| A100 40GB | $1.10 | $1.89 | $1.20-1.50 |
| A100 80GB | $1.69 | $2.49 | $1.80-2.00 |
| H100 | $2.21 | $3.89 | $2.50-3.00 |
| L40S | $1.14 | $1.89 | $1.30-1.50 |

### Persistent Desktop (Monthly)

| Type | Lowest Market | Average Market | Your Target |
|------|---------------|----------------|-------------|
| CPU Desktop | $4.95 (Shells) | $15-25 | $12-20 |
| GPU Desktop | $29.99 (Shadow) | $40-60 | $35-50 |
| Academic (per student) | $5 (volume) | $10-15 | $8-12 |

---

## Market Size Indicators

### IaaS/GPU Cloud
- Global GPU cloud market: ~$6B (2025), growing 30%+ YoY
- AI infrastructure spending: $200B+ by 2028

### DaaS
- Global DaaS market: ~$12B (2025), growing 15% YoY
- Remote work driving adoption post-pandemic

### EdTech/LaaS
- Global EdTech market: ~$400B (2025)
- Virtual labs segment: ~$3B, growing 20% YoY

### Your TAM Estimate
- Serviceable market: $5-10B (intersection of GPU cloud + DaaS + EdTech)
- Initial target: $500M (ML developers + academic institutions)

---

## Key Differentiators to Build

### Must-Have (Day 1)
1. ✓ Instant GPU provisioning (<30 seconds)
2. ✓ Transparent, per-second billing
3. ✓ Multiple interaction modes (CLI, Notebook, GUI)
4. ✓ Persistent user storage layer

### Should-Have (Day 90)
1. ✓ Fractional GPU sharing (MIG/MPS)
2. ✓ Custom base image templates
3. ✓ Team/organization management
4. ✓ API for programmatic access

### Nice-to-Have (Day 180)
1. ✓ Mentor marketplace MVP
2. ✓ LMS integrations (Canvas, Blackboard)
3. ✓ Real-time session collaboration
4. ✓ Usage analytics dashboard

### Moat Builders (Year 1+)
1. ✓ Proprietary template marketplace
2. ✓ AI-assisted compute optimization
3. ✓ Multi-cloud orchestration
4. ✓ Enterprise compliance (SOC2, HIPAA)

---

## Recommended Next Steps

### Immediate (Week 1-2)
1. [ ] Deep-dive on Selkies-GStreamer for streaming
2. [ ] Evaluate Kubernetes GPU operators
3. [ ] Design storage architecture (overlay + VHD)
4. [ ] Define pricing model v1

### Short-term (Month 1)
1. [ ] Build IaaS MVP (CLI + Notebook)
2. [ ] Implement usage metering (Lago)
3. [ ] Create base image library (Ubuntu, CUDA)
4. [ ] Launch private beta

### Medium-term (Month 2-3)
1. [ ] Add GUI/desktop mode
2. [ ] Implement persistent user disks
3. [ ] Build template marketplace
4. [ ] Academic pilot program

### Long-term (Month 4-6)
1. [ ] Mentor marketplace launch
2. [ ] Enterprise features
3. [ ] Multi-cloud expansion
4. [ ] Public launch

---

*Quick Reference v1.0 - March 2026*
