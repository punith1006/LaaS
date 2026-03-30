import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
          allocationType: { notIn: ['sso_default', 'institution_signup'] },
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
        } catch (error: unknown) {
          errorCount++;
          this.logger.error(
            `Failed billing for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(
        `Billing cycle complete: ${successCount} charged, ${skipCount} skipped, ${errorCount} errors`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Billing cycle failed: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      if (
        wallet.spendLimitEnabled &&
        wallet.spendLimitCents !== null &&
        wallet.spendLimitCents !== undefined
      ) {
        // For date_range, check if we're within the active period
        if (wallet.spendLimitPeriod === 'date_range') {
          const now = new Date();
          const startDate = wallet.spendLimitStartDate
            ? new Date(wallet.spendLimitStartDate)
            : null;
          const endDate = wallet.spendLimitEndDate
            ? new Date(wallet.spendLimitEndDate)
            : null;

          // If outside the date range, treat as no spend limit
          if (!startDate || !endDate || now < startDate || now > endDate) {
            // Skip spend limit check - not within active range
          } else {
            // Within date range - apply spend limit
            const periodStart = this.getSpendLimitPeriodStart(
              wallet.spendLimitPeriod,
              wallet.spendLimitStartDate,
            );
            const periodSpent = await tx.billingCharge.aggregate({
              where: {
                userId,
                createdAt: {
                  gte: periodStart,
                  lte: endDate,
                },
              },
              _sum: { amountCents: true },
            });

            const totalSpentInPeriod = Number(
              periodSpent._sum.amountCents || 0,
            );
            const spendLimit = Number(wallet.spendLimitCents);

            if (totalSpentInPeriod + totalChargeCents > spendLimit) {
              this.logger.warn(
                `User ${userId} would exceed spend limit (${totalSpentInPeriod + totalChargeCents} > ${spendLimit}), skipping`,
              );
              return 'skipped';
            }
          }
        } else {
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
      }

      // 4. Insufficient balance check — don't go negative
      if (currentBalance < totalChargeCents) {
        this.logger.warn(
          `User ${userId} insufficient balance (${currentBalance} < ${totalChargeCents}), skipping`,
        );
        return 'skipped';
      }

      const newBalance = BigInt(wallet.balanceCents) - BigInt(totalChargeCents);

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
          details: {
            totalChargeCents,
            volumeCount: volumeDetails.length,
            period: 'hourly',
          },
        });
      } catch {
        // Don't let audit logging failures break billing
      }

      return 'charged';
    });
  }

  /**
   * Get the start of the current spend limit period
   * @param period - 'daily', 'weekly', 'monthly', or 'date_range'
   * @param startDate - Required for 'date_range' period
   */
  getSpendLimitPeriodStart(
    period: string | null,
    startDate?: Date | null,
  ): Date {
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
      case 'date_range':
        // For date_range, use the startDate from the wallet settings
        return startDate
          ? new Date(startDate)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  /**
   * Check if a date_range period is currently active
   */
  private isDateRangeActive(
    startDate?: Date | null,
    endDate?: Date | null,
  ): boolean {
    if (!startDate || !endDate) return false;
    const now = new Date();
    return now >= new Date(startDate) && now <= new Date(endDate);
  }

  /**
   * Get spend limit settings for a user
   */
  async getSpendLimitSettings(userId: string): Promise<{
    enabled: boolean;
    limitAmountRupees: number | null;
    period: string | null;
    startDate: string | null;
    endDate: string | null;
    consentedAt: string | null;
    currentPeriodSpendRupees: number;
  }> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      return {
        enabled: false,
        limitAmountRupees: null,
        period: null,
        startDate: null,
        endDate: null,
        consentedAt: null,
        currentPeriodSpendRupees: 0,
      };
    }

    // Calculate current period spend
    let currentPeriodSpendCents = 0;

    if (wallet.spendLimitEnabled && wallet.spendLimitPeriod) {
      // For date_range, check if we're within the active period
      if (wallet.spendLimitPeriod === 'date_range') {
        if (
          this.isDateRangeActive(
            wallet.spendLimitStartDate,
            wallet.spendLimitEndDate,
          )
        ) {
          const periodStart = this.getSpendLimitPeriodStart(
            wallet.spendLimitPeriod,
            wallet.spendLimitStartDate,
          );
          const periodEnd = wallet.spendLimitEndDate
            ? new Date(wallet.spendLimitEndDate)
            : new Date();

          const periodCharges = await this.prisma.billingCharge.aggregate({
            where: {
              userId,
              createdAt: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
            _sum: { amountCents: true },
          });
          currentPeriodSpendCents = Number(periodCharges._sum.amountCents || 0);
        }
      } else {
        const periodStart = this.getSpendLimitPeriodStart(
          wallet.spendLimitPeriod,
        );
        const periodCharges = await this.prisma.billingCharge.aggregate({
          where: {
            userId,
            createdAt: { gte: periodStart },
          },
          _sum: { amountCents: true },
        });
        currentPeriodSpendCents = Number(periodCharges._sum.amountCents || 0);
      }
    }

    return {
      enabled: wallet.spendLimitEnabled,
      limitAmountRupees:
        wallet.spendLimitCents !== null ? wallet.spendLimitCents / 100 : null,
      period: wallet.spendLimitPeriod,
      startDate: wallet.spendLimitStartDate?.toISOString() ?? null,
      endDate: wallet.spendLimitEndDate?.toISOString() ?? null,
      consentedAt: wallet.spendLimitConsentedAt?.toISOString() ?? null,
      currentPeriodSpendRupees: currentPeriodSpendCents / 100,
    };
  }

  /**
   * Update spend limit settings for a user
   */
  async updateSpendLimit(
    userId: string,
    dto: {
      enabled: boolean;
      limitAmountRupees?: number;
      period?: string;
      startDate?: string;
      endDate?: string;
      consentAcknowledged: boolean;
    },
  ): Promise<{
    enabled: boolean;
    limitAmountRupees: number | null;
    period: string | null;
    startDate: string | null;
    endDate: string | null;
    consentedAt: string | null;
    currentPeriodSpendRupees: number;
  }> {
    // Get current wallet for audit comparison
    const currentWallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!currentWallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    // Capture old values for audit
    const oldData = {
      spendLimitEnabled: currentWallet.spendLimitEnabled,
      spendLimitCents: currentWallet.spendLimitCents,
      spendLimitPeriod: currentWallet.spendLimitPeriod,
      spendLimitStartDate:
        currentWallet.spendLimitStartDate?.toISOString() ?? null,
      spendLimitEndDate: currentWallet.spendLimitEndDate?.toISOString() ?? null,
    };

    // Build update data
    const updateData: {
      spendLimitEnabled: boolean;
      spendLimitCents?: number | null;
      spendLimitPeriod?: string | null;
      spendLimitStartDate?: Date | null;
      spendLimitEndDate?: Date | null;
      spendLimitConsentedAt?: Date | null;
      spendLimitWarning85Sent?: boolean;
    } = {
      spendLimitEnabled: dto.enabled,
    };

    if (dto.enabled) {
      // When enabling, set all the values
      updateData.spendLimitCents = Math.round(dto.limitAmountRupees! * 100); // Convert rupees to paise
      updateData.spendLimitPeriod = dto.period!;
      updateData.spendLimitStartDate = dto.startDate
        ? new Date(dto.startDate)
        : null;
      if (dto.endDate) {
        const end = new Date(dto.endDate);
        end.setHours(23, 59, 59, 999);
        updateData.spendLimitEndDate = end;
      } else {
        updateData.spendLimitEndDate = null;
      }
      updateData.spendLimitConsentedAt = new Date();
      updateData.spendLimitWarning85Sent = false; // Reset warning flag when settings change
    }
    // When disabling, we only set spendLimitEnabled=false, keep other fields for history

    // Update wallet
    const updatedWallet = await this.prisma.wallet.update({
      where: { id: currentWallet.id },
      data: updateData,
    });

    // Capture new values for audit
    const newData = {
      spendLimitEnabled: updatedWallet.spendLimitEnabled,
      spendLimitCents: updatedWallet.spendLimitCents,
      spendLimitPeriod: updatedWallet.spendLimitPeriod,
      spendLimitStartDate:
        updatedWallet.spendLimitStartDate?.toISOString() ?? null,
      spendLimitEndDate: updatedWallet.spendLimitEndDate?.toISOString() ?? null,
    };

    // Audit log
    try {
      await this.auditService.log({
        userId,
        action: 'spend_limit.update',
        category: 'billing',
        status: 'success',
        details: { oldData, newData },
      });
    } catch {
      // Don't let audit logging failures break the operation
      this.logger.warn(`Failed to audit spend limit update for user ${userId}`);
    }

    this.logger.log(
      `User ${userId} spend limit updated: enabled=${dto.enabled}, limit=${dto.limitAmountRupees ?? 'N/A'} rupees, period=${dto.period ?? 'N/A'}`,
    );

    // Return updated settings
    return this.getSpendLimitSettings(userId);
  }
}
