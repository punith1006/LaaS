import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
 * After successful host-level provisioning, creates a UserStorageVolume record in the DB.
 * Checks available space (when using script) and returns a result so the app can persist status.
 * Supports two backends:
 * - USER_STORAGE_PROVISION_SCRIPT: path to script; called with storageUid as first argument.
 * - USER_STORAGE_PROVISION_URL: HTTP POST { "storageUid": "u_xxx" } to this URL.
 * If neither is set, returns ok: false with error message (provisioning skipped).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provisionUserQuota(storageUid: string, userId: string): Promise<ProvisionResult> {
    if (!storageUid || !storageUid.startsWith('u_')) {
      const msg = `Invalid storageUid for provisioning: ${storageUid}`;
      this.logger.warn(msg);
      return { ok: false, error: msg };
    }

    const scriptPath = process.env[SCRIPT_ENV];
    const provisionUrl = process.env[URL_ENV];

    let result: ProvisionResult;

    if (scriptPath) {
      result = await this.runScript(scriptPath, storageUid);
    } else if (provisionUrl) {
      result = await this.callProvisionUrl(provisionUrl, storageUid);
    } else {
      const msg = `Storage provisioning skipped (set ${SCRIPT_ENV} or ${URL_ENV} to enable).`;
      this.logger.debug(`${msg} storageUid=${storageUid}`);
      return { ok: false, error: msg };
    }

    // After host-level provisioning, persist the UserStorageVolume record in DB
    if (result.ok) {
      try {
        // Use raw SQL to bypass stale Prisma client types (allocationType field added after last generate)
        await this.prisma.$executeRaw`
          INSERT INTO user_storage_volumes (id, user_id, storage_uid, os_choice, quota_bytes, used_bytes, allocation_type, status, provisioned_at, created_at, updated_at)
          VALUES (
            gen_random_uuid()::uuid,
            ${userId}::uuid,
            ${storageUid},
            'ubuntu22',
            ${BigInt(QUOTA_GB) * BigInt(1024) ** BigInt(3)},
            0,
            'sso_default',
            'active',
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (user_id) DO NOTHING
        `;
        this.logger.log(`UserStorageVolume created for userId=${userId} quota=${QUOTA_GB}GB`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to create UserStorageVolume for userId=${userId}: ${errMsg}`);
        // Don't fail the overall result — host provisioning succeeded, DB record is secondary
      }
    }

    return result;
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

  /**
   * Fetch live storage usage (used/quota bytes) from the Python service.
   * Returns null if the service is not configured or the dataset is not found.
   */
  async getStorageUsage(storageUid: string): Promise<{
    usedBytes: number;
    quotaBytes: number;
    usedGb: number;
    quotaGb: number;
    usagePercent: number;
  } | null> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping live usage fetch');
      return null;
    }

    const url = `${provisionUrl}/storage/usage/${encodeURIComponent(storageUid)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 404) {
        // Dataset not found — user has no storage provisioned yet
        return null;
      }

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Storage usage fetch failed for ${storageUid}: ${text}`);
        return null;
      }

      const data = await res.json() as {
        usedBytes: number;
        quotaBytes: number;
        usedGb: number;
        quotaGb: number;
        usagePercent: number;
      };

      return {
        usedBytes: data.usedBytes,
        quotaBytes: data.quotaBytes,
        usedGb: data.usedGb,
        quotaGb: data.quotaGb,
        usagePercent: data.usagePercent,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Storage usage fetch error for ${storageUid}: ${msg}`);
      return null;
    }
  }
}
