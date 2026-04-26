import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IsString, IsNotEmpty, IsInt, Min, Max, Length } from 'class-validator';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { randomBytes } from 'crypto';

const MIN_QUOTA_GB = 5;
const MAX_QUOTA_GB = 10;

export class CreateStorageVolumeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  name: string;

  @IsInt()
  @Min(MIN_QUOTA_GB)
  @Max(MAX_QUOTA_GB)
  quotaGb: number;
}

export class UpgradeStorageVolumeDto {
  @IsInt()
  @Min(MIN_QUOTA_GB + 1)
  @Max(MAX_QUOTA_GB)
  newQuotaGb: number;
}

interface StorageVolumeRow {
  id: string;
  name: string;
  storage_uid: string;
  quota_bytes: bigint;
  used_bytes: bigint;
  status: string;
  allocation_type: string;
  provisioned_at: Date | null;
  created_at: Date;
}

@Controller('api/storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper method to get user's active storage UID
   */
  private async getUserStorageUid(userId: string): Promise<string> {
    const volumes = await this.prisma.$queryRaw<{ storage_uid: string }[]>`
      SELECT storage_uid FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (volumes.length === 0) {
      throw new NotFoundException('No active storage volume found');
    }

    return volumes[0].storage_uid;
  }

  /**
   * Get all storage volumes for the authenticated user
   */
  @Get('volumes')
  async getVolumes(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;

    // Use raw SQL to bypass stale Prisma types
    const volumes = await this.prisma.$queryRaw<StorageVolumeRow[]>`
      SELECT id, name, storage_uid, quota_bytes, used_bytes, status, allocation_type, provisioned_at, created_at
      FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status != 'wiped'
      ORDER BY created_at DESC
    `;

    return volumes.map((v) => ({
      id: v.id,
      name: v.name,
      storageUid: v.storage_uid,
      quotaGb: Number(v.quota_bytes) / (1024 * 1024 * 1024),
      usedGb: Number(v.used_bytes) / (1024 * 1024 * 1024),
      status: v.status,
      allocationType: v.allocation_type,
      provisionedAt: v.provisioned_at,
      createdAt: v.created_at,
    }));
  }

  /**
   * Get file listing for the authenticated user's storage
   */
  @Get('files')
  async getFiles(
    @Query('path') path: string = '/',
    @Req() req: { user: { id: string } },
  ) {
    const userId = req.user.id;
    const storageUid = await this.getUserStorageUid(userId);
    const files = await this.storageService.getFiles(storageUid, path || '/');

    if (files === null) {
      throw new ServiceUnavailableException('Storage service unreachable or dataset not found');
    }

    return files;
  }

  /**
   * Check the reachability of the user's storage dataset
   */
  @Get('status')
  async getStorageStatus(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;

    // Check if user has a storage volume in DB
    const volumes = await this.prisma.$queryRaw<{ storage_uid: string; name: string; quota_bytes: bigint }[]>`
      SELECT storage_uid, name, quota_bytes FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (volumes.length === 0) {
      return { hasStorage: false, reachable: false, serviceHealthy: false };
    }

    const storageUid = volumes[0].storage_uid;
    const volumeName = volumes[0].name;
    const quotaGb = Math.round(Number(volumes[0].quota_bytes) / (1024 ** 3));

    // Check service-level health first
    const health = await this.storageService.checkStorageHealth();
    const serviceHealthy = health?.healthy ?? false;

    if (!serviceHealthy) {
      return { hasStorage: true, reachable: false, serviceHealthy: false, volumeName, quotaGb };
    }

    // Check if the specific dataset exists by probing usage
    const usage = await this.storageService.getStorageUsage(storageUid);
    const datasetExists = usage !== null;

    return {
      hasStorage: true,
      reachable: datasetExists && serviceHealthy,
      serviceHealthy,
      datasetExists,
      volumeName,
      quotaGb,
    };
  }

  /**
   * Create a folder in the authenticated user's storage
   */
  @Post('files/mkdir')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @Req() req: FastifyRequest & { user: { id: string } },
    @Body() body: { path: string; folderName: string },
  ) {
    const userId = req.user.id;
    const storageUid = await this.getUserStorageUid(userId);

    if (!body.folderName || !body.folderName.trim()) {
      throw new BadRequestException('folderName is required');
    }

    const result = await this.storageService.createFolder(
      storageUid,
      body.path || '/',
      body.folderName.trim(),
    );

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to create folder');
    }

    // Audit log for folder creation
    try {
      await this.auditService.log({
        userId,
        action: 'file.mkdir',
        category: 'storage',
        status: 'success',
        details: { path: body.path || '/', folderName: body.folderName.trim() },
        ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
        userAgent: req.headers?.['user-agent'] || undefined,
      });
    } catch {
      // Don't let audit logging failures break the main flow
    }

    return result;
  }

  /**
   * Upload files to the authenticated user's storage
   */
  @Post('files/upload')
  async uploadFiles(@Req() req: FastifyRequest & { user: { id: string } }) {
    const userId = req.user.id;
    const storageUid = await this.getUserStorageUid(userId);

    // Parse multipart from Fastify request
    const parts = req.parts();
    let path = '/';
    const uploaded: string[] = [];
    const errors: string[] = [];

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'path' && typeof part.value === 'string') {
          path = part.value || '/';
        }
      } else if (part.type === 'file') {
        // It's a file
        const filename = part.filename;
        if (!filename) continue;

        // Collect file chunks into a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        const result = await this.storageService.uploadFile(
          storageUid,
          path,
          fileBuffer,
          filename,
        );

        if (result.success && result.uploaded) {
          uploaded.push(...result.uploaded);
        } else if (result.error) {
          errors.push(`${filename}: ${result.error}`);
        }
      }
    }

    if (uploaded.length === 0 && errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    // Audit log for file upload
    if (uploaded.length > 0) {
      try {
        await this.auditService.log({
          userId,
          action: 'file.upload',
          category: 'storage',
          status: 'success',
          details: { fileName: uploaded.join(', '), path },
          ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
          userAgent: req.headers?.['user-agent'] || undefined,
        });
      } catch {
        // Don't let audit logging failures break the main flow
      }
    }

    return { success: true, uploaded, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Download a file from the authenticated user's storage
   */
  @Get('files/download')
  async downloadFile(
    @Req() req: FastifyRequest & { user: { id: string } },
    @Query('file') filePath: string,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user.id;

    if (!filePath || !filePath.trim()) {
      throw new BadRequestException('file parameter is required');
    }

    const storageUid = await this.getUserStorageUid(userId);
    const result = await this.storageService.downloadFile(storageUid, filePath.trim());

    if (!result) {
      throw new NotFoundException('File not found');
    }

    const { buffer, filename } = result;

    // Audit log for file download
    try {
      await this.auditService.log({
        userId,
        action: 'file.download',
        category: 'storage',
        status: 'success',
        details: { filePath: filePath.trim() },
        ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
        userAgent: req.headers?.['user-agent'] || undefined,
      });
    } catch {
      // Don't let audit logging failures break the main flow
    }

    return res
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Content-Length', buffer.length.toString())
      .send(buffer);
  }

  /**
   * Delete a file or folder from the authenticated user's storage
   */
  @Delete('files')
  async deleteFile(
    @Req() req: FastifyRequest & { user: { id: string } },
    @Query('file') filePath: string,
  ) {
    const userId = req.user.id;

    if (!filePath || !filePath.trim()) {
      throw new BadRequestException('file parameter is required');
    }

    const storageUid = await this.getUserStorageUid(userId);
    const result = await this.storageService.deleteFile(storageUid, filePath.trim());

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to delete file');
    }

    // Audit log for file deletion
    try {
      await this.auditService.log({
        userId,
        action: 'file.delete',
        category: 'storage',
        status: 'success',
        details: { filePath: filePath.trim() },
        ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
        userAgent: req.headers?.['user-agent'] || undefined,
      });
    } catch {
      // Don't let audit logging failures break the main flow
    }

    return { success: true };
  }

  /**
   * Check if a storage name is available for the authenticated user
   */
  @Get('volumes/check-name/:name')
  @HttpCode(HttpStatus.OK)
  async checkNameAvailability(
    @Param('name') name: string,
    @Req() req: { user: { id: string } },
  ) {
    const userId = req.user.id;

    // Validate name format
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 128) {
      return { available: false, error: 'Invalid name length' };
    }

    // Check for invalid characters (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(trimmedName)) {
      return { available: false, error: 'Name can only contain letters, numbers, hyphens, and underscores' };
    }

    // Check database for existing name using raw SQL
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND name = ${trimmedName} AND status != 'wiped'
      LIMIT 1
    `;

    return { available: existing.length === 0 };
  }

  /**
   * Create a new storage volume for the authenticated user
   */
  @Post('volumes')
  async createVolume(
    @Body() dto: CreateStorageVolumeDto,
    @Req() req: FastifyRequest & { user: { id: string; email: string } },
  ) {
    const userId = req.user.id;
    const { name, quotaGb } = dto;

    // Validate quota
    if (!Number.isInteger(quotaGb) || quotaGb < MIN_QUOTA_GB || quotaGb > MAX_QUOTA_GB) {
      throw new BadRequestException(
        `Quota must be between ${MIN_QUOTA_GB}GB and ${MAX_QUOTA_GB}GB`,
      );
    }

    // Validate and sanitize name
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 128) {
      throw new BadRequestException('Invalid storage name');
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(trimmedName)) {
      throw new BadRequestException(
        'Name can only contain letters, numbers, hyphens, and underscores',
      );
    }

    // Check for existing volume with same name (including wiped records)
    // The unique constraint is on (user_id, name) regardless of status
    const existing = await this.prisma.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND name = ${trimmedName}
      LIMIT 1
    `;

    if (existing.length > 0) {
      if (existing[0].status === 'wiped') {
        throw new BadRequestException(
          `A storage volume named '${trimmedName}' was previously created and deleted. Please use a different name.`,
        );
      }
      throw new BadRequestException('A storage volume with this name already exists');
    }

    // Generate storageUid
    const storageUid = `u_${randomBytes(12).toString('hex')}`;
    const quotaBytes = BigInt(quotaGb) * BigInt(1024) ** BigInt(3);

    // Call storage provisioning service with the user-selected quota
    const result = await this.storageService.provisionUserQuota(storageUid, userId, quotaGb);

    if (!result.ok) {
      throw new BadRequestException(
        `Storage provisioning failed: ${result.error || 'Unknown error'}`,
      );
    }

    // Build the paths based on storageUid (same pattern as SSO provisioning)
    const zfsDatasetPath = `datapool/users/${storageUid}`;
    const nfsExportPath = `/mnt/nfs/users/${storageUid}`;

    // Multi-node: capture nodeId and storageBackend from provision result
    const provisionedNodeId = result.nodeId ?? null;
    const provisionedBackend = result.storageBackend ?? 'zfs_dataset';

    // Create database record using raw SQL
    try {
      const volume = await this.prisma.$queryRaw<StorageVolumeRow>`
        INSERT INTO user_storage_volumes (id, user_id, name, storage_uid, zfs_dataset_path, nfs_export_path, os_choice, quota_bytes, used_bytes, allocation_type, status, provisioned_at, node_id, storage_backend, created_at, updated_at)
        VALUES (
          gen_random_uuid()::uuid,
          ${userId}::uuid,
          ${trimmedName},
          ${storageUid},
          ${zfsDatasetPath},
          ${nfsExportPath},
          'ubuntu22',
          ${quotaBytes},
          0::bigint,
          'user_created',
          'active',
          NOW(),
          ${provisionedNodeId}::uuid,
          ${provisionedBackend},
          NOW(),
          NOW()
        )
        RETURNING id, name, storage_uid, quota_bytes, used_bytes, status, allocation_type, provisioned_at, created_at
      `;

      const v = volume[0];

      // Link the new storage volume to the user record (same fields SSO provisioning sets)
      await this.prisma.$executeRaw`
        UPDATE users
        SET storage_uid = ${storageUid},
            storage_provisioning_status = 'provisioned',
            storage_provisioned_at = NOW(),
            storage_provisioning_error = NULL,
            updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
      
      // Calculate billing info for the response
      const pricePerGbMonth = 7.00; // Rs.7 per GB per month
      const monthlyEstimate = quotaGb * pricePerGbMonth;
      const hourlyRate = (quotaGb * 700) / 730 / 100; // (quotaGb * paise) / hoursPerMonth / 100 = Rs/hour
      
      // Audit log for volume creation
      try {
        await this.auditService.log({
          userId,
          action: 'filestore.create',
          category: 'storage',
          status: 'success',
          details: { storageUid, name: trimmedName, quotaGb },
          ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
          userAgent: req.headers?.['user-agent'] || undefined,
        });
      } catch {
        // Don't let audit logging failures break the main flow
      }

      return {
        id: v.id,
        name: v.name,
        storageUid: v.storage_uid,
        quotaGb,
        usedGb: 0,
        status: v.status,
        allocationType: v.allocation_type,
        provisionedAt: v.provisioned_at,
        createdAt: v.created_at,
        // Billing info
        pricePerGbMonth,           // Rs.7 per GB/month
        monthlyEstimate,           // Total monthly cost in rupees
        hourlyRate,                // Hourly rate in rupees
      };
    } catch (error) {
      // If DB insert fails, the ZFS dataset was still created
      console.error('Failed to create storage volume record:', error);
      throw new BadRequestException(
        'Storage was provisioned but failed to save record. Please contact support.',
      );
    }
  }

  /**
   * Delete (wipe) the current user's active storage volume
   * This destroys the ZFS dataset and cleans up all related records
   */
  @Delete('volumes')
  @HttpCode(HttpStatus.OK)
  async deleteStorageVolume(@Req() req: FastifyRequest & { user: { id: string } }) {
    const userId = req.user.id;

    // 1. Find active volume
    const volumes = await this.prisma.$queryRaw<{ id: string; storage_uid: string }[]>`
      SELECT id, storage_uid FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (volumes.length === 0) {
      throw new NotFoundException('No active storage volume found');
    }

    const volume = volumes[0];

    // 2. Set status to 'wiping' (prevents concurrent operations)
    await this.prisma.$executeRaw`
      UPDATE user_storage_volumes
      SET status = 'wiping', updated_at = NOW()
      WHERE id = ${volume.id}::uuid
    `;

    // 3. Call host to destroy ZFS dataset
    const result = await this.storageService.deprovisionUserStorage(volume.storage_uid);

    if (!result.ok) {
      // Revert status on failure
      await this.prisma.$executeRaw`
        UPDATE user_storage_volumes
        SET status = 'active', updated_at = NOW()
        WHERE id = ${volume.id}::uuid
      `;
      throw new InternalServerErrorException(result.error || 'Failed to deprovision storage');
    }

    // 4. Clean up DB in a transaction
    // NOTE: BillingCharge records are PRESERVED for historical audit trail and rolling average calculations
    await this.prisma.$transaction(async (tx) => {
      // Delete related storage extensions (if any FK constraints exist)
      await tx.$executeRaw`
        DELETE FROM storage_extensions WHERE storage_volume_id = ${volume.id}::uuid
      `;

      // Update volume status to wiped
      await tx.$executeRaw`
        UPDATE user_storage_volumes
        SET status = 'wiped', wiped_at = NOW(), wipe_reason = 'User requested deletion via API', updated_at = NOW()
        WHERE id = ${volume.id}::uuid
      `;

      // Reset user storage fields
      await tx.$executeRaw`
        UPDATE users
        SET storage_uid = NULL, storage_provisioning_status = NULL, storage_provisioned_at = NULL, storage_provisioning_error = NULL, updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;
    });

    // Audit log for volume deletion
    try {
      await this.auditService.log({
        userId,
        action: 'filestore.delete',
        category: 'storage',
        status: 'success',
        details: { storageUid: volume.storage_uid, volumeId: volume.id },
        ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
        userAgent: req.headers?.['user-agent'] || undefined,
      });
    } catch {
      // Don't let audit logging failures break the main flow
    }

    return { ok: true, message: 'File Store deleted successfully' };
  }

  /**
   * Get a specific storage volume by ID
   */
  @Get('volumes/:id')
  async getVolume(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const userId = req.user.id;

    const volume = await this.prisma.$queryRaw<StorageVolumeRow[]>`
      SELECT id, name, storage_uid, quota_bytes, used_bytes, status, allocation_type, provisioned_at, created_at
      FROM user_storage_volumes
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND status != 'wiped'
      LIMIT 1
    `;

    if (volume.length === 0) {
      throw new NotFoundException('Storage volume not found');
    }

    const v = volume[0];
    return {
      id: v.id,
      name: v.name,
      storageUid: v.storage_uid,
      quotaGb: Number(v.quota_bytes) / (1024 * 1024 * 1024),
      usedGb: Number(v.used_bytes) / (1024 * 1024 * 1024),
      status: v.status,
      allocationType: v.allocation_type,
      provisionedAt: v.provisioned_at,
      createdAt: v.created_at,
    };
  }

  /**
   * Delete (wipe) a storage volume
   */
  @Delete('volumes/:id')
  @HttpCode(HttpStatus.OK)
  async deleteVolume(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const userId = req.user.id;

    // Check volume exists
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM user_storage_volumes
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND status != 'wiped'
      LIMIT 1
    `;

    if (existing.length === 0) {
      throw new NotFoundException('Storage volume not found');
    }

    // Update status to wiped
    await this.prisma.$executeRaw`
      UPDATE user_storage_volumes
      SET status = 'wiped', wiped_at = NOW(), wipe_reason = 'User requested deletion', updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
    `;

    // In production, you would also:
    // 1. Call the storage host to destroy the ZFS dataset
    // 2. Clean up NFS exports
    // 3. Remove container mounts

    return { success: true };
  }

  /**
   * Check if user has active sessions that would block storage operations.
   */
  @Get('volumes/active-sessions-check')
  @HttpCode(HttpStatus.OK)
  async checkActiveSessions(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;

    // Find active sessions with stateful storage
    const sessions = await this.prisma.$queryRaw<{ id: string; instance_name: string | null; status: string }[]>`
      SELECT id, instance_name, status
      FROM sessions
      WHERE user_id = ${userId}::uuid
        AND storage_mode = 'stateful'
        AND status IN ('running', 'starting', 'reconnecting')
    `;

    return {
      hasActiveSessions: sessions.length > 0,
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        instanceName: s.instance_name || 'Unnamed Instance',
        status: s.status,
      })),
    };
  }

  /**
   * Check available host storage space.
   */
  @Get('volumes/host-space-check')
  @HttpCode(HttpStatus.OK)
  async checkHostSpace() {
    const spaceInfo = await this.storageService.getHostSpace();

    if (!spaceInfo) {
      throw new ServiceUnavailableException('Unable to check host storage space');
    }

    return spaceInfo;
  }

  /**
   * Upgrade storage volume quota.
   */
  @Patch('volumes/:id')
  @HttpCode(HttpStatus.OK)
  async upgradeVolume(
    @Param('id') id: string,
    @Body() dto: UpgradeStorageVolumeDto,
    @Req() req: FastifyRequest & { user: { id: string; email: string } },
  ) {
    const userId = req.user.id;
    const { newQuotaGb } = dto;

    // 1. Find the volume and verify ownership
    const volumes = await this.prisma.$queryRaw<StorageVolumeRow[]>`
      SELECT id, name, storage_uid, quota_bytes, used_bytes, status
      FROM user_storage_volumes
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND status = 'active'
      LIMIT 1
    `;

    if (volumes.length === 0) {
      throw new NotFoundException('Storage volume not found');
    }

    const volume = volumes[0];
    const currentQuotaGb = Number(volume.quota_bytes) / (1024 * 1024 * 1024);

    // 2. Validate upgrade request
    if (newQuotaGb <= currentQuotaGb) {
      throw new BadRequestException(
        `New size must be greater than current size (${Math.floor(currentQuotaGb)}GB)`,
      );
    }

    if (newQuotaGb > MAX_QUOTA_GB) {
      throw new BadRequestException(`Maximum storage size is ${MAX_QUOTA_GB}GB`);
    }

    // 3. Check for active sessions
    const activeSessions = await this.prisma.$queryRaw<{ instance_name: string | null }[]>`
      SELECT instance_name
      FROM sessions
      WHERE user_id = ${userId}::uuid
        AND storage_mode = 'stateful'
        AND status IN ('running', 'starting', 'reconnecting')
    `;

    if (activeSessions.length > 0) {
      const names = activeSessions.map((s) => s.instance_name || 'Unnamed Instance').join(', ');
      throw new BadRequestException(
        `Cannot upgrade while instances are running: ${names}. Please stop all instances first.`,
      );
    }

    // 4. Check host space availability
    const spaceInfo = await this.storageService.getHostSpace();
    if (spaceInfo) {
      const requiredGb = newQuotaGb - Math.floor(currentQuotaGb);
      if (spaceInfo.availableGb < requiredGb) {
        throw new BadRequestException(
          `Insufficient host storage space. Available: ${spaceInfo.availableGb.toFixed(1)}GB, Required: ${requiredGb}GB`,
        );
      }
    }

    // 5. Perform ZFS upgrade on host
    const upgradeResult = await this.storageService.upgradeStorageQuota(volume.storage_uid, newQuotaGb);

    if (!upgradeResult.ok) {
      throw new InternalServerErrorException(
        `Storage upgrade failed: ${upgradeResult.error}. Your storage is unchanged.`,
      );
    }

    // 6. Update database in transaction
    const newQuotaBytes = BigInt(newQuotaGb) * BigInt(1024) ** BigInt(3);
    const previousQuotaBytes = volume.quota_bytes;
    const extensionBytes = newQuotaBytes - previousQuotaBytes;

    await this.prisma.$transaction(async (tx) => {
      // Create extension record
      await tx.$executeRaw`
        INSERT INTO storage_extensions (id, user_id, storage_volume_id, extension_type, previous_quota_bytes, new_quota_bytes, extension_bytes, amount_cents, currency, created_at)
        VALUES (
          gen_random_uuid()::uuid,
          ${userId}::uuid,
          ${volume.id}::uuid,
          'user_upgrade',
          ${previousQuotaBytes},
          ${newQuotaBytes},
          ${extensionBytes},
          0,
          'INR',
          NOW()
        )
      `;

      // Update volume quota
      await tx.$executeRaw`
        UPDATE user_storage_volumes
        SET quota_bytes = ${newQuotaBytes}, updated_at = NOW()
        WHERE id = ${volume.id}::uuid
      `;
    });

    // 7. Audit log
    try {
      await this.auditService.log({
        userId,
        action: 'filestore.upgrade',
        category: 'storage',
        status: 'success',
        details: {
          volumeId: volume.id,
          name: volume.name,
          storageUid: volume.storage_uid,
          previousQuotaGb: Math.floor(currentQuotaGb),
          newQuotaGb,
        },
        ipAddress: req.ip || (req.headers?.['x-forwarded-for'] as string) || undefined,
        userAgent: req.headers?.['user-agent'] || undefined,
      });
    } catch {
      // Don't let audit failures break the main flow
    }

    // 8. Calculate billing info
    const pricePerGbMonth = 7.00;
    const monthlyEstimate = newQuotaGb * pricePerGbMonth;
    const hourlyRate = (newQuotaGb * 700) / 730 / 100;

    return {
      id: volume.id,
      name: volume.name,
      storageUid: volume.storage_uid,
      quotaGb: newQuotaGb,
      usedGb: Number(volume.used_bytes) / (1024 * 1024 * 1024),
      status: 'active',
      allocationType: 'user_created',
      previousQuotaGb: Math.floor(currentQuotaGb),
      monthlyEstimate,
      hourlyRate,
    };
  }
}
