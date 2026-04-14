import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import {
  ReferralLinkResponse,
  ReferralStatsResponse,
  ConversionHistoryResponse,
} from './dto/referral.dto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly REFERRAL_REWARD_CENTS = 5000n; // Rs. 50 = 5000 paise
  private readonly MIN_PAYMENT_CENTS = 10000; // Rs. 100 = 10000 paise

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generate or retrieve existing referral link for a user
   */
  async generateReferralLink(userId: string): Promise<ReferralLinkResponse> {
    // Check if user already has a referral record
    const existingReferral = await this.prisma.referral.findUnique({
      where: { referrerUserId: userId },
    });

    if (existingReferral && existingReferral.isActive) {
      return {
        code: existingReferral.referralCode,
        url: existingReferral.referralUrl,
        isActive: existingReferral.isActive,
        createdAt: existingReferral.createdAt,
      };
    }

    // Generate unique referral code
    const code = await this.generateUniqueReferralCode();
    const referralUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ref/${code}`;

    // Create referral record in transaction with event
    const referral = await this.prisma.$transaction(async (tx) => {
      const newReferral = await tx.referral.create({
        data: {
          referrerUserId: userId,
          referralCode: code,
          referralUrl,
          isActive: true,
          totalClicks: 0,
          totalSignups: 0,
          totalRewardsCents: BigInt(0),
        },
      });

      // Create referral event
      await tx.referralEvent.create({
        data: {
          referralId: newReferral.id,
          eventType: 'LINK_GENERATED',
          actorType: 'user',
          actorId: userId,
          metadata: { code, url: referralUrl },
        },
      });

      return newReferral;
    });

    return {
      code: referral.referralCode,
      url: referral.referralUrl,
      isActive: referral.isActive,
      createdAt: referral.createdAt,
    };
  }

  /**
   * Generate unique 8-character alphanumeric referral code
   * Retries up to 5 times on collision
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = crypto.randomBytes(6).toString('base64url').substring(0, 8);

      // Check if code already exists
      const existing = await this.prisma.referral.findUnique({
        where: { referralCode: code },
      });

      if (!existing) {
        return code;
      }

      this.logger.warn(`Referral code collision on attempt ${attempt + 1}, retrying...`);
    }

    throw new Error('Failed to generate unique referral code after maximum retries');
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string): Promise<ReferralStatsResponse> {
    const referral = await this.prisma.referral.findUnique({
      where: { referrerUserId: userId },
      include: {
        conversions: {
          include: {
            referredUser: {
              select: {
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!referral) {
      return {
        totalClicks: 0,
        totalSignups: 0,
        totalQualified: 0,
        totalPending: 0,
        totalRewardsCents: 0,
        conversions: [],
      };
    }

    // Aggregate stats
    const totalQualified = referral.conversions.filter(
      (c) => c.rewardStatus === 'CREDITED',
    ).length;
    const totalPending = referral.conversions.filter(
      (c) => c.status === 'SIGNUP_COMPLETED' && c.rewardStatus === 'PENDING',
    ).length;

    return {
      totalClicks: referral.totalClicks,
      totalSignups: referral.totalSignups,
      totalQualified,
      totalPending,
      totalRewardsCents: Number(referral.totalRewardsCents),
      conversions: referral.conversions.map((c) => ({
        id: c.id,
        referredUserEmail: this.maskEmail(c.referredUser.email),
        status: c.status,
        rewardStatus: c.rewardStatus,
        signupCompletedAt: c.signupCompletedAt,
        firstPaymentAt: c.firstPaymentAt,
        rewardCreditedAt: c.rewardCreditedAt,
      })),
    };
  }

  /**
   * Mask email for privacy: p***a@gmail.com
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  }

  /**
   * Track a signup from a referral link
   */
  async trackSignup(
    referralCode: string,
    referredUserId: string,
    signupMethod: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    // Find referral by code
    const referral = await this.prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral || !referral.isActive) {
      throw new NotFoundException('Invalid or inactive referral code');
    }

    // Self-referral check
    if (referral.referrerUserId === referredUserId) {
      throw new BadRequestException('Self-referral is not allowed');
    }

    // Check if referred user already has a conversion
    const existingConversion = await this.prisma.referralConversion.findUnique({
      where: { referredUserId },
    });

    if (existingConversion) {
      // Silently ignore - already tracked
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Create conversion record
        await tx.referralConversion.create({
          data: {
            referralId: referral.id,
            referrerUserId: referral.referrerUserId,
            referredUserId,
            status: 'SIGNUP_COMPLETED',
            signupMethod,
            metadata: metadata ?? {},
          },
        });

        // Increment total signups
        await tx.referral.update({
          where: { id: referral.id },
          data: { totalSignups: { increment: 1 } },
        });

        // Create event
        await tx.referralEvent.create({
          data: {
            referralId: referral.id,
            eventType: 'SIGNUP_COMPLETED',
            actorType: 'system',
            actorId: referredUserId,
            metadata: { signupMethod, ...metadata },
          },
        });
      });
    } catch (error: any) {
      // Handle unique constraint violation (P2002) - silently ignore
      if (error.code === 'P2002') {
        return;
      }
      throw error;
    }
  }

  /**
   * Check and process payment qualification for referred users
   * Called when a user makes their first payment
   */
  async checkAndProcessPaymentQualification(
    referredUserId: string,
    paymentAmountCents: bigint | number,
    paymentTxnId: string,
  ): Promise<void> {
    // Find pending conversion for this user
    const conversion = await this.prisma.referralConversion.findFirst({
      where: {
        referredUserId,
        status: 'SIGNUP_COMPLETED',
        rewardStatus: 'PENDING',
      },
      include: {
        referral: true,
      },
    });

    // If no pending conversion, return early (idempotent)
    if (!conversion) {
      return;
    }

    // Check minimum payment amount (Rs. 100)
    const paymentCents = BigInt(paymentAmountCents);
    if (paymentCents < BigInt(this.MIN_PAYMENT_CENTS)) {
      return;
    }

    const referrerUserId = conversion.referrerUserId;
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update conversion to QUALIFIED
        await tx.referralConversion.update({
          where: { id: conversion.id },
          data: {
            status: 'QUALIFIED',
            firstPaymentAt: now,
            firstPaymentAmountCents: paymentCents,
            firstPaymentTxnId: paymentTxnId,
          },
        });

        // 2. Find or create referrer's wallet
        let wallet = await tx.wallet.findUnique({
          where: { userId: referrerUserId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: referrerUserId,
              balanceCents: BigInt(0),
              lifetimeCreditsCents: BigInt(0),
              lifetimeSpentCents: BigInt(0),
            },
          });
        }

        // 3. Calculate new balance
        const newBalanceCents = BigInt(wallet.balanceCents) + this.REFERRAL_REWARD_CENTS;
        const newLifetimeCreditsCents =
          BigInt(wallet.lifetimeCreditsCents) + this.REFERRAL_REWARD_CENTS;

        // 4. Update wallet
        wallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCents: newBalanceCents,
            lifetimeCreditsCents: newLifetimeCreditsCents,
          },
        });

        // 5. Create wallet transaction
        const walletTxn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: referrerUserId,
            txnType: 'credit',
            amountCents: this.REFERRAL_REWARD_CENTS,
            balanceAfterCents: newBalanceCents,
            referenceType: 'referral_bonus',
            referenceId: conversion.id,
            description: 'Referral bonus - new user signup and first payment',
          },
        });

        // 6. Update conversion to REWARD_CREDITED
        await tx.referralConversion.update({
          where: { id: conversion.id },
          data: {
            status: 'REWARD_CREDITED',
            rewardStatus: 'CREDITED',
            rewardCreditedAt: now,
            rewardWalletTxnId: walletTxn.id,
          },
        });

        // 7. Update referral total rewards
        await tx.referral.update({
          where: { id: conversion.referralId },
          data: {
            totalRewardsCents: {
              increment: this.REFERRAL_REWARD_CENTS,
            },
          },
        });

        // 8. Create referral events
        await tx.referralEvent.create({
          data: {
            referralId: conversion.referralId,
            referralConversionId: conversion.id,
            eventType: 'PAYMENT_COMPLETED',
            actorType: 'system',
            metadata: {
              paymentAmountCents: Number(paymentCents),
              paymentTxnId,
            },
          },
        });

        await tx.referralEvent.create({
          data: {
            referralId: conversion.referralId,
            referralConversionId: conversion.id,
            eventType: 'REWARD_CREDITED',
            actorType: 'system',
            metadata: {
              rewardAmountCents: Number(this.REFERRAL_REWARD_CENTS),
              walletTxnId: walletTxn.id,
            },
          },
        });
      });

      // Audit log
      try {
        await this.auditService.log({
          userId: referrerUserId,
          action: 'referral.reward_credited',
          category: 'referral',
          status: 'success',
          details: {
            referredUserId,
            rewardAmountCents: Number(this.REFERRAL_REWARD_CENTS),
            paymentTxnId,
          },
        });
      } catch {
        // Don't let audit logging failures break the flow
      }

      this.logger.log(
        `Referral reward credited: referrer=${referrerUserId}, referred=${referredUserId}, amount=Rs.50`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process referral qualification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get paginated conversion history for a user
   */
  async getConversionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ConversionHistoryResponse> {
    const skip = (page - 1) * limit;

    const [conversions, total] = await Promise.all([
      this.prisma.referralConversion.findMany({
        where: { referrerUserId: userId },
        include: {
          referredUser: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referralConversion.count({
        where: { referrerUserId: userId },
      }),
    ]);

    return {
      data: conversions.map((c) => ({
        id: c.id,
        referredUserEmail: this.maskEmail(c.referredUser.email),
        referredUserFirstName: c.referredUser.firstName,
        status: c.status,
        rewardStatus: c.rewardStatus,
        signupCompletedAt: c.signupCompletedAt,
        firstPaymentAt: c.firstPaymentAt,
        firstPaymentAmountCents: c.firstPaymentAmountCents
          ? Number(c.firstPaymentAmountCents)
          : null,
        rewardCreditedAt: c.rewardCreditedAt,
        rewardAmountCents: c.rewardAmountCents,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Track a click on a referral link
   */
  async trackLinkClick(
    referralCode: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Increment click count
      await tx.referral.update({
        where: { id: referral.id },
        data: { totalClicks: { increment: 1 } },
      });

      // Create event
      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          eventType: 'LINK_CLICKED',
          actorType: 'anonymous',
          metadata,
        },
      });
    });
  }
}
