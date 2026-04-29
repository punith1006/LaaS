#!/bin/bash
# ============================================================================
# LaaS Host Pre-Check: Sudo Isolation Readiness
# ============================================================================
# Run this on each GPU compute node BEFORE deploying sudo isolation changes.
# This script validates that all prerequisites are in place for secure
# containerized GPU desktop environments.
#
# Usage: sudo ./host-precheck.sh
# ============================================================================

# NOTE: Do NOT use set -e here — this is a diagnostic script that must
# run ALL checks even if individual commands fail.
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Helper functions
check_pass() { 
    echo -e "  ${GREEN}✅ PASS:${NC} $1"
    ((PASS++))
}

check_fail() { 
    echo -e "  ${RED}❌ FAIL:${NC} $1"
    ((FAIL++))
}

check_warn() { 
    echo -e "  ${YELLOW}⚠️  WARN:${NC} $1"
    ((WARN++))
}

check_info() {
    echo -e "  ${BLUE}ℹ️  INFO:${NC} $1"
}

section_header() {
    echo ""
    echo -e "${CYAN}${BOLD}--- $1 ---${NC}"
}

# ============================================================================
# HEADER
# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  LaaS Host Pre-Check: Sudo Isolation${NC}"
echo -e "${BOLD}  $(date)${NC}"
echo -e "${BOLD}============================================${NC}"

# ============================================================================
# 1. DOCKER CHECKS
# ============================================================================
section_header "Docker Environment"

# Docker installed
if command -v docker &>/dev/null; then
    DOCKER_VER=$(docker --version 2>/dev/null | head -1)
    check_pass "Docker installed: $DOCKER_VER"
else
    check_fail "Docker not installed (required for container orchestration)"
fi

# Docker daemon running
if docker info &>/dev/null 2>&1; then
    check_pass "Docker daemon running"
    
    # Check Docker storage driver
    STORAGE_DRIVER=$(docker info 2>/dev/null | grep "Storage Driver" | awk '{print $3}')
    if [ -n "$STORAGE_DRIVER" ]; then
        check_info "Storage driver: $STORAGE_DRIVER"
    fi
else
    check_fail "Docker daemon not running (start with: sudo systemctl start docker)"
fi

# ============================================================================
# 2. NVIDIA CONTAINER TOOLKIT
# ============================================================================
section_header "NVIDIA Container Toolkit"

# Check for nvidia-container-toolkit (critical for CVE-2025-23359)
if command -v nvidia-container-toolkit &>/dev/null; then
    NCT_VER=$(nvidia-container-toolkit --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' | head -1)
    if [ -n "$NCT_VER" ]; then
        REQUIRED="1.17.7"
        # Compare versions using sort -V
        if printf '%s\n' "$REQUIRED" "$NCT_VER" | sort -V | head -1 | grep -q "^$REQUIRED$"; then
            check_pass "nvidia-container-toolkit version $NCT_VER (>= $REQUIRED required)"
        else
            check_fail "nvidia-container-toolkit version $NCT_VER is below $REQUIRED"
            check_info "Upgrade required for CVE-2025-23359 fix: apt update && apt install -y nvidia-container-toolkit"
        fi
    else
        check_warn "nvidia-container-toolkit installed but couldn't parse version"
    fi
elif dpkg -l nvidia-container-toolkit 2>/dev/null | grep -q '^ii'; then
    NCT_VER=$(dpkg -l nvidia-container-toolkit | grep '^ii' | awk '{print $3}')
    check_warn "nvidia-container-toolkit version $NCT_VER (verify >= 1.17.7 for CVE-2025-23359)"
else
    check_fail "nvidia-container-toolkit not found (required for GPU containers)"
    check_info "Install with: apt install -y nvidia-container-toolkit"
fi

# nvidia-smi working
if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    GPU_DRIVER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
    GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1)
    check_pass "NVIDIA GPU detected: $GPU_NAME"
    check_info "Driver version: $GPU_DRIVER, Memory: $GPU_MEMORY"
else
    check_fail "nvidia-smi not working (GPU drivers not loaded or no GPU present)"
fi

# ============================================================================
# 3. SYSTEM SECURITY
# ============================================================================
section_header "System Security"

# Sudo version (CVE-2025-32463 fix requires >= 1.9.18)
if command -v sudo &>/dev/null; then
    SUDO_VER=$(sudo --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+[a-z]*' | head -1)
    if [ -n "$SUDO_VER" ]; then
        # Extract major.minor for comparison
        SUDO_MAJOR=$(echo "$SUDO_VER" | cut -d. -f1)
        SUDO_MINOR=$(echo "$SUDO_VER" | cut -d. -f2)
        if [ "$SUDO_MAJOR" -gt 1 ] || { [ "$SUDO_MAJOR" -eq 1 ] && [ "$SUDO_MINOR" -ge 9 ]; }; then
            check_pass "sudo version: $SUDO_VER (verify >= 1.9.18 for CVE-2025-32463)"
        else
            check_warn "sudo version $SUDO_VER may be vulnerable to CVE-2025-32463"
        fi
    else
        check_warn "Could not parse sudo version"
    fi
else
    check_fail "sudo not installed"
fi

# AppArmor status
if command -v aa-status &>/dev/null && aa-status &>/dev/null 2>&1; then
    PROFILES=$(aa-status 2>/dev/null | grep "profiles are loaded" | awk '{print $1}')
    check_pass "AppArmor active with $PROFILES profiles loaded"
    
    # Check for docker-default profile
    if aa-status 2>/dev/null | grep -q "docker-default"; then
        check_pass "docker-default AppArmor profile available"
    else
        check_warn "docker-default AppArmor profile not found (Docker will create it automatically)"
    fi
elif [ -d /sys/kernel/security/apparmor ]; then
    check_warn "AppArmor module loaded but aa-status failed (install: apt install apparmor-utils)"
else
    check_fail "AppArmor not available (recommended for container isolation)"
fi

# Kernel user namespace support
if [ -f /proc/sys/kernel/unprivileged_userns_clone ]; then
    USERNS=$(cat /proc/sys/kernel/unprivileged_userns_clone)
    if [ "$USERNS" = "1" ]; then
        check_pass "User namespaces enabled (unprivileged_userns_clone=1)"
    else
        check_warn "User namespaces disabled (unprivileged_userns_clone=0)"
    fi
else
    check_pass "User namespace support available (no restriction file found)"
fi

# Kernel version
KERNEL_VER=$(uname -r)
check_info "Kernel version: $KERNEL_VER"

# ============================================================================
# 4. SERVICES
# ============================================================================
section_header "Required Services"

# lxcfs status (needed for /proc spoofing inside containers)
if systemctl is-active lxcfs &>/dev/null 2>&1; then
    check_pass "lxcfs running (enables /proc spoofing for resource isolation)"
else
    check_warn "lxcfs not running (install: apt install lxcfs && systemctl enable --now lxcfs)"
    check_info "lxcfs provides accurate /proc/{meminfo,cpuinfo} inside containers"
fi

# CUDA MPS daemon (enables GPU sharing)
if systemctl is-active cuda-mps &>/dev/null 2>&1; then
    check_pass "CUDA MPS daemon running (systemd service)"
elif pgrep -f "nvidia-cuda-mps-control" &>/dev/null; then
    check_pass "CUDA MPS control daemon running (standalone process)"
    MPS_PIPE=$(echo /tmp/nvidia-mps/control 2>/dev/null || echo "")
    if [ -S "$MPS_PIPE" ] 2>/dev/null; then
        check_info "MPS control pipe: $MPS_PIPE"
    fi
else
    check_warn "CUDA MPS daemon not detected (required for GPU sharing between containers)"
    check_info "Start with: nvidia-cuda-mps-control -d"
fi

# ============================================================================
# 5. HAMI-CORE
# ============================================================================
section_header "HAMi-Core (GPU VRAM/SM Enforcement)"

# HAMi-core library
if [ -f /usr/lib/libvgpu.so ]; then
    LIBVGPU_SIZE=$(ls -lh /usr/lib/libvgpu.so 2>/dev/null | awk '{print $5}')
    check_pass "HAMi-core library found at /usr/lib/libvgpu.so ($LIBVGPU_SIZE)"
else
    check_fail "HAMi-core library NOT found at /usr/lib/libvgpu.so"
    check_info "HAMi-core is required for VRAM limits. See: https://github.com/Project-HAMi/HAMi-core"
fi

# fake_sysconf.so (for KDE/desktop RAM display)
if [ -f /usr/lib/fake_sysconf.so ]; then
    check_pass "fake_sysconf.so found at /usr/lib/fake_sysconf.so"
else
    check_warn "fake_sysconf.so NOT found at /usr/lib/fake_sysconf.so"
    check_info "This library provides accurate RAM display in desktop environments"
fi

# ============================================================================
# 6. LAAS CONFIGURATION
# ============================================================================
section_header "LaaS Configuration"

if [ -d /etc/laas ]; then
    check_pass "/etc/laas/ directory exists"
    echo "    Contents:"
    ls -la /etc/laas/ 2>/dev/null | while read -r line; do echo "      $line"; done
    
    # Check individual config files
    [ -f /etc/laas/seccomp-gpu-desktop.json ] && check_pass "seccomp-gpu-desktop.json present" || check_warn "seccomp-gpu-desktop.json missing"
    [ -f /etc/laas/sudoers-laas-user ] && check_pass "sudoers-laas-user present" || check_warn "sudoers-laas-user missing"
    [ -f /etc/laas/bash.bashrc ] && check_pass "bash.bashrc present" || check_warn "bash.bashrc missing"
    [ -f /etc/laas/supervisord-hami.conf ] && check_pass "supervisord-hami.conf present" || check_warn "supervisord-hami.conf missing"
else
    check_warn "/etc/laas/ directory does not exist (will be created by deployment script)"
fi

# ============================================================================
# 7. NFS CONFIGURATION
# ============================================================================
section_header "NFS Configuration"

if [ -f /etc/exports ]; then
    if grep -q "no_root_squash" /etc/exports 2>/dev/null; then
        check_warn "NFS exports use no_root_squash (should change to root_squash for isolation)"
        echo "    Current exports with no_root_squash:"
        grep "no_root_squash" /etc/exports | while read -r line; do echo "      $line"; done
    elif grep -q "root_squash" /etc/exports 2>/dev/null; then
        check_pass "NFS exports use root_squash (correct for isolation)"
    else
        check_info "NFS exports found (verify root_squash setting manually)"
    fi
else
    check_info "/etc/exports not found (NFS may be on a different machine)"
fi

# Check for mounted NFS shares
if mount 2>/dev/null | grep -q "nfs"; then
    NFS_MOUNT=$(mount | grep nfs | head -1)
    check_pass "NFS mount detected: $NFS_MOUNT"
else
    check_info "No NFS mounts currently active"
fi

# ============================================================================
# 8. DOCKER NETWORKS
# ============================================================================
section_header "Docker Networks"

if docker network ls 2>/dev/null | grep -q "laas-user-network"; then
    check_pass "laas-user-network Docker bridge exists"
    # Check ICC setting
    ICC=$(docker network inspect laas-user-network 2>/dev/null | grep -A5 "Options" | grep "icc" | awk -F'"' '{print $4}')
    if [ "$ICC" = "false" ]; then
        check_pass "Inter-container communication disabled on laas-user-network"
    else
        check_warn "Inter-container communication may be enabled (should be disabled for isolation)"
    fi
else
    check_warn "laas-user-network not found (will be created by deployment script)"
fi

# ============================================================================
# 9. RUNNING CONTAINERS
# ============================================================================
section_header "Running Containers"

RUNNING=$(docker ps --format '{{.Names}}' 2>/dev/null | wc -l)
echo -e "  ${BLUE}Currently running containers:${NC} $RUNNING"

if [ "$RUNNING" -gt 0 ]; then
    echo ""
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null | head -10
    
    # Inspect first container's security settings
    FIRST_CONTAINER=$(docker ps --format '{{.Names}}' | head -1)
    if [ -n "$FIRST_CONTAINER" ]; then
        echo ""
        echo -e "  ${CYAN}Security flags of '$FIRST_CONTAINER':${NC}"
        docker inspect "$FIRST_CONTAINER" --format '    Cap Add: {{.HostConfig.CapAdd}}' 2>/dev/null
        docker inspect "$FIRST_CONTAINER" --format '    Cap Drop: {{.HostConfig.CapDrop}}' 2>/dev/null
        docker inspect "$FIRST_CONTAINER" --format '    Security Opt: {{.HostConfig.SecurityOpt}}' 2>/dev/null
        docker inspect "$FIRST_CONTAINER" --format '    Privileged: {{.HostConfig.Privileged}}' 2>/dev/null
        docker inspect "$FIRST_CONTAINER" --format '    PidsLimit: {{.HostConfig.PidsLimit}}' 2>/dev/null
    fi
fi

# ============================================================================
# 10. SECCOMP SUPPORT
# ============================================================================
section_header "Seccomp"

if docker info 2>/dev/null | grep -qi "seccomp"; then
    check_pass "Docker supports seccomp profiles"
    
    # Check if custom profile is valid JSON
    if [ -f /etc/laas/seccomp-gpu-desktop.json ]; then
        if python3 -c "import json; json.load(open('/etc/laas/seccomp-gpu-desktop.json'))" 2>/dev/null; then
            check_pass "seccomp-gpu-desktop.json is valid JSON"
        else
            check_fail "seccomp-gpu-desktop.json is not valid JSON"
        fi
    fi
else
    check_warn "Seccomp support unclear from docker info"
fi

# ============================================================================
# 11. DISK SPACE
# ============================================================================
section_header "Disk Space"

# Check /var/lib/docker space
if [ -d /var/lib/docker ]; then
    DOCKER_SPACE=$(df -h /var/lib/docker 2>/dev/null | tail -1 | awk '{print $4}')
    DOCKER_USE=$(df -h /var/lib/docker 2>/dev/null | tail -1 | awk '{print $5}')
    if [ -n "$DOCKER_SPACE" ]; then
        check_info "Docker storage: $DOCKER_SPACE available ($DOCKER_USE used)"
        # Warn if less than 20GB free
        DOCKER_SPACE_GB=$(df -BG /var/lib/docker 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
        if [ -n "$DOCKER_SPACE_GB" ] && [ "$DOCKER_SPACE_GB" -lt 20 ] 2>/dev/null; then
            check_warn "Low disk space for Docker (< 20GB free)"
        fi
    fi
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BOLD}============================================${NC}"
echo -e "${BOLD}  SUMMARY${NC}"
echo -e "${BOLD}============================================${NC}"
echo -e "  ${GREEN}✅ Passed:${NC}   $PASS"
echo -e "  ${RED}❌ Failed:${NC}   $FAIL"
echo -e "  ${YELLOW}⚠️  Warnings:${NC} $WARN"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}⛔ There are FAILED checks that must be resolved before deployment.${NC}"
    echo ""
    echo "  Recommended actions:"
    echo "    1. Review FAILED items above"
    echo "    2. Fix critical issues (Docker, nvidia-container-toolkit, HAMi-core)"
    echo "    3. Re-run this script to verify"
    echo "    4. Then run: sudo ./host-deploy-sudo-isolation.sh"
elif [ "$WARN" -gt 5 ]; then
    echo -e "  ${YELLOW}${BOLD}⚠️  Many warnings present. Review before proceeding.${NC}"
else
    echo -e "  ${GREEN}${BOLD}✅ No critical failures. Review warnings and proceed with deployment.${NC}"
    echo ""
    echo "  Next step: sudo ./host-deploy-sudo-isolation.sh"
fi
echo -e "${BOLD}============================================${NC}"

exit $FAIL
