#!/bin/bash
# ============================================================================
# LaaS Deployment: Sudo Isolation Configuration
# ============================================================================
# Run this on each GPU compute node to deploy hardened container configuration.
# This script deploys security policies that allow sudo inside containers while
# blocking dangerous operations that could compromise host isolation.
#
# Prerequisites:
#   1. Run host-precheck.sh first to verify system readiness
#   2. Must be run as root (sudo)
#
# Usage: sudo ./host-deploy-sudo-isolation.sh
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_SRC="${SCRIPT_DIR}/../../host-services/config"
LAAS_CONFIG_DIR="/etc/laas"
BACKUP_DIR="/etc/laas/backup-$(date +%Y%m%d-%H%M%S)"

# Counters
DEPLOYED=0
SKIPPED=0
ERRORS=0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
log_info() {
    echo -e "  ${BLUE}ℹ️${NC}  $1"
}

log_success() {
    echo -e "  ${GREEN}✅${NC} $1"
    ((DEPLOYED++))
}

log_warn() {
    echo -e "  ${YELLOW}⚠️${NC}  $1"
    ((SKIPPED++))
}

log_error() {
    echo -e "  ${RED}❌${NC} $1"
    ((ERRORS++))
}

section_header() {
    echo ""
    echo -e "${CYAN}${BOLD}--- $1 ---${NC}"
}

deploy_file() {
    local src="$1"
    local dst="$2"
    local perms="$3"
    local description="${4:-$(basename "$dst")}"
    
    if [ ! -f "$src" ]; then
        log_error "Source not found: $src"
        return 1
    fi
    
    # Backup existing file if present
    if [ -f "$dst" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$dst" "$BACKUP_DIR/$(basename "$dst")"
        log_info "Backed up existing: $dst"
    fi
    
    # Deploy the file
    cp "$src" "$dst"
    chmod "$perms" "$dst"
    chown root:root "$dst"
    log_success "Deployed: $dst (permissions: $perms)"
    return 0
}

# ============================================================================
# HEADER
# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  LaaS Deployment: Sudo Isolation Config${NC}"
echo -e "${BOLD}  $(date)${NC}"
echo -e "${BOLD}============================================${NC}"

# ============================================================================
# ROOT CHECK
# ============================================================================
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (sudo)${NC}"
    echo "   Usage: sudo $0"
    exit 1
fi

# ============================================================================
# VERIFY CONFIG SOURCE
# ============================================================================
section_header "Step 1: Verify Configuration Source"

if [ ! -d "$CONFIG_SRC" ]; then
    log_error "Configuration source directory not found: $CONFIG_SRC"
    echo ""
    echo "  Expected directory structure:"
    echo "    $CONFIG_SRC/"
    echo "      ├── seccomp-gpu-desktop.json"
    echo "      ├── sudoers-laas-user"
    echo "      ├── bash.bashrc"
    echo "      ├── supervisord-hami.conf"
    echo "      ├── nvidia-smi-wrapper"
    echo "      └── passwd-wrapper"
    exit 1
fi

log_success "Configuration source found: $CONFIG_SRC"

# List source files
echo "  Source files:"
for f in seccomp-gpu-desktop.json sudoers-laas-user bash.bashrc supervisord-hami.conf nvidia-smi-wrapper passwd-wrapper; do
    if [ -f "$CONFIG_SRC/$f" ]; then
        echo -e "    ${GREEN}✓${NC} $f"
    else
        echo -e "    ${RED}✗${NC} $f (missing)"
    fi
done

# ============================================================================
# CREATE CONFIGURATION DIRECTORY
# ============================================================================
section_header "Step 2: Create Configuration Directory"

if [ -d "$LAAS_CONFIG_DIR" ]; then
    log_info "$LAAS_CONFIG_DIR already exists"
else
    mkdir -p "$LAAS_CONFIG_DIR"
    chmod 755 "$LAAS_CONFIG_DIR"
    log_success "Created $LAAS_CONFIG_DIR"
fi

# ============================================================================
# DEPLOY CONFIGURATION FILES
# ============================================================================
section_header "Step 3: Deploy Configuration Files"

# 1. Seccomp profile (blocks dangerous syscalls)
deploy_file "$CONFIG_SRC/seccomp-gpu-desktop.json" \
            "$LAAS_CONFIG_DIR/seccomp-gpu-desktop.json" \
            "644" \
            "Seccomp profile (blocks mount, umount2, unshare, setns, bpf, etc.)"

# 2. Sudoers policy (must be 440 for security)
deploy_file "$CONFIG_SRC/sudoers-laas-user" \
            "$LAAS_CONFIG_DIR/sudoers-laas-user" \
            "440" \
            "Sudoers policy (allows sudo, denies mount/python3/etc.)"

# 3. Bash.bashrc with LD_PRELOAD wrappers
deploy_file "$CONFIG_SRC/bash.bashrc" \
            "$LAAS_CONFIG_DIR/bash.bashrc" \
            "644" \
            "Bash.bashrc with HAMi/sudo wrappers"

# 4. Supervisord config for HAMi injection
deploy_file "$CONFIG_SRC/supervisord-hami.conf" \
            "$LAAS_CONFIG_DIR/supervisord-hami.conf" \
            "644" \
            "Supervisord config with LD_PRELOAD for desktop services"

# 5. nvidia-smi wrapper (shows VRAM limit)
deploy_file "$CONFIG_SRC/nvidia-smi-wrapper" \
            "$LAAS_CONFIG_DIR/nvidia-smi-wrapper" \
            "755" \
            "nvidia-smi wrapper (displays user's VRAM limit)"

# 6. passwd wrapper (strips LD_PRELOAD)
deploy_file "$CONFIG_SRC/passwd-wrapper" \
            "$LAAS_CONFIG_DIR/passwd-wrapper" \
            "755" \
            "passwd wrapper (strips LD_PRELOAD)"

# ── Extract Real Sudo Binary ──────────────────────────────────────
# Selkies image replaces /usr/bin/sudo with a symlink to fakeroot.
# Extract the real sudo binary (sudo-root) for bind-mounting.
echo ""
echo "Extracting real sudo binary from Selkies image..."
TEMP_CONTAINER=$(docker create ghcr.io/selkies-project/nvidia-egl-desktop:latest 2>/dev/null)
if [ -n "$TEMP_CONTAINER" ]; then
    docker cp "$TEMP_CONTAINER:/usr/bin/sudo-root" /etc/laas/sudo-bin 2>/dev/null
    docker rm "$TEMP_CONTAINER" >/dev/null 2>&1
    if [ -f /etc/laas/sudo-bin ]; then
        chmod 4755 /etc/laas/sudo-bin
        chown root:root /etc/laas/sudo-bin
        echo "[OK] Real sudo binary deployed to /etc/laas/sudo-bin"
    else
        echo "[WARN] Could not extract sudo-root from image"
    fi
else
    echo "[WARN] Could not create temporary container from Selkies image"
fi

# ============================================================================
# VALIDATE SUDOERS SYNTAX
# ============================================================================
section_header "Step 4: Validate Sudoers File"

if command -v visudo &>/dev/null; then
    if visudo -c -f "$LAAS_CONFIG_DIR/sudoers-laas-user" 2>/dev/null; then
        log_success "Sudoers file syntax is valid"
    else
        log_error "Sudoers file has syntax errors!"
        echo ""
        echo "  Running visudo check:"
        visudo -c -f "$LAAS_CONFIG_DIR/sudoers-laas-user" 2>&1 || true
        echo ""
        echo -e "  ${RED}${BOLD}Fix the sudoers file before proceeding!${NC}"
        exit 1
    fi
else
    log_warn "visudo not found, skipping syntax validation"
fi

# ============================================================================
# VALIDATE SECCOMP JSON
# ============================================================================
section_header "Step 5: Validate Seccomp Profile"

if command -v python3 &>/dev/null; then
    if python3 -c "import json; json.load(open('$LAAS_CONFIG_DIR/seccomp-gpu-desktop.json'))" 2>/dev/null; then
        log_success "Seccomp profile is valid JSON"
        
        # Show blocked syscalls
        BLOCKED=$(python3 -c "
import json
with open('$LAAS_CONFIG_DIR/seccomp-gpu-desktop.json') as f:
    data = json.load(f)
    syscalls = data.get('syscalls', [{}])[0].get('names', [])
    print(', '.join(syscalls[:5]) + ('...' if len(syscalls) > 5 else ''))
" 2>/dev/null || echo "unable to parse")
        log_info "Blocked syscalls include: $BLOCKED"
    else
        log_error "Seccomp profile is not valid JSON"
    fi
else
    log_warn "python3 not found, skipping JSON validation"
fi

# ============================================================================
# DOCKER NETWORK SETUP
# ============================================================================
section_header "Step 6: Docker Network Setup"

if docker network ls 2>/dev/null | grep -q "laas-sessions"; then
    log_info "laas-sessions already exists"
    
    # Check ICC setting
    ICC=$(docker network inspect laas-sessions 2>/dev/null | grep -A5 "Options" | grep "icc" | awk -F'"' '{print $4}' || echo "")
    if [ "$ICC" = "false" ]; then
        log_success "Inter-container communication is disabled"
    else
        log_warn "Inter-container communication may be enabled"
        echo ""
        read -p "  Recreate network with ICC disabled? (y/N): " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            # Check for running containers on this network
            CONTAINERS_ON_NET=$(docker network inspect laas-sessions --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")
            if [ -n "$CONTAINERS_ON_NET" ]; then
                log_error "Cannot recreate: containers using this network: $CONTAINERS_ON_NET"
            else
                docker network rm laas-sessions 2>/dev/null || true
                docker network create --driver bridge \
                    --opt "com.docker.network.bridge.enable_icc=false" \
                    laas-sessions
                log_success "Recreated laas-sessions with ICC disabled"
            fi
        fi
    fi
else
    docker network create --driver bridge \
        --opt "com.docker.network.bridge.enable_icc=false" \
        laas-sessions
    log_success "Created laas-sessions (inter-container communication disabled)"
fi

# ============================================================================
# TURN SERVER (COTURN) FOR WEBRTC RELAY
# ============================================================================
section_header "Step 6b: TURN Server (coturn) Setup"

# Required for bridge networking: containers on isolated networks need
# TURN relay for WebRTC desktop streaming (Selkies GStreamer).
TURN_HOST="${TURN_HOST:-192.168.10.92}"
TURN_USER="${TURN_USERNAME:-selkies}"
TURN_PASS="${TURN_PASSWORD:-wVIAbfwkgkxjaCiZVX4BDsdU}"

echo "[INFO] TURN server configuration: host=${TURN_HOST}, user=${TURN_USER}"

if ! command -v turnserver &> /dev/null; then
    echo "[INFO] Installing coturn..."
    apt-get install -y coturn
fi

# Enable coturn daemon in /etc/default/coturn
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null
# Idempotent: ensure TURNSERVER_ENABLED=1 exists
grep -q "^TURNSERVER_ENABLED=1" /etc/default/coturn || echo "TURNSERVER_ENABLED=1" >> /etc/default/coturn

# Write coturn configuration
cat > /etc/turnserver.conf << TURNEOF
# LaaS TURN Server Configuration
# Used by Selkies GStreamer for WebRTC relay in bridge-networked containers
listening-port=3478
listening-ip=0.0.0.0
external-ip=${TURN_HOST}
fingerprint
lt-cred-mech
user=${TURN_USER}:${TURN_PASS}
realm=selkies
total-quota=100
stale-nonce=600
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
min-port=49152
max-port=65535
TURNEOF

chmod 644 /etc/turnserver.conf

systemctl enable coturn
systemctl restart coturn

if systemctl is-active --quiet coturn; then
    log_success "coturn TURN server running on port 3478 (external-ip: ${TURN_HOST})"
else
    log_warn "coturn failed to start — check: journalctl -u coturn"
fi

# ============================================================================
# NETWORK ISOLATION: DOCKER-USER IPTABLES RULES
# ============================================================================
section_header "Step 6c: Network Isolation (DOCKER-USER iptables)"

# ── Network Isolation: Block Container → Host/Private Traffic ──────
# Containers on the laas-sessions bridge network (172.31.0.0/16) must be 
# blocked from reaching host services and internal infrastructure.
# Rules go in DOCKER-USER chain (FORWARD path for Docker container traffic).
# Internet access (public IPs) is preserved for apt install, pip, etc.
#
# RULE ORDER (top to bottom in DOCKER-USER chain):
#   1. RETURN for ESTABLISHED,RELATED (required for published port responses)
#   2. RETURN for TURN server traffic (containers need WebRTC relay)
#   3. DROP for private IP ranges (host isolation)
LAAS_SUBNET="172.31.0.0/16"
TURN_IP="${TURN_HOST:-192.168.10.92}"

echo "[INFO] Setting up DOCKER-USER iptables rules for host isolation..."

# ── Rule 1: Allow responses to established connections (CRITICAL) ──────────
# Without this, published port traffic from Tailscale clients gets blocked
# because the response packets traverse DOCKER-USER and hit DROP rules.
if ! iptables -C DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN 2>/dev/null; then
    iptables -I DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
    echo "[OK] DOCKER-USER conntrack ESTABLISHED rule added"
else
    echo "[OK] DOCKER-USER conntrack ESTABLISHED rule already present"
fi

# ── Rule 2: Allow containers to reach TURN server for WebRTC relay ─────────
# Required for bridge networking: containers must reach coturn for ICE relay.
# These rules are inserted at position 2 (after conntrack, before DROP).
if ! iptables -C DOCKER-USER -s "$LAAS_SUBNET" -d "$TURN_IP/32" -p tcp --dport 3478 -j RETURN 2>/dev/null; then
    iptables -I DOCKER-USER 2 -s "$LAAS_SUBNET" -d "$TURN_IP/32" -p tcp --dport 3478 -j RETURN
    iptables -I DOCKER-USER 3 -s "$LAAS_SUBNET" -d "$TURN_IP/32" -p udp --dport 3478 -j RETURN
    iptables -I DOCKER-USER 4 -s "$LAAS_SUBNET" -d "$TURN_IP/32" -p udp --dport 49152:65535 -j RETURN
    echo "[OK] DOCKER-USER TURN server exceptions added for $TURN_IP"
else
    echo "[OK] DOCKER-USER TURN server exceptions already present"
fi

# ── Rule 3: Block containers from reaching private/internal IP ranges ──────
# These rules go AFTER the RETURN rules above.
for dst in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 169.254.0.0/16; do
    if ! iptables -C DOCKER-USER -s "$LAAS_SUBNET" -d "$dst" -j DROP 2>/dev/null; then
        iptables -A DOCKER-USER -s "$LAAS_SUBNET" -d "$dst" -j DROP
    fi
done
echo "[OK] DOCKER-USER host isolation DROP rules enforced"

# ── Persist iptables rules (MUST be last, after all rules are added) ───────
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
    echo "[OK] iptables rules persisted via netfilter-persistent"
elif command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null
    echo "[OK] iptables rules saved"
else
    echo "[WARN] No iptables persistence tool found. Install iptables-persistent: apt install iptables-persistent"
fi

# ============================================================================
# NFS CONFIGURATION CHECK
# ============================================================================
section_header "Step 7: NFS Configuration"

if [ -f /etc/exports ]; then
    if grep -q "no_root_squash" /etc/exports 2>/dev/null; then
        log_warn "NFS exports use no_root_squash (security risk)"
        echo ""
        echo "  Current exports with no_root_squash:"
        grep "no_root_squash" /etc/exports | while read -r line; do echo "    $line"; done
        echo ""
        echo "  To fix, edit /etc/exports:"
        echo "    - Change: no_root_squash → root_squash"
        echo "    - Then run: sudo exportfs -ra"
        echo ""
        read -p "  Update NFS exports automatically? (y/N): " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            cp /etc/exports "/etc/exports.backup.$(date +%Y%m%d%H%M%S)"
            sed -i 's/no_root_squash/root_squash/g' /etc/exports
            exportfs -ra
            log_success "NFS exports updated (backup saved)"
        else
            log_info "Skipped NFS update (do this manually before production)"
        fi
    else
        log_success "NFS exports already use root_squash (or no_root_squash not present)"
    fi
else
    log_info "/etc/exports not found (NFS may be on a different machine)"
fi

# ============================================================================
# VERIFY DEPLOYMENT
# ============================================================================
section_header "Step 8: Verification"

echo "  Files in $LAAS_CONFIG_DIR:"
ls -la "$LAAS_CONFIG_DIR/" 2>/dev/null | while read -r line; do echo "    $line"; done

# Quick file integrity check
echo ""
echo "  File checksums (for verification):"
for f in seccomp-gpu-desktop.json sudoers-laas-user bash.bashrc supervisord-hami.conf nvidia-smi-wrapper passwd-wrapper; do
    if [ -f "$LAAS_CONFIG_DIR/$f" ]; then
        MD5=$(md5sum "$LAAS_CONFIG_DIR/$f" 2>/dev/null | awk '{print $1}' || echo "n/a")
        echo "    $f: $MD5"
    fi
done

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  DEPLOYMENT COMPLETE${NC}"
echo -e "${BOLD}============================================${NC}"
echo ""
echo -e "  ${GREEN}✅ Deployed:${NC} $DEPLOYED files"
echo -e "  ${YELLOW}⚠️  Skipped:${NC}  $SKIPPED"
echo -e "  ${RED}❌ Errors:${NC}   $ERRORS"

if [ -d "$BACKUP_DIR" ]; then
    echo ""
    echo -e "  ${BLUE}ℹ️${NC}  Backups saved to: $BACKUP_DIR"
fi

echo ""
echo -e "${BOLD}  Next steps:${NC}"
echo "  1. Update session-orchestration/app.py to use these configs"
echo "     (if not already using the latest code)"
echo ""
echo "  2. Restart the session orchestration service:"
echo "     sudo systemctl restart laas-session-orchestration"
echo ""
echo "  3. Launch a test container and verify:"
echo ""
echo -e "     ${GREEN}Should WORK:${NC}"
echo "       sudo apt update && sudo apt install -y vim"
echo "       sudo systemctl status"
echo "       nvidia-smi (shows correct VRAM limit)"
echo ""
echo -e "     ${RED}Should be DENIED:${NC}"
echo "       sudo mount /dev/sda1 /mnt"
echo "       sudo nsenter -n -t 1"
echo "       sudo unshare --net bash"
echo "       sudo python3 script.py"
echo "       sudo docker ps"
echo ""
echo "  4. Run a CUDA test program to verify VRAM limits:"
echo "     python3 -c \"import torch; print(torch.cuda.memory_allocated())\""
echo ""
echo -e "${BOLD}============================================${NC}"

# Exit with error count
exit $ERRORS
