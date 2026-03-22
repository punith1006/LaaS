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
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Optional

from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename

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


def post_verify_provisioned(storage_uid: str, quota_gb: int) -> Optional[str]:
    """Verify dataset exists and has the expected quota. Returns None if ok, else error message."""
    dataset = f"datapool/users/{storage_uid}"
    ok, out = _run_cmd(["zfs", "get", "-H", "-o", "value", "quota", dataset])
    if not ok:
        return f"Verification failed: dataset not found or inaccessible"
    out = out.strip()
    # Accept XG format or exact bytes (quota_gb * 1024**3)
    expected_gb = f"{quota_gb}G"
    expected_bytes = str(quota_gb * (1024 ** 3))
    if out != expected_gb and out != expected_bytes:
        return f"Verification failed: quota mismatch (got {out}, expected {expected_gb})"
    return None


def run_provision_script(storage_uid: str, quota_gb: int) -> tuple[int, str]:
    """Run provision script with sudo; return (exit_code, stderr_or_stdout)."""
    try:
        result = subprocess.run(
            ["sudo", SCRIPT_PATH, storage_uid, str(quota_gb)],
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

    # Convert to integer for ZFS commands
    quota_gb_int = int(quota_gb)

    # Pre-check: pool and parent dataset exist (no provision if ZFS not ready)
    pre_err = pre_check_zfs_ready()
    if pre_err:
        log_event(request_id, client_ip, storage_uid, "failed", pre_err)
        return jsonify(error=pre_err), 500

    # Run provision script with storage_uid and quota_gb
    code, output = run_provision_script(storage_uid, quota_gb_int)
    if code == 0:
        # Post-check: only report success to backend after verifying dataset and quota
        verify_err = post_verify_provisioned(storage_uid, quota_gb_int)
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


def _remove_exports_line(storage_uid: str) -> Optional[str]:
    """Remove /etc/exports line for this storage_uid (idempotent)."""
    ok, _ = _run_cmd([
        "sudo", "bash", "-lc",
        f"sed -i '\\|^/datapool/users/{storage_uid} |d' {EXPORTS_PATH}"
    ])
    if not ok:
        return f"Failed to clean {EXPORTS_PATH}"
    ok, _ = _run_cmd(["sudo", "exportfs", "-ra"])
    if not ok:
        return "Failed to reload NFS exports"
    return None


def _remove_fstab_line(storage_uid: str) -> Optional[str]:
    """Remove /etc/fstab line for this storage_uid (idempotent)."""
    ok, _ = _run_cmd([
        "sudo", "bash", "-lc",
        f"sed -i '\\|{NFS_EXPORT_CLIENT}:/datapool/users/{storage_uid} |d' {FSTAB_PATH}"
    ])
    if not ok:
        return f"Failed to clean {FSTAB_PATH}"
    return None


def cleanup_nfs_for(storage_uid: str) -> Optional[str]:
    """
    Remove NFS export, unmount, and fstab entry for this storage_uid.
    Returns None on success, or an error string.
    """
    mountpoint = os.path.join(NFS_MOUNT_ROOT, storage_uid)

    # Unmount (ignore errors — may not be mounted)
    _run_cmd(["sudo", "umount", mountpoint], timeout=15)

    # Remove exports line
    err = _remove_exports_line(storage_uid)
    if err:
        return err

    # Remove fstab line
    err = _remove_fstab_line(storage_uid)
    if err:
        return err

    return None


@app.route("/deprovision", methods=["POST"])
def deprovision():
    """
    Deprovision (destroy) a user's ZFS storage dataset.
    Requires X-Provision-Secret header.
    Body: { "storageUid": "u_..." }
    
    Steps:
      1. Validate storageUid format
      2. Check if dataset exists (idempotent: return success if not found)
      3. If NFS_AUTOMOUNT_ENABLED: unmount, remove exports/fstab entries
      4. Destroy ZFS dataset
      5. Verify destruction
      6. Clean up mount point directory
    """
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

    # Validate storageUid BEFORE any destructive action
    if not STORAGE_UID_PATTERN.match(storage_uid):
        log_event(request_id, client_ip, storage_uid, "deprovision_failed", "Invalid storageUid format")
        return jsonify(error="Invalid storageUid format"), 400

    dataset = f"datapool/users/{storage_uid}"

    # Check if dataset exists (idempotent: if not found, return success)
    ok, _ = _run_cmd(["zfs", "list", "-H", dataset])
    if not ok:
        # Dataset doesn't exist — already deprovisioned, return success
        log_event(request_id, client_ip, storage_uid, "deprovision_success", "Dataset already absent")
        return jsonify(ok=True), 200

    # If NFS automount enabled, clean up NFS first
    if NFS_AUTOMOUNT_ENABLED:
        nfs_err = cleanup_nfs_for(storage_uid)
        if nfs_err:
            log_event(request_id, client_ip, storage_uid, "deprovision_failed", nfs_err)
            return jsonify(error=nfs_err), 500

    # Destroy ZFS dataset (30s timeout for large datasets)
    ok, out = _run_cmd(["sudo", "zfs", "destroy", dataset], timeout=30)
    if not ok:
        log_event(request_id, client_ip, storage_uid, "deprovision_failed", f"zfs destroy failed: {out}")
        return jsonify(error=f"Failed to destroy dataset: {out}"), 500

    # Verify destruction
    ok, _ = _run_cmd(["zfs", "list", "-H", dataset])
    if ok:
        # Dataset still exists after destroy — unexpected
        log_event(request_id, client_ip, storage_uid, "deprovision_failed", "Dataset still exists after destroy")
        return jsonify(error="Dataset destruction verification failed"), 500

    # Clean up mount point directory (ignore errors — may not exist)
    if NFS_AUTOMOUNT_ENABLED:
        mountpoint = os.path.join(NFS_MOUNT_ROOT, storage_uid)
        _run_cmd(["sudo", "rmdir", mountpoint])

    log_event(request_id, client_ip, storage_uid, "deprovision_success")
    return jsonify(ok=True), 200


def _parse_zfs_size(value: str) -> int:
    """
    Parse a ZFS size string like '24K', '5.23G', '1234567890' into bytes as integer.
    """
    value = value.strip()
    if not value:
        return 0
    # Try plain integer (bytes)
    try:
        return int(value)
    except ValueError:
        pass

    match = re.match(r"^([\d.]+)([BKMGTPE])$", value.upper())
    if not match:
        return 0

    number = float(match.group(1))
    unit = match.group(2)
    multipliers = {
        "B": 1,
        "K": 1024,
        "M": 1024 ** 2,
        "G": 1024 ** 3,
        "T": 1024 ** 4,
        "P": 1024 ** 5,
        "E": 1024 ** 6,
    }
    return int(number * multipliers.get(unit, 1))


@app.route("/storage/usage/<storage_uid>", methods=["GET"])
def get_storage_usage(storage_uid: str):
    """
    Return live ZFS used/quota bytes for the given storageUid.
    Requires X-Provision-Secret header.

    Response:
      {
        "storageUid": "u_...",
        "usedBytes": 24576000,
        "quotaBytes": 5368709120,
        "usedGb": 0.02,
        "quotaGb": 5.0,
        "usagePercent": 0.46,
        "zfsDataset": "datapool/users/u_..."
      }
    On error (dataset not found / not provisioned): 404
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    dataset = f"datapool/users/{storage_uid}"

    # Get used bytes
    ok_used, used_str = _run_cmd(["zfs", "get", "-H", "-o", "value", "used", dataset])
    if not ok_used or not used_str.strip():
        return jsonify(error=f"Dataset not found or inaccessible: {dataset}"), 404
    used_str = used_str.strip()

    # Parse used bytes (zfs returns e.g. "24K", "5.23G", or bytes as integer)
    used_bytes = _parse_zfs_size(used_str)

    # Get quota bytes
    ok_quota, quota_str = _run_cmd(["zfs", "get", "-H", "-o", "value", "quota", dataset])
    if not ok_quota or not quota_str.strip():
        return jsonify(error=f"Could not get quota for {dataset}"), 404
    quota_str = quota_str.strip()

    # Parse quota — "none" means no quota set, treat as 0
    if quota_str.lower() == "none":
        quota_bytes = 0
    else:
        quota_bytes = _parse_zfs_size(quota_str)

    # Calculate derived values
    used_gb = round(used_bytes / (1024 ** 3), 4)
    quota_gb = round(quota_bytes / (1024 ** 3), 4) if quota_bytes > 0 else 0.0
    usage_percent = round((used_bytes / quota_bytes) * 100, 2) if quota_bytes > 0 else 0.0

    return jsonify({
        "storageUid": storage_uid,
        "usedBytes": used_bytes,
        "quotaBytes": quota_bytes,
        "usedGb": used_gb,
        "quotaGb": quota_gb,
        "usagePercent": usage_percent,
        "zfsDataset": dataset,
    }), 200


@app.route("/files/<storage_uid>", methods=["GET"])
def list_files(storage_uid: str):
    """
    List files in the user's storage directory.
    Requires X-Provision-Secret header.
    Optional query param: ?path= for subdirectory navigation.

    Response:
      [
        { "name": "file.txt", "type": "file", "size": 1234, "updatedAt": "2026-03-20T10:30:00Z" },
        { "name": "folder", "type": "folder", "size": null, "updatedAt": "2026-03-20T10:30:00Z" },
        ...
      ]
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    # Build the base path
    base_path = f"/datapool/users/{storage_uid}"
    
    # Get optional subdirectory path
    subpath = request.args.get("path", "/").strip()
    if subpath and subpath != "/":
        # Sanitize path to prevent directory traversal
        subpath = subpath.lstrip("/")
        # Reject any path with .. or absolute paths
        if ".." in subpath or subpath.startswith("/"):
            return jsonify(error="Invalid path"), 400
        target_path = os.path.join(base_path, subpath)
    else:
        target_path = base_path

    # Normalize and verify the path is within the user's storage
    target_path = os.path.normpath(target_path)
    if not target_path.startswith(base_path):
        return jsonify(error="Access denied: path outside user storage"), 403

    # Check if path exists
    if not os.path.exists(target_path):
        return jsonify(error=f"Path not found: {target_path}"), 404
    
    if not os.path.isdir(target_path):
        return jsonify(error="Path is not a directory"), 400

    # List files
    files = []
    try:
        for entry_name in os.listdir(target_path):
            entry_path = os.path.join(target_path, entry_name)
            try:
                stat_info = os.stat(entry_path)
                is_dir = os.path.isdir(entry_path)
                updated_at = datetime.fromtimestamp(stat_info.st_mtime, tz=timezone.utc).isoformat()
                
                files.append({
                    "name": entry_name,
                    "type": "folder" if is_dir else "file",
                    "size": None if is_dir else stat_info.st_size,
                    "updatedAt": updated_at,
                })
            except OSError:
                # Skip files we can't stat
                continue
    except PermissionError:
        return jsonify(error="Permission denied"), 403
    except OSError as e:
        return jsonify(error=str(e)), 500

    # Sort: folders first, then files, alphabetically
    files.sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))

    return jsonify(files), 200


@app.route("/files/<storage_uid>/mkdir", methods=["POST"])
def create_folder(storage_uid: str):
    """
    Create a new folder in the user's storage directory.
    Requires X-Provision-Secret header.
    Body: { "path": "/", "folderName": "my-folder" }

    Response:
      { "success": true, "path": "/path/to/created/folder" }
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    # Parse body
    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify(error="Invalid JSON body"), 400

    path = data.get("path", "/").strip()
    folder_name = data.get("folderName", "").strip()

    if not folder_name:
        return jsonify(error="folderName is required"), 400

    # Sanitize: reject ".." in path and folderName
    if ".." in path or ".." in folder_name:
        return jsonify(error="Invalid path: directory traversal not allowed"), 400

    # Build full path
    base_path = f"/datapool/users/{storage_uid}"
    path = path.lstrip("/")
    if path:
        target_dir = os.path.join(base_path, path, folder_name)
    else:
        target_dir = os.path.join(base_path, folder_name)

    # Normalize and verify the path is within the user's storage
    target_dir = os.path.normpath(target_dir)
    if not target_dir.startswith(base_path):
        return jsonify(error="Access denied: path outside user storage"), 403

    try:
        os.makedirs(target_dir, exist_ok=False)
        relative_path = target_dir.replace(base_path, "") or "/"
        return jsonify(success=True, path=relative_path), 201
    except FileExistsError:
        return jsonify(error="Folder already exists"), 409
    except PermissionError:
        return jsonify(error="Permission denied"), 403
    except OSError as e:
        return jsonify(error=str(e)), 500


@app.route("/files/<storage_uid>/upload", methods=["POST"])
def upload_file(storage_uid: str):
    """
    Upload files to the user's storage directory.
    Requires X-Provision-Secret header.
    Multipart form data: 'files' (file field), 'path' (text field, default "/")

    Response:
      { "success": true, "uploaded": ["file1.txt", "file2.txt"] }
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    # Get path from form data
    path = request.form.get("path", "/").strip()

    # Sanitize path
    if ".." in path:
        return jsonify(error="Invalid path: directory traversal not allowed"), 400

    # Build target directory
    base_path = f"/datapool/users/{storage_uid}"
    path = path.lstrip("/")
    if path:
        target_dir = os.path.join(base_path, path)
    else:
        target_dir = base_path

    # Normalize and verify the path is within the user's storage
    target_dir = os.path.normpath(target_dir)
    if not target_dir.startswith(base_path):
        return jsonify(error="Access denied: path outside user storage"), 403

    # Check if target directory exists
    if not os.path.exists(target_dir):
        return jsonify(error="Target directory does not exist"), 404

    if not os.path.isdir(target_dir):
        return jsonify(error="Target path is not a directory"), 400

    # Get files from request
    files = request.files.getlist("files")
    if not files or len(files) == 0:
        return jsonify(error="No files provided"), 400

    uploaded = []
    for file in files:
        if file.filename:
            # Use secure_filename to sanitize the filename
            filename = secure_filename(file.filename)
            if not filename:
                continue

            # Check for directory traversal in filename
            if ".." in filename:
                continue

            file_path = os.path.join(target_dir, filename)

            # Double-check path is within user storage
            file_path = os.path.normpath(file_path)
            if not file_path.startswith(base_path):
                continue

            try:
                file.save(file_path)
                uploaded.append(filename)
            except IOError as e:
                # Could be quota exceeded or disk full
                return jsonify(error=f"Failed to save {filename}: {str(e)}"), 500

    if not uploaded:
        return jsonify(error="No valid files were uploaded"), 400

    return jsonify(success=True, uploaded=uploaded), 200


@app.route("/files/<storage_uid>/download", methods=["GET"])
def download_file(storage_uid: str):
    """
    Download a file from the user's storage directory.
    Requires X-Provision-Secret header.
    Query param: ?file=relative/path/to/file.txt

    Returns: Binary file stream
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    # Get file path from query params
    file_path = request.args.get("file", "").strip()
    if not file_path:
        return jsonify(error="file parameter is required"), 400

    # Sanitize: reject ".."
    if ".." in file_path:
        return jsonify(error="Invalid path: directory traversal not allowed"), 400

    # Build full path
    base_path = f"/datapool/users/{storage_uid}"
    file_path = file_path.lstrip("/")
    full_path = os.path.join(base_path, file_path)

    # Normalize and verify the path is within the user's storage
    full_path = os.path.normpath(full_path)
    if not full_path.startswith(base_path):
        return jsonify(error="Access denied: path outside user storage"), 403

    # Check if file exists
    if not os.path.exists(full_path):
        return jsonify(error="File not found"), 404

    if os.path.isdir(full_path):
        return jsonify(error="Cannot download a directory"), 400

    # Get just the filename for the download
    filename = os.path.basename(full_path)

    try:
        return send_file(full_path, as_attachment=True, download_name=filename)
    except PermissionError:
        return jsonify(error="Permission denied"), 403
    except OSError as e:
        return jsonify(error=str(e)), 500


@app.route("/files/<storage_uid>/delete", methods=["DELETE"])
def delete_file(storage_uid: str):
    """
    Delete a file or folder from the user's storage directory.
    Requires X-Provision-Secret header.
    Query param: ?file=relative/path/to/file.txt

    Response:
      { "success": true }
    """
    # Auth
    if not PROVISION_SECRET:
        return jsonify(error="Provision service misconfigured (no PROVISION_SECRET)"), 500
    secret = request.headers.get("X-Provision-Secret")
    if secret != PROVISION_SECRET:
        return jsonify(error="Unauthorized"), 401

    if not STORAGE_UID_PATTERN.match(storage_uid):
        return jsonify(error="Invalid storageUid format"), 400

    # Get file path from query params
    file_path = request.args.get("file", "").strip()
    if not file_path:
        return jsonify(error="file parameter is required"), 400

    # Sanitize: reject ".."
    if ".." in file_path:
        return jsonify(error="Invalid path: directory traversal not allowed"), 400

    # Build full path
    base_path = f"/datapool/users/{storage_uid}"
    file_path = file_path.lstrip("/")
    full_path = os.path.join(base_path, file_path)

    # Normalize and verify the path is within the user's storage
    full_path = os.path.normpath(full_path)
    if not full_path.startswith(base_path):
        return jsonify(error="Access denied: path outside user storage"), 403

    # Prevent deleting the root storage directory
    if full_path == base_path:
        return jsonify(error="Cannot delete root storage directory"), 400

    # Check if file/folder exists
    if not os.path.exists(full_path):
        return jsonify(error="File or folder not found"), 404

    try:
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return jsonify(success=True), 200
    except PermissionError:
        return jsonify(error="Permission denied"), 403
    except OSError as e:
        return jsonify(error=str(e)), 500


if __name__ == "__main__":
    if not PROVISION_SECRET:
        print("PROVISION_SECRET is not set; service will return 500 on provision.", file=sys.stderr)
    port = int(os.environ.get("PORT", "9999"))
    app.run(host="0.0.0.0", port=port, threaded=True)
