import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HomeDashboardData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    authType: string;
    storageQuotaGb: number;
    storageProvisioningStatus: string | null;
    storageProvisioningError: string | null;
  };
  storage: {
    quotaGb: number;
    usedGb: number;
    status: string;
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
  dailySpend: number;
  currentSpendRate: number;
  gpus: number;
  vcpus: number;
  endpoints: number;
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
  constructor(private prisma: PrismaService) {}

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
        storageProvisioningStatus: true,
        storageProvisioningError: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get storage volume info
    const storageVolume = await this.prisma.userStorageVolume.findFirst({
      where: { userId },
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

    const quotaGb = user.authType === 'university_sso' ? 5 : 5;
    const usedBytes = storageVolume?.usedBytes ?? BigInt(0);
    const usedGb = Math.round((Number(usedBytes) / (1024 * 1024 * 1024)) * 100) / 100;

    // Get recent activity (placeholder - can be expanded)
    const recentActivity: ActivityItem[] = [];

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authType: user.authType,
        storageQuotaGb: quotaGb,
        storageProvisioningStatus: user.storageProvisioningStatus,
        storageProvisioningError: user.storageProvisioningError,
      },
      storage: {
        quotaGb,
        usedGb,
        status: user.storageProvisioningStatus ?? 'unknown',
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

    const isInstitution = user.authType === 'university_sso';
    const quotaGb = isInstitution ? 5 : 5;
    const usedBytes = storageVolume?.usedBytes ?? BigInt(0);
    const usedGb = Math.round((Number(usedBytes) / (1024 * 1024 * 1024)) * 100) / 100;

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

    // Calculate current spend rate from active sessions
    const currentSpendRateCentsPerHour = activeSessions.reduce((total, session) => {
      return total + (session.computeConfig?.basePricePerHourCents ?? 0);
    }, 0);

    // Get today's billing charges for daily spend
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCharges = await this.prisma.billingCharge.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const dailySpendCents = todayCharges.reduce((total, charge) => {
      return total + Number(charge.amountCents);
    }, 0);

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

    // Calculate rolling average (last 7 days)
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
    const rollingAverageDaily = weeklySpendCents / 7 / 100; // Convert to rupees

    // Generate hourly spend data for today's chart (every 2 hours like reference)
    // Shows all 24 hours with actual data from the full day
    const hourlyData: HourlySpendData[] = [];
    
    // Get today's charges grouped by hour
    const todayChargesByHour = new Map<number, number>();
    todayCharges.forEach(charge => {
      const hour = new Date(charge.createdAt).getHours();
      const currentAmount = todayChargesByHour.get(hour) || 0;
      todayChargesByHour.set(hour, currentAmount + Number(charge.amountCents));
    });
    
    // Build data for every 2-hour interval (00:00, 02:00, 04:00, ..., 22:00, Now)
    // Use actual billing data for all intervals to show the full day's pattern
    const intervals = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    let cumulativeSpend = 0;
    
    for (const intervalHour of intervals) {
      const hourLabel = intervalHour.toString().padStart(2, '0') + ':00';
      
      // The interval represents the window from (intervalHour-2) to intervalHour
      // e.g., 14:00 represents 12:00-14:00
      const windowStartHour = intervalHour - 2;
      
      // Add charges for this 2-hour window to cumulative
      for (let h = windowStartHour + 1; h <= intervalHour; h++) {
        cumulativeSpend += todayChargesByHour.get(h) || 0;
      }
      
      // Get the total spend in this 2-hour window
      let intervalSpend = 0;
      for (let h = windowStartHour + 1; h <= intervalHour; h++) {
        intervalSpend += todayChargesByHour.get(h) || 0;
      }
      // Calculate hourly rate for this interval (total spend / 2 hours)
      const hourlyRateForInterval = intervalSpend / 2;
      
      hourlyData.push({
        hour: hourLabel,
        cumulativeSpend: cumulativeSpend / 100, // Convert to rupees
        hourlyRate: hourlyRateForInterval / 100, // Hourly rate at this interval
      });
    }
    
    // Add "Now" point with current actual cumulative spend and active rate
    // Use the total daily spend calculated from all today's charges
    hourlyData.push({
      hour: 'Now',
      cumulativeSpend: dailySpendCents / 100, // Total today's spend
      hourlyRate: currentSpendRateCentsPerHour / 100, // Current active rate
    });

    return {
      plan: {
        type: isInstitution ? 'institution' : 'free',
        name: isInstitution ? 'Institution Plan' : 'Free Tier',
        description: isInstitution
          ? 'Your institution provides access to LaaS platform resources.'
          : 'You are on the free tier with basic access to LaaS platform resources.',
      },
      usage: {
        storageQuotaGb: quotaGb,
        storageUsedGb: usedGb,
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
      spendLimit: (wallet?.spendLimitCents ?? 0) / 100, // Convert cents to rupees
      dailySpend: dailySpendCents / 100, // Convert cents to rupees
      currentSpendRate: currentSpendRateCentsPerHour / 100, // Convert cents/hour to rupees/hour
      gpus: activeSessions.filter(s => (s.actualGpuVramMb ?? 0) > 0).length,
      vcpus: activeSessions.reduce((total, s) => total + (s.computeConfig?.vcpu ?? 0), 0),
      endpoints: activeSessions.length,
      hourlyData, // Today's hourly spend data for the chart
    };
  }
}
