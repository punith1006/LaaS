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
}

export interface BillingHistoryItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: string;
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
      billingHistory: [], // Placeholder for future billing history
    };
  }
}
