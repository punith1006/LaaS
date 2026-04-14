import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditLogParams {
  userId: string;
  action: string;       // 'auth.login', 'filestore.create', 'file.upload', etc.
  category: string;     // 'auth', 'storage', 'file', 'billing', 'wallet'
  status: string;       // 'success', 'failed', 'pending'
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly logBaseDir: string;

  constructor(private readonly prisma: PrismaService) {
    // logs/audit/ directory relative to backend root
    this.logBaseDir = path.resolve(process.cwd(), 'logs', 'audit');
  }

  async log(params: AuditLogParams): Promise<void> {
    // Fire both DB and filesystem writes in parallel, don't let logging failures
    // crash the main request flow
    await Promise.allSettled([
      this.writeToDatabase(params),
      this.writeToFilesystem(params),
    ]);
  }

  private async writeToDatabase(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: params.userId,
          action: params.action,
          resourceType: params.category,
          actionReason: params.status,
          newData: params.details ?? undefined,
          clientIp: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log to DB: ${err.message}`, err.stack);
    }
  }

  private async writeToFilesystem(params: AuditLogParams): Promise<void> {
    try {
      const userDir = path.join(this.logBaseDir, params.userId);
      
      // Create user directory if it doesn't exist
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Daily log file: YYYY-MM-DD.log
      const today = new Date().toISOString().split('T')[0]; // e.g., '2026-03-22'
      const logFile = path.join(userDir, `${today}.log`);

      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        action: params.action,
        category: params.category,
        status: params.status,
        details: params.details ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      }) + '\n';

      fs.appendFileSync(logFile, logEntry, 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to write audit log to filesystem: ${err.message}`, err.stack);
    }
  }
}
