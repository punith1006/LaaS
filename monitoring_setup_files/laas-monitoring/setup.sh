#!/usr/bin/env bash
# ============================================================
# LaaS Monitoring Stack — Setup & Deployment Script
# Run as root or user with docker + sudo privileges
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh [--check | --deploy | --status | --down | --update]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLU}[INFO]${NC}  $*"; }
ok()    { echo -e "${GRN}[OK]${NC}    $*"; }
warn()  { echo -e "${YLW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Parse arguments ──────────────────────────────────────────
ACTION="${1:-deploy}"

# ── Pre-flight checks ────────────────────────────────────────
preflight() {
    info "Running pre-flight checks..."
    local failed=0

    # Docker
    if ! command -v docker &>/dev/null; then
        error "Docker not installed. Install: curl -fsSL https://get.docker.com | bash"
        failed=1
    else
        ok "Docker: $(docker --version)"
    fi

    # Docker Compose
    if ! docker compose version &>/dev/null 2>&1; then
        error "Docker Compose v2 not available. Update Docker to 24+."
        failed=1
    else
        ok "Docker Compose: $(docker compose version)"
    fi

    # NVIDIA Container Toolkit
    if ! nvidia-smi &>/dev/null; then
        warn "nvidia-smi not found — DCGM exporter will not work. Install NVIDIA driver first."
    else
        ok "NVIDIA driver: $(nvidia-smi --query-gpu=driver_version --format=csv,noheader | head -1)"
    fi

    if ! docker run --rm --runtime=nvidia --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi &>/dev/null 2>&1; then
        warn "NVIDIA Container Toolkit not configured or GPU not accessible in Docker. DCGM exporter may fail."
        warn "Fix: sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker"
    else
        ok "NVIDIA Container Toolkit: working"
    fi

    # lxcfs
    if ! systemctl is-active lxcfs &>/dev/null; then
        warn "lxcfs not running. Install: sudo apt install lxcfs && sudo systemctl enable --now lxcfs"
    else
        ok "lxcfs: running"
    fi

    # CUDA MPS
    if ! systemctl is-active cuda-mps &>/dev/null; then
        warn "cuda-mps not running. See POC runbook Step 2 to configure."
    else
        ok "CUDA MPS: running"
    fi

    # .env file
    if [[ ! -f .env ]]; then
        warn ".env file not found. Copying from .env.example..."
        cp .env.example .env
        warn "IMPORTANT: Edit .env with your Telegram bot token, admin password, etc."
        warn "           Then re-run: ./setup.sh deploy"
        failed=1
    else
        ok ".env file found"
        # Check critical values
        if grep -q "CHANGE_THIS_STRONG_PASSWORD" .env; then
            warn "Grafana admin password is still the default — update in .env!"
        fi
        if grep -q "YOUR_TELEGRAM_BOT_TOKEN" .env; then
            warn "Telegram bot token not configured in .env — alerts won't be sent"
        fi
    fi

    [[ $failed -eq 0 ]] && ok "All pre-flight checks passed!" || return 1
}

# ── Create required directories ──────────────────────────────
prepare_dirs() {
    info "Creating required directories..."

    mkdir -p prometheus/file_sd
    mkdir -p prometheus/rules
    mkdir -p grafana/dashboards
    mkdir -p node-exporter/textfile
    mkdir -p blackbox

    # file_sd: must be writable by session-exporter container
    chmod 777 prometheus/file_sd

    # node-exporter textfile: must be writable by scripts
    chmod 777 node-exporter/textfile

    # Initialize file_sd if empty
    [[ -f prometheus/file_sd/selkies_sessions.json ]] || echo '[]' > prometheus/file_sd/selkies_sessions.json

    ok "Directories ready"
}

# ── Build custom images ──────────────────────────────────────
build_images() {
    info "Building custom exporter images..."
    docker compose build --no-cache mps-exporter session-exporter
    ok "Custom images built"
}

# ── Deploy ────────────────────────────────────────────────────
deploy() {
    info "Deploying LaaS monitoring stack..."

    prepare_dirs
    build_images

    # Pull all other images first
    info "Pulling upstream images..."
    docker compose pull prometheus grafana alertmanager loki promtail \
                         node-exporter cadvisor dcgm-exporter blackbox-exporter uptime-kuma

    # Start the stack
    docker compose up -d

    info "Waiting for services to become healthy..."
    sleep 10

    # Health checks
    check_health

    echo ""
    ok "=== LaaS Monitoring Stack Deployed ==="
    echo ""
    echo "  Grafana:       http://localhost:3000  (admin / see .env)"
    echo "  Prometheus:    http://localhost:9090"
    echo "  Alertmanager:  http://localhost:9093"
    echo "  Uptime Kuma:   http://localhost:3001  (configure on first visit)"
    echo "  Loki:          http://localhost:3100"
    echo ""
    echo "  Next steps:"
    echo "  1. Open Grafana → Import community dashboards:"
    echo "     - Node Exporter Full:   ID 1860"
    echo "     - DCGM Exporter:        ID 12239"
    echo "     - cAdvisor:             ID 14282"
    echo "  2. Configure Uptime Kuma to monitor all platform services"
    echo "  3. Set up Telegram bot in Alertmanager (update .env)"
    echo "  4. Add Docker labels to session containers (see README)"
    echo ""
}

# ── Health check ─────────────────────────────────────────────
check_health() {
    info "Checking service health..."

    services=(
        "prometheus:9090/-/healthy"
        "grafana:3000/api/health"
        "alertmanager:9093/-/healthy"
        "loki:3100/ready"
    )

    for svc_url in "${services[@]}"; do
        service="${svc_url%%:*}"
        url="http://${svc_url#*:}"
        if curl -sf --max-time 5 "$url" &>/dev/null; then
            ok "$service: healthy"
        else
            warn "$service: not responding yet at $url"
        fi
    done

    # Custom exporters
    if curl -sf --max-time 5 "http://localhost:9500/health" &>/dev/null; then
        ok "mps-exporter: healthy"
    else
        warn "mps-exporter: not responding (may need GPU access)"
    fi

    if curl -sf --max-time 5 "http://localhost:9501/health" &>/dev/null; then
        ok "session-exporter: healthy"
    else
        warn "session-exporter: not responding"
    fi
}

# ── Status ────────────────────────────────────────────────────
status() {
    echo ""
    info "=== LaaS Monitoring Stack Status ==="
    docker compose ps
    echo ""
    check_health
}

# ── Teardown ──────────────────────────────────────────────────
down() {
    warn "Stopping LaaS monitoring stack (data volumes preserved)..."
    docker compose down
    ok "Stack stopped. Data volumes preserved."
    info "To remove ALL data: docker compose down -v"
}

# ── Update ────────────────────────────────────────────────────
update() {
    info "Updating LaaS monitoring stack..."
    docker compose pull
    build_images
    docker compose up -d
    ok "Update complete"
}

# ── Install textfile collector scripts ───────────────────────
install_textfile_scripts() {
    info "Installing node-exporter textfile collector scripts..."

    # Script: export ZFS ARC stats
    cat > /usr/local/bin/laas-zfs-textfile.sh << 'SCRIPT'
#!/bin/bash
# Writes ZFS ARC metrics to node-exporter textfile collector
OUTPUT_DIR="/opt/laas-monitoring/node-exporter/textfile"
TMPFILE="$OUTPUT_DIR/zfs_arc.prom.tmp"
OUTFILE="$OUTPUT_DIR/zfs_arc.prom"

if [[ -f /proc/spl/kstat/zfs/arcstats ]]; then
    echo "# HELP laas_zfs_arc_size_bytes ZFS ARC current size" > "$TMPFILE"
    echo "# TYPE laas_zfs_arc_size_bytes gauge" >> "$TMPFILE"
    arc_size=$(awk '/^size / {print $3}' /proc/spl/kstat/zfs/arcstats)
    echo "laas_zfs_arc_size_bytes ${arc_size}" >> "$TMPFILE"
    mv "$TMPFILE" "$OUTFILE"
fi
SCRIPT
    chmod +x /usr/local/bin/laas-zfs-textfile.sh

    # Script: export MPS state to textfile (backup to mps-exporter)
    cat > /usr/local/bin/laas-mps-textfile.sh << 'SCRIPT'
#!/bin/bash
OUTPUT_DIR="/opt/laas-monitoring/node-exporter/textfile"
OUTFILE="$OUTPUT_DIR/mps_state.prom"

MPS_PIPE_DIR="${CUDA_MPS_PIPE_DIRECTORY:-/tmp/nvidia-mps}"
STATE=0

if [[ -S "$MPS_PIPE_DIR/control" ]]; then
    if systemctl is-active cuda-mps &>/dev/null; then
        STATE=1
    fi
fi

echo "# HELP laas_mps_textfile_state MPS state from textfile (backup check)" > "$OUTFILE"
echo "# TYPE laas_mps_textfile_state gauge" >> "$OUTFILE"
echo "laas_mps_textfile_state $STATE" >> "$OUTFILE"
SCRIPT
    chmod +x /usr/local/bin/laas-mps-textfile.sh

    # Systemd timer to run these every minute
    cat > /etc/systemd/system/laas-textfile-collector.service << 'SVCEOF'
[Unit]
Description=LaaS node-exporter textfile collector

[Service]
Type=oneshot
ExecStart=/bin/bash -c '/usr/local/bin/laas-zfs-textfile.sh; /usr/local/bin/laas-mps-textfile.sh'
SVCEOF

    cat > /etc/systemd/system/laas-textfile-collector.timer << 'TIMEREOF'
[Unit]
Description=Run LaaS textfile collector every 30s
[Timer]
OnBootSec=10s
OnUnitActiveSec=30s
[Install]
WantedBy=timers.target
TIMEREOF

    sudo systemctl daemon-reload
    sudo systemctl enable --now laas-textfile-collector.timer
    ok "Textfile collector scripts installed and timer started"
}

# ── Main ──────────────────────────────────────────────────────
case "$ACTION" in
    --check)   preflight ;;
    --deploy | deploy)
               preflight || { warn "Some pre-flight checks failed. Fix issues then re-run."; }
               deploy ;;
    --status | status)  status ;;
    --down | down)      down ;;
    --update | update)  update ;;
    --textfile)         install_textfile_scripts ;;
    --health)           check_health ;;
    *)
        echo "Usage: $0 [--check | --deploy | --status | --down | --update | --health]"
        exit 1
        ;;
esac
