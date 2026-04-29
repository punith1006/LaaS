#!/usr/bin/env python3
"""
LaaS MPS Exporter
=================
Exposes Prometheus metrics for:
  - CUDA MPS daemon state (stopped / active / fault)
  - MPS fault event counter
  - NVENC concurrent session count (via nvidia-smi)
  - NVENC encoder utilization (from DCGM if available locally)
  - lxcfs health check
  - Orchestrator-side VRAM accounting (reads from /tmp/laas-vram-state.json)
    (written by session-exporter, read here for GPU-side correlation)

Metrics exported:
  laas_mps_daemon_state{node}           gauge: 0=stopped, 1=active, 2=fault
  laas_mps_active_clients{node}         gauge: count of MPS client processes
  laas_mps_fault_total{node}            counter: total MPS faults observed
  laas_nvenc_active_sessions{node}      gauge: concurrent NVENC sessions
  laas_lxcfs_running{node}              gauge: 1=running, 0=stopped
  laas_vram_total_mb{node}              gauge: total GPU VRAM in MB
  laas_vram_allocated_mb{node}          gauge: VRAM allocated by containers
  laas_vram_free_mb{node}               gauge: VRAM available for new sessions
  laas_exporter_last_scrape_seconds{node} gauge: unix timestamp of last successful scrape
"""

import os
import json
import time
import subprocess
import threading
import logging
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
PORT               = int(os.environ.get("EXPORTER_PORT", "9500"))
NODE_ID            = os.environ.get("NODE_ID", "node-mvp")
GPU_INDEX          = int(os.environ.get("GPU_INDEX", "0"))
GPU_TOTAL_VRAM_MB  = int(os.environ.get("GPU_TOTAL_VRAM_MB", "32768"))
MPS_PIPE_DIR       = os.environ.get("MPS_PIPE_DIR", "/tmp/nvidia-mps")
VRAM_STATE_FILE    = "/tmp/laas-vram-state.json"
SCRAPE_INTERVAL    = 5   # seconds

# ── Shared state ─────────────────────────────────────────────
state = {
    "mps_daemon_state":    0,   # 0=stopped, 1=active, 2=fault
    "mps_active_clients":  0,
    "mps_fault_total":     0,
    "nvenc_active_sessions": 0,
    "lxcfs_running":       0,
    "vram_total_mb":       GPU_TOTAL_VRAM_MB,
    "vram_allocated_mb":   0,
    "vram_free_mb":        GPU_TOTAL_VRAM_MB,
    "last_scrape":         0,
    "_prev_mps_state":     0,   # internal: to detect transitions
}
state_lock = threading.Lock()


def run_cmd(cmd: list[str], timeout: int = 5) -> tuple[int, str]:
    """Run a shell command, return (returncode, stdout)."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout.strip()
    except subprocess.TimeoutExpired:
        return -1, ""
    except FileNotFoundError:
        return -2, ""


def check_mps_state() -> tuple[int, int]:
    """
    Query MPS daemon state via nvidia-cuda-mps-control.
    Returns: (state_int, active_client_count)
      state: 0=stopped, 1=active, 2=fault
    """
    # First check if the pipe dir exists and has the control socket
    control_socket = Path(MPS_PIPE_DIR) / "control"
    if not control_socket.exists():
        return 0, 0   # MPS not running

    # Try to get server list
    rc, out = run_cmd(
        ["bash", "-c", f"echo 'get_server_list' | CUDA_MPS_PIPE_DIRECTORY={MPS_PIPE_DIR} nvidia-cuda-mps-control"],
        timeout=5
    )

    if rc != 0:
        # Can't communicate with MPS — it may have faulted
        # Check if MPS process is in the process table
        rc2, pout = run_cmd(["pgrep", "-x", "nvidia-cuda-mps-c"], timeout=3)
        if rc2 == 0:
            return 2, 0  # process exists but unresponsive = FAULT
        return 0, 0       # completely stopped

    # Parse output for fault indicators
    if "FAULT" in out.upper() or "ERROR" in out.upper():
        return 2, 0

    # Count active client processes
    rc3, client_out = run_cmd(
        ["bash", "-c", f"echo 'get_client_list' | CUDA_MPS_PIPE_DIRECTORY={MPS_PIPE_DIR} nvidia-cuda-mps-control"],
        timeout=5
    )
    client_count = 0
    if rc3 == 0 and client_out:
        client_count = len([l for l in client_out.splitlines() if l.strip()])

    return 1, client_count   # active


def check_nvenc_sessions() -> int:
    """
    Count active NVENC encoding sessions via nvidia-smi pmon.
    NVENC is used by each Selkies container for desktop stream encoding.
    Consumer GPUs have a firmware limit (typically 3-5 sessions).
    nvidia-patch removes this limit — monitor to verify it's working.
    """
    rc, out = run_cmd(
        ["nvidia-smi", "pmon", "-c", "1", "-d", "1", "-s", "u"],
        timeout=8
    )
    if rc != 0 or not out:
        return -1   # nvidia-smi unavailable (using wrapper that strips LD_PRELOAD)

    nvenc_count = 0
    for line in out.splitlines():
        if line.startswith('#') or not line.strip():
            continue
        parts = line.split()
        # nvidia-smi pmon columns: # gpu  pid  type  sm  mem  enc  dec  jpg  ofa  command
        # enc column is index 5 (0-indexed after splitting)
        if len(parts) >= 6:
            try:
                enc_util = int(parts[5])
                if enc_util > 0:
                    nvenc_count += 1
            except (ValueError, IndexError):
                pass

    return nvenc_count


def check_lxcfs() -> int:
    """
    Check if lxcfs is running. Critical: if lxcfs stops,
    all containers show host hardware specs instead of tier limits.
    """
    rc, _ = run_cmd(["pgrep", "-x", "lxcfs"], timeout=3)
    return 1 if rc == 0 else 0


def read_vram_state() -> tuple[int, int]:
    """
    Read orchestrator VRAM accounting from shared JSON file.
    Written by session-exporter based on running container configs.
    Returns: (allocated_mb, free_mb)
    """
    try:
        if Path(VRAM_STATE_FILE).exists():
            with open(VRAM_STATE_FILE) as f:
                data = json.load(f)
                allocated = data.get("allocated_mb", 0)
                # Reserve 2GB for NVENC + driver state
                free = max(0, GPU_TOTAL_VRAM_MB - allocated - 2048)
                return allocated, free
    except (json.JSONDecodeError, IOError, KeyError) as e:
        log.debug(f"Could not read VRAM state file: {e}")
    return 0, GPU_TOTAL_VRAM_MB - 2048


def collect_metrics():
    """Main collection loop — runs every SCRAPE_INTERVAL seconds."""
    global state
    fault_total = 0

    while True:
        try:
            mps_state, mps_clients = check_mps_state()
            nvenc_sessions          = check_nvenc_sessions()
            lxcfs_running           = check_lxcfs()
            vram_allocated, vram_free = read_vram_state()

            with state_lock:
                # Track MPS fault transitions
                if mps_state == 2 and state["_prev_mps_state"] != 2:
                    fault_total += 1
                    log.warning(f"MPS FAULT detected on {NODE_ID}!")

                state.update({
                    "mps_daemon_state":      mps_state,
                    "mps_active_clients":    mps_clients,
                    "mps_fault_total":       fault_total,
                    "nvenc_active_sessions": max(0, nvenc_sessions),
                    "lxcfs_running":         lxcfs_running,
                    "vram_total_mb":         GPU_TOTAL_VRAM_MB,
                    "vram_allocated_mb":     vram_allocated,
                    "vram_free_mb":          vram_free,
                    "last_scrape":           time.time(),
                    "_prev_mps_state":       mps_state,
                })

        except Exception as e:
            log.error(f"Error collecting metrics: {e}")

        time.sleep(SCRAPE_INTERVAL)


def generate_prometheus_output() -> str:
    """Format state as Prometheus text exposition format."""
    with state_lock:
        s = dict(state)

    labels = f'node="{NODE_ID}",gpu="{GPU_INDEX}"'
    node_label = f'node="{NODE_ID}"'

    lines = [
        # MPS daemon state
        '# HELP laas_mps_daemon_state CUDA MPS daemon state: 0=stopped, 1=active, 2=fault',
        '# TYPE laas_mps_daemon_state gauge',
        f'laas_mps_daemon_state{{{labels}}} {s["mps_daemon_state"]}',

        '# HELP laas_mps_active_clients Number of processes connected to MPS',
        '# TYPE laas_mps_active_clients gauge',
        f'laas_mps_active_clients{{{labels}}} {s["mps_active_clients"]}',

        '# HELP laas_mps_fault_total Total CUDA MPS fault events since exporter start',
        '# TYPE laas_mps_fault_total counter',
        f'laas_mps_fault_total{{{labels}}} {s["mps_fault_total"]}',

        # NVENC
        '# HELP laas_nvenc_active_sessions Number of active NVENC encoding sessions (Selkies streams)',
        '# TYPE laas_nvenc_active_sessions gauge',
        f'laas_nvenc_active_sessions{{{labels}}} {s["nvenc_active_sessions"]}',

        # lxcfs
        '# HELP laas_lxcfs_running Whether lxcfs is running (1=yes, 0=no)',
        '# TYPE laas_lxcfs_running gauge',
        f'laas_lxcfs_running{{{node_label}}} {s["lxcfs_running"]}',

        # VRAM accounting
        '# HELP laas_vram_total_mb Total GPU VRAM in MB',
        '# TYPE laas_vram_total_mb gauge',
        f'laas_vram_total_mb{{{labels}}} {s["vram_total_mb"]}',

        '# HELP laas_vram_allocated_mb VRAM allocated by running session containers (orchestrator view)',
        '# TYPE laas_vram_allocated_mb gauge',
        f'laas_vram_allocated_mb{{{labels}}} {s["vram_allocated_mb"]}',

        '# HELP laas_vram_free_mb VRAM available for new session scheduling (minus 2GB reserve)',
        '# TYPE laas_vram_free_mb gauge',
        f'laas_vram_free_mb{{{labels}}} {s["vram_free_mb"]}',

        # Exporter health
        '# HELP laas_exporter_last_scrape_seconds Unix timestamp of last successful scrape',
        '# TYPE laas_exporter_last_scrape_seconds gauge',
        f'laas_exporter_last_scrape_seconds{{{node_label}}} {s["last_scrape"]:.3f}',
    ]
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
        pass   # suppress default access log


if __name__ == '__main__':
    log.info(f"LaaS MPS Exporter starting | node={NODE_ID} | port={PORT} | GPU_TOTAL_VRAM={GPU_TOTAL_VRAM_MB}MB")

    # Start collector in background thread
    t = threading.Thread(target=collect_metrics, daemon=True)
    t.start()

    # Wait for first collection
    time.sleep(2)

    # Start HTTP server
    server = HTTPServer(('0.0.0.0', PORT), MetricsHandler)
    log.info(f"Serving metrics at http://0.0.0.0:{PORT}/metrics")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")
