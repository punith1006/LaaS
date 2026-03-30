import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const SCRIPT_ENV = 'USER_STORAGE_PROVISION_SCRIPT';
const URL_ENV = 'USER_STORAGE_PROVISION_URL';
const SECRET_ENV = 'USER_STORAGE_PROVISION_SECRET';
const DEFAULT_QUOTA_GB = 5;
const PROVISION_TIMEOUT_MS = 15000;
const MAX_ERROR_LENGTH = 500;

export interface ProvisionResult {
  ok: boolean;
  error?: string;
}

/**
 * Provisions ZFS quota for users.
 * After successful host-level provisioning, the caller is responsible for creating the UserStorageVolume record.
 * Checks available space (when using script) and returns a result so the app can persist status.
 * Supports two backends:
 * - USER_STORAGE_PROVISION_SCRIPT: path to script; called with storageUid and quotaGb as arguments.
 * - USER_STORAGE_PROVISION_URL: HTTP POST { "storageUid": "u_xxx", "quotaGb": 5 } to this URL.
 * If neither is set, returns ok: false with error message (provisioning skipped).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provisionUserQuota(
    storageUid: string,
    userId: string,
    quotaGb: number = DEFAULT_QUOTA_GB,
  ): Promise<ProvisionResult> {
    if (!storageUid || !storageUid.startsWith('u_')) {
      const msg = `Invalid storageUid for provisioning: ${storageUid}`;
      this.logger.warn(msg);
      return { ok: false, error: msg };
    }

    // Validate quota is within reasonable bounds
    const validQuota = Math.max(1, Math.min(50, quotaGb));

    const scriptPath = process.env[SCRIPT_ENV];
    const provisionUrl = process.env[URL_ENV];

    let result: ProvisionResult;

    if (scriptPath) {
      result = await this.runScript(scriptPath, storageUid, validQuota);
    } else if (provisionUrl) {
      result = await this.callProvisionUrl(provisionUrl, storageUid, validQuota);
    } else {
      const msg = `Storage provisioning skipped (set ${SCRIPT_ENV} or ${URL_ENV} to enable).`;
      this.logger.debug(`${msg} storageUid=${storageUid}`);
      return { ok: false, error: msg };
    }

    if (result.ok) {
      this.logger.log(`Storage provisioned for userId=${userId} storageUid=${storageUid} quota=${validQuota}GB`);
    }

    return result;
  }

  private runScript(scriptPath: string, storageUid: string, quotaGb: number): Promise<ProvisionResult> {
    return new Promise((resolve) => {
      const child = spawn(scriptPath, [storageUid, quotaGb.toString()], {
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
    quotaGb: number,
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
        body: JSON.stringify({ storageUid, quotaGb }),
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
   * Check if the Python storage service is healthy and reachable.
   * Returns null if the service is not configured.
   */
  async checkStorageHealth(): Promise<{ healthy: boolean; error?: string } | null> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      return null;
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout - fast fail

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return { healthy: res.ok, error: res.ok ? undefined : 'Service unhealthy' };
    } catch (err) {
      clearTimeout(timeoutId);
      return { healthy: false, error: err instanceof Error ? err.message : 'Unreachable' };
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

    // Strip /provision suffix to get base URL
    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/storage/usage/${encodeURIComponent(storageUid)}`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
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

  /**
   * Fetch file listing from the Python service.
   * Returns null if the service is not configured or the path is not found.
   */
  async getFiles(storageUid: string, path = '/'): Promise<{
    name: string;
    type: 'file' | 'folder';
    size: number | null;
    updatedAt: string;
  }[] | null> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping file listing');
      return null;
    }

    // Strip /provision suffix to get base URL
    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}?path=${encodeURIComponent(path)}`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 404) {
        // Path not found
        return null;
      }

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`File listing fetch failed for ${storageUid}: ${text}`);
        return null;
      }

      const data = await res.json() as {
        name: string;
        type: 'file' | 'folder';
        size: number | null;
        updatedAt: string;
      }[];

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`File listing fetch error for ${storageUid}: ${msg}`);
      return null;
    }
  }

  /**
   * Create a folder in the user's storage.
   */
  async createFolder(storageUid: string, path: string, folderName: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping folder creation');
      return { success: false, error: 'Storage service not configured' };
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/mkdir`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ path, folderName }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json() as { success?: boolean; path?: string; error?: string };

      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      return { success: true, path: data.path };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Folder creation error for ${storageUid}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Upload a file to the user's storage.
   */
  async uploadFile(storageUid: string, path: string, fileBuffer: Buffer, filename: string): Promise<{ success: boolean; uploaded?: string[]; error?: string }> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping file upload');
      return { success: false, error: 'Storage service not configured' };
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/upload`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }

    // Build multipart form data
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

    // Construct multipart body manually
    const parts: Buffer[] = [];

    // Add path field
    parts.push(Buffer.from(`--${boundary}\r\n`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="path"\r\n\r\n`));
    parts.push(Buffer.from(`${path}\r\n`));

    // Add file field
    parts.push(Buffer.from(`--${boundary}\r\n`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`));
    parts.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n`));

    // End boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for uploads

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json() as { success?: boolean; uploaded?: string[]; error?: string };

      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      return { success: true, uploaded: data.uploaded };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`File upload error for ${storageUid}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Download a file from the user's storage.
   */
  async downloadFile(storageUid: string, filePath: string): Promise<{ buffer: Buffer; filename: string } | null> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping file download');
      return null;
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/download?file=${encodeURIComponent(filePath)}`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for downloads

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`File download failed for ${storageUid}/${filePath}: ${text}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract filename from Content-Disposition header or use path
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = filePath.split('/').pop() || 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      return { buffer, filename };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`File download error for ${storageUid}/${filePath}: ${msg}`);
      return null;
    }
  }

  /**
   * Deprovision (destroy) a user's ZFS storage dataset.
   * Calls the Python host service's /deprovision endpoint.
   */
  async deprovisionUserStorage(storageUid: string): Promise<{ ok: boolean; error?: string }> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      return { ok: false, error: 'Storage provisioning URL not configured' };
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/deprovision`;
    const secret = process.env[SECRET_ENV];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Provision-Secret': secret } : {}),
        },
        body: JSON.stringify({ storageUid }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        const errorMsg = data.error || `Deprovision failed (${res.status})`;
        this.logger.error(`Deprovision failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      // Also check the JSON body ok field (Python returns 200 with {error: ...} on failure)
      if (!data.ok) {
        const errorMsg = data.error || 'Deprovision failed';
        this.logger.error(`Deprovision failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      this.logger.log(`Storage deprovisioned for storageUid=${storageUid}`);
      return { ok: true };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const msg = isTimeout
        ? 'Deprovision request timed out'
        : err instanceof Error
          ? err.message
          : String(err);
      this.logger.error(`Deprovision request failed for storageUid=${storageUid}: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  /**
   * Delete a file or folder from the user's storage.
   */
  async deleteFile(storageUid: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    const provisionUrl = process.env[URL_ENV];
    if (!provisionUrl) {
      this.logger.debug('USER_STORAGE_PROVISION_URL not set, skipping file deletion');
      return { success: false, error: 'Storage service not configured' };
    }

    const baseUrl = provisionUrl.replace(/\/provision$/, '');
    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/delete?file=${encodeURIComponent(filePath)}`;
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      return { success: true };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`File deletion error for ${storageUid}/${filePath}: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
