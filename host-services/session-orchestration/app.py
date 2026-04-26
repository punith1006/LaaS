#!/usr/bin/env python3
"""
LaaS Session Orchestration HTTP Service.
Run on the host machine (GPU compute node) alongside Docker.
Manages Docker container lifecycle for GPU desktop sessions.

Expects SESSION_SECRET in env; validates X-Session-Secret header on every protected endpoint.
"""
import fcntl
import json
import logging
import os
import re
import secrets
import string
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, request, jsonify

app = Flask(__name__)
log = logging.getLogger("werkzeug")
log.setLevel(logging.WARNING)

# Application logger for session orchestration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("laas-session-orchestration")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
SESSION_SECRET = os.environ.get("SESSION_SECRET")
HOST_IP = os.environ.get("HOST_IP", "192.168.10.92")
SELKIES_IMAGE = os.environ.get("SELKIES_IMAGE", "ghcr.io/selkies-project/nvidia-egl-desktop:latest")
NFS_MOUNT_ROOT = os.environ.get("NFS_MOUNT_ROOT", "/mnt/nfs/users")
RESOURCE_LOCK_PATH = "/tmp/laas-resource-lock"

# Network mode: "bridge" (isolated) or "host" (legacy)
NETWORK_MODE = os.environ.get("LAAS_NETWORK_MODE", "bridge")
USER_NETWORK_NAME = os.environ.get("LAAS_USER_NETWORK_NAME", "laas-sessions")

# Internal container ports (for bridge networking - each container uses same internal ports)
INTERNAL_NGINX_PORT = 8080
INTERNAL_SELKIES_PORT = 9080
INTERNAL_METRICS_PORT = 19080

# Port ranges
NGINX_PORT_MIN, NGINX_PORT_MAX = 8100, 8199  # Start at 8100 to avoid 8080 (cAdvisor)
SELKIES_PORT_OFFSET = 1000  # selkies = nginx + 1000
METRICS_PORT_OFFSET = 11000  # metrics = nginx + 11000

# Reserved infrastructure ports - these are used by monitoring stack and other services
# on the host and must never be allocated to user session containers.
RESERVED_PORTS = {
    3000,   # Grafana
    3001,   # Uptime Kuma
    3100,   # Loki
    8080,   # cAdvisor (internal)
    8999,   # cAdvisor (published)
    9090,   # Prometheus
    9093,   # Alertmanager
    9100,   # Node Exporter
    9115,   # Blackbox Exporter
    9400,   # DCGM Exporter
    9500,   # MPS Exporter
    9501,   # Session Exporter
    9998,   # Session Orchestration API
    8180,   # Reserved for Keycloak
}

# Display range
DISPLAY_MIN, DISPLAY_MAX = 20, 99

# CPU core allocation: cores 2-15 (14 allocatable cores, 0-1 reserved for OS)
ALLOCATABLE_CORES = list(range(2, 16))

# TURN server config (can override via env)
# NOTE: For bridge networking, TURN_HOST must be an IP reachable from BOTH:
#   1. The browser (WebRTC client) - for STUN/TURN ICE candidate discovery
#   2. The container (via laas-sessions network) - for WebRTC relay traffic
# Using FortiClient VPN IP (192.168.10.92); ensure iptables DOCKER-USER chain
# has conntrack ESTABLISHED rule to allow response traffic from containers.
TURN_HOST = os.environ.get("TURN_HOST", "192.168.10.92")
TURN_PORT = os.environ.get("TURN_PORT", "3478")
TURN_USERNAME = os.environ.get("TURN_USERNAME", "selkies")
TURN_PASSWORD = os.environ.get("TURN_PASSWORD", "wVIAbfwkgkxjaCiZVX4BDsdU")
TURN_PROTOCOL = os.environ.get("TURN_PROTOCOL", "tcp")

# Validation patterns
UUID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
STORAGE_UID_PATTERN = re.compile(r"^u_[0-9a-f]{24}$")
TIER_SLUGS = {"spark", "blaze", "inferno", "supernova"}

# In-memory event store: container_name -> event list
session_events: Dict[str, Dict[str, Any]] = {}
session_events_lock = threading.Lock()

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
def log_event(
    request_id: str,
    client_ip: str,
    container_name: str,
    outcome: str,
    session_id: str = "",
    error: Optional[str] = None
):
    """Emit structured JSON log entry."""
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
        "client_ip": client_ip,
        "container_name": container_name,
        "session_id": session_id,
        "outcome": outcome,
    }
    if error:
        payload["error"] = error[:500]
    print(json.dumps(payload), flush=True)


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────
def _run_cmd(cmd: List[str], timeout: int = 30) -> Tuple[bool, str]:
    """Run a command; return (success, stderr_or_stdout)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        out = (result.stderr or result.stdout or "").strip()
        return result.returncode == 0, out
    except FileNotFoundError as e:
        return False, f"Command not found: {e}"
    except subprocess.TimeoutExpired:
        return False, f"Command timed out after {timeout}s"
    except Exception as e:
        return False, str(e)


def generate_password(length: int = 16) -> str:
    """Generate a secure random alphanumeric password."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_hostname() -> str:
    """Generate a random hostname like ws-a1b2c3d4."""
    return f"ws-{secrets.token_hex(4)}"


def now_iso() -> str:
    """Return current time as ISO8601 string."""
    return datetime.now(timezone.utc).isoformat()


# In-memory session metadata: container_name -> {storage_transport, storage_uid, nvme_subsystem, storage_backend}
session_metadata: Dict[str, Dict[str, Any]] = {}
session_metadata_lock = threading.Lock()


# ─────────────────────────────────────────────────────────────────────────────
# NVMe-oF Error + Helpers
# ─────────────────────────────────────────────────────────────────────────────
class NvmeError(Exception):
    """Custom exception for NVMe-oF verification chain failures."""
    def __init__(self, step: str, message: str):
        self.step = step
        self.message = message
        super().__init__(f"NVMe-oF error at '{step}': {message}")


def find_nvme_device(nvme_subsystem: str) -> Optional[str]:
    """Parse nvme list-subsys to find the block device for a subsystem.
    
    The subsystem name (e.g., 'laas-u_abc123') should appear within the NQN string.
    Returns the device path (e.g., '/dev/nvme1n1') or None.
    """
    result = subprocess.run(
        ["nvme", "list-subsys", "-o", "json"],
        capture_output=True, text=True, timeout=10
    )
    if result.returncode != 0:
        logger.error(f"[NVME-DEVICE] nvme list-subsys failed: {result.stderr}")
        return None
    
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        logger.error(f"[NVME-DEVICE] Failed to parse nvme list-subsys JSON")
        return None
    
    # nvme-cli >=2.x wraps in {"Subsystems": [...]}
    subsystems = data.get("Subsystems", data) if isinstance(data, dict) else data
    if isinstance(subsystems, dict):
        subsystems = subsystems.get("Subsystems", [])
    
    for subsys in subsystems:
        nqn = subsys.get("NQN", "") or subsys.get("SubsystemNQN", "")
        name = subsys.get("Name", "")
        if nvme_subsystem in nqn or nvme_subsystem in name:
            # Check Namespaces array (nvme-cli v2+)
            for ns in subsys.get("Namespaces", []):
                ns_name = ns.get("NameSpace", "") or ns.get("Name", "")
                if ns_name:
                    return f"/dev/{ns_name}"
            # Fallback: check Paths -> Namespaces (older format)
            for path_info in subsys.get("Paths", []):
                for ns in path_info.get("Namespaces", []):
                    ns_name = ns.get("NameSpace", "") or ns.get("Name", "")
                    if ns_name:
                        return f"/dev/{ns_name}"
    return None


def rollback_nvmeof(completed_steps: List[str], mount_path: str, nvme_subsystem: str) -> None:
    """Rollback completed NVMe-oF steps in REVERSE order."""
    for step in reversed(completed_steps):
        try:
            if step == "mount":
                logger.info(f"[NVME-ROLLBACK] Unmounting {mount_path}...")
                subprocess.run(["umount", mount_path], capture_output=True, timeout=10)
            elif step == "connect":
                logger.info(f"[NVME-ROLLBACK] Disconnecting {nvme_subsystem}...")
                subprocess.run(
                    ["nvme", "disconnect", "-n", nvme_subsystem],
                    capture_output=True, timeout=10
                )
            elif step in ("find_device", "discover", "permissions"):
                pass  # Nothing to rollback
        except Exception as e:
            logger.error(f"[NVME-ROLLBACK] Error during {step} rollback: {e}")
    # Cleanup mount dir if empty and not mounted
    if os.path.isdir(mount_path) and not os.path.ismount(mount_path):
        try:
            os.rmdir(mount_path)
        except Exception:
            pass


def setup_nvmeof_storage(
    container_name: str,
    storage_uid: str,
    storage_node_ip: str,
    nvme_port: int,
    nvme_subsystem: str,
) -> str:
    """
    5-step NVMe-oF verification chain with rollback on failure.
    Each step emits events for backend visibility.
    Returns mount_path on success, raises NvmeError on failure.
    """
    completed_steps: List[str] = []
    mount_path = f"/mnt/nvme/{storage_uid}"
    
    try:
        # Step 1: DISCOVER
        logger.info(f"[NVME-DISCOVER] Discovering subsystem {nvme_subsystem} at {storage_node_ip}:{nvme_port}...")
        emit_event(container_name, "nvme_discovering", f"Discovering NVMe-oF subsystem at {storage_node_ip}...")
        result = subprocess.run(
            ["nvme", "discover", "-t", "tcp", "-a", storage_node_ip, "-s", str(nvme_port)],
            capture_output=True, text=True, timeout=15
        )
        if nvme_subsystem not in result.stdout:
            raise NvmeError("discover", f"Subsystem {nvme_subsystem} not found in discovery output")
        completed_steps.append("discover")
        complete_event(container_name, "nvme_discovering", "NVMe-oF subsystem discovered")
        
        # Step 2: CONNECT
        logger.info(f"[NVME-CONNECT] Connecting to subsystem {nvme_subsystem}...")
        emit_event(container_name, "nvme_connecting", f"Connecting to NVMe-oF subsystem {nvme_subsystem}...")
        result = subprocess.run(
            ["nvme", "connect", "-t", "tcp", "-n", nvme_subsystem,
             "-a", storage_node_ip, "-s", str(nvme_port)],
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            # "already connected" is not an error
            if "already connected" not in result.stderr.lower():
                raise NvmeError("connect", f"Connect failed: {result.stderr}")
        completed_steps.append("connect")
        complete_event(container_name, "nvme_connecting", "NVMe-oF connected")
        
        # Step 3: FIND DEVICE
        logger.info(f"[NVME-DEVICE] Finding block device for {nvme_subsystem}...")
        emit_event(container_name, "nvme_finding_device", "Locating NVMe block device...")
        # Brief delay for kernel device registration
        time.sleep(0.5)
        device_path = find_nvme_device(nvme_subsystem)
        if not device_path or not os.path.exists(device_path):
            raise NvmeError("find_device", f"Block device not found for {nvme_subsystem}")
        completed_steps.append("find_device")
        complete_event(container_name, "nvme_finding_device", f"Block device found: {device_path}")
        
        # Step 4: MOUNT
        logger.info(f"[NVME-MOUNT] Mounting {device_path} to {mount_path}...")
        emit_event(container_name, "nvme_mounting", f"Mounting {device_path} to {mount_path}...")
        os.makedirs(mount_path, exist_ok=True)
        # Check if already mounted
        if os.path.ismount(mount_path):
            logger.info(f"[NVME-MOUNT] {mount_path} already mounted, skipping")
        else:
            result = subprocess.run(
                ["mount", device_path, mount_path],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                raise NvmeError("mount", f"Mount failed: {result.stderr}")
            if not os.path.ismount(mount_path):
                raise NvmeError("mount", "Mount point not active after mount command")
        completed_steps.append("mount")
        complete_event(container_name, "nvme_mounting", "NVMe-oF volume mounted")
        
        # Step 5: VERIFY PERMISSIONS
        logger.info(f"[NVME-VERIFY] Verifying permissions on {mount_path}...")
        emit_event(container_name, "nvme_verifying", "Verifying storage permissions...")
        stat_info = os.stat(mount_path)
        if stat_info.st_uid != 1000:
            raise NvmeError("permissions", f"Owner UID is {stat_info.st_uid}, expected 1000")
        # Write test to confirm read/write access
        test_file = os.path.join(mount_path, ".nvme_verify_test")
        try:
            with open(test_file, "w") as f:
                f.write("verify")
            os.remove(test_file)
        except Exception as e:
            raise NvmeError("permissions", f"Write test failed: {e}")
        completed_steps.append("permissions")
        complete_event(container_name, "nvme_verifying", "Permissions verified (UID 1000, read/write OK)")
        
        logger.info(f"[NVME-READY] Storage ready at {mount_path}")
        return mount_path
        
    except NvmeError as e:
        logger.error(f"[NVME-FAIL] Failed at step '{e.step}': {e.message}")
        fail_session(container_name, f"nvme_{e.step}", f"NVMe-oF failed at {e.step}: {e.message}")
        rollback_nvmeof(completed_steps, mount_path, nvme_subsystem)
        raise


def verify_local_zfs(storage_uid: str, storage_backend: str = 'zfs_dataset') -> str:
    """Verify local ZFS storage (dataset or zvol) and return mount path.
    
    For zfs_dataset: checks directory at /datapool/users/{uid}.
    For zfs_zvol: checks block device at /dev/zvol/datapool/users/{uid},
    mounts to /datapool/users/{uid} if not already mounted (provision-managed path).
    
    Returns the mount path on success, raises Exception on failure.
    """
    if storage_backend == 'zfs_zvol':
        # Zvol: block device needs to be mounted at provision-managed path
        zvol_dev = f"/dev/zvol/datapool/users/{storage_uid}"
        mount_path = f"/datapool/users/{storage_uid}"

        # Check block device exists
        if not os.path.exists(zvol_dev):
            raise Exception(f"[LOCAL-ZVOL] Block device not found: {zvol_dev}")

        # Ensure mount directory exists (use sudo since /datapool may be root-owned)
        if not os.path.exists(mount_path):
            result = subprocess.run(
                ["sudo", "mkdir", "-p", mount_path],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode != 0:
                raise Exception(f"[LOCAL-ZVOL] Failed to create mount path: {result.stderr}")

        if not os.path.ismount(mount_path):
            logger.info(f"[LOCAL-ZVOL] Mounting {zvol_dev} to {mount_path}")
            result = subprocess.run(
                ["sudo", "mount", zvol_dev, mount_path],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                raise Exception(f"[LOCAL-ZVOL] Mount failed: {result.stderr}")

        # Verify ownership
        stat_info = os.stat(mount_path)
        if stat_info.st_uid != 1000:
            # Try to fix ownership
            subprocess.run(
                ["sudo", "chown", "-R", "1000:1000", mount_path],
                capture_output=True, text=True, timeout=10
            )
            stat_info = os.stat(mount_path)
            if stat_info.st_uid != 1000:
                raise Exception(f"[LOCAL-ZVOL] Owner UID is {stat_info.st_uid}, expected 1000")

        logger.info(f"[LOCAL-ZVOL] Verified: {mount_path}")
        return mount_path
    else:
        # Dataset: existing behavior — directory at /datapool/users/{uid}
        dataset_path = f"/datapool/users/{storage_uid}"
        if not os.path.isdir(dataset_path):
            raise Exception(f"Local ZFS dataset path not found: {dataset_path}")
        stat_info = os.stat(dataset_path)
        if stat_info.st_uid != 1000:
            raise Exception(f"ZFS dataset owner UID is {stat_info.st_uid}, expected 1000")
        return dataset_path


def cleanup_nvmeof_storage(
    storage_uid: str,
    nvme_subsystem: str,
) -> List[str]:
    """
    Clean up NVMe-oF storage after session shutdown.
    Returns list of errors (empty = success).
    """
    errors: List[str] = []
    mount_path = f"/mnt/nvme/{storage_uid}"
    
    # 1: Unmount
    logger.info(f"[CLEANUP-3a] Unmounting {mount_path}...")
    if os.path.ismount(mount_path):
        ok, out = _run_cmd(["umount", mount_path], timeout=15)
        if not ok:
            logger.warning(f"[CLEANUP-3a] Regular umount failed, trying lazy umount...")
            ok, out = _run_cmd(["umount", "-l", mount_path], timeout=15)
            if not ok:
                errors.append(f"umount: {out}")
    
    # 2: NVMe disconnect
    logger.info(f"[CLEANUP-3b] Disconnecting NVMe-oF {nvme_subsystem}...")
    ok, out = _run_cmd(["nvme", "disconnect", "-n", nvme_subsystem], timeout=15)
    if not ok:
        errors.append(f"nvme disconnect: {out}")
    
    # 3: Remove mount directory
    logger.info(f"[CLEANUP-3c] Removing mount dir {mount_path}...")
    try:
        if os.path.isdir(mount_path) and not os.path.ismount(mount_path):
            os.rmdir(mount_path)
    except Exception as e:
        errors.append(f"rmdir: {e}")
    
    return errors


def store_session_metadata(
    container_name: str,
    storage_transport: Optional[str],
    storage_uid: Optional[str],
    nvme_subsystem: Optional[str],
    storage_backend: Optional[str] = None,
) -> None:
    """Store session metadata for cleanup on shutdown."""
    with session_metadata_lock:
        session_metadata[container_name] = {
            "storage_transport": storage_transport,
            "storage_uid": storage_uid,
            "nvme_subsystem": nvme_subsystem,
            "storage_backend": storage_backend,
        }


def pop_session_metadata(container_name: str) -> Dict[str, Any]:
    """Retrieve and remove session metadata."""
    with session_metadata_lock:
        return session_metadata.pop(container_name, {})


# ─────────────────────────────────────────────────────────────────────────────
# Session Event Management
# ─────────────────────────────────────────────────────────────────────────────
def init_session_events(container_name: str) -> None:
    """Initialize event tracking for a new session."""
    with session_events_lock:
        session_events[container_name] = {
            "events": [],
            "currentStep": None,
            "overallStatus": "launching",
            "connectionInfo": None,
            "launchId": str(uuid.uuid4()),
        }


def emit_event(
    container_name: str,
    step: str,
    message: str,
    status: str = "in_progress"
) -> None:
    """Emit an event for a session launch step."""
    with session_events_lock:
        if container_name not in session_events:
            return
        session_events[container_name]["events"].append({
            "step": step,
            "message": message,
            "ts": now_iso(),
            "status": status,
        })
        session_events[container_name]["currentStep"] = step


def complete_event(container_name: str, step: str, message: str) -> None:
    """Mark the current step as completed."""
    emit_event(container_name, step, message, "completed")


def fail_session(container_name: str, step: str, reason: str) -> None:
    """Mark the session as failed."""
    with session_events_lock:
        if container_name not in session_events:
            return
        session_events[container_name]["events"].append({
            "step": step,
            "message": reason,
            "ts": now_iso(),
            "status": "failed",
        })
        session_events[container_name]["currentStep"] = step
        session_events[container_name]["overallStatus"] = "failed"


def set_session_ready(container_name: str, connection_info: Dict[str, Any]) -> None:
    """Mark the session as ready with connection info."""
    with session_events_lock:
        if container_name not in session_events:
            return
        session_events[container_name]["overallStatus"] = "ready"
        session_events[container_name]["connectionInfo"] = connection_info


def get_session_events(container_name: str) -> Optional[Dict[str, Any]]:
    """Get the event list for a session."""
    with session_events_lock:
        return session_events.get(container_name)


# ─────────────────────────────────────────────────────────────────────────────
# Resource Allocation (under file lock)
# ─────────────────────────────────────────────────────────────────────────────
def get_laas_containers() -> List[Dict[str, Any]]:
    """Query running LaaS containers with their resource allocations."""
    ok, out = _run_cmd([
        "docker", "ps", "--filter", "label=laas.session_id",
        "--format", "{{.Names}}\t{{.ID}}"
    ])
    if not ok or not out:
        return []
    
    containers = []
    for line in out.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        name, container_id = parts[0], parts[1]
        
        # Get detailed inspect info
        ok, inspect_out = _run_cmd([
            "docker", "inspect", "--format",
            '{{.Config.Labels}}|||{{.HostConfig.CpusetCpus}}|||{{index .Config.Env 0}}',
            container_id
        ])
        if ok:
            containers.append({
                "name": name,
                "id": container_id,
                "inspect": inspect_out,
            })
    return containers


def get_used_ports() -> set:
    """Get currently used nginx ports from running LaaS containers.
    
    Reads host port bindings from docker inspect to get actual allocated host ports.
    """
    containers = get_laas_containers()
    used_ports = set()
    
    for container in containers:
        # Inspect for host port bindings (e.g., "8080/tcp" -> host port 8101)
        ok, out = _run_cmd([
            "docker", "inspect", "--format",
            '{{json .NetworkSettings.Ports}}',
            container["id"]
        ])
        if ok and out.strip():
            try:
                ports_data = json.loads(out.strip())
                # Look for the 8080/tcp mapping (nginx internal port -> host port)
                if "8080/tcp" in ports_data:
                    bindings = ports_data["8080/tcp"]
                    if bindings and len(bindings) > 0:
                        host_port = int(bindings[0].get("HostPort", 0))
                        if host_port > 0:
                            used_ports.add(host_port)
            except (json.JSONDecodeError, ValueError, KeyError, TypeError):
                pass
    return used_ports


def get_used_displays() -> set:
    """Get currently used display numbers from running LaaS containers."""
    containers = get_laas_containers()
    used_displays = set()
    
    for container in containers:
        ok, out = _run_cmd([
            "docker", "inspect", "--format",
            '{{range .Config.Env}}{{println .}}{{end}}',
            container["id"]
        ])
        if ok:
            for line in out.split("\n"):
                if line.startswith("DISPLAY=:"):
                    try:
                        display = int(line.split(":")[1])
                        used_displays.add(display)
                    except (ValueError, IndexError):
                        pass
    return used_displays


def get_used_cores() -> set:
    """Get currently used CPU cores from running LaaS containers."""
    containers = get_laas_containers()
    used_cores = set()
    
    for container in containers:
        ok, out = _run_cmd([
            "docker", "inspect", "--format",
            '{{.HostConfig.CpusetCpus}}',
            container["id"]
        ])
        if ok and out.strip():
            cpuset = out.strip()
            # Parse ranges like "2-5" or "2,3,4,5"
            for part in cpuset.split(","):
                if "-" in part:
                    try:
                        start, end = part.split("-")
                        for core in range(int(start), int(end) + 1):
                            used_cores.add(core)
                    except ValueError:
                        pass
                else:
                    try:
                        used_cores.add(int(part))
                    except ValueError:
                        pass
    return used_cores


def allocate_port() -> Optional[int]:
    """Find the first available nginx port in range 8100-8199.

    Skips ports that are:
    - Already in use by other LaaS containers
    - In RESERVED_PORTS (infrastructure/monitoring services)
    - Would cause derived ports (selkies=nginx+1000, metrics=nginx+11000) to conflict with RESERVED_PORTS
    """
    used_ports = get_used_ports()
    for port in range(NGINX_PORT_MIN, NGINX_PORT_MAX + 1):
        if port in used_ports:
            continue
        if port in RESERVED_PORTS:
            continue
        # Check derived ports don't conflict with reserved ports
        selkies_port = port + SELKIES_PORT_OFFSET
        metrics_port = port + METRICS_PORT_OFFSET
        if selkies_port in RESERVED_PORTS or metrics_port in RESERVED_PORTS:
            continue
        return port
    return None


def allocate_display() -> Optional[int]:
    """Find the first available display number in range 20-99."""
    used_displays = get_used_displays()
    for display in range(DISPLAY_MIN, DISPLAY_MAX + 1):
        if display not in used_displays:
            return display
    return None


def allocate_cores(needed: int) -> Optional[str]:
    """Find next available contiguous block of `needed` cores. Return '2-5' format."""
    used_cores = get_used_cores()
    available = [c for c in ALLOCATABLE_CORES if c not in used_cores]
    
    # Find contiguous block
    if len(available) < needed:
        return None
    
    # Sort available cores
    available.sort()
    
    # Find first contiguous block of `needed` cores
    for i in range(len(available) - needed + 1):
        block = available[i:i + needed]
        # Check if contiguous
        if block[-1] - block[0] == needed - 1:
            return f"{block[0]}-{block[-1]}"
    
    # If no contiguous block, return None (or could allow non-contiguous)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Health Checks
# ─────────────────────────────────────────────────────────────────────────────
def check_docker_alive() -> Tuple[bool, str]:
    """Check if Docker daemon is running."""
    ok, out = _run_cmd(["docker", "info"], timeout=5)
    return ok, "Docker daemon is running" if ok else f"Docker daemon error: {out}"


def check_nvidia_gpu() -> Tuple[bool, str]:
    """Check if NVIDIA GPU is accessible via nvidia-smi."""
    ok, out = _run_cmd(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], timeout=5)
    if ok:
        return True, f"GPU available: {out.strip()}"
    return False, f"nvidia-smi error: {out}"


def check_selkies_image() -> Tuple[bool, str]:
    """Check if Selkies image exists locally."""
    ok, out = _run_cmd(["docker", "image", "inspect", SELKIES_IMAGE], timeout=10)
    if ok:
        return True, f"Selkies image present: {SELKIES_IMAGE}"
    return False, f"Selkies image missing: {SELKIES_IMAGE}"


def check_mps_daemon() -> Tuple[bool, str]:
    """Check if CUDA MPS daemon is running."""
    ok, out = _run_cmd(["pgrep", "-f", "nvidia-cuda-mps-control"], timeout=5)
    if ok and out.strip():
        return True, f"MPS daemon running (PID: {out.strip()})"
    # Alternative check: MPS socket exists
    if os.path.exists("/tmp/nvidia-mps/control"):
        return True, "MPS control socket present"
    return False, "CUDA MPS daemon not running"


# ─────────────────────────────────────────────────────────────────────────────
# Docker Command Builder
# ─────────────────────────────────────────────────────────────────────────────
def build_docker_command(
    container_name: str,
    hostname: str,
    vcpu: int,
    cpuset: str,
    memory_mb: int,
    vram_mb: int,
    hami_sm_percent: int,
    display_number: int,
    nginx_port: int,
    password: str,
    storage_type: str,
    storage_uid: Optional[str],
    session_id: str,
    user_email: str,
    tier_slug: str,
    node_hostname: str,
    storage_transport: Optional[str] = None,
    mount_path: Optional[str] = None,
) -> List[str]:
    """Build the complete docker run command."""
    
    selkies_port = nginx_port + SELKIES_PORT_OFFSET
    metrics_port = nginx_port + METRICS_PORT_OFFSET
    memory_gb = memory_mb // 1024 if memory_mb >= 1024 else 1
    vram_gb = vram_mb // 1024 if vram_mb >= 1024 else 1
    container_memory_bytes = memory_mb * 1024 * 1024
    
    cmd = ["docker", "create"]
    
    # Container identity
    cmd.extend(["--name", container_name])
    cmd.extend(["--hostname", hostname])
    # Ensure container hostname resolves (required by sudo)
    cmd.extend(["--add-host", f"{hostname}:127.0.0.1"])
    
    # Restart policy
    cmd.extend(["--restart", "unless-stopped"])
    
    # GPU access
    cmd.extend(["--gpus", "all"])
    
    # Resource limits
    cmd.extend([f"--cpus={vcpu}"])
    cmd.extend([f"--cpuset-cpus={cpuset}"])
    cmd.extend([f"--memory={memory_gb}g"])
    cmd.extend(["--pids-limit", "2048"])  # KDE desktop + browser + dev tools need ~500+ PIDs
    
    # IPC sharing (required for Selkies WebRTC shared memory and HAMi MPS pipes)
    cmd.append("--ipc=host")
    
    # Network configuration: bridge (isolated) or host (legacy)
    # Bridge mode: containers CANNOT access host localhost services (NestJS, Keycloak, etc.)
    # but CAN reach the internet via Docker NAT (for apt install, pip, etc.)
    if NETWORK_MODE == "bridge":
        cmd.append(f"--network={USER_NETWORK_NAME}")
        # DNS for external hostname resolution (apt install, pip, etc.)
        cmd.extend(["--dns", "8.8.8.8", "--dns", "8.8.4.4"])
        # Publish container ports to host — map external ports to fixed internal ports
        cmd.extend(["-p", f"{nginx_port}:{INTERNAL_NGINX_PORT}"])
        # Note: selkies_port not published — selkies-gstreamer binds to 127.0.0.1
        # only inside the container; all WebRTC traffic is proxied through nginx
        cmd.extend(["-p", f"{metrics_port}:{INTERNAL_METRICS_PORT}"])
    else:
        # Fallback: host networking (no isolation, all host services accessible)
        cmd.append("--network=host")
    
    cmd.extend(["--tmpfs", "/dev/shm:rw"])
    
    # Security: Drop all capabilities, add only what's needed for sudo + desktop
    cmd.append("--cap-drop=ALL")
    sudo_caps = [
        "CHOWN", "DAC_OVERRIDE", "FOWNER", "SETUID", "SETGID",
        "NET_BIND_SERVICE", "KILL", "SYS_CHROOT", "MKNOD",
        "NET_RAW", "FSETID", "AUDIT_WRITE"
    ]
    for cap in sudo_caps:
        cmd.extend(["--cap-add", cap])
    
    # Security: Seccomp syscall filter + AppArmor MAC profile
    cmd.extend(["--security-opt", "seccomp=/etc/laas/seccomp-gpu-desktop.json"])
    cmd.extend(["--security-opt", "apparmor=docker-default"])
    # no-new-privileges must be false to allow sudo inside container
    cmd.extend(["--security-opt", "no-new-privileges=false"])
    
    # Timezone
    cmd.extend(["-e", "TZ=UTC"])
    
    # Display settings
    cmd.extend(["-e", f"DISPLAY=:{display_number}"])
    cmd.extend(["-e", "DISPLAY_SIZEW=1920"])
    cmd.extend(["-e", "DISPLAY_SIZEH=1080"])
    cmd.extend(["-e", "DISPLAY_REFRESH=60"])
    
    # Selkies encoder and auth
    cmd.extend(["-e", "SELKIES_ENCODER=nvh264enc"])
    cmd.extend(["-e", "SELKIES_ENABLE_BASIC_AUTH=true"])
    cmd.extend(["-e", f"SELKIES_BASIC_AUTH_PASSWORD={password}"])
    
    # Ports: in bridge mode, container listens on fixed internal ports
    # In host mode, container listens directly on external ports
    if NETWORK_MODE == "bridge":
        cmd.extend(["-e", f"NGINX_PORT={INTERNAL_NGINX_PORT}"])
        cmd.extend(["-e", f"SELKIES_PORT={INTERNAL_SELKIES_PORT}"])
        cmd.extend(["-e", f"SELKIES_METRICS_HTTP_PORT={INTERNAL_METRICS_PORT}"])
    else:
        cmd.extend(["-e", f"NGINX_PORT={nginx_port}"])
        cmd.extend(["-e", f"SELKIES_PORT={selkies_port}"])
        cmd.extend(["-e", f"SELKIES_METRICS_HTTP_PORT={metrics_port}"])
    
    # Ubuntu user password
    cmd.extend(["-e", f"PASSWD={password}"])
    
    # CUDA/GPU settings
    cmd.extend(["-e", "CUDA_VISIBLE_DEVICES=0"])
    cmd.extend(["-e", "CUDA_NVRTC_ARCH=89"])
    cmd.extend(["-e", "__NV_PRIME_RENDER_OFFLOAD=1"])
    cmd.extend(["-e", "__GLX_VENDOR_LIBRARY_NAME=nvidia"])
    
    # HAMi-core GPU limits
    cmd.extend(["-e", f"CUDA_DEVICE_MEMORY_LIMIT_0={vram_mb}m"])
    cmd.extend(["-e", f"CUDA_DEVICE_SM_LIMIT={hami_sm_percent}"])
    
    # MPS settings
    cmd.extend(["-e", "CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps"])
    cmd.extend(["-e", "CUDA_MPS_LOG_DIRECTORY=/tmp/nvidia-log"])
    cmd.extend(["-e", f"CUDA_MPS_PINNED_DEVICE_MEM_LIMIT=0={vram_gb}G"])
    cmd.extend(["-e", f"CUDA_MPS_ACTIVE_THREAD_PERCENTAGE={hami_sm_percent}"])
    cmd.extend(["-e", "CUDA_MPS_ENABLE_PER_CTX_DEVICE_MULTIPROCESSOR_PARTITIONING=1"])
    
    # Container memory limit for lxcfs
    cmd.extend(["-e", f"CONTAINER_MEMORY_LIMIT_BYTES={container_memory_bytes}"])
    
    # TURN server settings
    cmd.extend(["-e", f"SELKIES_TURN_HOST={TURN_HOST}"])
    cmd.extend(["-e", f"SELKIES_TURN_PORT={TURN_PORT}"])
    cmd.extend(["-e", f"SELKIES_TURN_USERNAME={TURN_USERNAME}"])
    cmd.extend(["-e", f"SELKIES_TURN_PASSWORD={TURN_PASSWORD}"])
    cmd.extend(["-e", f"SELKIES_TURN_PROTOCOL={TURN_PROTOCOL}"])
    
    # Volume mounts - MPS
    cmd.extend(["-v", "/tmp/nvidia-mps:/tmp/nvidia-mps"])
    cmd.extend(["-v", "/tmp/nvidia-log:/tmp/nvidia-log"])
    
    # Volume mounts - User storage (stateful only)
    if storage_type == "stateful" and storage_uid:
        # Use the resolved mount_path if provided, otherwise resolve from transport
        if mount_path:
            resolved_path = mount_path
        elif storage_transport == "local_zfs":
            resolved_path = f"/datapool/users/{storage_uid}"
        elif storage_transport == "nvmeof_tcp":
            resolved_path = f"/mnt/nvme/{storage_uid}"  # Already mounted by setup_nvmeof_storage()
        else:
            # Fallback to NFS for backward compatibility
            resolved_path = f"{NFS_MOUNT_ROOT}/{storage_uid}"
        cmd.extend(["-v", f"{resolved_path}:/home/ubuntu"])
    
    # Volume mounts - HAMi-core libs
    cmd.extend(["-v", "/usr/lib/libvgpu.so:/usr/lib/libvgpu.so:ro"])
    cmd.extend(["-v", "/usr/lib/fake_sysconf.so:/usr/lib/fake_sysconf.so:ro"])
    
    # Volume mounts - vgpulock
    cmd.extend(["-v", f"/tmp/vgpulock-{display_number}:/tmp/vgpulock"])
    
    # Volume mounts - nvidia-smi wrapper
    cmd.extend(["-v", "/usr/bin/nvidia-smi:/usr/bin/nvidia-smi.real"])
    cmd.extend(["-v", "/etc/laas/nvidia-smi-wrapper:/usr/bin/nvidia-smi:ro"])
    
    # Volume mounts - passwd wrapper
    cmd.extend(["-v", "/usr/bin/passwd:/usr/bin/passwd.real"])
    cmd.extend(["-v", "/etc/laas/passwd-wrapper:/usr/bin/passwd:ro"])
    
    # Volume mounts - supervisord config
    cmd.extend(["-v", "/etc/laas/supervisord-hami.conf:/etc/supervisord.conf:ro"])
    cmd.extend(["-v", "/etc/laas/bash.bashrc:/etc/bash.bashrc:ro"])
    
    # Sudoers: override base image's /etc/sudoers to remove blanket ubuntu ALL grant
    # (base image puts ubuntu ALL=(ALL:ALL) NOPASSWD: ALL after @includedir,
    # which overrides all deny rules in /etc/sudoers.d/laas-user)
    cmd.extend(["-v", "/etc/laas/sudoers:/etc/sudoers:ro"])
    # Sudoers: enable passwordless sudo with deny rules for dangerous operations
    cmd.extend(["-v", "/etc/laas/sudoers-laas-user:/etc/sudoers.d/laas-user:ro"])
    # Override fakeroot-symlinked sudo with real setuid sudo binary
    cmd.extend(["-v", "/etc/laas/sudo-bin:/usr/bin/sudo"])
    
    # Volume mounts - lxcfs (fake proc/sys)
    cmd.extend(["-v", "/var/lib/lxcfs/proc/cpuinfo:/proc/cpuinfo:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/meminfo:/proc/meminfo:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/stat:/proc/stat:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/uptime:/proc/uptime:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/loadavg:/proc/loadavg:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/diskstats:/proc/diskstats:ro"])
    cmd.extend(["-v", "/var/lib/lxcfs/proc/swaps:/proc/swaps:ro"])
    
    # Volume mounts - CPU topology
    cmd.extend(["-v", f"/tmp/container-{display_number}-cpu:/sys/devices/system/cpu:ro"])
    
    # Labels for LaaS management
    cmd.extend(["--label", f"laas.session_id={session_id}"])
    cmd.extend(["--label", f"laas.user_id={user_email}"])
    cmd.extend(["--label", f"laas.tier={tier_slug}"])
    cmd.extend(["--label", f"laas.session_type={storage_type}"])
    cmd.extend(["--label", f"laas.node={node_hostname}"])
    cmd.extend(["--label", f"laas.display={display_number}"])
    cmd.extend(["--label", f"laas.nginx_port={nginx_port}"])
    
    # Image
    cmd.append(SELKIES_IMAGE)
    
    return cmd


# ─────────────────────────────────────────────────────────────────────────────
# Session Launch Background Worker
# ─────────────────────────────────────────────────────────────────────────────
def launch_session_worker(
    container_name: str,
    session_id: str,
    user_email: str,
    tier_slug: str,
    vcpu: int,
    memory_mb: int,
    vram_mb: int,
    hami_sm_percent: int,
    storage_type: str,
    storage_uid: Optional[str],
    node_hostname: str,
    storage_transport: Optional[str] = None,
    storage_node_ip: Optional[str] = None,
    nvme_port: int = 4420,
    nvme_subsystem: Optional[str] = None,
    storage_backend: Optional[str] = None,
) -> None:
    """Background worker thread to handle the multi-step session launch."""
    
    nginx_port: Optional[int] = None
    display_number: Optional[int] = None
    cpuset: Optional[str] = None
    password: str = ""
    mount_path: Optional[str] = None
    
    try:
        # Step 1: Scheduling - validate params
        emit_event(container_name, "scheduling", "Validating launch parameters...")
        time.sleep(0.1)  # Small delay for event visibility
        
        # Validate required params
        if not session_id or not UUID_PATTERN.match(session_id):
            fail_session(container_name, "scheduling", "Invalid session_id format")
            return
        
        if tier_slug not in TIER_SLUGS:
            fail_session(container_name, "scheduling", f"Invalid tier_slug: {tier_slug}")
            return
        
        if vcpu < 1 or vcpu > 14:
            fail_session(container_name, "scheduling", f"Invalid vcpu: {vcpu} (must be 1-14)")
            return
        
        if memory_mb < 512 or memory_mb > 65536:
            fail_session(container_name, "scheduling", f"Invalid memory_mb: {memory_mb}")
            return
        
        if vram_mb < 512 or vram_mb > 24576:
            fail_session(container_name, "scheduling", f"Invalid vram_mb: {vram_mb}")
            return
        
        if hami_sm_percent < 1 or hami_sm_percent > 100:
            fail_session(container_name, "scheduling", f"Invalid hami_sm_percent: {hami_sm_percent}")
            return
        
        complete_event(container_name, "scheduling", "Parameters validated successfully")
        
        # Acquire resource lock for allocation steps
        lock_fd = None
        try:
            lock_fd = open(RESOURCE_LOCK_PATH, "w")
            fcntl.flock(lock_fd, fcntl.LOCK_EX)
            
            # Step 2: Allocate ports
            emit_event(container_name, "allocating_ports", "Finding available port triplet...")
            nginx_port = allocate_port()
            if nginx_port is None:
                fail_session(container_name, "allocating_ports", "No available ports in range 8100-8199")
                return
            display_number = allocate_display()
            if display_number is None:
                fail_session(container_name, "allocating_ports", "No available displays in range 20-99")
                return
            complete_event(
                container_name, "allocating_ports",
                f"Allocated ports: nginx={nginx_port}, selkies={nginx_port + SELKIES_PORT_OFFSET}, "
                f"metrics={nginx_port + METRICS_PORT_OFFSET}, display=:{display_number}"
            )
            
            # Step 3: Allocate CPU cores
            emit_event(container_name, "allocating_cpus", f"Finding {vcpu} contiguous CPU cores...")
            cpuset = allocate_cores(vcpu)
            if cpuset is None:
                fail_session(container_name, "allocating_cpus", f"No contiguous block of {vcpu} cores available")
                return
            complete_event(container_name, "allocating_cpus", f"Allocated CPU cores: {cpuset}")
            
        finally:
            if lock_fd:
                fcntl.flock(lock_fd, fcntl.LOCK_UN)
                lock_fd.close()
        
        # Step 4: Validate/setup storage based on transport
        if storage_type == "stateful":
            if not storage_uid or not STORAGE_UID_PATTERN.match(storage_uid):
                fail_session(container_name, "validating_mount", f"Invalid storage_uid format: {storage_uid}")
                return
            
            if storage_transport == "nvmeof_tcp":
                # Cross-node NVMe-oF storage setup
                emit_event(container_name, "validating_mount", f"Setting up NVMe-oF storage for {storage_uid}...")
                if not storage_node_ip or not nvme_subsystem:
                    fail_session(container_name, "validating_mount",
                                 "nvmeof_tcp requires storage_node_ip and nvme_subsystem")
                    return
                try:
                    mount_path = setup_nvmeof_storage(
                        container_name=container_name,
                        storage_uid=storage_uid,
                        storage_node_ip=storage_node_ip,
                        nvme_port=nvme_port,
                        nvme_subsystem=nvme_subsystem,
                    )
                    complete_event(container_name, "validating_mount",
                                   f"NVMe-oF storage ready at {mount_path}")
                except NvmeError:
                    # setup_nvmeof_storage already called fail_session + rollback
                    return
                except Exception as e:
                    fail_session(container_name, "validating_mount",
                                 f"NVMe-oF setup unexpected error: {e}")
                    return
            
            elif storage_transport == "local_zfs":
                # Same-node ZFS storage verification (dataset or zvol)
                backend_label = "zvol" if storage_backend == "zfs_zvol" else "dataset"
                emit_event(container_name, "validating_mount", f"Verifying local ZFS {backend_label} for {storage_uid}...")
                try:
                    mount_path = verify_local_zfs(storage_uid, storage_backend or 'zfs_dataset')
                    complete_event(container_name, "validating_mount",
                                   f"Local ZFS {backend_label} verified: {mount_path}")
                except Exception as e:
                    fail_session(container_name, "validating_mount", f"Local ZFS verification failed: {e}")
                    return
            
            else:
                # Legacy NFS fallback
                emit_event(container_name, "validating_mount", f"Verifying NFS mount for {storage_uid}...")
                mount_path = f"{NFS_MOUNT_ROOT}/{storage_uid}"
                if not os.path.exists(mount_path):
                    fail_session(container_name, "validating_mount", f"NFS mount not found: {mount_path}")
                    return
                if not os.path.isdir(mount_path):
                    fail_session(container_name, "validating_mount", f"Mount path is not a directory: {mount_path}")
                    return
                # Check if writable
                test_file = os.path.join(mount_path, f".laas-write-test-{session_id[:8]}")
                try:
                    with open(test_file, "w") as f:
                        f.write("test")
                    os.remove(test_file)
                except (IOError, OSError) as e:
                    fail_session(container_name, "validating_mount", f"Mount not writable: {e}")
                    return
                complete_event(container_name, "validating_mount", f"NFS mount validated: {mount_path}")
            
            # Store session metadata for cleanup
            store_session_metadata(container_name, storage_transport, storage_uid, nvme_subsystem, storage_backend)
        else:
            emit_event(container_name, "validating_mount", "Ephemeral session - skipping mount validation")
            complete_event(container_name, "validating_mount", "Ephemeral session - no persistent storage")
            # Store metadata even for ephemeral (for consistent cleanup)
            store_session_metadata(container_name, storage_transport, storage_uid, nvme_subsystem, storage_backend)
        
        # Generate password
        password = generate_password(16)
        hostname = generate_hostname()
        
        # Step 5: Create container
        emit_event(container_name, "creating", "Building Docker command and creating container...")
        
        # Ensure vgpulock directory exists
        vgpulock_dir = f"/tmp/vgpulock-{display_number}"
        ok, err = _run_cmd(["mkdir", "-p", vgpulock_dir])
        if not ok:
            fail_session(container_name, "creating", f"Failed to create vgpulock dir: {err}")
            return
        
        # Ensure container CPU directory exists for lxcfs
        cpu_dir = f"/tmp/container-{display_number}-cpu"
        if not os.path.exists(cpu_dir):
            ok, err = _run_cmd(["mkdir", "-p", cpu_dir])
            if not ok:
                fail_session(container_name, "creating", f"Failed to create CPU topology dir: {err}")
                return
        
        docker_cmd = build_docker_command(
            container_name=container_name,
            hostname=hostname,
            vcpu=vcpu,
            cpuset=cpuset,
            memory_mb=memory_mb,
            vram_mb=vram_mb,
            hami_sm_percent=hami_sm_percent,
            display_number=display_number,
            nginx_port=nginx_port,
            password=password,
            storage_type=storage_type,
            storage_uid=storage_uid,
            session_id=session_id,
            user_email=user_email,
            tier_slug=tier_slug,
            node_hostname=node_hostname,
            storage_transport=storage_transport,
            mount_path=mount_path,
        )
        
        ok, out = _run_cmd(docker_cmd, timeout=60)
        if not ok:
            fail_session(container_name, "creating", f"docker create failed: {out}")
            return
        
        complete_event(container_name, "creating", f"Container created: {container_name}")
        
        # Step 6: Start container
        emit_event(container_name, "starting", "Starting container...")
        ok, out = _run_cmd(["docker", "start", container_name], timeout=30)
        if not ok:
            fail_session(container_name, "starting", f"docker start failed: {out}")
            # Cleanup: remove the created container
            _run_cmd(["docker", "rm", "-f", container_name], timeout=10)
            return
        
        complete_event(container_name, "starting", "Container started successfully")
        
        # Step 7: Wait for desktop to be ready (poll nginx port)
        emit_event(container_name, "waiting_desktop", f"Waiting for desktop to initialize on port {nginx_port}...")
        
        desktop_ready = False
        max_wait = 120  # seconds - KDE Plasma + GPU driver initialization needs 70-120s
        poll_interval = 2  # seconds
        waited = 0
        
        while waited < max_wait:
            # Check if container is still running
            ok, state = _run_cmd([
                "docker", "inspect", "--format={{.State.Status}}", container_name
            ], timeout=5)
            if not ok or state.strip() != "running":
                fail_session(container_name, "waiting_desktop", f"Container exited unexpectedly: {state}")
                return
            
            # Try to connect to nginx port
            ok, http_code = _run_cmd([
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                "--connect-timeout", "2",
                f"http://127.0.0.1:{nginx_port}/"
            ], timeout=5)
            http_code = http_code.strip()
            # Any HTTP response (even 401 from basic auth) means nginx is alive
            if ok and http_code and http_code != "000":
                desktop_ready = True
                emit_event(container_name, "waiting_desktop", 
                           f"Desktop responding on port {nginx_port} (HTTP {http_code})", "completed")
                break
            
            # Log progress every ~10 seconds (every 5th poll iteration)
            if waited > 0 and waited % 10 == 0:
                logger.info(f"Desktop readiness check: {waited}s elapsed, still waiting for port {nginx_port}...")
            
            time.sleep(poll_interval)
            waited += poll_interval
        
        if not desktop_ready:
            fail_session(container_name, "waiting_desktop", f"Desktop did not respond on port {nginx_port} within {max_wait}s")
            return
        
        complete_event(container_name, "waiting_desktop", f"Desktop responding on port {nginx_port}")
        
        # Step 8: Health check - verify WebRTC stream is accessible
        emit_event(container_name, "health_checking", "Verifying WebRTC stream accessibility...")
        
        # Give it a bit more time for WebRTC to initialize
        time.sleep(2)
        
        # Check that the nginx endpoint returns a valid response
        ok, response = _run_cmd([
            "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "--connect-timeout", "5",
            f"http://127.0.0.1:{nginx_port}/"
        ], timeout=10)
        
        if not ok:
            # Non-fatal warning - container may still be starting WebRTC
            emit_event(container_name, "health_checking", "WebRTC health check inconclusive, proceeding...", "completed")
        else:
            complete_event(container_name, "health_checking", "WebRTC stream health check passed")
        
        # Step 9: Mark as ready
        emit_event(container_name, "ready", "Session is live and ready for connection")
        
        connection_info = {
            "nginxPort": nginx_port,
            "selkiesPort": nginx_port + SELKIES_PORT_OFFSET,
            "metricsPort": nginx_port + METRICS_PORT_OFFSET,
            "displayNumber": display_number,
            "password": password,
            "username": "ubuntu",
            "sessionUrl": f"http://{HOST_IP}:{nginx_port}/",
            "cpuset": cpuset,
            "hostname": hostname,
        }
        
        set_session_ready(container_name, connection_info)
        complete_event(container_name, "ready", "Session ready for connection")
        
    except Exception as e:
        fail_session(container_name, "unknown", f"Unexpected error: {str(e)}")
        # Try to cleanup if container was created
        if container_name:
            _run_cmd(["docker", "rm", "-f", container_name], timeout=10)
        # Cleanup NVMe-oF storage if it was set up
        if storage_transport == "nvmeof_tcp" and storage_uid and nvme_subsystem:
            cleanup_nvmeof_storage(storage_uid, nvme_subsystem)
        # Cleanup local zvol mount if it was set up
        # NOTE: /datapool/users/{uid} is provision-managed, do NOT unmount it here
        if storage_transport == "local_zfs" and storage_backend == "zfs_zvol" and storage_uid:
            zvol_mount = f"/datapool/users/{storage_uid}"
            logger.info(f"[CLEANUP-ERR] Local zvol at {zvol_mount} is provision-managed, skipping unmount")


# ─────────────────────────────────────────────────────────────────────────────
# Input Validation
# ─────────────────────────────────────────────────────────────────────────────
def validate_launch_request(data: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate the launch request body. Returns (is_valid, error_message)."""
    required_fields = [
        "session_id", "user_id", "user_email", "tier_slug",
        "vcpu", "memory_mb", "vram_mb", "hami_sm_percent",
        "storage_type", "node_hostname"
    ]
    
    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"
    
    session_id = data.get("session_id", "")
    if not UUID_PATTERN.match(session_id):
        return False, f"Invalid session_id format: {session_id}"
    
    user_id = data.get("user_id", "")
    if not UUID_PATTERN.match(user_id):
        return False, f"Invalid user_id format: {user_id}"
    
    user_email = data.get("user_email", "")
    if not user_email or "@" not in user_email:
        return False, f"Invalid user_email: {user_email}"
    
    tier_slug = data.get("tier_slug", "")
    if tier_slug not in TIER_SLUGS:
        return False, f"Invalid tier_slug: {tier_slug}"
    
    storage_type = data.get("storage_type", "")
    if storage_type not in ("stateful", "ephemeral"):
        return False, f"Invalid storage_type: {storage_type}"
    
    if storage_type == "stateful":
        storage_uid = data.get("storage_uid", "")
        if not storage_uid or not STORAGE_UID_PATTERN.match(storage_uid):
            return False, f"Invalid storage_uid for stateful session: {storage_uid}"
    
    vcpu = data.get("vcpu", 0)
    if not isinstance(vcpu, int) or vcpu < 1 or vcpu > 14:
        return False, f"Invalid vcpu: {vcpu} (must be integer 1-14)"
    
    memory_mb = data.get("memory_mb", 0)
    if not isinstance(memory_mb, int) or memory_mb < 512:
        return False, f"Invalid memory_mb: {memory_mb}"
    
    vram_mb = data.get("vram_mb", 0)
    if not isinstance(vram_mb, int) or vram_mb < 512:
        return False, f"Invalid vram_mb: {vram_mb}"
    
    hami_sm_percent = data.get("hami_sm_percent", 0)
    if not isinstance(hami_sm_percent, int) or hami_sm_percent < 1 or hami_sm_percent > 100:
        return False, f"Invalid hami_sm_percent: {hami_sm_percent}"
    
    # Validate storage_transport if provided
    storage_transport = data.get("storage_transport")
    if storage_transport is not None and storage_transport not in ("local_zfs", "nvmeof_tcp"):
        return False, f"Invalid storage_transport: {storage_transport} (must be 'local_zfs', 'nvmeof_tcp', or null)"
    
    if storage_transport == "nvmeof_tcp":
        if not data.get("storage_node_ip"):
            return False, "storage_node_ip is required when storage_transport is 'nvmeof_tcp'"
        if not data.get("nvme_subsystem"):
            return False, "nvme_subsystem is required when storage_transport is 'nvmeof_tcp'"
    
    # Validate storage_backend if provided
    storage_backend = data.get("storage_backend")
    if storage_backend is not None and storage_backend not in ("zfs_dataset", "zfs_zvol"):
        return False, f"Invalid storage_backend: {storage_backend} (must be 'zfs_dataset', 'zfs_zvol', or null)"
    
    # storage_backend only applies to local_zfs transport
    if storage_backend and storage_transport != "local_zfs":
        return False, f"storage_backend '{storage_backend}' only applies when storage_transport is 'local_zfs'"
    
    return True, ""


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint.
    Returns JSON status of: Docker daemon, NVIDIA GPU, Selkies image, CUDA MPS daemon.
    """
    checks = {}
    all_ok = True
    
    docker_ok, docker_msg = check_docker_alive()
    checks["docker"] = {"ok": docker_ok, "message": docker_msg}
    if not docker_ok:
        all_ok = False
    
    gpu_ok, gpu_msg = check_nvidia_gpu()
    checks["gpu"] = {"ok": gpu_ok, "message": gpu_msg}
    if not gpu_ok:
        all_ok = False
    
    image_ok, image_msg = check_selkies_image()
    checks["selkies_image"] = {"ok": image_ok, "message": image_msg}
    if not image_ok:
        all_ok = False
    
    mps_ok, mps_msg = check_mps_daemon()
    checks["mps"] = {"ok": mps_ok, "message": mps_msg}
    if not mps_ok:
        all_ok = False
    
    status_code = 200 if all_ok else 503
    return jsonify({
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
        "ts": now_iso(),
    }), status_code


@app.route("/sessions/launch", methods=["POST"])
def launch_session():
    """
    Launch a new GPU desktop session (async).
    Returns immediately with container name and launch ID.
    Spawns a background thread to handle the multi-step launch.
    
    Requires X-Session-Secret header.
    
    Request body:
    {
        "session_id": "uuid",
        "user_id": "uuid",
        "user_email": "user@example.com",
        "tier_slug": "blaze",
        "vcpu": 4,
        "memory_mb": 8192,
        "vram_mb": 4096,
        "hami_sm_percent": 17,
        "storage_type": "stateful" | "ephemeral",
        "storage_uid": "u_abc123..." (required if stateful),
        "node_hostname": "laas-node-01",
        "storage_transport": "local_zfs" | "nvmeof_tcp" | null (optional, null=NFS fallback),
        "storage_node_ip": "10.10.100.99" (required if nvmeof_tcp),
        "nvme_port": 4420 (optional, default 4420),
        "nvme_subsystem": "laas-u_abc123" (required if nvmeof_tcp),
        "storage_backend": "zfs_dataset" | "zfs_zvol" | null (optional, only for local_zfs, default zfs_dataset)
    }
    """
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    client_ip = request.remote_addr or ""
    
    # Auth
    if not SESSION_SECRET:
        return jsonify(error="Session orchestration service misconfigured (no SESSION_SECRET)"), 500
    
    secret = request.headers.get("X-Session-Secret")
    if secret != SESSION_SECRET:
        return jsonify(error="Unauthorized"), 401
    
    # Parse body
    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify(error="Invalid JSON body"), 400
    
    # Validate request
    is_valid, error_msg = validate_launch_request(data)
    if not is_valid:
        log_event(request_id, client_ip, "", "launch_failed", data.get("session_id", ""), error_msg)
        return jsonify(error=error_msg), 400
    
    # Extract params
    session_id = data["session_id"]
    user_id = data["user_id"]
    user_email = data["user_email"]
    tier_slug = data["tier_slug"]
    vcpu = data["vcpu"]
    memory_mb = data["memory_mb"]
    vram_mb = data["vram_mb"]
    hami_sm_percent = data["hami_sm_percent"]
    storage_type = data["storage_type"]
    storage_uid = data.get("storage_uid")
    node_hostname = data["node_hostname"]
    
    # New multi-node storage params (optional, backward-compatible)
    storage_transport = data.get("storage_transport")  # "local_zfs" | "nvmeof_tcp" | null
    storage_node_ip = data.get("storage_node_ip")      # 10GbE IP for nvmeof_tcp
    nvme_port = data.get("nvme_port", 4420)             # NVMe-oF port
    nvme_subsystem = data.get("nvme_subsystem")         # e.g., "laas-u_abc123"
    storage_backend = data.get("storage_backend")       # "zfs_dataset" | "zfs_zvol" | null
    
    # Generate container name
    container_name = f"laas-{session_id[:8]}"
    
    # Check if container already exists
    ok, _ = _run_cmd(["docker", "inspect", container_name], timeout=5)
    if ok:
        log_event(request_id, client_ip, container_name, "launch_failed", session_id, "Container already exists")
        return jsonify(error=f"Container {container_name} already exists"), 409
    
    # Initialize event tracking
    init_session_events(container_name)
    launch_id = get_session_events(container_name)["launchId"]
    
    log_event(request_id, client_ip, container_name, "launch_started", session_id)
    
    # Spawn background thread
    thread = threading.Thread(
        target=launch_session_worker,
        args=(
            container_name, session_id, user_email, tier_slug,
            vcpu, memory_mb, vram_mb, hami_sm_percent,
            storage_type, storage_uid, node_hostname,
            storage_transport, storage_node_ip, nvme_port, nvme_subsystem, storage_backend,
        ),
        daemon=True
    )
    thread.start()
    
    return jsonify({
        "containerName": container_name,
        "launchId": launch_id,
        "sessionId": session_id,
    }), 202


@app.route("/sessions/<name>/events", methods=["GET"])
def get_events(name: str):
    """
    Get the event list for a session launch.
    
    Response:
    {
        "events": [...],
        "currentStep": "starting",
        "overallStatus": "launching" | "ready" | "failed",
        "connectionInfo": { ... } or null
    }
    """
    # Optional auth (allow polling without secret for debugging)
    # If SESSION_SECRET is set, require it
    if SESSION_SECRET:
        secret = request.headers.get("X-Session-Secret")
        if secret != SESSION_SECRET:
            return jsonify(error="Unauthorized"), 401
    
    events_data = get_session_events(name)
    if events_data is None:
        return jsonify(error=f"Session {name} not found"), 404
    
    return jsonify({
        "events": events_data["events"],
        "currentStep": events_data["currentStep"],
        "overallStatus": events_data["overallStatus"],
        "connectionInfo": events_data["connectionInfo"],
        "launchId": events_data["launchId"],
    }), 200


@app.route("/sessions/<name>/status", methods=["GET"])
def get_status(name: str):
    """
    Get the Docker container status for a session.
    
    Response:
    {
        "containerName": "laas-abc12345",
        "status": "running" | "exited" | "created" | etc.,
        "running": true/false
    }
    """
    if SESSION_SECRET:
        secret = request.headers.get("X-Session-Secret")
        if secret != SESSION_SECRET:
            return jsonify(error="Unauthorized"), 401
    
    ok, status = _run_cmd([
        "docker", "inspect", "--format={{.State.Status}}", name
    ], timeout=5)
    
    if not ok:
        return jsonify(error=f"Container {name} not found"), 404
    
    status = status.strip()
    return jsonify({
        "containerName": name,
        "status": status,
        "running": status == "running",
    }), 200


@app.route("/sessions/<name>/stop", methods=["POST"])
def stop_session(name: str):
    """
    Stop and remove a session container.
    Uses 30-second graceful timeout.
    
    Requires X-Session-Secret header.
    """
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    client_ip = request.remote_addr or ""
    
    if not SESSION_SECRET:
        return jsonify(error="Session orchestration service misconfigured (no SESSION_SECRET)"), 500
    
    secret = request.headers.get("X-Session-Secret")
    if secret != SESSION_SECRET:
        return jsonify(error="Unauthorized"), 401
    
    # Check if container exists
    ok, _ = _run_cmd(["docker", "inspect", name], timeout=5)
    if not ok:
        log_event(request_id, client_ip, name, "stop_skipped", "", "Container not found")
        return jsonify(ok=True, message="Container not found (already stopped)"), 200
    
    # Stop container with 30s timeout
    log_event(request_id, client_ip, name, "stop_started")
    
    errors: List[str] = []
    
    # Step 1: Docker stop (graceful 30s timeout)
    logger.info(f"[CLEANUP-1] Stopping container {name}...")
    ok, out = _run_cmd(["docker", "stop", "-t", "30", name], timeout=45)
    if not ok:
        # Try docker kill as fallback
        logger.warning(f"[CLEANUP-DOCKER] docker stop {name} failed, trying kill: {out}")
        ok2, out2 = _run_cmd(["docker", "kill", name], timeout=15)
        if not ok2:
            errors.append(f"docker stop: {out}")
            log_event(request_id, client_ip, name, "stop_failed", "", out)
            return jsonify(error=f"Failed to stop container: {out}"), 500

    # Step 2: Docker remove (best effort - don't block cleanup)
    logger.info(f"[CLEANUP-2] Removing container {name}...")
    ok, out = _run_cmd(["docker", "rm", name], timeout=15)
    if not ok:
        errors.append(f"docker rm failed: {out}")
        logger.warning(f"[CLEANUP-DOCKER] docker rm {name} failed: {out}")

    # Always proceed to storage cleanup regardless of docker rm result
    
    # Step 3: NVMe-oF storage cleanup (if applicable)
    meta = pop_session_metadata(name)
    storage_transport = meta.get("storage_transport")
    storage_uid = meta.get("storage_uid")
    nvme_subsystem = meta.get("nvme_subsystem")
    storage_backend = meta.get("storage_backend")
    
    if storage_transport == "nvmeof_tcp" and storage_uid and nvme_subsystem:
        logger.info(f"[CLEANUP-3] Cleaning up NVMe-oF storage for {name}...")
        nvme_errors = cleanup_nvmeof_storage(storage_uid, nvme_subsystem)
        if nvme_errors:
            errors.extend(nvme_errors)
            logger.warning(f"[CLEANUP-WARN] NVMe-oF cleanup had errors: {nvme_errors}")
        else:
            logger.info(f"[CLEANUP-3] NVMe-oF storage cleanup complete for {name}")
    
    # Step 4: Local zvol cleanup (if applicable)
    # NOTE: /datapool/users/{uid} is provision-managed, do NOT unmount it here
    if storage_transport == "local_zfs" and storage_backend == "zfs_zvol" and storage_uid:
        zvol_mount = f"/datapool/users/{storage_uid}"
        logger.info(f"[CLEANUP-ZVOL] Local zvol at {zvol_mount} is provision-managed, skipping unmount")
    
    # Clean up event tracking
    with session_events_lock:
        session_events.pop(name, None)
    
    if errors:
        logger.warning(f"[CLEANUP-WARN] Session {name} stopped with errors: {errors}")
    else:
        logger.info(f"[CLEANUP-OK] Clean shutdown complete for {name}")
    
    log_event(request_id, client_ip, name, "stop_success")
    return jsonify(ok=True, message=f"Container {name} stopped and removed"), 200


@app.route("/sessions/<name>/restart", methods=["POST"])
def restart_session(name: str):
    """
    Restart a session container.
    
    Requires X-Session-Secret header.
    """
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    client_ip = request.remote_addr or ""
    
    if not SESSION_SECRET:
        return jsonify(error="Session orchestration service misconfigured (no SESSION_SECRET)"), 500
    
    secret = request.headers.get("X-Session-Secret")
    if secret != SESSION_SECRET:
        return jsonify(error="Unauthorized"), 401
    
    # Check if container exists
    ok, _ = _run_cmd(["docker", "inspect", name], timeout=5)
    if not ok:
        return jsonify(error=f"Container {name} not found"), 404
    
    log_event(request_id, client_ip, name, "restart_started")
    ok, out = _run_cmd(["docker", "restart", name], timeout=60)
    if not ok:
        log_event(request_id, client_ip, name, "restart_failed", "", out)
        return jsonify(error=f"docker restart failed: {out}"), 500
    
    log_event(request_id, client_ip, name, "restart_success")
    return jsonify(ok=True, message=f"Container {name} restarted"), 200


@app.route("/sessions/<name>/logs", methods=["GET"])
def get_logs(name: str):
    """
    Get the last 100 lines of container logs.
    
    Optional query params:
    - tail: number of lines (default 100)
    - since: time filter (e.g., "5m", "1h")
    
    Requires X-Session-Secret header.
    """
    if SESSION_SECRET:
        secret = request.headers.get("X-Session-Secret")
        if secret != SESSION_SECRET:
            return jsonify(error="Unauthorized"), 401
    
    # Check if container exists
    ok, _ = _run_cmd(["docker", "inspect", name], timeout=5)
    if not ok:
        return jsonify(error=f"Container {name} not found"), 404
    
    tail = request.args.get("tail", "100")
    try:
        tail_int = int(tail)
        if tail_int < 1 or tail_int > 10000:
            tail_int = 100
    except ValueError:
        tail_int = 100
    
    cmd = ["docker", "logs", "--tail", str(tail_int), name]
    
    since = request.args.get("since")
    if since:
        cmd.extend(["--since", since])
    
    ok, out = _run_cmd(cmd, timeout=15)
    if not ok:
        return jsonify(error=f"Failed to get logs: {out}"), 500
    
    return jsonify({
        "containerName": name,
        "logs": out,
        "tail": tail_int,
    }), 200


@app.route("/sessions", methods=["GET"])
def list_sessions():
    """
    List all active LaaS session containers.
    
    Response:
    [
        {
            "containerName": "laas-abc12345",
            "sessionId": "...",
            "userId": "...",
            "tier": "blaze",
            "status": "running",
            "createdAt": "..."
        },
        ...
    ]
    """
    if SESSION_SECRET:
        secret = request.headers.get("X-Session-Secret")
        if secret != SESSION_SECRET:
            return jsonify(error="Unauthorized"), 401
    
    ok, out = _run_cmd([
        "docker", "ps", "-a",
        "--filter", "label=laas.session_id",
        "--format", "{{.Names}}\t{{.ID}}\t{{.Status}}\t{{.CreatedAt}}"
    ], timeout=10)
    
    if not ok:
        return jsonify(error=f"Failed to list containers: {out}"), 500
    
    sessions = []
    if out.strip():
        for line in out.strip().split("\n"):
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            name, cid, status, created_at = parts[0], parts[1], parts[2], parts[3]
            
            # Get labels
            ok_labels, labels_out = _run_cmd([
                "docker", "inspect", "--format",
                '{{index .Config.Labels "laas.session_id"}}|||'
                '{{index .Config.Labels "laas.user_id"}}|||'
                '{{index .Config.Labels "laas.tier"}}|||'
                '{{index .Config.Labels "laas.session_type"}}|||'
                '{{index .Config.Labels "laas.node"}}',
                cid
            ], timeout=5)
            
            session_id, user_id, tier, session_type, node = "", "", "", "", ""
            if ok_labels:
                label_parts = labels_out.split("|||")
                if len(label_parts) >= 5:
                    session_id = label_parts[0]
                    user_id = label_parts[1]
                    tier = label_parts[2]
                    session_type = label_parts[3]
                    node = label_parts[4]
            
            sessions.append({
                "containerName": name,
                "containerId": cid,
                "sessionId": session_id,
                "userId": user_id,
                "tier": tier,
                "sessionType": session_type,
                "node": node,
                "status": status,
                "createdAt": created_at,
            })
    
    return jsonify(sessions), 200


@app.route("/resources", methods=["GET"])
def get_resources():
    """
    Get current resource allocation status.
    
    Response:
    {
        "cpuCores": { "total": 14, "used": 8, "available": 6, "usedCores": [2,3,4,5,8,9,10,11] },
        "ports": { "range": "8100-8199", "used": 3, "usedPorts": [8100, 8101, 8103] },
        "displays": { "range": "20-99", "used": 3, "usedDisplays": [20, 21, 23] },
        "containers": 3
    }
    """
    if SESSION_SECRET:
        secret = request.headers.get("X-Session-Secret")
        if secret != SESSION_SECRET:
            return jsonify(error="Unauthorized"), 401
    
    used_cores = get_used_cores()
    used_ports = get_used_ports()
    used_displays = get_used_displays()
    
    return jsonify({
        "cpuCores": {
            "total": len(ALLOCATABLE_CORES),
            "used": len(used_cores),
            "available": len(ALLOCATABLE_CORES) - len(used_cores),
            "usedCores": sorted(list(used_cores)),
        },
        "ports": {
            "range": f"{NGINX_PORT_MIN}-{NGINX_PORT_MAX}",
            "used": len(used_ports),
            "usedPorts": sorted(list(used_ports)),
        },
        "displays": {
            "range": f"{DISPLAY_MIN}-{DISPLAY_MAX}",
            "used": len(used_displays),
            "usedDisplays": sorted(list(used_displays)),
        },
        "activeContainers": len(get_laas_containers()),
        "ts": now_iso(),
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not SESSION_SECRET:
        print("WARNING: SESSION_SECRET is not set; service will return 500 on protected endpoints.", file=sys.stderr)
    
    port = int(os.environ.get("PORT", "9998"))
    print(f"Starting LaaS Session Orchestration Service on port {port}...", file=sys.stderr)
    print(f"Host IP: {HOST_IP}", file=sys.stderr)
    print(f"NFS Mount Root: {NFS_MOUNT_ROOT}", file=sys.stderr)
    print(f"Selkies Image: {SELKIES_IMAGE}", file=sys.stderr)
    
    app.run(host="0.0.0.0", port=port, threaded=True)
        