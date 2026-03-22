import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Runs every hour at minute 0.
   * Processes storage billing for ALL users with active chargeable volumes.
   * Each user is processed in isolation within its own transaction.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyStorageBilling() {
    const billingHour = new Date();
    // Round down to the start of current hour for idempotency key
    billingHour.setMinutes(0, 0, 0);

    this.logger.log(
      `Starting hourly storage billing cycle for ${billingHour.toISOString()}`,
    );

    try {
      // Find all users with active, chargeable storage volumes
      // EXCLUDE sso_default (free 5GB for SSO students)
      const usersWithVolumes = await this.prisma.userStorageVolume.findMany({
        where: {
          status: 'active',
          allocationType: { notIn: ['sso_default'] },
        },
        select: {
          id: true,
          userId: true,
          quotaBytes: true,
          pricePerGbCentsMonth: true,
        },
      });

      // Group volumes by userId
      const volumesByUser = new Map<string, typeof usersWithVolumes>();
      for (const vol of usersWithVolumes) {
        const existing = volumesByUser.get(vol.userId) || [];
        existing.push(vol);
        volumesByUser.set(vol.userId, existing);
      }

      this.logger.log(
        `Found ${volumesByUser.size} users with chargeable storage volumes`,
      );

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const [userId, volumes] of volumesByUser) {
        try {
          const result = await this.processUserStorageBilling(
            userId,
            volumes,
            billingHour,
          );
          if (result === 'charged') successCount++;
          else if (result === 'skipped') skipCount++;
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed billing for user ${userId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Billing cycle complete: ${successCount} charged, ${skipCount} skipped, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(`Billing cycle failed: ${error.message}`);
    }
  }

  /**
   * Process storage billing for a single user.
   * Runs in an atomic Prisma transaction for isolation.
   */
  private async processUserStorageBilling(
    userId: string,
    volumes: {
      id: string;
      quotaBytes: bigint;
      pricePerGbCentsMonth: number;
    }[],
    billingHour: Date,
  ): Promise<'charged' | 'skipped'> {
    // Calculate total hourly charge across all volumes
    let totalChargeCents = 0;
    const volumeDetails: {
      volumeId: string;
      quotaGb: number;
      chargeCents: number;
    }[] = [];

    for (const vol of volumes) {
      const quotaGb = Number(vol.quotaBytes) / (1024 * 1024 * 1024);
      // hourly rate = (pricePerGbCentsMonth * quotaGb) / 730 (avg hours per month)
      const hourlyChargeCents = Math.round(
        (vol.pricePerGbCentsMonth * quotaGb) / 730,
      );

      if (hourlyChargeCents > 0) {
        totalChargeCents += hourlyChargeCents;
        volumeDetails.push({
          volumeId: vol.id,
          quotaGb: Math.round(quotaGb),
          chargeCents: hourlyChargeCents,
        });
      }
    }

    if (totalChargeCents === 0) {
      return 'skipped';
    }

    // Atomic transaction: charge + deduct wallet + record transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check: has this user already been charged for this hour?
      const existingCharge = await tx.billingCharge.findFirst({
        where: {
          userId,
          chargeType: 'storage',
          createdAt: {
            gte: billingHour,
            lt: new Date(billingHour.getTime() + 3600000), // +1 hour
          },
        },
      });

      if (existingCharge) {
        this.logger.debug(
          `User ${userId} already charged for ${billingHour.toISOString()}, skipping`,
        );
        return 'skipped';
      }

      // 2. Get user's wallet
      const wallet = await tx.wallet.findFirst({
        where: { userId },
      });

      if (!wallet) {
        this.logger.warn(
          `No wallet found for user ${userId}, skipping storage billing`,
        );
        return 'skipped';
      }

      const currentBalance = Number(wallet.balanceCents);

      // 3. Spend limit check
      if (wallet.spendLimitEnabled && wallet.spendLimitCents !== null && wallet.spendLimitCents !== undefined) {
        // Check if adding this charge would exceed spend limit
        // Get total spent in the current period
        const periodStart = this.getSpendLimitPeriodStart(
          wallet.spendLimitPeriod,
        );
        const periodSpent = await tx.billingCharge.aggregate({
          where: {
            userId,
            createdAt: { gte: periodStart },
          },
          _sum: { amountCents: true },
        });

        const totalSpentInPeriod = Number(periodSpent._sum.amountCents || 0);
        const spendLimit = Number(wallet.spendLimitCents);

        if (totalSpentInPeriod + totalChargeCents > spendLimit) {
          this.logger.warn(
            `User ${userId} would exceed spend limit (${totalSpentInPeriod + totalChargeCents} > ${spendLimit}), skipping`,
          );
          return 'skipped';
        }
      }

      // 4. Insufficient balance check — don't go negative
      if (currentBalance < totalChargeCents) {
        this.logger.warn(
          `User ${userId} insufficient balance (${currentBalance} < ${totalChargeCents}), skipping`,
        );
        return 'skipped';
      }

      const newBalance =
        BigInt(wallet.balanceCents) - BigInt(totalChargeCents);

      // 5. Create WalletTransaction record first to get its ID for linking
      const walletTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          txnType: 'debit',
          amountCents: BigInt(totalChargeCents),
          balanceAfterCents: newBalance,
          referenceType: 'storage_billing',
          description: `Storage billing: ${volumeDetails.map((v) => `${v.quotaGb}GB`).join(', ')} for ${billingHour.toISOString()}`,
        },
      });

      // 6. Create BillingCharge records (one per volume for traceability)
      for (const detail of volumeDetails) {
        await tx.billingCharge.create({
          data: {
            userId,
            chargeType: 'storage',
            storageVolumeId: detail.volumeId,
            quotaGb: detail.quotaGb,
            durationSeconds: 3600, // 1 hour
            rateCentsPerHour: detail.chargeCents,
            amountCents: BigInt(detail.chargeCents),
            currency: 'INR',
            walletTransactionId: walletTransaction.id,
            createdAt: billingHour,
          },
        });
      }

      // 7. Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: newBalance,
          lifetimeSpentCents: {
            increment: totalChargeCents,
          },
        },
      });

      this.logger.log(
        `Charged user ${userId}: ${totalChargeCents} paise for ${volumeDetails.length} volume(s)`,
      );

      // Audit log for successful billing charge
      try {
        await this.auditService.log({
          userId,
          action: 'billing.charge',
          category: 'billing',
          status: 'success',
          details: { totalChargeCents, volumeCount: volumeDetails.length, period: 'hourly' },
        });
      } catch {
        // Don't let audit logging failures break billing
      }

      return 'charged';
    });
  }

  /**
   * Get the start of the current spend limit period
   */
  private getSpendLimitPeriodStart(period: string | null): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly': {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        return new Date(now.getFullYear(), now.getMonth(), diff);
      }
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
}
