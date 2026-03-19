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