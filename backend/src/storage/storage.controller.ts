import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { IsString, IsNotEmpty, IsInt, Min, Max, Length } from 'class-validator';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
    const volumes = await this.prisma.$queryRaw<{ storage_uid: string }[]>`
      SELECT storage_uid FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (volumes.length === 0) {
      return { hasStorage: false, reachable: false, serviceHealthy: false };
    }

    const storageUid = volumes[0].storage_uid;

    // Check service-level health first
    const health = await this.storageService.checkStorageHealth();
    const serviceHealthy = health?.healthy ?? false;

    if (!serviceHealthy) {
      return { hasStorage: true, reachable: false, serviceHealthy: false };
    }

    // Check if the specific dataset exists by probing usage
    const usage = await this.storageService.getStorageUsage(storageUid);
    const datasetExists = usage !== null;

    return {
      hasStorage: true,
      reachable: datasetExists && serviceHealthy,
      serviceHealthy,
      datasetExists,
    };
  }

  /**
   * Create a folder in the authenticated user's storage
   */
  @Post('files/mkdir')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @Req() req: { user: { id: string } },
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

    return { success: true, uploaded, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Download a file from the authenticated user's storage
   */
  @Get('files/download')
  async downloadFile(
    @Req() req: { user: { id: string } },
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
    @Req() req: { user: { id: string } },
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
    @Req() req: { user: { id: string; email: string } },
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

    // Check for duplicate name using raw SQL
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND name = ${trimmedName} AND status != 'wiped'
      LIMIT 1
    `;

    if (existing.length > 0) {
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

    // Create database record using raw SQL
    try {
      const volume = await this.prisma.$queryRaw<StorageVolumeRow>`
        INSERT INTO user_storage_volumes (id, user_id, name, storage_uid, zfs_dataset_path, nfs_export_path, os_choice, quota_bytes, used_bytes, allocation_type, status, provisioned_at, created_at, updated_at)
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
}
