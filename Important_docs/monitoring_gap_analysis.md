# LaaS Monitoring — Critical Gap Analysis & Additions

**Research basis:** Selkies-GStreamer source code (metrics.py, webrtc_input.py), coturn Prometheus docs,
JupyterHub monitoring reference, RunPod/Paperspace/VastAI operational patterns, WebRTC getStats()
observability research (ObserveRTC, WebRTC.ventures), OpenTelemetry CNCF standards (2025),
DaaS/VDI monitoring literature, GPU cloud billing architecture papers.

---

## The Fundamental Problem With What We Built

The first version of this monitoring stack is **infrastructure-centric**. Every exporter —
DCGM, Node Exporter, cAdvisor, Smartctl — answers the question *"Is the hardware healthy?"*
What it cannot answer is *"Is the user experiencing a good session?"*

This distinction is the defining insight from the entire WebRTC observability industry:

> "A green server dashboard frequently coexists with a red user experience.
>  The server knows it forwarded a packet. It does not know if that packet arrived
>  at the client, in the correct order, or if the client's decoder had the CPU
>  cycles to render it. Packet loss, jitter buffer underruns, and decode failures
>  are strictly client-side phenomena."
>
> — WebRTC.ventures / ObserveRTC, 2025

Your platform is a commercial service. Universities are paying. Users will complain about
frozen screens, choppy video, laggy input. Without client-side stream telemetry, you're
debugging these complaints with no data. You will lose clients.

---

## GAP 1 — Client-Side WebRTC Stream Quality Telemetry [CRITICAL]

**What's missing:** The user's actual experience of the Selkies desktop stream.

**What the browser knows that you don't:**
- `packetsLost` on the inbound-rtp track — did packets drop between TURN and the user?
- `framesPerSecond` actually decoded — is the user getting 60fps or 12fps?
- `freezeCount` + `totalFreezesDuration` — how many times did the stream freeze?
- `roundTripTime` — actual latency between server and user's browser (not ICMP ping)
- `jitter` — stream smoothness
- `qualityLimitationReason` — is the browser CPU-limited, bandwidth-limited, or none?
- `availableOutgoingBitrate` — what bandwidth the user's network is actually providing
- ICE connection type — `relay` (TURN) vs `srflx` (STUN direct) — are all users going through TURN?
- DTLS state, ICE connection state — failed connections you never see

**Why Selkies specifically matters here:**
Selkies-GStreamer has a `Metrics` class (`metrics.py`) that receives stats from the browser
via an `RTCDataChannel`. The container exposes `SELKIES_METRICS_HTTP_PORT`. BUT this only
gives you the server-side encoding stats (NVENC bitrate, GStreamer pipeline stats). The
browser-side `getStats()` data — which is the authoritative user experience source — must be
collected client-side and pushed from the frontend to your platform.

**The solution: Client telemetry collector in your Next.js frontend**

```javascript
// In your session page (Next.js), poll WebRTC stats every 5 seconds
// and POST to your orchestrator's telemetry endpoint

async function collectWebRTCStats(peerConnection, sessionId) {
  const stats = await peerConnection.getStats();
  const report = {};

  stats.forEach(stat => {
    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
      report.packetsLost = stat.packetsLost;
      report.framesPerSecond = stat.framesPerSecond;
      report.freezeCount = stat.freezeCount;
      report.totalFreezesDuration = stat.totalFreezesDuration;
      report.jitter = stat.jitter;
      report.bytesReceived = stat.bytesReceived;
    }
    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
      report.roundTripTime = stat.currentRoundTripTime;
      report.availableOutgoingBitrate = stat.availableOutgoingBitrate;
      report.transportType = stat.remoteCandidateId?.includes('relay') ? 'relay' : 'direct';
    }
  });

  // Push to orchestrator telemetry endpoint
  await fetch('/api/sessions/${sessionId}/telemetry', {
    method: 'POST',
    body: JSON.stringify({ ...report, timestamp: Date.now() }),
  });
}

// Call every 5 seconds during active session
setInterval(() => collectWebRTCStats(pc, sessionId), 5000);
```

**Orchestrator telemetry endpoint** receives these and:
1. Writes to Redis (`session:{id}:webrtc_stats` — rolling window)
2. Pushes aggregated metrics to Prometheus Pushgateway
3. Logs to Loki with `session_id`, `user_id`, `node` labels

**What this unlocks:**
- Grafana panel: "Stream quality heatmap" — which sessions are degraded right now
- Alert: packet_loss > 2% for 3+ minutes → proactive admin notification
- Alert: freeze_count > 5 in 10 minutes → session quality severely degraded
- Evidence for billing disputes: "the system shows your stream had 0 freezes in 2 hours"
- Evidence for NOC: distinguish ISP problems (all users on a node degraded) from
  single-user network issues

**Prometheus metrics to push:**
```
laas_webrtc_packet_loss_ratio{session_id, user_id, node}
laas_webrtc_fps_actual{session_id, user_id, node}
laas_webrtc_freeze_count{session_id, user_id, node}
laas_webrtc_rtt_seconds{session_id, user_id, node}
laas_webrtc_jitter_seconds{session_id, user_id, node}
laas_webrtc_transport_type{session_id, user_id, node}  # relay=1, direct=0
laas_webrtc_bitrate_bps{session_id, user_id, node}
```

---

## GAP 2 — coturn Has Native Prometheus (We Completely Missed It) [HIGH]

**Discovery from research:** coturn has built-in Prometheus support since version 4.5.1.
Enable with `--prometheus --prometheus-port=9641`. No external exporter needed.

**What it exposes:**
- `turn_total_allocations` — current number of active TURN relay sessions
- `turn_total_requests` — STUN binding requests (ICE negotiation traffic)
- `turn_traffic_rcvp` / `turn_traffic_sntp` — relay traffic packets (bytes per session)
- `turn_total_finished_sessions` — total TURN sessions served since boot
- With `--prometheus-username-labels`: per-user TURN bandwidth consumption

**Why this matters for your platform:**
1. If `turn_total_allocations` equals your total active sessions → ALL users are going through
   TURN relay (university firewall blocking direct WebRTC). This is 2–3x more bandwidth
   consumption than direct connections. Knowing this informs ISP capacity planning.
2. TURN bandwidth per session → input to billing (if you charge for bandwidth overages)
3. TURN allocation failures → users who can't connect at all

**Add to prometheus.yml:**
```yaml
- job_name: "coturn"
  scrape_interval: 15s
  static_configs:
    - targets: ["10.10.10.20:9641"]
  labels:
    service: "coturn-turn-server"
```

**Add to turnserver.conf:**
```
prometheus
prometheus-port=9641
# WARNING: enabling username labels can cause memory leaks with ephemeral auth tokens
# Only enable if using persistent usernames
# prometheus-username-labels
```

**Alert to add:**
```yaml
- alert: TURNRelayRatioHigh
  expr: turn_total_allocations / laas_active_sessions_total > 0.8
  for: 10m
  annotations:
    summary: ">80% of sessions are using TURN relay — ISP/firewall issue or bandwidth spike"
```

---

## GAP 3 — Distributed Tracing for Session Lifecycle [HIGH]

**What's missing:** The ability to answer "why did session X take 45 seconds to start?"
or "which step failed when user Y's session crashed?"

Your system has multiple sequential steps per session launch:
```
Request received (FastAPI) →
  Redis check (resources available?) →
    ZFS provision (if new user) →
      docker run command →
        Container networking setup →
          nvidia-container-toolkit GPU injection →
            supervisord start →
              KDE Plasma init →
                Selkies-GStreamer WebRTC ready →
                  Nginx ready →
                    Health check passed →
                      Session URL returned to user
```

Without distributed tracing, if a session takes 45 seconds instead of 20, you have
no idea which step is slow. Was it ZFS? Docker pull? KDE? Selkies?

**What similar platforms use:**
JupyterHub uses `jupyterhub_request_duration_seconds` per endpoint. RunPod has internal
tracing for pod start sequences. For self-hosted: **Grafana Tempo** (open-source distributed
tracing backend) + OpenTelemetry SDK in FastAPI.

**What to add to your stack:**

### Grafana Tempo (add to central docker-compose.yml)
```yaml
tempo:
  image: grafana/tempo:latest
  container_name: laas-tempo
  restart: unless-stopped
  networks: [monitoring]
  ports:
    - "10.10.10.20:3200:3200"   # Tempo query API
    - "10.10.10.20:4317:4317"   # OTLP gRPC receiver
    - "10.10.10.20:4318:4318"   # OTLP HTTP receiver
  volumes:
    - ./tempo/tempo-config.yml:/etc/tempo/config.yml:ro
    - tempo_data:/tmp/tempo
  command: -config.file=/etc/tempo/config.yml
```

### OpenTelemetry in FastAPI Orchestrator
```python
# requirements.txt additions:
# opentelemetry-api
# opentelemetry-sdk
# opentelemetry-instrumentation-fastapi
# opentelemetry-instrumentation-redis
# opentelemetry-instrumentation-httpx
# opentelemetry-exporter-otlp

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

# Initialize
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://10.10.10.20:4317"))
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("laas-orchestrator")
FastAPIInstrumentor.instrument_app(app)
RedisInstrumentor().instrument()

# In your session launch endpoint:
@app.post("/sessions/launch")
async def launch_session(request: SessionLaunchRequest):
    with tracer.start_as_current_span("session.launch") as span:
        span.set_attribute("session.user_id", request.user_id)
        span.set_attribute("session.tier", request.tier)
        span.set_attribute("session.node_selected", node_id)

        with tracer.start_as_current_span("session.zfs_provision"):
            await provision_user_storage(request.user_id)

        with tracer.start_as_current_span("session.docker_run"):
            container_id = await start_container(...)

        with tracer.start_as_current_span("session.health_check"):
            await wait_for_container_ready(container_id)
```

**Add Tempo as Grafana datasource:**
This enables the "Explore" → select trace_id → see the full waterfall of every step in
a session launch, with exact timing per step.

---

## GAP 4 — Uptime/SLA Status Page [MEDIUM-HIGH]

**What's missing:** Both RunPod (uptime.runpod.io) and Paperspace (status.paperspace.com)
have public status pages. Your university clients will ask for this.

Beyond internal alerting, you need:
1. **Per-service availability % tracking** (30-day rolling)
2. **Public/internal status page** (universities can check before reporting issues)
3. **Scheduled maintenance windows** (announce downtime in advance)
4. **Historical incident log** (audit trail for SLA conversations)

**Tool: Gatus** (lightweight, self-hosted, Prometheus-native)
```yaml
# Add to central docker-compose.yml
gatus:
  image: twinproduction/gatus:latest
  container_name: laas-gatus
  restart: unless-stopped
  networks: [monitoring]
  ports:
    - "10.10.10.20:8080:8080"
  volumes:
    - ./gatus/gatus.yml:/config/config.yml:ro
  environment:
    PROMETHEUS: "true"
```

Gatus tracks: response time, success rate, availability %, and generates a clean
status page at `http://10.10.10.20:8080`. Export metrics to Prometheus for
SLA calculation dashboards.

The status page can show: Web Portal ✅, Keycloak ✅, TURN Server ✅, Node 1-4 ✅, NAS ✅.
Universities get this URL. No more "is it down or is it me?" support tickets.

---

## GAP 5 — UPS / Power Monitoring [HIGH for 24/7 operation]

**What's missing:** The 5kVA online UPS is the single point of failure for your entire
physical fleet. If the UPS battery is degraded or the load exceeds capacity, all 4 nodes
and the NAS go dark simultaneously with zero warning.

**Tool: Network UPS Tools (NUT) + nut-exporter**

APC and Eaton UPS units expose status via USB or SNMP. NUT reads these and nut-exporter
exposes them to Prometheus.

```bash
# On the host machine connected to UPS (USB)
sudo apt install nut nut-client

# /etc/nut/ups.conf
[laas-ups]
  driver = usbhid-ups
  port = auto
  desc = "LaaS Platform UPS 5kVA"
```

**Metrics exposed:**
- `ups_input_voltage` — input power quality (sags = alert)
- `ups_battery_charge_percent` — battery health
- `ups_load_percent` — current load vs capacity (alert at 85%)
- `ups_battery_runtime_seconds` — estimated runtime on battery
- `ups_status` — OL (online), OB (on battery), LB (low battery)

**Critical alerts:**
```yaml
- alert: UPSOnBattery
  expr: ups_status{status="OB"} == 1
  for: 0s   # Immediate
  labels:
    severity: critical
  annotations:
    summary: "🔴 UPS IS ON BATTERY — POWER OUTAGE DETECTED"
    description: "The platform is running on UPS battery. Estimated runtime: {{ $value }}s. Begin graceful session suspension immediately."

- alert: UPSBatteryLow
  expr: ups_battery_charge_percent < 20
  labels:
    severity: critical
  annotations:
    summary: "🔴 UPS BATTERY CRITICAL (<20%) — IMMINENT SHUTDOWN"

- alert: UPSLoadHigh
  expr: ups_load_percent > 85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "⚠️ UPS load at {{ $value }}% — approaching capacity limit"
```

**The graceful shutdown automation:** When `UPSOnBattery` fires, the Alertmanager webhook
should trigger an orchestrator endpoint that immediately:
1. Sends 5-minute warning to all active sessions
2. Stops accepting new session launches
3. Begins graceful termination of all containers (user data saves to NAS)
4. The NAS (ZFS) is last to shut down

This is the difference between "all user data preserved" and "storage corruption on
all 4 nodes simultaneously."

---

## GAP 6 — Security / Intrusion Monitoring [HIGH]

**What's missing:** Your containers are on a multi-tenant platform accessible from
universities. Security events need dedicated tracking.

### 6a. Fail2ban → Prometheus

```bash
# fail2ban-exporter exposes ban counts to Prometheus
docker run -d --name fail2ban-exporter \
  -v /var/run/fail2ban:/var/run/fail2ban:ro \
  -p 9191:9191 \
  registry.gitlab.com/hectorjsmith/fail2ban-prometheus-exporter:latest
```

Tracks: SSH brute force bans, Keycloak login failure bans, active bans by jail.

### 6b. auditd → Loki

Track privileged actions on host: who ran `docker` commands, who accessed `/etc/shadow`,
who modified container configs. Ship via Promtail.

```bash
# /etc/audit/rules.d/laas.rules
-w /usr/bin/docker -p x -k docker_exec
-w /var/lib/docker -p wxa -k docker_data
-w /usr/lib/libvgpu.so -p wxa -k hami_tamper
-a always,exit -F arch=b64 -S execve -F uid=0 -k root_commands
```

### 6c. Container escape attempt detection

Add to promtail pipeline: watch for seccomp policy violations in kernel logs.
Any `Operation not permitted` from containerd/docker in kernel logs with a
container ID is a potential escape attempt.

### 6d. Alert: Anomalous outbound connections from containers

```yaml
- alert: ContainerAnomalousOutbound
  expr: |
    rate(container_network_transmit_bytes_total[5m]) > 100000000  # 100MB/s sustained
    AND laas_active_sessions_total > 0
  for: 10m
  labels:
    severity: warning
    category: abuse
  annotations:
    summary: "⚠️ Anomalous outbound traffic from {{ $labels.node }} containers"
    description: "Sustained high outbound network from containers. Possible data exfiltration or mining pool communication."
```

---

## GAP 7 — Billing Audit Data Architecture [CRITICAL for revenue integrity]

**What's missing:** Monitoring metrics are not audit records. Prometheus data can be
incorrect (scrape failures, counter resets, retention expiry). For billing, you need a
separate, write-once, tamper-evident audit log.

Every session must produce an **immutable billing record** containing:

```json
{
  "billing_record_id": "uuid4",
  "session_id": "uuid4",
  "user_id": "priya@cs.university.ac.in",
  "tier": "pro",
  "node": "node2",
  "container_id": "abc123def456",
  
  "started_at_unix": 1742000000.000,
  "ended_at_unix": 1742003600.000,
  "duration_seconds": 3600,
  "billable_seconds": 3600,
  
  "resources_consumed": {
    "cpu_seconds": 14400,         // from cAdvisor
    "ram_peak_mb": 7823,          // from cAdvisor
    "vram_allocated_mb": 4096,    // from container launch params (hard)
    "vram_peak_mb": 3241,         // from DCGM (actual peak)
    "nvenc_seconds": 3600,        // NVENC was active for full session
    "network_bytes_tx": 45231040  // from cAdvisor (stream bytes to user)
  },
  
  "connection_events": [
    {"event": "connected", "timestamp": 1742000015.0},
    {"event": "disconnected", "timestamp": 1742001200.0},
    {"event": "reconnected", "timestamp": 1742001245.0},
    {"event": "session_ended", "timestamp": 1742003600.0}
  ],
  
  "webrtc_quality": {
    "avg_fps": 59.2,
    "avg_rtt_ms": 45,
    "packet_loss_ratio": 0.0012,
    "freeze_count": 0
  },
  
  "hash": "sha256_of_record",   // tamper-evidence
  "recorded_at": 1742003605.0
}
```

**Where to store:** PostgreSQL (your orchestrator's DB) with an **append-only table**
(no UPDATE or DELETE permissions for the application service account).

**Why the WebRTC quality fields matter for billing:**
If a user disputes a charge saying "the session was unusable," you have objective evidence.
If `freeze_count > 10` and `avg_fps < 15`, that's grounds for a credit. Without this data,
every dispute is a coin flip.

---

## GAP 8 — ISP / Upstream Bandwidth Monitoring [HIGH]

**What's missing:** Your platform's #1 external dependency after the hardware is the
ISP upstream. 500Mbps symmetric sounds like a lot until 20 users are streaming 10Mbps
each (200Mbps). You have NO visibility into:
- Actual ISP utilization (you know node NIC rates, but not aggregate at the gateway)
- ISP link quality (jitter, packet loss to internet)
- Whether you're approaching your committed bandwidth

**Tools:**

### vnstat for interface-level bandwidth accounting
```bash
sudo apt install vnstat
# Track monthly usage (important for ISP billing)
vnstat --dbiflist

# Export to Prometheus via Pushgateway (cron)
echo "laas_isp_bytes_out_total $(vnstat --json | jq '.interfaces[0].traffic.total.tx')" | \
  curl --data-binary @- http://10.10.10.20:9091/metrics/job/vnstat/iface/wan
```

### Smokeping-equivalent: network latency probing
Node exporter's `--collector.ping` probes external hosts. Add:
```yaml
# In prometheus.yml — blackbox probes to internet landmarks
- job_name: "blackbox-internet-quality"
  metrics_path: /probe
  params:
    module: [icmp]
  static_configs:
    - targets:
        - "8.8.8.8"              # Google DNS
        - "1.1.1.1"              # Cloudflare
        - "103.21.244.0"         # Cloudflare India POP
        - "university1.ac.in"    # Primary customer's infrastructure
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - target_label: __address__
      replacement: "10.10.10.20:9115"
```

Alert: if ICMP probe RTT to 8.8.8.8 > 100ms for 5 minutes = ISP degradation affecting users.

---

## GAP 9 — Recording Rules (Query Performance) [MEDIUM]

**What's missing:** Several Grafana dashboards will run expensive PromQL queries on
every panel refresh. Without recording rules, this hammers Prometheus and causes
dashboard timeouts.

**Add to prometheus recording_rules.yml:**
```yaml
groups:
  - name: laas_recorded
    interval: 30s
    rules:
      # Fleet VRAM utilization (used by fleet overview dashboard)
      - record: laas:fleet_vram_utilization_ratio
        expr: sum(laas_node_vram_allocated_mb) / (4 * 32768)

      # Per-node CPU utilization (pre-computed for all dashboard panels)
      - record: node:cpu_utilization_ratio:5m
        expr: |
          1 - avg by(node) (irate(node_cpu_seconds_total{mode="idle"}[5m]))

      # Session launch P95 latency (expensive histogram query)
      - record: laas:session_launch_p95_seconds
        expr: |
          histogram_quantile(0.95,
            sum by(le) (rate(laas_session_launch_duration_seconds_bucket[10m]))
          )

      # Daily active users (24h window)
      - record: laas:daily_active_users
        expr: count(count_over_time(laas_session_age_seconds[24h])) by (user_id)

      # Per-node RAM utilization
      - record: node:ram_utilization_ratio
        expr: |
          1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

      # Total active sessions across fleet
      - record: laas:total_active_sessions
        expr: sum(laas_active_sessions_total)
```

---

## GAP 10 — Room Temperature / Physical Environment [MEDIUM]

**What's missing:** The 4 RTX 5090 GPUs, if in a single room, will generate ~2.4kW
of heat under full load. If ambient temperature rises above ~28°C, GPU junction
temperatures will hit thermal throttle thresholds even under light load.

**What similar datacenter operations do:** Monitor ambient temperature at multiple
rack positions. A single GPU hitting 88°C while others are at 70°C is an airflow problem,
not a workload problem.

**Cheap implementation:**
- Raspberry Pi Zero W with DS18B20 or DHT22 temperature sensor in the server room
- Expose via node_exporter textfile collector
- Alert if room temperature > 28°C

```bash
# On RPi: publish room temp to textfile collector path
echo "room_temperature_celsius $(cat /sys/bus/w1/devices/28-*/w1_slave | grep 't=' | cut -d= -f2 | awk '{printf "%.2f", $1/1000}')" > /var/lib/node_exporter/room_temp.prom
```

Alternatively: the Corsair AX1600i has iCUE which is Windows-only. On Linux, use
`hwmon` sensors via node_exporter's `--collector.hwmon` (reads from `/sys/class/hwmon/*`).
This provides AIO liquid cooler coolant temperature (the Corsair Nautilus RS reports via
USB HID).

---

## GAP 11 — Traefik / Reverse Proxy Metrics [MEDIUM]

**What's missing:** Traefik (your reverse proxy) has native Prometheus metrics but
we only have blackbox probes (HTTP 200/not-200). Traefik's internal metrics add:

- Request rate per service (users/api/auth/session traffic breakdown)
- Response time per backend (Keycloak slow? Selkies websocket latency?)
- Backend health check failures (Traefik knows before blackbox does)
- TLS certificate expiry days remaining (alert at 30 days, critical at 7)
- WebSocket upgrade success rate (critical for Selkies)

```yaml
# In traefik static config:
metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
    addRoutersLabels: true

# In prometheus.yml:
- job_name: "traefik"
  scrape_interval: 15s
  static_configs:
    - targets: ["10.10.10.20:8082"]   # Traefik metrics port
  labels:
    service: "traefik"
```

**Alert to add:**
```yaml
- alert: TLSCertExpiringSoon
  expr: traefik_tls_certs_not_after - time() < 7 * 24 * 3600
  labels:
    severity: critical
  annotations:
    summary: "🔴 TLS cert expiring in < 7 days for {{ $labels.cn }}"
```

---

## GAP 12 — JupyterHub-Style Active User Metrics (DAU/WAU/MAU) [MEDIUM]

**What's missing:** University clients will ask "how many students used the platform
this semester?" Your client needs to report this to justify the ROI. RunPod tracks
usage analytics. JupyterHub explicitly tracks `active_users` with 24h/7d/30d windows.

**Add to LaaS Custom Exporter:**
```python
active_users_24h = Gauge("laas_active_users_24h",
  "Users who had at least one session in the last 24 hours")
active_users_7d = Gauge("laas_active_users_7d",
  "Users who had at least one session in the last 7 days")
active_users_30d = Gauge("laas_active_users_30d",
  "Users who had at least one session in the last 30 days")

sessions_per_university = Gauge("laas_sessions_by_university_total",
  "Session count by university", ["university_domain"])

gpu_hours_consumed = Counter("laas_gpu_hours_consumed_total",
  "Total GPU-hours consumed", ["tier", "node"])
```

These feed:
- Monthly reports to university clients ("Your students used 847 GPU-hours in March")
- Revenue attribution dashboard
- Capacity planning ("demand is growing 15%/month, need node 5 by August")

---

## GAP 13 — Keycloak Events → Loki (Beyond /metrics) [MEDIUM]

**What's missing:** Keycloak's `/metrics` endpoint gives counts. But Keycloak also
has a rich **event log** (admin events, login events, failures with reasons) that the
`/metrics` endpoint doesn't expose in detail.

**Solution:** Keycloak event listener → file → Promtail → Loki

```json
// Keycloak event example (what we want in Loki):
{
  "type": "LOGIN_ERROR",
  "error": "invalid_user_credentials",
  "ipAddress": "103.x.x.x",
  "userId": null,
  "details": { "username": "priya@cs.university.ac.in" },
  "time": 1742000000000
}
```

Enable: `Realm Settings → Events → Add to Event Listeners: jboss-logging`
Then Promtail ships `/opt/keycloak/data/log/keycloak.log` to Loki.

This enables Loki queries like:
- "Show all failed logins from IP 103.x.x.x in the last hour" → security investigation
- "Show all sessions by user priya this semester" → academic integrity audit
- "Which error reason is most common?" → product improvement

---

## GAP 14 — Selkies Metrics Endpoint — Correct Scraping Architecture [HIGH]

**Critical detail from Selkies source code:** Each container exposes metrics on
`SELKIES_METRICS_HTTP_PORT`. But this port changes per container (you assign it dynamically
per the POC runbook). You can't statically configure this in prometheus.yml.

**Solution: Docker service discovery in Prometheus**

```yaml
# In prometheus.yml — dynamic discovery of Selkies containers
- job_name: "selkies-containers"
  docker_sd_configs:
    - host: tcp://10.10.10.11:2375  # node1
      filters:
        - name: label
          values: ["session_type=stateful"]
  relabel_configs:
    # Extract SELKIES_METRICS_HTTP_PORT from container labels
    - source_labels: [__meta_docker_container_label_metrics_port]
      target_label: __address__
      replacement: "10.10.10.11:${1}"
    - source_labels: [__meta_docker_container_label_session_id]
      target_label: session_id
    - source_labels: [__meta_docker_container_label_user_id]
      target_label: user_id
    - source_labels: [__meta_docker_container_label_tier]
      target_label: tier
```

**Requirement on orchestrator side:** When launching a container, add these Docker labels:
```python
labels = {
    "session_id": session_id,
    "user_id": user_id,
    "tier": tier,
    "session_type": "stateful",
    "metrics_port": str(metrics_port),
    "node": node_id
}
```

This enables Prometheus to auto-discover and scrape EVERY running Selkies container's
stream metrics dynamically, without manual configuration per session.

**What Selkies metrics endpoint exposes (from metrics.py):**
- GStreamer pipeline stats (encoder bitrate, frame rate from server-side)
- NVENC encoding metrics (encode latency, frames)
- Audio encoder stats (Opus)
- WebRTC signaling state

Combined with the client-side `getStats()` push (GAP 1), you have end-to-end
stream quality visibility: server → network → client.

---

## What RunPod/Paperspace Actually Monitor That We Haven't Considered

From researching their operational patterns:

**1. Job/workload failure classification**
Not every session failure is equal. Classify failures:
- `OOM_KILLED` — user workload exceeded memory limit
- `GPU_FAULT_MPS` — MPS fault terminated session
- `SESSION_TIMEOUT` — normal scheduled end
- `USER_DISCONNECT_TIMEOUT` — user idle too long
- `ORCHESTRATOR_ERROR` — platform fault (compensate user)
- `HARDWARE_FAULT` — hardware issue (compensate + investigate)

Only `ORCHESTRATOR_ERROR` and `HARDWARE_FAULT` should potentially trigger billing credits.

**2. Time-to-first-byte (TTFB) for session startup**
The gap between "container started" and "first WebRTC frame received by user browser."
This is the actual user-perceived cold start latency, not the container health check time.
Measure via WebRTC stats: first `framesDecoded > 0` timestamp minus session request time.

**3. Geographic client distribution** (if relevant for ISP planning)
Which universities are users at? What's their RTT to your server? This helps
decide TURN server placement and ISP peering.

---

## Summary: Prioritized Additions to the Stack

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Client-side WebRTC stats (getStats) | CRITICAL — user experience visibility | Medium | **P0** |
| coturn Prometheus scrape | HIGH — TURN capacity & billing | Trivial | **P0** |
| Billing audit records (PostgreSQL) | CRITICAL — revenue integrity | Medium | **P0** |
| Distributed tracing (Tempo + OTel) | HIGH — debug session launch failures | Medium | **P1** |
| UPS monitoring (NUT) | HIGH — prevent mass data loss | Low | **P1** |
| Gatus status page | MEDIUM-HIGH — SLA + university trust | Low | **P1** |
| Fail2ban + auditd security metrics | HIGH — security compliance | Low | **P1** |
| Selkies dynamic service discovery | HIGH — stream metrics per session | Medium | **P1** |
| Recording rules | MEDIUM — dashboard performance | Trivial | **P2** |
| Traefik metrics | MEDIUM — proxy health | Trivial | **P2** |
| DAU/WAU/MAU user metrics | MEDIUM — business reporting | Low | **P2** |
| ISP bandwidth / Smokeping | MEDIUM — capacity planning | Low | **P2** |
| Room temperature sensor | MEDIUM — thermal environment | Low | **P2** |
| Keycloak events → Loki | MEDIUM — audit / security | Low | **P2** |
| Failure classification labels | MEDIUM — billing disputes | Low | **P2** |

---

## The Revised "Three Pillars" Thinking for LaaS

Most platforms define observability as Metrics + Logs + Traces.

For LaaS, there's a **fourth pillar** that most infrastructure guides miss: **User Experience Telemetry**.

```
Metrics (Prometheus)    → "Is the system healthy?"
Logs (Loki)             → "What happened and when?"
Traces (Tempo)          → "How long did each step take?"
UX Telemetry (WebRTC)   → "What did the user actually experience?"
```

Without the fourth pillar, you can have a perfectly healthy system in Grafana
while every user is watching a slideshow. You'll find out when they cancel.

The complete, production-grade monitoring system for LaaS is all four pillars, not three.