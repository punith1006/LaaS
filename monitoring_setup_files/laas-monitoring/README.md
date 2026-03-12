# LaaS Platform — Complete Monitoring Stack
**Version:** 1.0 | **Scope:** MVP (single host) → Production (4-node fleet) ready

---

## Architecture Overview

This monitoring stack covers every observable dimension of the LaaS platform:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   LaaS Host Machine (MVP)                            │
│                                                                      │
│  ┌──── User Sessions ─────────────────────────────────────────────┐ │
│  │  selkies-<id>  selkies-<id>  selkies-<id>  selkies-<id>       │ │
│  │  [KDE Desktop + NVENC stream @ NGINX_PORT]                     │ │
│  │  [Metrics exposed at SELKIES_METRICS_HTTP_PORT per container]  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──── Platform Services ─────────────────────────────────────────┐ │
│  │  cuda-mps  lxcfs  nfs-kernel-server  cloudflared  coturn      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──── Monitoring Stack (Docker Compose) ─────────────────────────┐ │
│  │                                                                  │ │
│  │  Prometheus ──→ Alertmanager ──→ Telegram / Email               │ │
│  │     ↑                                                            │ │
│  │  ┌──┴──────────────────────────────────────────────────┐        │ │
│  │  │ Scrapers                                             │        │ │
│  │  │  node-exporter    (host CPU/RAM/disk/NVMe/NFS)       │        │ │
│  │  │  cAdvisor         (per-container resources)          │        │ │
│  │  │  dcgm-exporter    (GPU: temp/power/VRAM/SM/NVENC)   │        │ │
│  │  │  mps-exporter     (MPS state/faults/NVENC count)     │        │ │
│  │  │  session-exporter (sessions/VRAM accounting/storage) │        │ │
│  │  │  blackbox-exporter(endpoint probes)                  │        │ │
│  │  │  coturn            (TURN server metrics on :9641)    │        │ │
│  │  │  selkies-sessions  (per-session WebRTC quality)      │        │ │
│  │  └─────────────────────────────────────────────────────┘        │ │
│  │                                                                  │ │
│  │  Grafana (dashboards) ←── Loki (logs) ←── Promtail              │ │
│  │                                                                  │ │
│  │  Uptime Kuma (service status page)                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack Components & Rationale

| Component | Port | Purpose | Why this tool |
|---|---|---|---|
| **Prometheus** | 9090 | Metrics store + alerting rules engine | Industry standard, pull-based, PromQL, file SD |
| **Grafana** | 3000 | Dashboards + visualization | Best-in-class, native Loki integration, community dashboards |
| **Alertmanager** | 9093 | Alert routing to Telegram + Email | Part of Prometheus ecosystem, inhibition rules, deduplication |
| **Loki** | 3100 | Log aggregation backend | Grafana native, label-indexed, low storage overhead vs ELK |
| **Promtail** | — | Log shipper (Docker + systemd) | Loki native, Docker SD, systemd journal support |
| **node-exporter** | 9100 | Host metrics (CPU/RAM/disk/NFS/ZFS/systemd) | Standard Prometheus host exporter |
| **cAdvisor** | 8999 | Per-container CPU/RAM/network/disk | Docker-native metrics, promotes LaaS labels |
| **DCGM Exporter** | 9400 | Deep GPU telemetry | NVIDIA official exporter, NVENC metrics, ECC, power, clocks |
| **mps-exporter** | 9500 | CUDA MPS state, NVENC count, VRAM tracking | **Custom** — no existing tool monitors MPS fault state |
| **session-exporter** | 9501 | Session lifecycle, per-user storage | **Custom** — bridges Docker API → Prometheus |
| **blackbox-exporter** | 9115 | Endpoint probing (TURN, portal, health) | Standard synthetic monitoring |
| **Uptime Kuma** | 3001 | Service status dashboard | Simple, visual, Docker-aware |

### Why NOT these tools:
- **Datadog / New Relic**: Paid, sends data to external servers. Not acceptable for a platform that handles university user data under DPDPA 2023.
- **Elastic Stack (ELK)**: Resource-heavy (8-16GB RAM just for ELK). Loki is far more efficient.
- **Zabbix**: Agent-based, complex, not cloud-native. Prometheus fits better.
- **OpenTelemetry Collector**: Overkill for MVP. Add for traces when orchestrator is built.

---

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
nano .env   # set GRAFANA_ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

# 2. Pre-flight check
chmod +x setup.sh
./setup.sh --check

# 3. Deploy
./setup.sh --deploy

# 4. Open dashboards
# Grafana: http://localhost:3000
# Prometheus: http://localhost:9090
# Uptime Kuma: http://localhost:3001
```

---

## Critical: Docker Labels for Session Containers

**The session exporter and cAdvisor both rely on Docker labels** to associate metrics with users and tiers. When your FastAPI orchestrator launches session containers, it MUST add these labels:

```bash
docker run -d \
  --name selkies-$SESSION_ID \
  --label laas.session_id=$SESSION_ID \
  --label laas.user_id=$USER_EMAIL \
  --label laas.tier=$TIER \           # starter|standard|pro|power|max|full_machine
  --label laas.session_type=$TYPE \   # stateful|ephemeral
  --label laas.node=$NODE_ID \
  # ... rest of your existing docker run command
```

Without these labels, session metrics will only show container names, not user identity or tier information.

---

## Dashboard Import Guide

After deploying, import these community dashboards into Grafana:

1. **Grafana → Dashboards → Import**

| Dashboard | Grafana ID | Purpose |
|---|---|---|
| Node Exporter Full | **1860** | Host CPU/RAM/disk/network |
| NVIDIA DCGM Exporter | **12239** | GPU health and utilization |
| cAdvisor Exporter | **14282** | Per-container resource usage |
| Docker Container & Host | **10619** | Docker daemon overview |

2. **Custom LaaS Dashboards** (build in Grafana, key panels listed below)

### LaaS Fleet Overview Dashboard — Key Panels

```
Panel: Active Sessions           Query: sum(laas_active_sessions_total)
Panel: Active by Tier            Query: sum by(tier)(laas_active_sessions_total)
Panel: VRAM Allocated (%)        Query: laas_vram_allocated_mb / laas_vram_total_mb * 100
Panel: GPU Temperature           Query: DCGM_FI_DEV_GPU_TEMP
Panel: NVENC Sessions            Query: laas_nvenc_active_sessions
Panel: MPS State                 Query: laas_mps_daemon_state  (0=stopped, 1=active, 2=fault)
Panel: Host RAM (%)              Query: (1 - node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes)*100
Panel: Docker Storage (%)        Query: (1 - node_filesystem_avail_bytes{mountpoint="/var/lib/docker"}/node_filesystem_size_bytes{mountpoint="/var/lib/docker"})*100
```

### LaaS GPU Deep Dive Dashboard — Key Panels

```
Panel: VRAM per Container        Query: laas_session_vram_allocated_mb
Panel: SM Utilization            Query: DCGM_FI_DEV_GPU_UTIL
Panel: NVENC Utilization         Query: DCGM_FI_DEV_ENC_UTIL
Panel: GPU Power Draw (W)        Query: DCGM_FI_DEV_POWER_USAGE
Panel: GPU Clock Speed (MHz)     Query: DCGM_FI_DEV_SM_CLOCK
Panel: Memory Bandwidth Util     Query: DCGM_FI_DEV_MEM_COPY_UTIL
Panel: PCIe Bandwidth            Query: DCGM_FI_DEV_PCIE_TX_THROUGHPUT + DCGM_FI_DEV_PCIE_RX_THROUGHPUT
Panel: MPS Fault Events          Query: increase(laas_mps_fault_total[24h])
Panel: ECC Error Counter         Query: DCGM_FI_DEV_ECC_DBE_VOL_TOTAL
```

### LaaS Session Analytics Dashboard — Key Panels

```
Panel: Sessions Started (today)  Query: increase(laas_active_sessions_total[24h])
Panel: Session Duration (hist)   Query: histogram_quantile(0.95, laas_session_uptime_seconds)
Panel: Per-User Storage Usage    Query: laas_user_storage_used_bytes / laas_user_storage_quota_bytes * 100
Panel: WebRTC FPS (by session)   Query: selkies_stream_fps  (from file_sd scraping)
Panel: ICE Type Distribution     Query: count by(type)(selkies_ice_connection_type)
Panel: Session Startup Times     Query: laas_session_startup_seconds (future orchestrator metric)
```

---

## Uptime Kuma Setup

Configure these monitors in Uptime Kuma (http://localhost:3001):

| Monitor | Type | URL/Target |
|---|---|---|
| Prometheus | HTTP | http://localhost:9090/-/healthy |
| Grafana | HTTP | http://localhost:3000/api/health |
| Alertmanager | HTTP | http://localhost:9093/-/healthy |
| Loki | HTTP | http://localhost:3100/ready |
| DCGM Exporter | HTTP | http://localhost:9400/health |
| TURN Server | TCP | localhost:3478 |
| Cloudflare Tunnel | HTTP | https://lab.youragency.in |
| MPS Daemon | Docker Container | cuda-mps service |
| lxcfs | Docker Container | via systemd check |

---

## Alert Channels — Setup Instructions

### Telegram Bot Setup
```
1. Message @BotFather on Telegram
2. /newbot → choose name → get token like: 1234567890:ABC...
3. Start a chat with your bot (send any message)
4. curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
   → Find "chat":{"id":<NUMBER>} — this is your TELEGRAM_CHAT_ID
5. Add both to .env, restart alertmanager:
   docker compose restart alertmanager
```

### Testing Alerts
```bash
# Trigger a test alert via Alertmanager API
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels":{"alertname":"TestAlert","severity":"warning","node":"node-mvp"},"annotations":{"summary":"Test alert from LaaS monitoring setup"}}]'
```

---

## Critical Things You May Have Missed

The following are gaps I identified while analyzing your project that the monitoring stack addresses:

### 1. nvidia-patch Regression Detection
After every NVIDIA driver update, the nvidia-patch (NVENC session limit removal) must be re-applied. There is currently no automatic check for this.

**Monitoring solution:** The `laas_nvenc_active_sessions` gauge from mps-exporter tracks concurrent NVENC sessions. If users start reporting "black screen" or encoding failures but GPU is healthy, this alert fires:
```
NVENCSessionLimitApproaching: laas_nvenc_active_sessions >= 3
```
This is your signal that nvidia-patch needs re-application.

### 2. lxcfs Stoppage — Silent Security/UX Issue
If lxcfs stops (crash, OOM, update), ALL running user containers immediately start showing the host's full 16C/64GB specs instead of their tier's 4C/8GB. Users see the real hardware. This is both a security disclosure and a UX violation.

**Monitoring solution:** `laas_lxcfs_running` gauge + `LxcfsDown` critical alert with 30-second fire time.

### 3. ZFS/NFS Mount Health (MVP File-Backed Pool)
Your MVP uses a file-backed ZFS pool mounted at /mnt/nfs/users. If the NFS mount drops (system restart, ZFS pool import issue), containers start failing to write to home directories silently. Users lose work.

**Monitoring solution:** NFS client error rate + filesystem mount probes in node-exporter.

### 4. Per-User Storage Quota Near-Limit
Users hitting their 15GB quota will see silent failures: pip installs fail, file saves fail, conda environments break. No error shown in the GUI. Users blame the platform.

**Monitoring solution:** `laas_user_storage_used_bytes` + `UserStorageQuotaHigh` alert at 85%.

### 5. CUDA_NVRTC_ARCH Mismatch (POC → Production)
Your POC used `CUDA_NVRTC_ARCH=89` (Ada Lovelace, RTX 4090). Production RTX 5090 requires `100` (Blackwell). If this env var is wrong in production, CUDA kernel compilation inside containers will silently target the wrong architecture, causing compute failures.

**What to monitor:** Add a custom label to containers: `laas.cuda_arch`. The session exporter reads this and you can verify all production containers use `100`.

### 6. MPS Fault Frequency Trending
A single MPS fault is recoverable. 3+ faults/hour indicates a systematic problem (a specific user's workload triggers GPU faults repeatedly). Without trending, you'd never notice.

**Monitoring solution:** `MPSFaultFrequencyHigh` alert: `increase(laas_mps_fault_total[1h]) > 3`

### 7. TURN Relay Ratio
If >50% of WebRTC sessions use TURN relay instead of direct P2P, you have a network configuration problem (ISP blocking UDP, Cloudflare Tunnel WebSocket issues). High TURN usage also increases bandwidth costs and latency.

**Monitoring solution:** `WebRTCUsingTURNRelay` info alert + dashboard panel showing ICE connection type distribution.

### 8. coturn Native Prometheus Metrics
coturn (your TURN server) exposes native Prometheus metrics on port 9641 — but only if compiled with the `--prometheus` flag. Check: `curl http://localhost:9641/metrics`. If it returns metrics, you get: `turn_total_allocations`, relay bandwidth, authentication failures.

**Monitoring solution:** Already configured as a Prometheus scrape job in prometheus.yml.

### 9. Docker Storage Partition Creep
The Docker overlay partition (500GB, nvme0n1p2) fills up over time from: dangling image layers (failed builds), stopped container overlays not cleaned up, old image versions during rolling updates.

**Monitoring solution:** `DockerStoragePartitionFull` at 80% + script:
```bash
# Add to crontab (daily):
docker system prune --volumes -f >> /var/log/laas-docker-prune.log 2>&1
```

### 10. Session Container Network Namespace (MVP POC Risk)
Your POC uses `--network=host`, meaning all session containers share the host network namespace. This means one container crash or port collision can affect ALL containers. The monitoring stack detects container restarts but not the root cause of port conflicts.

**Production fix reminder:** Switch to `--network=bridge` per POC runbook instructions before MVP. The monitoring stack is configured for bridge networking already.

---

## Multi-Node Production Expansion

When you move from single-host MVP to 4-node production, add each node to prometheus.yml:

```yaml
# In prometheus.yml, update static_configs for each job:
- job_name: 'node-exporter'
  static_configs:
    - targets: ['node1:9100', 'node2:9100', 'node3:9100', 'node4:9100']
      labels:
        role: 'compute'

- job_name: 'dcgm-exporter'
  static_configs:
    - targets: ['node1:9400', 'node2:9400', 'node3:9400', 'node4:9400']
```

Each node runs its own `mps-exporter` and `session-exporter`. The Prometheus instance can be on the NAS/management node and scrapes all compute nodes.

---

## Port Reference

| Port | Service | Access |
|------|---------|--------|
| 3000 | Grafana | Admin only |
| 3001 | Uptime Kuma | Admin only |
| 3100 | Loki | Internal only |
| 9090 | Prometheus | Admin only |
| 9093 | Alertmanager | Admin only |
| 9100 | node-exporter | Internal only |
| 8999 | cAdvisor | Internal only |
| 9400 | DCGM Exporter | Internal only |
| 9500 | MPS Exporter | Internal only |
| 9501 | Session Exporter | Internal only |
| 9115 | Blackbox Exporter | Internal only |
| 9641 | coturn (metrics) | Internal only — host network |

**Firewall rule:** Only expose ports 3000 and 3001 externally (via Cloudflare Tunnel or Tailscale). All other monitoring ports are internal-only.

---

## Maintenance Runbook

### Prometheus Hot Reload (after config change)
```bash
curl -X POST http://localhost:9090/-/reload
```

### Silence a flapping alert during maintenance
```bash
# Via Alertmanager API:
curl -X POST http://localhost:9093/api/v2/silences \
  -H 'Content-Type: application/json' \
  -d '{"matchers":[{"name":"alertname","value":"GPUTemperatureHigh","isRegex":false}],"startsAt":"2025-01-01T00:00:00Z","endsAt":"2025-01-01T02:00:00Z","createdBy":"admin","comment":"Maintenance window"}'
```

### Check active alerts
```bash
curl -s http://localhost:9093/api/v2/alerts | python3 -m json.tool
```

### Rebuild custom exporters after code changes
```bash
docker compose build mps-exporter session-exporter
docker compose up -d mps-exporter session-exporter
```

### Verify Selkies session metrics are being scraped
```bash
# Check file_sd targets
cat prometheus/file_sd/selkies_sessions.json

# Query Prometheus for selkies metrics
curl -s 'http://localhost:9090/api/v1/query?query=selkies_stream_fps' | python3 -m json.tool
```
