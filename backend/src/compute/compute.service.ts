import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LaunchSessionDto,
  ResourceSummary,
  ComputeConfigsResponse,
  SessionResponse,
  SessionListResponse,
  SessionDetailResponse,
  NodeResourceStatus,
  AdminSessionResponse,
  AdminSessionListResponse,
} from './compute.dto';

// Statuses that consume resources (session is considered "active" for resource purposes)
const RESOURCE_CONSUMING_STATUSES = ['pending', 'starting', 'running', 'reconnecting'];

// Statuses that can be terminated by user
const TERMINABLE_STATUSES = ['pending', 'starting', 'running', 'reconnecting'];

// Statuses that mean the session is already ended (idempotent termination)
const ALREADY_ENDED_STATUSES = ['stopping', 'ended', 'failed', 'terminated_idle', 'terminated_overuse'];

@Injectable()
export class ComputeService {
  private readonly logger = new Logger(ComputeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // HELPER: Get allocatable resources from node
  // ============================================================================

  private async getAllocatable(nodeId?: string) {
    const whereClause = nodeId ? { id: nodeId, status: 'healthy' as const } : { status: 'healthy' as const };
    const node = await this.prisma.node.findFirst({
      where: whereClause,
    });

    if (!node) {
      throw new ServiceUnavailableException('No healthy compute nodes available');
    }

    const metadata = node.metadata as Record<string, unknown> | null;
    return {
      node,
      allocatable: {
        vramMb: (metadata?.allocatableGpuVramMb as number) ?? (node.totalGpuVramMb - 1024),
        vcpu: (metadata?.allocatableVcpu as number) ?? (node.totalVcpu - 2),
        ramMb: (metadata?.allocatableMemoryMb as number) ?? (node.totalMemoryMb - 10240),
      },
    };
  }

  // ============================================================================
  // (a) getResourceUsage - Get current resource usage summary
  // ============================================================================

  async getResourceUsage(): Promise<ResourceSummary> {
    const { node, allocatable } = await this.getAllocatable();

    // Query all active sessions and sum their resource allocations
    const activeSessions = await this.prisma.session.findMany({
      where: { status: { in: RESOURCE_CONSUMING_STATUSES as any[] } },
      include: { computeConfig: true },
    });

    const used = { vramMb: 0, vcpu: 0, ramMb: 0 };
    for (const s of activeSessions) {
      used.vramMb += s.allocatedGpuVramMb ?? s.computeConfig.gpuVramMb;
      used.vcpu += s.allocatedVcpu ?? s.computeConfig.vcpu;
      used.ramMb += s.allocatedMemoryMb ?? s.computeConfig.memoryMb;
    }

    return {
      total: {
        vramMb: allocatable.vramMb,
        vcpu: allocatable.vcpu,
        ramMb: allocatable.ramMb,
      },
      used,
      available: {
        vramMb: allocatable.vramMb - used.vramMb,
        vcpu: allocatable.vcpu - used.vcpu,
        ramMb: allocatable.ramMb - used.ramMb,
      },
    };
  }

  // ============================================================================
  // (b) getConfigsWithAvailability - List all configs with availability info
  // ============================================================================

  async getConfigsWithAvailability(): Promise<ComputeConfigsResponse> {
    const resourceUsage = await this.getResourceUsage();
    const available = resourceUsage.available;

    // Fetch all active configs sorted by sortOrder
    const configs = await this.prisma.computeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Count running instances
    const runningInstances = await this.prisma.session.count({
      where: { status: { in: RESOURCE_CONSUMING_STATUSES as any[] } },
    });

    const configsWithAvailability = configs.map((config) => {
      const isAvailable =
        config.gpuVramMb <= available.vramMb &&
        config.vcpu <= available.vcpu &&
        config.memoryMb <= available.ramMb;

      // Calculate max launchable instances
      let maxLaunchable = 0;
      if (isAvailable) {
        const byVram = config.gpuVramMb > 0 ? Math.floor(available.vramMb / config.gpuVramMb) : Infinity;
        const byCpu = config.vcpu > 0 ? Math.floor(available.vcpu / config.vcpu) : Infinity;
        const byRam = config.memoryMb > 0 ? Math.floor(available.ramMb / config.memoryMb) : Infinity;
        maxLaunchable = Math.min(byVram, byCpu, byRam);
        if (!isFinite(maxLaunchable)) maxLaunchable = 0;
      }

      return {
        id: config.id,
        slug: config.slug,
        name: config.name,
        description: config.description,
        tier: config.tier,
        sessionType: config.sessionType,
        vcpu: config.vcpu,
        memoryMb: config.memoryMb,
        gpuVramMb: config.gpuVramMb,
        gpuModel: config.gpuModel,
        hamiSmPercent: config.hamiSmPercent,
        basePricePerHourCents: config.basePricePerHourCents,
        currency: config.currency,
        bestFor: config.bestFor,
        sortOrder: config.sortOrder,
        available: isAvailable,
        maxLaunchable,
      };
    });

    return {
      configs: configsWithAvailability,
      resources: resourceUsage,
      runningInstances,
    };
  }

  // ============================================================================
  // (c) launchSession - Launch a new compute session with serializable transaction
  // ============================================================================

  async launchSession(userId: string, dto: LaunchSessionDto) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Validate config exists and is active
        const config = await tx.computeConfig.findUnique({ where: { id: dto.computeConfigId } });
        if (!config || !config.isActive) {
          throw new NotFoundException('Compute configuration not found');
        }

        // 2. Check instance name uniqueness for this user (among active sessions)
        const existingName = await tx.session.findFirst({
          where: {
            userId,
            instanceName: dto.instanceName,
            status: { in: RESOURCE_CONSUMING_STATUSES as any[] },
          },
        });
        if (existingName) {
          throw new ConflictException('Instance name already in use');
        }

        // 3. Get node and allocatable resources
        const node = await tx.node.findFirst({ where: { status: 'healthy' } });
        if (!node) {
          throw new ServiceUnavailableException('No healthy compute nodes available');
        }
        const metadata = node.metadata as Record<string, unknown> | null;
        const allocatable = {
          vramMb: (metadata?.allocatableGpuVramMb as number) ?? (node.totalGpuVramMb - 1024),
          vcpu: (metadata?.allocatableVcpu as number) ?? (node.totalVcpu - 2),
          ramMb: (metadata?.allocatableMemoryMb as number) ?? (node.totalMemoryMb - 10240),
        };

        // 4. Check resource availability with FOR UPDATE lock
        const activeSessions = await tx.$queryRaw<
          Array<{ vcpu: number; memory_mb: number; gpu_vram_mb: number }>
        >`
          SELECT cc.vcpu, cc.memory_mb, cc.gpu_vram_mb
          FROM sessions s
          JOIN compute_configs cc ON s.compute_config_id = cc.id
          WHERE s.status IN ('pending', 'starting', 'running', 'reconnecting')
          FOR UPDATE
        `;

        const used = { vramMb: 0, vcpu: 0, ramMb: 0 };
        for (const s of activeSessions) {
          used.vramMb += s.gpu_vram_mb;
          used.vcpu += s.vcpu;
          used.ramMb += s.memory_mb;
        }

        const available = {
          vramMb: allocatable.vramMb - used.vramMb,
          vcpu: allocatable.vcpu - used.vcpu,
          ramMb: allocatable.ramMb - used.ramMb,
        };

        if (
          config.gpuVramMb > available.vramMb ||
          config.vcpu > available.vcpu ||
          config.memoryMb > available.ramMb
        ) {
          const bottlenecks: string[] = [];
          if (config.gpuVramMb > available.vramMb) {
            bottlenecks.push(`GPU VRAM (need ${config.gpuVramMb}MB, ${available.vramMb}MB free)`);
          }
          if (config.vcpu > available.vcpu) {
            bottlenecks.push(`CPU (need ${config.vcpu} cores, ${available.vcpu} free)`);
          }
          if (config.memoryMb > available.ramMb) {
            bottlenecks.push(`RAM (need ${config.memoryMb}MB, ${available.ramMb}MB free)`);
          }
          throw new ConflictException(`Insufficient resources: ${bottlenecks.join(', ')}`);
        }

        // 5. Check wallet balance (minimum 1 hour)
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          throw new BadRequestException('Wallet not found. Please contact support.');
        }
        if (wallet.isFrozen) {
          throw new ForbiddenException('Wallet is frozen. Please contact support.');
        }

        const activeHolds = await tx.walletHold.aggregate({
          where: { walletId: wallet.id, status: 'active' },
          _sum: { amountCents: true },
        });
        const holdTotal = Number(activeHolds._sum.amountCents ?? 0n);
        const availableBalance = Number(wallet.balanceCents) - holdTotal;
        const requiredBalance = config.basePricePerHourCents;

        if (availableBalance < requiredBalance) {
          throw new HttpException(
            {
              statusCode: 402,
              message: `Insufficient wallet balance. Need ₹${(requiredBalance / 100).toFixed(2)}, available ₹${(availableBalance / 100).toFixed(2)}.`,
              requiredCents: requiredBalance,
              availableCents: availableBalance,
            },
            402,
          );
        }

        // 6. If stateful storage, check user has active File Store
        let nfsMountPath: string | null = null;
        if (dto.storageType === 'stateful') {
          const volume = await tx.userStorageVolume.findFirst({
            where: { userId, status: 'active' },
          });
          if (!volume) {
            throw new BadRequestException(
              'No active File Store found. Create one first or use ephemeral storage.',
            );
          }
          nfsMountPath = volume.nfsExportPath;
        }

        // 7. Determine session type
        const sessionType = dto.interfaceMode === 'gui' ? 'stateful_desktop' : 'ephemeral_cli';

        // 8. Create session with full allocation snapshot
        const session = await tx.session.create({
          data: {
            userId,
            computeConfigId: config.id,
            nodeId: node.id,
            sessionType: sessionType as any,
            instanceName: dto.instanceName,
            containerName: dto.instanceName,
            storageMode: dto.storageType as any,
            status: 'pending',
            nfsMountPath,
            allocatedVcpu: config.vcpu,
            allocatedMemoryMb: config.memoryMb,
            allocatedGpuVramMb: config.gpuVramMb,
            allocatedHamiSmPercent: config.hamiSmPercent,
            allocationSnapshotAt: new Date(),
            actualGpuVramMb: config.gpuVramMb,
            actualHamiSmPercent: config.hamiSmPercent,
            resourceSnapshot: {
              interfaceMode: dto.interfaceMode,
              storageType: dto.storageType,
              configSlug: config.slug,
              configName: config.name,
              vcpu: config.vcpu,
              memoryMb: config.memoryMb,
              gpuVramMb: config.gpuVramMb,
              hamiSmPercent: config.hamiSmPercent,
              gpuModel: config.gpuModel,
              basePricePerHourCents: config.basePricePerHourCents,
              nodeHostname: node.hostname,
              nodeGpuModel: node.gpuModel,
            },
          },
          include: { computeConfig: true },
        });

        // 9. Create NodeResourceReservation
        await tx.nodeResourceReservation.create({
          data: {
            nodeId: node.id,
            sessionId: session.id,
            reservedVcpu: config.vcpu,
            reservedMemoryMb: config.memoryMb,
            reservedGpuVramMb: config.gpuVramMb,
            reservedHamiSmPercent: config.hamiSmPercent,
            status: 'reserved',
          },
        });

        // 10. Update node allocated counters
        await tx.node.update({
          where: { id: node.id },
          data: {
            allocatedVcpu: { increment: config.vcpu },
            allocatedMemoryMb: { increment: config.memoryMb },
            allocatedGpuVramMb: { increment: config.gpuVramMb },
            currentSessionCount: { increment: 1 },
          },
        });

        // 11. Create wallet hold for 1 hour
        await tx.walletHold.create({
          data: {
            walletId: wallet.id,
            userId,
            sessionId: session.id,
            amountCents: BigInt(requiredBalance),
            holdReason: 'compute_session_hold',
            status: 'active',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        this.logger.log(
          `Session launched: userId=${userId} sessionId=${session.id} config=${config.slug} instanceName=${dto.instanceName}`,
        );

        return session;
      },
      { isolationLevel: 'Serializable', timeout: 15000 },
    );
  }

  // ============================================================================
  // (d) getUserSessions - List all sessions for a user
  // ============================================================================

  async getUserSessions(userId: string): Promise<SessionListResponse> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      include: {
        computeConfig: true,
        node: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const formattedSessions: SessionResponse[] = sessions.map((session) => {
      // Calculate uptime
      let uptimeSeconds = 0;
      if (session.startedAt) {
        if (session.endedAt) {
          uptimeSeconds = session.durationSeconds ?? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
        } else {
          uptimeSeconds = Math.floor((now - session.startedAt.getTime()) / 1000);
        }
      }

      // Calculate cost so far
      let costSoFarCents = 0;
      if (ALREADY_ENDED_STATUSES.includes(session.status)) {
        costSoFarCents = Number(session.cumulativeCostCents);
      } else if (session.startedAt && session.computeConfig) {
        const uptimeHours = uptimeSeconds / 3600;
        costSoFarCents = Math.ceil(uptimeHours * session.computeConfig.basePricePerHourCents);
      }

      return {
        id: session.id,
        userId: session.userId,
        instanceName: session.instanceName,
        containerName: session.containerName,
        sessionType: session.sessionType,
        storageMode: session.storageMode,
        status: session.status,
        sessionUrl: session.sessionUrl,
        nfsMountPath: session.nfsMountPath,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
        uptimeSeconds,
        costSoFarCents,
        allocatedVcpu: session.allocatedVcpu,
        allocatedMemoryMb: session.allocatedMemoryMb,
        allocatedGpuVramMb: session.allocatedGpuVramMb,
        allocatedHamiSmPercent: session.allocatedHamiSmPercent,
        computeConfig: session.computeConfig
          ? {
              id: session.computeConfig.id,
              slug: session.computeConfig.slug,
              name: session.computeConfig.name,
              vcpu: session.computeConfig.vcpu,
              memoryMb: session.computeConfig.memoryMb,
              gpuVramMb: session.computeConfig.gpuVramMb,
              gpuModel: session.computeConfig.gpuModel,
              basePricePerHourCents: session.computeConfig.basePricePerHourCents,
            }
          : null,
        node: session.node
          ? {
              id: session.node.id,
              hostname: session.node.hostname,
              gpuModel: session.node.gpuModel,
            }
          : null,
        terminationReason: session.terminationReason,
        terminatedBy: session.terminatedBy,
        terminatedAt: session.terminatedAt,
        cumulativeCostCents: Number(session.cumulativeCostCents),
        durationSeconds: session.durationSeconds,
      };
    });

    return {
      sessions: formattedSessions,
      total: formattedSessions.length,
    };
  }

  // ============================================================================
  // (e) getSessionDetail - Get detailed session info
  // ============================================================================

  async getSessionDetail(userId: string, sessionId: string): Promise<SessionDetailResponse> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: {
        computeConfig: true,
        node: true,
        nodeResourceReservation: true,
        walletHolds: true,
        billingCharges: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const now = Date.now();

    // Calculate uptime
    let uptimeSeconds = 0;
    if (session.startedAt) {
      if (session.endedAt) {
        uptimeSeconds = session.durationSeconds ?? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
      } else {
        uptimeSeconds = Math.floor((now - session.startedAt.getTime()) / 1000);
      }
    }

    // Calculate cost so far
    let costSoFarCents = 0;
    if (ALREADY_ENDED_STATUSES.includes(session.status)) {
      costSoFarCents = Number(session.cumulativeCostCents);
    } else if (session.startedAt && session.computeConfig) {
      const uptimeHours = uptimeSeconds / 3600;
      costSoFarCents = Math.ceil(uptimeHours * session.computeConfig.basePricePerHourCents);
    }

    return {
      id: session.id,
      userId: session.userId,
      instanceName: session.instanceName,
      containerName: session.containerName,
      sessionType: session.sessionType,
      storageMode: session.storageMode,
      status: session.status,
      sessionUrl: session.sessionUrl,
      nfsMountPath: session.nfsMountPath,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
      uptimeSeconds,
      costSoFarCents,
      allocatedVcpu: session.allocatedVcpu,
      allocatedMemoryMb: session.allocatedMemoryMb,
      allocatedGpuVramMb: session.allocatedGpuVramMb,
      allocatedHamiSmPercent: session.allocatedHamiSmPercent,
      computeConfig: session.computeConfig
        ? {
            id: session.computeConfig.id,
            slug: session.computeConfig.slug,
            name: session.computeConfig.name,
            vcpu: session.computeConfig.vcpu,
            memoryMb: session.computeConfig.memoryMb,
            gpuVramMb: session.computeConfig.gpuVramMb,
            gpuModel: session.computeConfig.gpuModel,
            basePricePerHourCents: session.computeConfig.basePricePerHourCents,
          }
        : null,
      node: session.node
        ? {
            id: session.node.id,
            hostname: session.node.hostname,
            gpuModel: session.node.gpuModel,
          }
        : null,
      terminationReason: session.terminationReason,
      terminatedBy: session.terminatedBy,
      terminatedAt: session.terminatedAt,
      cumulativeCostCents: Number(session.cumulativeCostCents),
      durationSeconds: session.durationSeconds,
      resourceSnapshot: session.resourceSnapshot as Record<string, unknown> | null,
      walletHolds: session.walletHolds.map((h) => ({
        id: h.id,
        amountCents: Number(h.amountCents),
        status: h.status,
        holdReason: h.holdReason,
        createdAt: h.createdAt,
        releasedAt: h.releasedAt,
      })),
      billingCharges: session.billingCharges.map((c) => ({
        id: c.id,
        chargeType: c.chargeType,
        durationSeconds: c.durationSeconds,
        rateCentsPerHour: c.rateCentsPerHour,
        amountCents: Number(c.amountCents),
        createdAt: c.createdAt,
      })),
      nodeResourceReservation: session.nodeResourceReservation
        ? {
            id: session.nodeResourceReservation.id,
            reservedVcpu: session.nodeResourceReservation.reservedVcpu,
            reservedMemoryMb: session.nodeResourceReservation.reservedMemoryMb,
            reservedGpuVramMb: session.nodeResourceReservation.reservedGpuVramMb,
            reservedHamiSmPercent: session.nodeResourceReservation.reservedHamiSmPercent,
            status: session.nodeResourceReservation.status,
            reservedAt: session.nodeResourceReservation.reservedAt,
            releasedAt: session.nodeResourceReservation.releasedAt,
          }
        : null,
    };
  }

  // ============================================================================
  // (f) terminateSession - Terminate a session and release resources
  // ============================================================================

  async terminateSession(userId: string, sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find session and verify ownership
      const session = await tx.session.findFirst({
        where: { id: sessionId, userId },
        include: {
          computeConfig: true,
          nodeResourceReservation: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // 2. Check if already ended (idempotent)
      if (ALREADY_ENDED_STATUSES.includes(session.status)) {
        this.logger.debug(`Session ${sessionId} already in terminal state: ${session.status}`);
        return session;
      }

      // 3. Verify session is in terminable status
      if (!TERMINABLE_STATUSES.includes(session.status)) {
        throw new ConflictException(`Session cannot be terminated from status: ${session.status}`);
      }

      const now = new Date();

      // 4. Calculate duration if session was started
      let durationSeconds: number | null = null;
      if (session.startedAt) {
        durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      }

      // 5. Set session to stopping first
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'stopping',
          endedAt: now,
          terminationReason: 'user_requested',
          terminatedBy: userId,
          terminatedAt: now,
          durationSeconds,
        },
      });

      // 6. Release NodeResourceReservation
      if (session.nodeResourceReservation) {
        await tx.nodeResourceReservation.update({
          where: { id: session.nodeResourceReservation.id },
          data: {
            status: 'released',
            releasedAt: now,
          },
        });
      }

      // 7. Decrement node allocated counters
      if (session.nodeId) {
        await tx.node.update({
          where: { id: session.nodeId },
          data: {
            allocatedVcpu: { decrement: session.allocatedVcpu ?? session.computeConfig.vcpu },
            allocatedMemoryMb: { decrement: session.allocatedMemoryMb ?? session.computeConfig.memoryMb },
            allocatedGpuVramMb: { decrement: session.allocatedGpuVramMb ?? session.computeConfig.gpuVramMb },
            currentSessionCount: { decrement: 1 },
          },
        });
      }

      // 8. Release active wallet holds
      await tx.walletHold.updateMany({
        where: { sessionId, status: 'active' },
        data: {
          status: 'released',
          releasedAt: now,
          releaseReason: 'session_terminated',
        },
      });

      // 9. Calculate final cost (minimum 1 minute)
      let finalCostCents = 0;
      if (durationSeconds !== null && durationSeconds > 0) {
        const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
        const rateCentsPerMinute = session.computeConfig.basePricePerHourCents / 60;
        finalCostCents = Math.ceil(durationMinutes * rateCentsPerMinute);
      }

      // 10. Create BillingCharge record
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      let walletTransactionId: string | null = null;

      if (finalCostCents > 0 && wallet) {
        // Create wallet transaction for the billing charge
        const newBalance = BigInt(wallet.balanceCents) - BigInt(finalCostCents);
        const walletTxn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            txnType: 'debit',
            amountCents: BigInt(finalCostCents),
            balanceAfterCents: newBalance,
            referenceType: 'compute_billing',
            referenceId: sessionId,
            description: `Compute session: ${session.instanceName || session.id}`,
          },
        });
        walletTransactionId = walletTxn.id;

        // 11. Deduct from wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCents: newBalance,
            lifetimeSpentCents: { increment: finalCostCents },
          },
        });
      }

      // Create billing charge record
      await tx.billingCharge.create({
        data: {
          userId,
          chargeType: 'compute',
          sessionId,
          computeConfigId: session.computeConfigId,
          durationSeconds: durationSeconds ?? 0,
          rateCentsPerHour: session.computeConfig.basePricePerHourCents,
          amountCents: BigInt(finalCostCents),
          currency: 'INR',
          walletTransactionId,
        },
      });

      // 12. Update session to ended with final cost
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          cumulativeCostCents: BigInt(finalCostCents),
          costLastUpdatedAt: now,
        },
        include: {
          computeConfig: true,
          node: true,
        },
      });

      this.logger.log(
        `Session terminated: userId=${userId} sessionId=${sessionId} duration=${durationSeconds}s cost=${finalCostCents} paise`,
      );

      return updatedSession;
    });
  }

  // ============================================================================
  // (g) getNodeResourceStatus - Admin endpoint for node resources
  // ============================================================================

  async getNodeResourceStatus(): Promise<NodeResourceStatus[]> {
    const nodes = await this.prisma.node.findMany({
      orderBy: { hostname: 'asc' },
    });

    return nodes.map((node) => {
      const metadata = node.metadata as Record<string, unknown> | null;
      const allocatableVram = (metadata?.allocatableGpuVramMb as number) ?? (node.totalGpuVramMb - 1024);
      const allocatableVcpu = (metadata?.allocatableVcpu as number) ?? (node.totalVcpu - 2);
      const allocatableRam = (metadata?.allocatableMemoryMb as number) ?? (node.totalMemoryMb - 10240);

      return {
        nodeId: node.id,
        hostname: node.hostname,
        displayName: node.displayName,
        gpuModel: node.gpuModel,
        status: node.status,
        total: {
          vramMb: allocatableVram,
          vcpu: allocatableVcpu,
          ramMb: allocatableRam,
        },
        allocated: {
          vramMb: node.allocatedGpuVramMb,
          vcpu: node.allocatedVcpu,
          ramMb: node.allocatedMemoryMb,
        },
        available: {
          vramMb: allocatableVram - node.allocatedGpuVramMb,
          vcpu: allocatableVcpu - node.allocatedVcpu,
          ramMb: allocatableRam - node.allocatedMemoryMb,
        },
        sessionCount: node.currentSessionCount,
        maxConcurrentSessions: node.maxConcurrentSessions,
        lastHeartbeatAt: node.lastHeartbeatAt,
      };
    });
  }

  // ============================================================================
  // (h) getAllSessions - Admin endpoint for all sessions
  // ============================================================================

  async getAllSessions(): Promise<AdminSessionListResponse> {
    const sessions = await this.prisma.session.findMany({
      include: {
        computeConfig: true,
        node: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const formattedSessions: AdminSessionResponse[] = sessions.map((session) => {
      // Calculate uptime
      let uptimeSeconds = 0;
      if (session.startedAt) {
        if (session.endedAt) {
          uptimeSeconds = session.durationSeconds ?? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
        } else {
          uptimeSeconds = Math.floor((now - session.startedAt.getTime()) / 1000);
        }
      }

      // Calculate cost so far
      let costSoFarCents = 0;
      if (ALREADY_ENDED_STATUSES.includes(session.status)) {
        costSoFarCents = Number(session.cumulativeCostCents);
      } else if (session.startedAt && session.computeConfig) {
        const uptimeHours = uptimeSeconds / 3600;
        costSoFarCents = Math.ceil(uptimeHours * session.computeConfig.basePricePerHourCents);
      }

      return {
        id: session.id,
        userId: session.userId,
        instanceName: session.instanceName,
        containerName: session.containerName,
        sessionType: session.sessionType,
        storageMode: session.storageMode,
        status: session.status,
        sessionUrl: session.sessionUrl,
        nfsMountPath: session.nfsMountPath,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
        uptimeSeconds,
        costSoFarCents,
        allocatedVcpu: session.allocatedVcpu,
        allocatedMemoryMb: session.allocatedMemoryMb,
        allocatedGpuVramMb: session.allocatedGpuVramMb,
        allocatedHamiSmPercent: session.allocatedHamiSmPercent,
        computeConfig: session.computeConfig
          ? {
              id: session.computeConfig.id,
              slug: session.computeConfig.slug,
              name: session.computeConfig.name,
              vcpu: session.computeConfig.vcpu,
              memoryMb: session.computeConfig.memoryMb,
              gpuVramMb: session.computeConfig.gpuVramMb,
              gpuModel: session.computeConfig.gpuModel,
              basePricePerHourCents: session.computeConfig.basePricePerHourCents,
            }
          : null,
        node: session.node
          ? {
              id: session.node.id,
              hostname: session.node.hostname,
              gpuModel: session.node.gpuModel,
            }
          : null,
        terminationReason: session.terminationReason,
        terminatedBy: session.terminatedBy,
        terminatedAt: session.terminatedAt,
        cumulativeCostCents: Number(session.cumulativeCostCents),
        durationSeconds: session.durationSeconds,
        user: {
          id: session.user.id,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          email: session.user.email,
        },
      };
    });

    return {
      sessions: formattedSessions,
      total: formattedSessions.length,
    };
  }
}
