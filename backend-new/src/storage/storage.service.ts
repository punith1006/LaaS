import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NodeService } from '../node/node.service';
import { Node } from '@prisma/client';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const SCRIPT_ENV = 'USER_STORAGE_PROVISION_SCRIPT';
const SECRET_ENV = 'USER_STORAGE_PROVISION_SECRET';
const DEFAULT_QUOTA_GB = 5;
const PROVISION_TIMEOUT_MS = 15000;
const MAX_ERROR_LENGTH = 500;
const DEFAULT_NODE_HOSTNAME = 'node-01';

export interface ProvisionResult {
  ok: boolean;
  error?: string;
  /** The node ID where the volume was provisioned. */
  nodeId?: string;
  /** The storage backend used for provisioning. */
  storageBackend?: string;
}

/**
 * Provisions ZFS quota for users.
 * After successful host-level provisioning, the caller is responsible for creating the UserStorageVolume record.
 * Routes all operations to the correct node via NodeService (multi-node aware).
 *
 * Supports two backends:
 * - USER_STORAGE_PROVISION_SCRIPT: path to script; called with storageUid and quotaGb as arguments (legacy, single-node).
 * - Dynamic URL via NodeService: HTTP POST { "storageUid": "u_xxx", "quotaGb": 5, "storageBackend": "zfs_zvol" } to the selected node.
 * If neither is available, returns ok: false with error message (provisioning skipped).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeService: NodeService,
  ) {}

  // ============================================================================
  // HELPER: Resolve the base URL for an existing volume's node
  // ============================================================================

  /**
   * Resolves the storage service base URL for a given storageUid.
   * Looks up the volume's nodeId, fetches the Node, and builds the URL.
   * Falls back to the default node (node-01) for legacy volumes without nodeId.
   */
  private async resolveBaseUrlForVolume(storageUid: string): Promise<string | null> {
    // Look up the volume to find its nodeId
    const volume = await this.prisma.userStorageVolume.findFirst({
      where: { storageUid },
      select: { nodeId: true },
    });

    let node: Node | null = null;

    if (volume?.nodeId) {
      node = await this.prisma.node.findUnique({ where: { id: volume.nodeId } });
    }

    // Fallback for legacy volumes without nodeId
    if (!node) {
      node = await this.prisma.node.findFirst({
        where: { hostname: DEFAULT_NODE_HOSTNAME, status: 'healthy' },
      });
    }

    // Last resort: any healthy node
    if (!node) {
      node = await this.prisma.node.findFirst({
        where: { status: 'healthy' },
        orderBy: { hostname: 'asc' },
      });
    }

    if (!node) {
      this.logger.warn(`No healthy node found for storageUid=${storageUid}`);
      return null;
    }

    return this.nodeService.getStorageProvisionUrl(node);
  }

  /**
   * Resolves the base URL for a specific node ID.
   * Falls back to default node if the nodeId is null or not found.
   */
  private async resolveBaseUrlForNode(nodeId: string | null): Promise<string | null> {
    let node: Node | null = null;

    if (nodeId) {
      node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    }

    if (!node) {
      node = await this.prisma.node.findFirst({
        where: { hostname: DEFAULT_NODE_HOSTNAME, status: 'healthy' },
      });
    }

    if (!node) {
      node = await this.prisma.node.findFirst({
        where: { status: 'healthy' },
        orderBy: { hostname: 'asc' },
      });
    }

    if (!node) {
      this.logger.warn('No healthy node available for storage operation');
      return null;
    }

    return this.nodeService.getStorageProvisionUrl(node);
  }

  /**
   * Build common auth headers using the shared provision secret.
   */
  private getAuthHeaders(): Record<string, string> {
    const secret = process.env[SECRET_ENV];
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Provision-Secret'] = secret;
    }
    return headers;
  }

  // ============================================================================
  // PROVISION: Select node, provision, and return nodeId + storageBackend
  // ============================================================================

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

    // Legacy script path (single-node fallback)
    const scriptPath = process.env[SCRIPT_ENV];

    if (scriptPath) {
      const result = await this.runScript(scriptPath, storageUid, validQuota);
      if (result.ok) {
        this.logger.log(`Storage provisioned (script) for userId=${userId} storageUid=${storageUid} quota=${validQuota}GB`);
      }
      return result;
    }

    // Multi-node: select the best storage node
    try {
      const selectedNode = await this.nodeService.selectStorageNode(validQuota);
      const baseUrl = this.nodeService.getStorageProvisionUrl(selectedNode);
      const url = `${baseUrl}/provision`;

      const result = await this.callProvisionUrl(url, storageUid, validQuota, 'zfs_zvol');

      if (result.ok) {
        this.logger.log(
          `Storage provisioned on node ${selectedNode.hostname} for userId=${userId} storageUid=${storageUid} quota=${validQuota}GB backend=zfs_zvol`,
        );
        return {
          ok: true,
          nodeId: selectedNode.id,
          storageBackend: 'zfs_zvol',
        };
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Storage provisioning failed for storageUid=${storageUid}: ${msg}`);
      return { ok: false, error: msg };
    }
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
    storageBackend: string = 'zfs_zvol',
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
        body: JSON.stringify({ storageUid, quotaGb, storageBackend }),
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

  // ============================================================================
  // HEALTH: Check storage service health on the volume's node
  // ============================================================================

  /**
   * Check if the Python storage service is healthy and reachable.
   * Routes to the volume's node or falls back to the default node.
   * Returns null if no node is available.
   */
  async checkStorageHealth(storageUid?: string): Promise<{ healthy: boolean; error?: string } | null> {
    let baseUrl: string | null;

    if (storageUid) {
      baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    } else {
      baseUrl = await this.resolveBaseUrlForNode(null);
    }

    if (!baseUrl) {
      return null;
    }

    const url = `${baseUrl}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return { healthy: res.ok, error: res.ok ? undefined : 'Service unhealthy' };
    } catch (err) {
      clearTimeout(timeoutId);
      return { healthy: false, error: err instanceof Error ? err.message : 'Unreachable' };
    }
  }

  // ============================================================================
  // USAGE: Fetch live storage usage from the volume's node
  // ============================================================================

  /**
   * Fetch live storage usage (used/quota bytes) from the Python service.
   * Routes to the node where the volume physically lives.
   * Returns null if no node is available or the dataset is not found.
   */
  async getStorageUsage(storageUid: string): Promise<{
    usedBytes: number;
    quotaBytes: number;
    usedGb: number;
    quotaGb: number;
    usagePercent: number;
  } | null> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      this.logger.debug('No healthy node available, skipping live usage fetch');
      return null;
    }

    const url = `${baseUrl}/storage/usage/${encodeURIComponent(storageUid)}`;
    const headers = this.getAuthHeaders();
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

  // ============================================================================
  // FILES: List, create, upload, download, delete — all routed to volume's node
  // ============================================================================

  /**
   * Fetch file listing from the Python service.
   * Routes to the node where the volume physically lives.
   */
  async getFiles(storageUid: string, path = '/'): Promise<{
    name: string;
    type: 'file' | 'folder';
    size: number | null;
    updatedAt: string;
  }[] | null> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      this.logger.debug('No healthy node available, skipping file listing');
      return null;
    }

    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}?path=${encodeURIComponent(path)}`;
    const headers = this.getAuthHeaders();
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
   * Routes to the node where the volume physically lives.
   */
  async createFolder(storageUid: string, path: string, folderName: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      return { success: false, error: 'Storage service not configured' };
    }

    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/mkdir`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
    };
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
   * Routes to the node where the volume physically lives.
   */
  async uploadFile(storageUid: string, path: string, fileBuffer: Buffer, filename: string): Promise<{ success: boolean; uploaded?: string[]; error?: string }> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      return { success: false, error: 'Storage service not configured' };
    }

    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/upload`;
    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
    };

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
   * Routes to the node where the volume physically lives.
   */
  async downloadFile(storageUid: string, filePath: string): Promise<{ buffer: Buffer; filename: string } | null> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      return null;
    }

    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/download?file=${encodeURIComponent(filePath)}`;
    const headers = this.getAuthHeaders();
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

  // ============================================================================
  // DEPROVISION: Route to the volume's node, include storageBackend
  // ============================================================================

  /**
   * Deprovision (destroy) a user's ZFS storage dataset.
   * Routes to the node where the volume physically lives.
   * Passes storageBackend so the host service knows whether to do zvol+NVMe-oF cleanup or dataset cleanup.
   */
  async deprovisionUserStorage(storageUid: string): Promise<{ ok: boolean; error?: string }> {
    // Look up volume to get nodeId and storageBackend
    const volume = await this.prisma.userStorageVolume.findFirst({
      where: { storageUid },
      select: { nodeId: true, storageBackend: true },
    });

    const nodeId = volume?.nodeId ?? null;
    const storageBackend = volume?.storageBackend ?? 'zfs_dataset';

    const baseUrl = await this.resolveBaseUrlForNode(nodeId);
    if (!baseUrl) {
      return { ok: false, error: 'No healthy node available for deprovision' };
    }

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
        body: JSON.stringify({ storageUid, storageBackend }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        const errorMsg = data.error || `Deprovision failed (${res.status})`;
        this.logger.error(`Deprovision failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      if (!data.ok) {
        const errorMsg = data.error || 'Deprovision failed';
        this.logger.error(`Deprovision failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      this.logger.log(`Storage deprovisioned for storageUid=${storageUid} on nodeId=${nodeId ?? 'default'}`);
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

  // ============================================================================
  // DELETE FILE: Route to the volume's node
  // ============================================================================

  /**
   * Delete a file or folder from the user's storage.
   * Routes to the node where the volume physically lives.
   */
  async deleteFile(storageUid: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      return { success: false, error: 'Storage service not configured' };
    }

    const url = `${baseUrl}/files/${encodeURIComponent(storageUid)}/delete?file=${encodeURIComponent(filePath)}`;
    const headers = this.getAuthHeaders();
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

  // ============================================================================
  // HOST SPACE: Route to a specific node or default
  // ============================================================================

  /**
   * Get available host storage space.
   * Optionally targets a specific node; defaults to the first healthy node.
   */
  async getHostSpace(nodeId?: string | null): Promise<{ availableGb: number; totalGb: number; availableBytes: number } | null> {
    const baseUrl = await this.resolveBaseUrlForNode(nodeId ?? null);
    if (!baseUrl) {
      this.logger.debug('No healthy node available, skipping host space check');
      return null;
    }

    const url = `${baseUrl}/host-space`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        this.logger.warn(`Host space check failed: ${res.status}`);
        return null;
      }

      const data = await res.json() as {
        availableBytes: number;
        totalBytes: number;
        availableGb: number;
        totalGb: number;
      };

      return {
        availableGb: data.availableGb,
        totalGb: data.totalGb,
        availableBytes: data.availableBytes,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Host space check error: ${msg}`);
      return null;
    }
  }

  // ============================================================================
  // UPGRADE: Route to the volume's node
  // ============================================================================

  /**
   * Upgrade storage quota on the host.
   * Routes to the node where the volume physically lives.
   */
  async upgradeStorageQuota(
    storageUid: string,
    newQuotaGb: number,
  ): Promise<{ ok: boolean; previousQuotaGb?: number; newQuotaGb?: number; error?: string }> {
    const baseUrl = await this.resolveBaseUrlForVolume(storageUid);
    if (!baseUrl) {
      return { ok: false, error: 'No healthy node available for storage upgrade' };
    }

    const url = `${baseUrl}/upgrade-storage`;
    const secret = process.env[SECRET_ENV];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min timeout for upgrade

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Provision-Secret': secret } : {}),
        },
        body: JSON.stringify({ storageUid, newQuotaGb }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json() as {
        ok?: boolean;
        previousQuotaGb?: number;
        newQuotaGb?: number;
        error?: string;
      };

      if (!res.ok) {
        const errorMsg = data.error || `Upgrade failed (${res.status})`;
        this.logger.error(`Storage upgrade failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      if (!data.ok) {
        const errorMsg = data.error || 'Upgrade failed';
        this.logger.error(`Storage upgrade failed for storageUid=${storageUid}: ${errorMsg}`);
        return { ok: false, error: errorMsg };
      }

      this.logger.log(`Storage upgraded for storageUid=${storageUid}: ${data.previousQuotaGb}GB -> ${data.newQuotaGb}GB`);
      return {
        ok: true,
        previousQuotaGb: data.previousQuotaGb,
        newQuotaGb: data.newQuotaGb,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const msg = isTimeout
        ? 'Storage upgrade timed out'
        : err instanceof Error
          ? err.message
          : String(err);
      this.logger.error(`Storage upgrade failed for storageUid=${storageUid}: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}
