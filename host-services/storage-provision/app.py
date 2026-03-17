#!/usr/bin/env python3
"""
LaaS storage provision HTTP service. Run on the host (ZFS/NFS node).
Expects PROVISION_SECRET in env; validates X-Provision-Secret on every POST /provision.
Calls provision-user-storage.sh (via sudo) for ZFS create; returns structured errors and logs.
"""
import json
import logging
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from typing import Optional

from flask import Flask, request, jsonify

app = Flask(__name__)
log = logging.getLogger("werkzeug")
log.setLevel(logging.WARNING)

PROVISION_SECRET = os.environ.get("PROVISION_SECRET")
SCRIPT_PATH = os.environ.get("PROVISION_SCRIPT_PATH", "/usr/local/bin/provision-user-storage.sh")
STORAGE_UID_PATTERN = re.compile(r"^u_[0-9a-f]{24}$")
QUOTA_GB_MIN, QUOTA_GB_MAX = 1, 50
REQUIRED_QUOTA_GB = 5

# Optional NFS automount (single-host POC).
# When ENABLE_NFS_AUTOMOUNT=true, the service will:
# - Ensure an NFS export for /datapool/users/<storage_uid> on this host
# - Ensure a mount at /mnt/nfs/users/<storage_uid> (or NFS_MOUNT_ROOT/<storage_uid>)
# - Ensure a matching /etc/fstab entry
NFS_AUTOMOUNT_ENABLED = os.environ.get("ENABLE_NFS_AUTOMOUNT", "false").lower() == "true"
NFS_EXPORT_CLIENT = os.environ.get("NFS_EXPORT_CLIENT", "127.0.0.1")
NFS_MOUNT_ROOT = os.environ.get("NFS_MOUNT_ROOT", "/mnt/nfs/users")
EXPORTS_PATH = "/etc/exports"
FSTAB_PATH = "/etc/fstab"


def log_event(request_id: str, client_ip: str, storage_uid: str, outcome: str, error: Optional[str] = None):
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
        "client_ip": client_ip,
        "storage_uid": storage_uid,
        "outcome": outcome,
    }
    if error:
        payload["error"] = error[:500]
    print(json.dumps(payload), flush=True)


def _run_cmd(cmd: list[str], timeout: int = 10) -> tuple[bool, str]:
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
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
        return False, str(e)


def pre_check_zfs_ready() -> Optional[str]:
    """Verify pool and parent dataset exist. Returns None if ready, else error message."""
    ok, _ = _run_cmd(["zpool", "list", "-H", "datapool"])
    if not ok:
        return "ZFS pool datapool not available"
    ok, _ = _run_cmd(["zfs", "list", "-H", "datapool/users"])
    if not ok:
        return "ZFS dataset datapool/users not available"
    return None


def _ensure_exports_line(storage_uid: str) -> Optional[str]:
    """Ensure /etc/exports has an export line for this subdataset (idempotent)."""
    export_line = f"/datapool/users/{storage_uid}  {NFS_EXPORT_CLIENT}(rw,sync,no_subtree_check,no_root_squash)"
    grep_pattern = f"^/datapool/users/{storage_uid} "
    ok, _ = _run_cmd(
        [
            "sudo",
            "bash",
            "-lc",
            f"grep -q '{grep_pattern}' {EXPORTS_PATH} 2>/dev/null || echo '{export_line}' >> {EXPORTS_PATH}",
        ]
    )
    if not ok:
        return f"Failed to update {EXPORTS_PATH} for {storage_uid}"

    ok, _ = _run_cmd(["sudo", "exportfs", "-ra"])
    if not ok:
        return "Failed to reload NFS exports (exportfs -ra)"
    return None


def _ensure_mount(storage_uid: str) -> Optional[str]:
    """Ensure mountpoint exists and NFS subdataset is mounted (idempotent)."""
    mountpoint = os.path.join(NFS_MOUNT_ROOT, storage_uid)
    ok, err = _run_cmd(["sudo", "mkdir", "-p", mountpoint])
    if not ok:
        return f"Failed to create mountpoint {mountpoint}: {err}"

    ok, mounts_out = _run_cmd(["mount"])
    if not ok:
        return f"Failed to read current mounts: {mounts_out}"
    if f" {mountpoint} " not in f" {mounts_out} ":
        # Not mounted yet; mount it
        source = f"{NFS_EXPORT_CLIENT}:/datapool/users/{storage_uid}"
        ok, out = _run_cmd(["sudo", "mount", "-t", "nfs4", source, mountpoint], timeout=20)
        if not ok:
            return f"Failed to mount {source} on {mountpoint}: {out}"
    return None


def _ensure_fstab_line(storage_uid: str) -> Optional[str]:
    """Ensure /etc/fstab has an entry for this NFS mount (idempotent)."""
    mountpoint = os.path.join(NFS_MOUNT_ROOT, storage_uid)
    source = f"{NFS_EXPORT_CLIENT}:/datapool/users/{storage_uid}"
    fstab_line = f"{source} {mountpoint} nfs4 defaults 0 0"
    grep_pattern = f"{source} {mountpoint} "
    ok, _ = _run_cmd(
        [
            "sudo",
            "bash",
            "-lc",
            f"grep -q '{grep_pattern}' {FSTAB_PATH} 2>/dev/null || echo '{fstab_line}' >> {FSTAB_PATH}",
        ]
    )
    if not ok:
        return f"Failed to update {FSTAB_PATH} for {storage_uid}"
    return None


def reconcile_nfs_for(storage_uid: str) -> Optional[str]:
    """
    Ensure NFS export, mount, and fstab entry exist for this storage_uid.
    Returns None on success, or an error string.
    """
    err = _ensure_exports_line(storage_uid)
    if err:
        return err
    err = _ensure_mount(storage_uid)
    if err:
        return err
    err = _ensure_fstab_line(storage_uid)
    if err:
        return err
    return None


def post_verify_provisioned(storage_uid: str) -> Optional[str]:
    """Verify dataset exists and has 5G quota. Returns None if ok, else error message."""
    dataset = f"datapool/users/{storage_uid}"
    ok, out = _run_cmd(["zfs", "get", "-H", "-o", "value", "quota", dataset])
    if not ok:
        return f"Verification failed: dataset not found or inaccessible"
    out = out.strip()
    # Accept 5G or exact bytes (5 * 1024**3)
    if out != "5G" and out != "5368709120":
        return f"Verification failed: quota mismatch (got {out})"
    return None


def run_provision_script(storage_uid: str) -> tuple[int, str]:
    """Run provision script with sudo; return (exit_code, stderr_or_stdout)."""
    try:
        result = subprocess.run(
            ["sudo", SCRIPT_PATH, storage_uid],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.returncode, (result.stderr or result.stdout or "").strip()
    except FileNotFoundError:
        return -1, f"Script not found: {SCRIPT_PATH}"
    except subprocess.TimeoutExpired:
        return -2, "Script timed out (30s)"
    except Exception as e:
        return -3, str(e)


@app.route("/health", methods=["GET"])
def health():
    """Return 200 if service is up and ZFS pool is available."""
    try:
        subprocess.run(
            ["zpool", "list", "-H", "datapool"],
            capture_output=True,
            timeout=5,
            check=True,
        )
        return "", 200
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return jsonify(error="ZFS pool datapool not available"), 503


@app.route("/provision", methods=["POST"])
def provision():
    request_id = request.headers.get("X-Request-Id", "")
    client_ip = request.remote_addr or ""
    storage_uid = ""

    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    # Parse body
    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify(error="Invalid JSON body"), 400
    storage_uid = data.get("storageUid") or ""
    quota_gb = data.get("quotaGb", REQUIRED_QUOTA_GB)

    # Validate storageUid
    if not STORAGE_UID_PATTERN.match(storage_uid):
        log_event(request_id, client_ip, storage_uid, "failed", "Invalid storageUid format")
        return jsonify(error="Invalid storageUid format"), 400
    if not isinstance(quota_gb, (int, float)) or not (QUOTA_GB_MIN <= quota_gb <= QUOTA_GB_MAX):
        log_event(request_id, client_ip, storage_uid, "failed", "Invalid quotaGb")
        return jsonify(error="Invalid quotaGb"), 400

    # Pre-check: pool and parent dataset exist (no provision if ZFS not ready)
    pre_err = pre_check_zfs_ready()
    if pre_err:
        log_event(request_id, client_ip, storage_uid, "failed", pre_err)
        return jsonify(error=pre_err), 500

    # Run script (script uses 5G; we ignore quota_gb for now to match existing script)
    code, output = run_provision_script(storage_uid)
    if code == 0:
        # Post-check: only report success to backend after verifying dataset and quota
        verify_err = post_verify_provisioned(storage_uid)
        if verify_err:
            log_event(request_id, client_ip, storage_uid, "failed", verify_err)
            return jsonify(error=verify_err), 500

        # Optional: reconcile NFS export, mount, and fstab (single-host POC).
        if NFS_AUTOMOUNT_ENABLED:
            nfs_err = reconcile_nfs_for(storage_uid)
            if nfs_err:
                log_event(request_id, client_ip, storage_uid, "failed", nfs_err)
                return jsonify(error=nfs_err), 500

        log_event(request_id, client_ip, storage_uid, "success")
        return jsonify(ok=True, path=f"/datapool/users/{storage_uid}"), 200
    if code == 1:
        log_event(request_id, client_ip, storage_uid, "failed", output or "Invalid args")
        return jsonify(error=output or "Invalid storageUid"), 400
    if code == 2:
        log_event(request_id, client_ip, storage_uid, "failed", output or "Insufficient space")
        return jsonify(error=output or "Insufficient disk space"), 507
    if code == -1:
        log_event(request_id, client_ip, storage_uid, "failed", output)
        return jsonify(error=output), 500
    if code == -2:
        log_event(request_id, client_ip, storage_uid, "failed", output)
        return jsonify(error=output), 504
    # code 3 or other
    log_event(request_id, client_ip, storage_uid, "failed", output or f"Script exited with code {code}")
    return jsonify(error=output or f"Storage system error (exit {code})"), 500


if __name__ == "__main__":
    if not PROVISION_SECRET:
        print("PROVISION_SECRET is not set; service will return 500 on provision.", file=sys.stderr)
    port = int(os.environ.get("PORT", "9999"))
    app.run(host="0.0.0.0", port=port, threaded=True)
