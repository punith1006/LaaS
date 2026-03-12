#!/usr/bin/env python3
"""
LaaS Session Exporter
======================
Queries the Docker API to inspect all running Selkies session containers.
Extracts per-session metadata from container labels and environment variables.

Responsibilities:
  1. Export live session metrics (count, by tier, VRAM allocated, uptime)
  2. Export per-user storage quota metrics (by reading ZFS dataset sizes)
  3. Write Prometheus file_sd JSON for Selkies per-session metrics scraping
  4. Write /tmp/laas-vram-state.json for MPS exporter VRAM correlation
  5. Export Docker daemon health metrics

Container labels expected on session containers (set by orchestrator):
  laas.session_id  — unique session UUID
  laas.user_id     — user's email/identifier
  laas.tier        — starter | standard | pro | power | max | full_machine
  laas.session_type — stateful | ephemeral
  laas.node        — node identifier

Container env vars used for VRAM accounting:
  CUDA_DEVICE_MEMORY_LIMIT_0 — e.g., "4096m" (HAMi VRAM limit)

Metrics exported:
  laas_active_sessions_total{node, tier, session_type}    gauge
  laas_session_vram_allocated_mb{session_id, user_id, tier, node} gauge
  laas_session_uptime_seconds{session_id, user_id, tier}  gauge
  laas_docker_info_containers_running{node}               gauge
  laas_user_storage_used_bytes{user_id, node}             gauge
  laas_user_storage_quota_bytes{user_id, node}            gauge
  laas_session_exporter_up{node}                          gauge (always 1 if running)
"""

import os
import re
import json
import time
import subprocess
import threading
import logging
from datetime import datetime, timezone
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Docker SDK — install in Dockerfile
try:
    import docker as docker_sdk
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False
    logging.warning("docker SDK not installed — install via pip install docker")

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
PORT           = int(os.environ.get("EXPORTER_PORT", "9501"))
NODE_ID        = os.environ.get("NODE_ID", "node-mvp")
FILE_SD_PATH   = os.environ.get("FILE_SD_PATH", "/app/file_sd/selkies_sessions.json")
VRAM_STATE_FILE = "/tmp/laas-vram-state.json"
ZFS_USERS_ROOT = "/mnt/nfs/users"           # where user home dirs are NFS-mounted
SCRAPE_INTERVAL = 10

# ── Session container name prefix ────────────────────────────
SESSION_NAME_PREFIX = "selkies-"

# ── Shared state ─────────────────────────────────────────────
state = {
    "sessions":     [],   # list of session dicts
    "docker_up":    0,
    "containers_running": 0,
    "last_scrape":  0,
}
state_lock = threading.Lock()


def parse_vram_limit(env_value: str) -> int:
    """Parse CUDA_DEVICE_MEMORY_LIMIT_0 value to MB. e.g. '4096m' → 4096."""
    if not env_value:
        return 0
    m = re.match(r'(\d+)\s*(m|g|mb|gb)?', env_value.lower())
    if not m:
        return 0
    val = int(m.group(1))
    unit = m.group(2) or 'm'
    if unit in ('g', 'gb'):
        return val * 1024
    return val   # already in MB


def get_user_storage_metrics() -> list[dict]:
    """
    Get ZFS dataset sizes for each user's NFS home directory.
    Uses 'du -sb' as a fallback when ZFS tools aren't available.
    Returns list of {user_id, used_bytes, quota_bytes}
    """
    metrics = []
    users_path = Path(ZFS_USERS_ROOT)
    if not users_path.exists():
        return metrics

    try:
        # Try ZFS native quota info
        result = subprocess.run(
            ["zfs", "list", "-H", "-o", "name,used,quota", "-t", "filesystem",
             "-r", "datapool/users"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            for line in result.stdout.strip().splitlines():
                parts = line.split('\t')
                if len(parts) >= 3:
                    dataset_name = parts[0]
                    user_id = dataset_name.split('/')[-1]
                    if user_id == 'users':
                        continue

                    def parse_zfs_size(s):
                        s = s.strip()
                        if s == '-' or s == 'none':
                            return 0
                        mult = {'K': 1024, 'M': 1024**2, 'G': 1024**3, 'T': 1024**4}
                        if s[-1] in mult:
                            return int(float(s[:-1]) * mult[s[-1]])
                        return int(s)

                    used  = parse_zfs_size(parts[1])
                    quota = parse_zfs_size(parts[2]) or (15 * 1024 * 1024 * 1024)
                    metrics.append({
                        "user_id":    user_id,
                        "used_bytes": used,
                        "quota_bytes": quota,
                    })
            return metrics
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Fallback: use du -sb on each mounted user directory
    for user_dir in users_path.iterdir():
        if not user_dir.is_dir():
            continue
        try:
            r = subprocess.run(["du", "-sb", str(user_dir)], capture_output=True, text=True, timeout=10)
            if r.returncode == 0:
                used = int(r.stdout.split()[0])
                metrics.append({
                    "user_id":     user_dir.name,
                    "used_bytes":  used,
                    "quota_bytes": 15 * 1024 * 1024 * 1024,  # 15GB default
                })
        except Exception:
            pass

    return metrics


def collect_metrics():
    """Main collection loop."""
    if not DOCKER_AVAILABLE:
        log.error("Docker SDK not available. Cannot collect session metrics.")
        return

    client = docker_sdk.from_env()

    while True:
        try:
            sessions = []
            total_vram_allocated = 0

            # List all running containers
            containers = client.containers.list()
            running_count = len(containers)

            for c in containers:
                name = c.name

                # Only process session containers
                if not name.startswith(SESSION_NAME_PREFIX):
                    continue

                labels   = c.labels or {}
                env_dict = {}
                try:
                    for e in c.attrs.get('Config', {}).get('Env', []):
                        if '=' in e:
                            k, v = e.split('=', 1)
                            env_dict[k] = v
                except Exception:
                    pass

                # Extract session metadata
                session_id   = labels.get('laas.session_id', name.replace(SESSION_NAME_PREFIX, ''))
                user_id      = labels.get('laas.user_id', 'unknown')
                tier         = labels.get('laas.tier', 'unknown')
                session_type = labels.get('laas.session_type', 'stateful')
                node         = labels.get('laas.node', NODE_ID)

                # VRAM allocation from HAMi env var
                vram_limit_str = env_dict.get('CUDA_DEVICE_MEMORY_LIMIT_0', '')
                vram_mb        = parse_vram_limit(vram_limit_str)
                total_vram_allocated += vram_mb

                # Selkies metrics port
                metrics_port = env_dict.get('SELKIES_METRICS_HTTP_PORT', '')

                # Container uptime
                started_at_str = c.attrs.get('State', {}).get('StartedAt', '')
                uptime_seconds = 0
                if started_at_str:
                    try:
                        # Docker returns RFC3339Nano
                        started = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                        uptime_seconds = (datetime.now(timezone.utc) - started).total_seconds()
                    except Exception:
                        pass

                sessions.append({
                    "session_id":     session_id,
                    "user_id":        user_id,
                    "tier":           tier,
                    "session_type":   session_type,
                    "node":           node,
                    "container_name": name,
                    "vram_mb":        vram_mb,
                    "uptime_seconds": uptime_seconds,
                    "metrics_port":   metrics_port,
                })

            # Get user storage metrics
            storage_metrics = get_user_storage_metrics()

            # Update shared state
            with state_lock:
                state["sessions"]             = sessions
                state["docker_up"]            = 1
                state["containers_running"]   = running_count
                state["storage_metrics"]      = storage_metrics
                state["last_scrape"]          = time.time()

            # Write VRAM state for MPS exporter correlation
            vram_data = {
                "allocated_mb": total_vram_allocated,
                "session_count": len(sessions),
                "timestamp": time.time(),
            }
            try:
                with open(VRAM_STATE_FILE, 'w') as f:
                    json.dump(vram_data, f)
            except IOError:
                pass

            # Write Prometheus file_sd targets for Selkies session scraping
            write_file_sd_targets(sessions)

        except docker_sdk.errors.DockerException as e:
            log.error(f"Docker API error: {e}")
            with state_lock:
                state["docker_up"] = 0
        except Exception as e:
            log.error(f"Unexpected error in collector: {e}")

        time.sleep(SCRAPE_INTERVAL)


def write_file_sd_targets(sessions: list[dict]):
    """
    Write Prometheus file-based service discovery targets.
    Each Selkies container exposes WebRTC metrics at SELKIES_METRICS_HTTP_PORT.
    Prometheus watches this file and scrapes each session's metrics endpoint.
    """
    targets = []
    for s in sessions:
        if not s.get("metrics_port"):
            continue
        targets.append({
            "targets": [f"host.docker.internal:{s['metrics_port']}"],
            "labels": {
                "session_id":   s["session_id"],
                "user_id":      s["user_id"],
                "tier":         s["tier"],
                "session_type": s["session_type"],
                "node":         s["node"],
                "job":          "selkies-session-metrics",
            }
        })

    try:
        Path(FILE_SD_PATH).parent.mkdir(parents=True, exist_ok=True)
        with open(FILE_SD_PATH, 'w') as f:
            json.dump(targets, f, indent=2)
    except IOError as e:
        log.error(f"Failed to write file_sd targets: {e}")


def generate_prometheus_output() -> str:
    """Format state as Prometheus text exposition format."""
    with state_lock:
        sessions       = list(state["sessions"])
        docker_up      = state["docker_up"]
        containers_run = state["containers_running"]
        storage_metrics = state.get("storage_metrics", [])
        last_scrape    = state["last_scrape"]

    lines = []

    # ── Docker daemon health ────────────────────────────────
    lines += [
        '# HELP laas_docker_info_containers_running Total Docker containers currently running',
        '# TYPE laas_docker_info_containers_running gauge',
        f'laas_docker_info_containers_running{{node="{NODE_ID}"}} {containers_run}',

        '# HELP laas_session_exporter_up Session exporter health (1=up)',
        '# TYPE laas_session_exporter_up gauge',
        f'laas_session_exporter_up{{node="{NODE_ID}"}} 1',
    ]

    # ── Active sessions count (by tier + type) ─────────────
    tier_counts: dict[tuple, int] = {}
    for s in sessions:
        key = (s["tier"], s["session_type"], s["node"])
        tier_counts[key] = tier_counts.get(key, 0) + 1

    lines += [
        '# HELP laas_active_sessions_total Number of currently active user sessions',
        '# TYPE laas_active_sessions_total gauge',
    ]
    for (tier, stype, node), count in tier_counts.items():
        lines.append(f'laas_active_sessions_total{{node="{node}",tier="{tier}",session_type="{stype}"}} {count}')
    if not tier_counts:
        lines.append(f'laas_active_sessions_total{{node="{NODE_ID}",tier="none",session_type="none"}} 0')

    # ── Per-session VRAM allocation ─────────────────────────
    lines += [
        '# HELP laas_session_vram_allocated_mb VRAM allocated to each session in MB',
        '# TYPE laas_session_vram_allocated_mb gauge',
    ]
    for s in sessions:
        if s["vram_mb"] > 0:
            lines.append(
                f'laas_session_vram_allocated_mb{{node="{s["node"]}",session_id="{s["session_id"]}",'
                f'user_id="{s["user_id"]}",tier="{s["tier"]}"}} {s["vram_mb"]}'
            )

    # ── Per-session uptime ──────────────────────────────────
    lines += [
        '# HELP laas_session_uptime_seconds Duration of current session in seconds',
        '# TYPE laas_session_uptime_seconds gauge',
    ]
    for s in sessions:
        lines.append(
            f'laas_session_uptime_seconds{{session_id="{s["session_id"]}",'
            f'user_id="{s["user_id"]}",tier="{s["tier"]}",node="{s["node"]}"}} {s["uptime_seconds"]:.0f}'
        )

    # ── User storage quota metrics ──────────────────────────
    lines += [
        '# HELP laas_user_storage_used_bytes Bytes used by user in their 15GB ZFS quota',
        '# TYPE laas_user_storage_used_bytes gauge',
        '# HELP laas_user_storage_quota_bytes Total ZFS storage quota for user',
        '# TYPE laas_user_storage_quota_bytes gauge',
    ]
    for sm in storage_metrics:
        uid = sm["user_id"]
        lines.append(f'laas_user_storage_used_bytes{{user_id="{uid}",node="{NODE_ID}"}} {sm["used_bytes"]}')
        lines.append(f'laas_user_storage_quota_bytes{{user_id="{uid}",node="{NODE_ID}"}} {sm["quota_bytes"]}')

    # ── Scrape timestamp ────────────────────────────────────
    lines.append(f'laas_session_exporter_last_scrape_seconds{{node="{NODE_ID}"}} {last_scrape:.3f}')

    return '\n'.join(lines) + '\n'


class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            body = generate_prometheus_output().encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    log.info(f"LaaS Session Exporter starting | node={NODE_ID} | port={PORT}")

    t = threading.Thread(target=collect_metrics, daemon=True)
    t.start()

    time.sleep(3)

    server = HTTPServer(('0.0.0.0', PORT), MetricsHandler)
    log.info(f"Serving metrics at http://0.0.0.0:{PORT}/metrics")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")
