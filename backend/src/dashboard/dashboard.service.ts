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
    const quotaGb = Math.round((Number(quotaBytes) / (1024 ** 3)) * 100) / 100;

    // Live storage used from ZFS via Python service (real-time, no DB caching)
    let usedGb = Math.round((Number(storageVolume?.usedBytes ?? BigInt(0)) / (1024 ** 3)) * 100) / 100;
    if (user.storageUid && quotaGb > 0) {
      const liveUsage = await this.storageService.getStorageUsage(user.storageUid);
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
        healthStatus = 'not_found';  // Service up but dataset missing
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

    // Get storage volume for usage
    const storageVolume = await this.prisma.userStorageVolume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Allocated quota from the actual storage volume record (DB is source of truth for quota)
    const quotaBytes = storageVolume?.quotaBytes ?? BigInt(0);
    const allocatedGb = Math.round((Number(quotaBytes) / (1024 * 1024 * 1024)) * 100) / 100;

    // Fetch LIVE storage usage from ZFS via Python service (no DB caching)
    let storageUsedGb = 0;
    let storageUsagePercent = 0;
    if (user.storageUid) {
      const liveUsage = await this.storageService.getStorageUsage(user.storageUid);
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
    const walletRaw = await this.prisma.$queryRaw<Array<{
      spend_limit_cents: number | null;
      spend_limit_enabled: boolean;
    }>>`
      SELECT spend_limit_cents, spend_limit_enabled
      FROM wallets
      WHERE user_id = ${userId}::uuid
      LIMIT 1
    `;
    const walletExtra = walletRaw[0] ?? { spend_limit_cents: null, spend_limit_enabled: false };

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
    const computeSpendRateCentsPerHour = activeSessions.reduce((total, session) => {
      return total + (session.computeConfig?.basePricePerHourCents ?? 0);
    }, 0);

    // Fetch user's active storage volumes for storage billing calculation
    // Use raw SQL to access pricePerGbCentsMonth and allocationType
    const activeVolumes = await this.prisma.$queryRaw<Array<{
      quota_bytes: bigint;
      price_per_gb_cents_month: number;
      allocation_type: string;
    }>>`
      SELECT quota_bytes, price_per_gb_cents_month, allocation_type
      FROM user_storage_volumes
      WHERE user_id = ${userId}::uuid AND status = 'active'
    `;

    // Filter out SSO default volumes (5GB free for SSO students)
    // Only charge for 'user_created' or 'purchased' volumes
    const chargeableVolumes = activeVolumes.filter(
      v => v.allocation_type !== 'sso_default'
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
    const totalSpendRateCentsPerHour = computeSpendRateCentsPerHour + storageRateCentsPerHour;

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

    const dailySpendCents = recentCharges12h.reduce((t, c) => t + Number(c.amountCents), 0);

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

    // Build hourly data from 00:00 to current hour
    const hourlyData: HourlySpendData[] = [];
    let cumulativeSpend = 0;

    for (let h = 0; h <= currentHour; h++) {
      const spendThisHour = chargesByHour.get(h) ?? 0;
      cumulativeSpend += spendThisHour;

      const label = h === currentHour ? 'Now' : `${h.toString().padStart(2, '0')}:00`;
      hourlyData.push({
        hour: label,
        cumulativeSpend: cumulativeSpend / 100, // ₹
        hourlyRate: spendThisHour / 100,        // ₹
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
        // Ceiling logic:
        // - If spendLimit is set AND spendLimit <= creditBalance → ceiling = spendLimit
        // - If spendLimit is set AND spendLimit > creditBalance → ceiling = creditBalance
        // - If spendLimit is not set → ceiling = creditBalance
        const balanceCents = Number(wallet?.balanceCents ?? 0);
        const spendLimitCentsVal = walletExtra.spend_limit_enabled && (walletExtra.spend_limit_cents ?? 0) > 0
          ? (walletExtra.spend_limit_cents ?? 0)
          : null;

        let ceilingCents: number;
        if (spendLimitCentsVal !== null) {
          ceilingCents = spendLimitCentsVal <= balanceCents ? spendLimitCentsVal : balanceCents;
        } else {
          ceilingCents = balanceCents;
        }

        // Runway = (ceiling - totalSpentToday) / burnRate (in hours)
        // Now uses total (compute + storage) rate for accurate runway
        const remainingCents = ceilingCents - dailySpendCents;
        if (remainingCents <= 0 || totalSpendRateCentsPerHour <= 0) return null;

        const hoursLeft = remainingCents / totalSpendRateCentsPerHour;
        return hoursLeft; // Number of hours of runway remaining
      })(),
      gpus: activeSessions.filter(s => (s.actualGpuVramMb ?? 0) > 0).length,
      gpuVramMb: activeSessions.reduce((total, s) => total + (s.actualGpuVramMb ?? 0), 0),
      vcpus: activeSessions.reduce((total, s) => total + (s.computeConfig?.vcpu ?? 0), 0),
      memoryMb: activeSessions.reduce((total, s) => total + (s.computeConfig?.memoryMb ?? 0), 0),
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
    const services: { name: string; status: 'healthy' | 'unhealthy'; message: string }[] = [];

    // 1. Database check — simple query with timeout
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.push({ name: 'Database', status: 'healthy', message: 'Database is responsive' });
    } catch {
      services.push({ name: 'Database', status: 'unhealthy', message: 'Database connectivity issue' });
    }

    // 2. Storage service check — reuse existing method
    try {
      const health = await this.storageService.checkStorageHealth();
      if (health?.healthy) {
        services.push({ name: 'Storage', status: 'healthy', message: 'Storage service is online' });
      } else {
        services.push({ name: 'Storage', status: 'unhealthy', message: 'Storage service is not reachable' });
      }
    } catch {
      services.push({ name: 'Storage', status: 'unhealthy', message: 'Storage service is not reachable' });
    }

    // 3. Compute service check — check if the compute/GPU host is reachable
    // For now, skip this one since we don't have a compute health endpoint yet
    // In future, add: services.push(...)

    // Determine overall status
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
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
}
