import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const SCRIPT_ENV = 'USER_STORAGE_PROVISION_SCRIPT';
const URL_ENV = 'USER_STORAGE_PROVISION_URL';
const SECRET_ENV = 'USER_STORAGE_PROVISION_SECRET';
const QUOTA_GB = 5;
const PROVISION_TIMEOUT_MS = 15000;
const MAX_ERROR_LENGTH = 500;

export interface ProvisionResult {
  ok: boolean;
  error?: string;
}

/**
 * Provisions 5GB ZFS quota for institution members (university_sso) at user creation only.
 * Checks available space (when using script) and returns a result so the app can persist status.
 * Supports two backends:
 * - USER_STORAGE_PROVISION_SCRIPT: path to script; called with storageUid as first argument.
 * - USER_STORAGE_PROVISION_URL: HTTP POST { "storageUid": "u_xxx" } to this URL.
 * If neither is set, returns ok: false with error message (provisioning skipped).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  async provisionUserQuota(storageUid: string): Promise<ProvisionResult> {
    if (!storageUid || !storageUid.startsWith('u_')) {
      const msg = `Invalid storageUid for provisioning: ${storageUid}`;
      this.logger.warn(msg);
      return { ok: false, error: msg };
    }

    const scriptPath = process.env[SCRIPT_ENV];
    const provisionUrl = process.env[URL_ENV];

    if (scriptPath) {
      return this.runScript(scriptPath, storageUid);
    }

    if (provisionUrl) {
      return this.callProvisionUrl(provisionUrl, storageUid);
    }

    const msg = `Storage provisioning skipped (set ${SCRIPT_ENV} or ${URL_ENV} to enable).`;
    this.logger.debug(`${msg} storageUid=${storageUid}`);
    return { ok: false, error: msg };
  }

  private runScript(scriptPath: string, storageUid: string): Promise<ProvisionResult> {
    return new Promise((resolve) => {
      const child = spawn(scriptPath, [storageUid], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        const err = 'Storage provision script timed out (15s)';
        this.logger.error(`${err}. storageUid=${storageUid}`);
        resolve({ ok: false, error: err });
      }, 15000);

      let stderr = '';
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.stdout?.on('data', (chunk) => {
        this.logger.debug(`provision script: ${chunk.toString().trim()}`);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        const errTrim = stderr.trim();
        if (code === 0) {
          this.logger.log(`Storage provisioned for storageUid=${storageUid}`);
          resolve({ ok: true });
        } else {
          const errorMsg =
            errTrim || (code === 2 ? 'Insufficient disk space' : code === 3 ? 'Storage system error' : `Script exited with code ${code}`);
          this.logger.error(
            `Storage provision script exited ${code}. storageUid=${storageUid} stderr=${errTrim || '(none)'}`,
          );
          resolve({ ok: false, error: errorMsg });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        const msg = err.message;
        this.logger.error(`Storage provision script failed: ${msg}. storageUid=${storageUid}`);
        resolve({ ok: false, error: msg });
      });
    });
  }

  private async callProvisionUrl(
    url: string,
    storageUid: string,
  ): Promise<ProvisionResult> {
    const requestId = randomUUID();
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    };
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      PROVISION_TIMEOUT_MS,
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ storageUid, quotaGb: QUOTA_GB }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        this.logger.log(
          `Storage provisioned via URL requestId=${requestId} storageUid=${storageUid}`,
        );
        return { ok: true };
      }
      const text = await res.text();
      let errorMsg: string;
      try {
        const json = JSON.parse(text) as { error?: string };
        errorMsg =
          typeof json.error === 'string'
            ? json.error
            : text || `HTTP ${res.status}`;
      } catch {
        errorMsg = text || `HTTP ${res.status}`;
      }
      const capped = errorMsg.slice(0, MAX_ERROR_LENGTH);
      this.logger.error(
        `Storage provision URL requestId=${requestId} status=${res.status} storageUid=${storageUid} error=${capped.slice(0, 100)}`,
      );
      return { ok: false, error: capped };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout =
        err instanceof Error && err.name === 'AbortError';
      const msg = isTimeout
        ? 'Provision request timed out'
        : err instanceof Error
          ? err.message
          : String(err);
      this.logger.error(
        `Storage provision URL request failed requestId=${requestId} storageUid=${storageUid} error=${msg}`,
      );
      return { ok: false, error: msg };
    }
  }
}
