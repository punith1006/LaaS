import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface HomeDashboardData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    authType: string;
    storageUid: string | null;
    storageQuotaGb: number;
    storageProvisioningStatus: string | null;
    storageProvisioningError: string | null;
  };
  storage: {
    quotaGb: number;
    usedGb: number;
    status: string;
    healthStatus: string | null; // 'live' | 'unreachable' | null
  };
  quickStats: {
    totalSessions: number;
    activeSessions: number;
    totalDatasets: number;
    totalNotebooks: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'session' | 'dataset' | 'notebook' | 'storage';
  action: string;
  description: string;
  timestamp: Date;
}

export interface BillingData {
  plan: {
    type: string;
    name: string;
    description: string;
  };
  usage: {
    storageQuotaGb: number;
    storageUsedGb: number;
    storageAllocatedGb: number;
    computeHoursUsed: number;
    billingCycle: string;
  };
  paymentMethod: {
    type: string;
    description: string;
  } | null;
  billingHistory: BillingHistoryItem[];
  // Lambda.ai style billing fields
  creditBalance: number;
  spendRate: number;
  spendLimit: number;
  spendLimitEnabled: boolean;
  dailySpend: number;
  currentSpendRate: number; // Total (compute + storage) burn rate in rupees/hour
  computeBurnRateRupeesPerHour: number; // Compute-only burn rate in rupees/hour
  storageBurnRateCentsPerHour: number; // Storage burn rate in paise/cents per hour
  storageMonthlyEstimateCents: number; // Total monthly storage cost in paise/cents
  runway: number | null; // Hours of runway remaining (null if no active sessions/storage)
  gpus: number;
  gpuVramMb: number;
  vcpus: number;
  memoryMb: number;
  endpoints: number;
  storageAllocatedGb: number;
  storageUsedGb: number;
  storageUsagePercent: number; // Live usage % from ZFS via Python service
  hourlyData: HourlySpendData[]; // Today's hourly spend data for the chart
}

export interface BillingHistoryItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: string;
}

export interface HourlySpendData {
  hour: string;
  cumulativeSpend: number;
  hourlyRate: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async getHomeData(userId: string): Promise<HomeDashboardData> {
    // Get user with storage info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        authType: true,
        storageUid: true,
        storageProvisioningStatus: true,
        storageProvisioningError: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get storage volume info (real quota from DB)
    const storageVolume = await this.prisma.userStorageVolume.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    // Get session stats
    const totalSessions = await this.prisma.session.count({
      where: { userId },
    });

    const activeSessions = await this.prisma.session.count({
      where: {
        userId,
        status: { in: ['pending', 'running'] },
      },
    });

    // Get dataset count (placeholder - model not yet implemented)
    const totalDatasets = 0;

    // Get notebook count (placeholder - model not yet implemented)
    const totalNotebooks = 0;

    // Storage quota from UserStorageVolume.quotaBytes (real DB data)
    const quotaBytes = storageVolume?.quotaBytes ?? BigInt(0);
    const quotaGb = Math.round((Number(quotaBytes) / 1024 ** 3) * 100) / 100;

    // Live storage used from ZFS via Python service (real-time, no DB caching)
    let usedGb =
      Math.round(
        (Number(storageVolume?.usedBytes ?? BigInt(0)) / 1024 ** 3) * 100,
      ) / 100;
    if (user.storageUid && quotaGb > 0) {
      const liveUsage = await this.storageService.getStorageUsage(
        user.storageUid,
      );
      if (liveUsage) {
        usedGb = liveUsage.usedGb;
      }
    }

    // Check storage service health if storage is provisioned
    let healthStatus: string | null = null;
    if (user.storageProvisioningStatus === 'provisioned' && user.storageUid) {
      const health = await this.storageService.checkStorageHealth();
      if (health) {
        healthStatus = health.healthy ? 'live' : 'unreachable';
      }
    }

    // If service is healthy, verify the user's actual dataset exists
    if (healthStatus === 'live' && user.storageUid) {
      const usage = await this.storageService.getStorageUsage(user.storageUid);
      if (usage === null) {
        healthStatus = 'not_found'; // Service up but dataset missing
      }
    }

    // Get recent activity (placeholder - can be expanded)
    const recentActivity: ActivityItem[] = [];

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authType: user.authType,
        storageUid: user.storageUid,
        storageQuotaGb: quotaGb,
        storageProvisioningStatus: user.storageProvisioningStatus,
        storageProvisioningError: user.storageProvisioningError,
      },
      storage: {
        quotaGb,
        usedGb,
        status: user.storageProvisioningStatus ?? 'unknown',
        healthStatus,
      },
      quickStats: {
        totalSessions,
        activeSessions,
        totalDatasets,
        totalNotebooks,
      },
      recentActivity,
    };
  }

  async getBillingData(userId: string): Promise<BillingData> {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        authType: true,
        storageProvisioningStatus: true,
        storageUid: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get storage volume for usage (only active volumes, exclude wiped)
    const storageVolume = await this.prisma.userStorageVolume.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    // Allocated quota from the actual storage volume record (DB is source of truth for quota)
    const quotaBytes = storageVolume?.quotaBytes ?? BigInt(0);
    const allocatedGb =
      Math.round((Number(quotaBytes) / (1024 * 1024 * 1024)) * 100) / 100;

    // Fetch LIVE storage usage from ZFS via Python service (no DB caching)
    let storageUsedGb = 0;
    let storageUsagePercent = 0;
    if (user.storageUid) {
      const liveUsage = await this.storageService.getStorageUsage(
        user.storageUid,
      );
      if (liveUsage) {
        storageUsedGb = liveUsage.usedGb;
        storageUsagePercent = liveUsage.usagePercent;
      }
    }

    // Get compute hours from sessions
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        startedAt: { not: null },
        endedAt: { not: null },
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    const computeHoursUsed = sessions.reduce((total, session) => {
      if (session.startedAt && session.endedAt) {
        const hours =
          (session.endedAt.getTime() - session.startedAt.getTime()) /
          (1000 * 60 * 60);
        return total + hours;
      }
      return total;
    }, 0);

    // Get wallet data for billing
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    // Fetch spend limit fields via raw SQL (Prisma client may not have these after schema migration)
    const walletRaw = await this.prisma.$queryRaw<
      Array<{
        spend_limit_cents: number | null;
        spend_limit_enabled: boolean;
        spend_limit_period: string | null;
        spend_limit_start_date: Date | null;
        spend_limit_end_date: Date | null;
      }>
    >`
      SELECT spend_limit_cents, spend_limit_enabled, spend_limit_period, spend_limit_start_date, spend_limit_end_date
      FROM wallets
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    const walletExtra = walletRaw[0] ?? {
      spend_limit_cents: null,
      spend_limit_enabled: false,
      spend_limit_period: null,
      spend_limit_start_date: null,
      spend_limit_end_date: null,
    };

    // Get active sessions for current spend rate calculation
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        status: 'running',
      },
      include: {
        computeConfig: true,
      },
    });

    // Calculate current compute spend rate from active sessions
    const computeSpendRateCentsPerHour = activeSessions.reduce(
      (total, session) => {
        return total + (session.computeConfig?.basePricePerHourCents ?? 0);
      },
      0,
    );

    // Fetch user's active storage volumes for storage billing calculation
    // Use raw SQL to access pricePerGbCentsMonth and allocationType
    const activeVolumes = await this.prisma.$queryRaw<
      Array<{
        quota_bytes: bigint;
        price_per_gb_cents_month: number;
        allocation_type: string;
      }>
    >`
      SELECT quota_bytes, price_per_gb_cents_month, allocation_type
      FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
    `;

    // Filter out SSO default volumes (5GB free for SSO students)
    // Only charge for 'user_created' or 'purchased' volumes
    const chargeableVolumes = activeVolumes.filter(
      (v) => v.allocation_type !== 'sso_default',
    );

    // Calculate storage hourly rate (in paise/cents per hour)
    // Formula: (quotaGb * pricePerGbCentsMonth) / 730 hours per month
    let storageRateCentsPerHour = 0;
    let storageMonthlyEstimateCents = 0;
    for (const vol of chargeableVolumes) {
      const quotaGb = Number(vol.quota_bytes) / (1024 * 1024 * 1024);
      const monthlyRate = vol.price_per_gb_cents_month * quotaGb;
      const hourlyRate = monthlyRate / 730;
      storageRateCentsPerHour += hourlyRate;
      storageMonthlyEstimateCents += monthlyRate;
    }

    // Total spend rate = compute + storage (both in cents per hour)
    const totalSpendRateCentsPerHour =
      computeSpendRateCentsPerHour + storageRateCentsPerHour;

    // dailySpend and chart both use past-12h charges (simpler, single source of truth)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const recentCharges12h = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: {
          gte: twelveHoursAgo,
        },
      },
    });

    const dailySpendCents = recentCharges12h.reduce(
      (t, c) => t + Number(c.amountCents),
      0,
    );

    // Get billing history for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCharges = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const billingHistory = recentCharges.map((charge) => ({
      id: charge.id,
      date: charge.createdAt,
      description: `Session usage`,
      amount: Number(charge.amountCents) / 100,
      status: 'completed' as const,
    }));

    // Rolling average: average daily spend over the last 7 days (monthly timescale approximation)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekCharges = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const weeklySpendCents = weekCharges.reduce((total, charge) => {
      return total + Number(charge.amountCents);
    }, 0);
    const rollingAverageDaily = weeklySpendCents / 7 / 100; // rupees/day (monthly timescale)

    // Get current time info for today's chart
    const now = new Date();
    const currentHour = now.getHours();

    // Start from midnight today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get all charges from today (midnight to now)
    const todayCharges = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    });

    // Group by hour of day
    const chargesByHour = new Map<number, number>();
    todayCharges.forEach((charge) => {
      const chargeHour = new Date(charge.createdAt).getHours();
      chargesByHour.set(
        chargeHour,
        (chargesByHour.get(chargeHour) ?? 0) + Number(charge.amountCents),
      );
    });

    // Project active session spend across ALL hours the session was running today
    // This distributes unbilled cost proportionally, showing accurate hourly rates
    for (const session of activeSessions) {
      if (!session.startedAt || !session.computeConfig) continue;

      // Find last billing charge for this session to know what's already billed
      const lastCharge = await this.prisma.billingCharge.findFirst({
        where: { sessionId: session.id, chargeType: 'compute' },
        orderBy: { createdAt: 'desc' },
      });

      const billedUntil = lastCharge ? lastCharge.createdAt : session.startedAt;
      const rateCentsPerHour = session.computeConfig.basePricePerHourCents;

      // Distribute across each hour the session was active (unbilled portion)
      const startHour = billedUntil < todayStart ? 0 : billedUntil.getHours();

      for (let h = startHour; h <= currentHour; h++) {
        // Calculate how many seconds of this hour are covered by the unbilled period
        const hourStart = new Date(todayStart);
        hourStart.setHours(h, 0, 0, 0);
        const hourEnd = new Date(todayStart);
        hourEnd.setHours(h + 1, 0, 0, 0);

        const effectiveStart =
          billedUntil > hourStart ? billedUntil : hourStart;
        const effectiveEnd = now < hourEnd ? now : hourEnd;

        const secondsInHour = Math.max(
          0,
          (effectiveEnd.getTime() - effectiveStart.getTime()) / 1000,
        );
        const costCents = Math.round((secondsInHour / 3600) * rateCentsPerHour);

        if (costCents > 0) {
          chargesByHour.set(h, (chargesByHour.get(h) ?? 0) + costCents);
        }
      }
    }

    // Build hourly data from 00:00 to current hour
    const hourlyData: HourlySpendData[] = [];
    let cumulativeSpend = 0;

    for (let h = 0; h <= currentHour; h++) {
      const spendThisHour = chargesByHour.get(h) ?? 0;
      cumulativeSpend += spendThisHour;

      const label =
        h === currentHour ? 'Now' : `${h.toString().padStart(2, '0')}:00`;
      hourlyData.push({
        hour: label,
        cumulativeSpend: cumulativeSpend / 100, // ₹
        hourlyRate: spendThisHour / 100, // ₹
      });
    }

    const isInstitution = user.authType === 'university_sso';

    return {
      plan: {
        type: isInstitution ? 'institution' : 'free',
        name: isInstitution ? 'Institution Plan' : 'Free Tier',
        description: isInstitution
          ? 'Your institution provides access to LaaS platform resources.'
          : 'You are on the free tier with basic access to LaaS platform resources.',
      },
      usage: {
        storageQuotaGb: allocatedGb,
        storageUsedGb: storageUsedGb,
        storageAllocatedGb: allocatedGb, // Actual quota from UserStorageVolume.quotaBytes
        computeHoursUsed: Math.round(computeHoursUsed * 100) / 100,
        billingCycle: isInstitution ? 'Institution Managed' : 'N/A',
      },
      paymentMethod: isInstitution
        ? {
            type: 'institution',
            description: 'Managed by your institution',
          }
        : null,
      billingHistory,
      // Lambda.ai style billing fields (real data from wallet/billing tables)
      creditBalance: Number(wallet?.balanceCents ?? 0) / 100, // Convert cents to rupees
      spendRate: rollingAverageDaily, // Rolling average daily spend
      spendLimit: (walletExtra.spend_limit_cents ?? 0) / 100, // Convert cents to rupees (0 means no limit)
      spendLimitEnabled: walletExtra.spend_limit_enabled,
      dailySpend: dailySpendCents / 100, // Convert cents to rupees
      currentSpendRate: totalSpendRateCentsPerHour / 100, // Total (compute + storage) burn rate in rupees/hour
      computeBurnRateRupeesPerHour: computeSpendRateCentsPerHour / 100, // Compute-only burn rate in rupees/hour
      storageBurnRateCentsPerHour: storageRateCentsPerHour, // Storage burn rate in paise/cents per hour
      storageMonthlyEstimateCents: storageMonthlyEstimateCents, // Total monthly storage cost in paise/cents
      runway: (() => {
        // Runway calculation:
        // - When spend limit is NOT enabled: runway = balance / burnRate
        //   (balance is already the current wallet balance, no need to subtract daily spend)
        // - When spend limit IS enabled: runway = min(remainingBudget, balance) / burnRate
        //   (remainingBudget = spendLimit - spentInPeriod)
        const balanceCents = Number(wallet?.balanceCents ?? 0);

        // Determine if spend limit is effectively active
        let spendLimitCentsVal: number | null = null;
        if (
          walletExtra.spend_limit_enabled &&
          (walletExtra.spend_limit_cents ?? 0) > 0
        ) {
          // For date_range, check if we're within the active period
          if (walletExtra.spend_limit_period === 'date_range') {
            const now = new Date();
            const startDate = walletExtra.spend_limit_start_date
              ? new Date(walletExtra.spend_limit_start_date)
              : null;
            const endDate = walletExtra.spend_limit_end_date
              ? new Date(walletExtra.spend_limit_end_date)
              : null;

            // Only apply spend limit if within the date range
            if (startDate && endDate && now >= startDate && now <= endDate) {
              spendLimitCentsVal = walletExtra.spend_limit_cents ?? 0;
            }
            // If outside range, spendLimitCentsVal stays null (no limit applied)
          } else {
            // For daily/monthly, always apply the spend limit
            spendLimitCentsVal = walletExtra.spend_limit_cents ?? 0;
          }
        }

        // No burn rate = no runway calculation needed (infinite runway)
        if (totalSpendRateCentsPerHour <= 0) return null;

        let effectiveRemainingCents: number;

        if (spendLimitCentsVal !== null) {
          // Spend limit IS enabled:
          // Calculate remaining budget in the current period
          const remainingBudget = spendLimitCentsVal - dailySpendCents;
          // Runway is limited by both remaining budget AND wallet balance
          effectiveRemainingCents = Math.min(remainingBudget, balanceCents);
        } else {
          // Spend limit NOT enabled:
          // Runway = how long current balance lasts at current burn rate
          // Note: balanceCents is the CURRENT balance (already reduced by past spending)
          // Do NOT subtract dailySpendCents again (that would double-count)
          effectiveRemainingCents = balanceCents;
        }

        if (effectiveRemainingCents <= 0) return 0;

        const hoursLeft = effectiveRemainingCents / totalSpendRateCentsPerHour;
        return hoursLeft; // Number of hours of runway remaining
      })(),
      gpus: activeSessions.filter((s) => (s.actualGpuVramMb ?? 0) > 0).length,
      gpuVramMb: activeSessions.reduce(
        (total, s) => total + (s.actualGpuVramMb ?? 0),
        0,
      ),
      vcpus: activeSessions.reduce(
        (total, s) => total + (s.computeConfig?.vcpu ?? 0),
        0,
      ),
      memoryMb: activeSessions.reduce(
        (total, s) => total + (s.computeConfig?.memoryMb ?? 0),
        0,
      ),
      endpoints: activeSessions.length,
      // Storage: live used from ZFS via Python service; allocated from UserStorageVolume
      storageAllocatedGb: allocatedGb,
      storageUsedGb: storageUsedGb,
      storageUsagePercent,
      hourlyData, // Today's hourly spend data for the chart
    };
  }

  /**
   * Get platform-wide health status for the header STATUS indicator.
   * Checks multiple backend services and returns customer-friendly status.
   */
  async getPlatformHealth(): Promise<{
    overall: 'operational' | 'degraded' | 'outage';
    services: {
      name: string;
      status: 'healthy' | 'unhealthy';
      message: string;
    }[];
  }> {
    const services: {
      name: string;
      status: 'healthy' | 'unhealthy';
      message: string;
    }[] = [];

    // 1. Database check — simple query with timeout
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.push({
        name: 'Database',
        status: 'healthy',
        message: 'Database is responsive',
      });
    } catch {
      services.push({
        name: 'Database',
        status: 'unhealthy',
        message: 'Database connectivity issue',
      });
    }

    // 2. Storage service check — reuse existing method
    try {
      const health = await this.storageService.checkStorageHealth();
      if (health?.healthy) {
        services.push({
          name: 'Storage',
          status: 'healthy',
          message: 'Storage service is online',
        });
      } else {
        services.push({
          name: 'Storage',
          status: 'unhealthy',
          message: 'Storage service is not reachable',
        });
      }
    } catch {
      services.push({
        name: 'Storage',
        status: 'unhealthy',
        message: 'Storage service is not reachable',
      });
    }

    // 3. Compute service check — check if the compute/GPU host is reachable
    // For now, skip this one since we don't have a compute health endpoint yet
    // In future, add: services.push(...)

    // Determine overall status
    const unhealthyCount = services.filter(
      (s) => s.status === 'unhealthy',
    ).length;
    let overall: 'operational' | 'degraded' | 'outage';
    if (unhealthyCount === 0) {
      overall = 'operational';
    } else if (unhealthyCount < services.length) {
      overall = 'degraded';
    } else {
      overall = 'outage';
    }

    return { overall, services };
  }

  /**
   * Get recent activity (audit logs + session events + billing) for the current user.
   * Used for the Recent Activity section on the Home page.
   */
  async getRecentActivity(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch audit logs
    const logs = await this.prisma.auditLog.findMany({
      where: {
        actorId: userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch session events with session info
    const sessionEvents = await this.prisma.sessionEvent.findMany({
      where: {
        session: { userId },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        session: {
          select: {
            instanceName: true,
            computeConfig: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    });

    // Fetch billing charges
    const billingCharges = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        session: {
          select: { instanceName: true },
        },
        computeConfig: {
          select: { name: true },
        },
      },
    });

    // Fetch wallet transactions (credits added)
    const walletTransactions = await this.prisma.walletTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        txnType: 'credit', // Only show credits, debits are shown as billing charges
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Map audit logs to activity items
    const auditActivities = logs.map((log) => ({
      id: log.id,
      action: log.action,
      category: log.resourceType,
      status: log.actionReason ?? 'success',
      details: log.newData as Record<string, any> | null,
      ipAddress: log.clientIp,
      createdAt: log.createdAt.toISOString(),
    }));

    // Map session events to activity items
    const sessionActivities = sessionEvents
      .map((event) => {
        const payload = event.payload as Record<string, any> | null;

        // Determine action based on event type
        let action: string;
        let status = 'success';

        switch (event.eventType) {
          case 'session_created':
            action = 'session.created';
            break;
          case 'launch_initiated':
            action = 'session.scheduling';
            break;
          case 'session_ready':
            action = 'session.running';
            break;
          case 'session_terminated': {
            action = 'session.terminated';
            break;
          }
          case 'launch_failed':
            action = 'session.failed';
            status = 'failed';
            break;
          case 'session_ended':
            action = 'session.ended';
            break;
          case 'session_restarted':
            action = 'session.restarted';
            break;
          default:
            // Handle launch step events (launch_creating, launch_starting, etc.)
            if (event.eventType.startsWith('launch_')) {
              return null; // Skip intermediate launch step events to reduce noise
            }
            action = `session.${event.eventType}`;
        }

        return {
          id: event.id,
          action,
          category: 'session',
          status,
          details: payload,
          ipAddress: event.clientIp,
          createdAt: event.createdAt.toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Map billing charges to activity items
    const billingActivities = billingCharges.map((charge) => {
      const instanceName = charge.session?.instanceName || 'Session';
      const configName = charge.computeConfig?.name || '';

      return {
        id: charge.id,
        action: 'billing.charge',
        category: 'billing',
        status: 'success',
        details: {
          amountCents: Number(charge.amountCents),
          durationSeconds: charge.durationSeconds,
          chargeType: charge.chargeType,
          instanceName,
          configName,
        },
        ipAddress: null,
        createdAt: charge.createdAt.toISOString(),
      };
    });

    // Map wallet transactions (credits) to activity items
    const walletActivities = walletTransactions.map((txn) => {
      return {
        id: txn.id,
        action: 'wallet.credit',
        category: 'billing',
        status: 'success',
        details: {
          amountCents: Number(txn.amountCents),
          description: txn.description,
          referenceType: txn.referenceType,
        },
        ipAddress: null,
        createdAt: txn.createdAt.toISOString(),
      };
    });

    // Combine all activities and sort by date (most recent first)
    const allActivities = [
      ...auditActivities,
      ...sessionActivities,
      ...billingActivities,
      ...walletActivities,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Return top 200
    return allActivities.slice(0, 200);
  }
}
