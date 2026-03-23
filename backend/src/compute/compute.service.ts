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
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
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
  LaunchSessionResponse,
  SessionEventResponse,
  ConnectionResponse,
  SessionLogsResponse,
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

  // Track active polling sessions to avoid duplicates
  private readonly activePollingMap = new Map<string, boolean>();

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // ORCHESTRATION HTTP CLIENT HELPER
  // ============================================================================

  private async callOrchestration(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    const baseUrl = process.env.SESSION_ORCHESTRATION_URL || 'http://100.100.66.101:9998';
    const secret = process.env.SESSION_ORCHESTRATION_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['X-Session-Secret'] = secret;
    headers['X-Request-Id'] = randomUUID();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Orchestration ${method} ${path} failed: ${res.status} ${text}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // ============================================================================
  // AES-256-GCM ENCRYPTION HELPERS
  // ============================================================================

  private encryptPassword(password: string): { encrypted: string; iv: string; tag: string } {
    const key = Buffer.from(process.env.SESSION_CREDENTIAL_KEY || '', 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { encrypted, iv: iv.toString('hex'), tag };
  }

  private decryptPassword(encrypted: string, iv: string, tag: string): string {
    const key = Buffer.from(process.env.SESSION_CREDENTIAL_KEY || '', 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

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

  async launchSession(userId: string, dto: LaunchSessionDto): Promise<LaunchSessionResponse> {
    // Phase 1: Transaction - create session, reservation, wallet hold
    const txResult = await this.prisma.$transaction(
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

        // 6. Get user for email and storage UID
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { email: true, storageUid: true },
        });
        if (!user) {
          throw new NotFoundException('User not found');
        }

        // 7. If stateful storage, check user has active File Store
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

        // 8. Determine session type
        const sessionType = dto.interfaceMode === 'gui' ? 'stateful_desktop' : 'ephemeral_cli';

        // 9. Create session with full allocation snapshot
        const session = await tx.session.create({
          data: {
            userId,
            computeConfigId: config.id,
            nodeId: node.id,
            sessionType: sessionType as any,
            instanceName: dto.instanceName,
            containerName: null, // Will be set after orchestration responds
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

        // 10. Create NodeResourceReservation
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

        // 11. Update node allocated counters
        await tx.node.update({
          where: { id: node.id },
          data: {
            allocatedVcpu: { increment: config.vcpu },
            allocatedMemoryMb: { increment: config.memoryMb },
            allocatedGpuVramMb: { increment: config.gpuVramMb },
            currentSessionCount: { increment: 1 },
          },
        });

        // 12. Create wallet hold for 1 hour
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

        // Create session_created event
      await tx.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: 'session_created',
          payload: {
            instanceName: dto.instanceName,
            configSlug: config.slug,
            configName: config.name,
            interfaceMode: dto.interfaceMode,
            storageType: dto.storageType,
          },
        },
      });

      this.logger.log(
          `Session created: userId=${userId} sessionId=${session.id} config=${config.slug} instanceName=${dto.instanceName}`,
        );

        return { session, config, node, user };
      },
      { isolationLevel: 'Serializable', timeout: 15000 },
    );

    const { session, config, node, user } = txResult;

    // Phase 2: Call orchestration service to launch the container
    try {
      const orchResponse = await this.callOrchestration('/sessions/launch', 'POST', {
        session_id: session.id,
        user_id: userId,
        user_email: user.email,
        tier_slug: config.slug,
        vcpu: config.vcpu,
        memory_mb: config.memoryMb,
        vram_mb: config.gpuVramMb,
        hami_sm_percent: config.hamiSmPercent ?? 17,
        storage_type: dto.storageType,
        storage_uid: dto.storageType === 'stateful' ? user.storageUid : null,
        node_hostname: node.hostname,
      }) as { containerName: string; launchId: string; sessionId: string };

      // Update session with container name and status = starting
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          containerName: orchResponse.containerName,
          status: 'starting',
        },
      });

      // Create session event for launch initiated
      await this.prisma.sessionEvent.create({
        data: {
          sessionId: session.id,
          eventType: 'launch_initiated',
          payload: {
            containerName: orchResponse.containerName,
            launchId: orchResponse.launchId,
          },
        },
      });

      // Phase 3: Start background polling loop
      this.startEventPolling(session.id, orchResponse.containerName, node);

      this.logger.log(
        `Session launching: sessionId=${session.id} containerName=${orchResponse.containerName}`,
      );

      return {
        sessionId: session.id,
        containerName: orchResponse.containerName,
        status: 'starting',
        instanceName: session.instanceName,
      };
    } catch (err) {
      // Orchestration failed - mark session as failed and release resources
      this.logger.error(`Orchestration launch failed for session ${session.id}: ${err}`);
      await this.releaseSessionResources(session.id, 'orchestration_launch_failed');

      throw new ServiceUnavailableException(
        'Failed to launch session on compute node. Please try again.',
      );
    }
  }

  // ============================================================================
  // BACKGROUND EVENT POLLING FOR SESSION LAUNCH
  // ============================================================================

  private startEventPolling(
    sessionId: string,
    containerName: string,
    node: { id: string; hostname: string; ipCompute: string | null },
  ): void {
    // Prevent duplicate polling
    if (this.activePollingMap.get(sessionId)) {
      this.logger.warn(`Polling already active for session ${sessionId}`);
      return;
    }
    this.activePollingMap.set(sessionId, true);

    const pollIntervalMs = 2000;
    const timeoutMs = 120000;
    const startTime = Date.now();
    let lastEventCount = 0;

    const poll = async () => {
      // Check if polling was cancelled
      if (!this.activePollingMap.get(sessionId)) {
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        this.logger.warn(`Session ${sessionId} launch timed out after ${timeoutMs}ms`);
        await this.handleLaunchFailure(sessionId, 'Launch timed out after 120 seconds');
        this.activePollingMap.delete(sessionId);
        return;
      }

      try {
        const eventsData = (await this.callOrchestration(
          `/sessions/${containerName}/events`,
        )) as {
          events: Array<{ step: string; message: string; ts: string; status: string }>;
          currentStep: string | null;
          overallStatus: 'launching' | 'ready' | 'failed';
          connectionInfo: {
            nginxPort: number;
            selkiesPort: number;
            displayNumber: number;
            password: string;
            username: string;
            sessionUrl: string;
          } | null;
        };

        // Create SessionEvent records for new events
        if (eventsData.events.length > lastEventCount) {
          const newEvents = eventsData.events.slice(lastEventCount);
          for (const event of newEvents) {
            await this.prisma.sessionEvent.create({
              data: {
                sessionId,
                eventType: `launch_${event.step}`,
                payload: {
                  message: event.message,
                  status: event.status,
                  ts: event.ts,
                },
              },
            });
          }
          lastEventCount = eventsData.events.length;
        }

        // Handle completion states
        if (eventsData.overallStatus === 'ready' && eventsData.connectionInfo) {
          // Session is ready!
          const connInfo = eventsData.connectionInfo;
          const { encrypted, iv, tag } = this.encryptPassword(connInfo.password);

          // Build session URL using node IP
          const nodeIp = node.ipCompute || '100.100.66.101';
          const sessionUrl = `http://${nodeIp}:${connInfo.nginxPort}/`;

          // Get current resource snapshot
          const currentSession = await this.prisma.session.findUnique({
            where: { id: sessionId },
            select: { resourceSnapshot: true },
          });
          const existingSnapshot = (currentSession?.resourceSnapshot as Record<string, unknown>) || {};

          await this.prisma.session.update({
            where: { id: sessionId },
            data: {
              status: 'running',
              startedAt: new Date(),
              nginxPort: connInfo.nginxPort,
              selkiesPort: connInfo.selkiesPort,
              displayNumber: connInfo.displayNumber,
              sessionUrl,
              resourceSnapshot: {
                ...existingSnapshot,
                encryptedPassword: encrypted,
                encryptedPasswordIv: iv,
                encryptedPasswordTag: tag,
              },
            },
          });

          await this.prisma.sessionEvent.create({
            data: {
              sessionId,
              eventType: 'session_ready',
              payload: {
                sessionUrl,
                nginxPort: connInfo.nginxPort,
                selkiesPort: connInfo.selkiesPort,
                displayNumber: connInfo.displayNumber,
              },
            },
          });

          this.logger.log(`Session ${sessionId} is now running at ${sessionUrl}`);
          this.activePollingMap.delete(sessionId);
          return;
        }

        if (eventsData.overallStatus === 'failed') {
          // Get the failure reason from the last event
          const lastEvent = eventsData.events[eventsData.events.length - 1];
          const reason = lastEvent?.message || 'Launch failed';
          await this.handleLaunchFailure(sessionId, reason);
          this.activePollingMap.delete(sessionId);
          return;
        }

        // Continue polling
        setTimeout(poll, pollIntervalMs);
      } catch (err) {
        this.logger.warn(`Event polling error for session ${sessionId}: ${err}`);
        // Continue polling on transient errors
        setTimeout(poll, pollIntervalMs);
      }
    };

    // Start the first poll
    setTimeout(poll, pollIntervalMs);
  }

  private async handleLaunchFailure(sessionId: string, reason: string): Promise<void> {
    this.logger.error(`Session ${sessionId} launch failed: ${reason}`);
    await this.releaseSessionResources(sessionId, reason);

    await this.prisma.sessionEvent.create({
      data: {
        sessionId,
        eventType: 'launch_failed',
        payload: { reason },
      },
    });
  }

  private async releaseSessionResources(sessionId: string, reason: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { nodeResourceReservation: true, computeConfig: true },
    });

    if (!session) return;

    const now = new Date();

    // Update session to failed
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        endedAt: now,
        terminationReason: reason as any,
      },
    });

    // Release NodeResourceReservation
    if (session.nodeResourceReservation) {
      await this.prisma.nodeResourceReservation.update({
        where: { id: session.nodeResourceReservation.id },
        data: { status: 'released', releasedAt: now },
      });
    }

    // Decrement node counters
    if (session.nodeId && session.computeConfig) {
      await this.prisma.node.update({
        where: { id: session.nodeId },
        data: {
          allocatedVcpu: { decrement: session.allocatedVcpu ?? session.computeConfig.vcpu },
          allocatedMemoryMb: { decrement: session.allocatedMemoryMb ?? session.computeConfig.memoryMb },
          allocatedGpuVramMb: { decrement: session.allocatedGpuVramMb ?? session.computeConfig.gpuVramMb },
          currentSessionCount: { decrement: 1 },
        },
      });
    }

    // Release wallet holds
    await this.prisma.walletHold.updateMany({
      where: { sessionId, status: 'active' },
      data: { status: 'released', releasedAt: now, releaseReason: 'session_failed' },
    });
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
    const result = await this.prisma.$transaction(async (tx) => {
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
        return { updatedSession: session, containerName: null };
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

      // 8. Calculate final cost (minimum 1 minute)
      let finalCostCents = 0;
      if (durationSeconds !== null && durationSeconds > 0) {
        const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
        const rateCentsPerMinute = session.computeConfig.basePricePerHourCents / 60;
        finalCostCents = Math.ceil(durationMinutes * rateCentsPerMinute);
      }

      // 9. Handle wallet holds - capture if we're billing, release if no charge
      if (finalCostCents > 0) {
        // Capture the hold since we're billing the user
        await tx.walletHold.updateMany({
          where: { sessionId, status: 'active' },
          data: {
            status: 'captured',
            releasedAt: now,
            releaseReason: 'session_billing_captured',
            capturedAmount: BigInt(finalCostCents),
          },
        });
      } else {
        // Release the hold since there's no charge (session never started or 0 duration)
        await tx.walletHold.updateMany({
          where: { sessionId, status: 'active' },
          data: {
            status: 'released',
            releasedAt: now,
            releaseReason: 'session_terminated_no_charge',
          },
        });
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

      // 13. Create session terminated event
      await tx.sessionEvent.create({
        data: {
          sessionId,
          eventType: 'session_terminated',
          payload: {
            terminatedBy: userId,
            terminationReason: 'user_requested',
            durationSeconds,
            finalCostCents,
          },
        },
      });

      this.logger.log(
        `Session terminated: userId=${userId} sessionId=${sessionId} duration=${durationSeconds}s cost=${finalCostCents} paise`,
      );

      // 14. Call orchestration to stop container (after transaction commits we handle this)
      // Store containerName for post-transaction orchestration call
      return { updatedSession, containerName: session.containerName };
    });

    // After transaction: call orchestration to stop the container
    if (result.containerName) {
      try {
        await this.callOrchestration(`/sessions/${result.containerName}/stop`, 'POST');
        this.logger.log(`Container ${result.containerName} stopped via orchestration`);
      } catch (err) {
        // Log but don't fail - container may already be gone (404) or orchestration may be down
        this.logger.warn(`Failed to stop container ${result.containerName} via orchestration: ${err}`);
      }
    }

    // Cancel any active polling for this session
    this.activePollingMap.delete(sessionId);

    return result.updatedSession;
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

  // ============================================================================
  // SESSION STATUS RECONCILIATION (Cron job)
  // ============================================================================

  @Cron('*/30 * * * * *') // Every 30 seconds
  async reconcileSessionStatuses(): Promise<void> {
    // Query sessions with active statuses
    const activeSessions = await this.prisma.session.findMany({
      where: { status: { in: ['starting', 'running', 'reconnecting'] } },
      include: { computeConfig: true },
    });

    if (activeSessions.length === 0) return;

    this.logger.debug(`Reconciling ${activeSessions.length} active sessions`);

    for (const session of activeSessions) {
      if (!session.containerName) continue;

      try {
        const statusData = (await this.callOrchestration(
          `/sessions/${session.containerName}/status`,
        )) as { containerName: string; status: string; running: boolean };

        // Container is running but session is 'starting' - promote to running
        if (statusData.running && session.status === 'starting') {
          // This shouldn't happen normally (polling handles it), but just in case
          this.logger.log(`Promoting session ${session.id} to running (reconciliation)`);
          await this.prisma.session.update({
            where: { id: session.id },
            data: { status: 'running', startedAt: session.startedAt ?? new Date() },
          });
        }

        // Container exited but session is still 'running' - mark as ended
        if (!statusData.running && statusData.status === 'exited' && session.status === 'running') {
          this.logger.log(`Session ${session.id} container exited unexpectedly, settling billing`);
          // Settle billing and mark as ended
          await this.settleSessionBilling(session.id, session.userId);
        }
      } catch (err) {
        // 404 means container not found - if session is active, mark as failed
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('404')) {
          this.logger.warn(`Container ${session.containerName} not found for active session ${session.id}`);
          await this.releaseSessionResources(session.id, 'container_not_found');
        } else {
          this.logger.warn(`Reconciliation error for session ${session.id}: ${errMsg}`);
        }
      }
    }
  }

  private async settleSessionBilling(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { computeConfig: true, nodeResourceReservation: true },
    });

    if (!session || !session.startedAt) return;

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
    const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    const rateCentsPerMinute = session.computeConfig.basePricePerHourCents / 60;
    const finalCostCents = Math.ceil(durationMinutes * rateCentsPerMinute);

    await this.prisma.$transaction(async (tx) => {
      // Update session to ended
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: now,
          durationSeconds,
          cumulativeCostCents: BigInt(finalCostCents),
          costLastUpdatedAt: now,
          terminationReason: 'error_unrecoverable',
        },
      });

      // Release reservation
      if (session.nodeResourceReservation) {
        await tx.nodeResourceReservation.update({
          where: { id: session.nodeResourceReservation.id },
          data: { status: 'released', releasedAt: now },
        });
      }

      // Decrement node counters
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

      // Release wallet holds
      await tx.walletHold.updateMany({
        where: { sessionId, status: 'active' },
        data: { status: 'released', releasedAt: now, releaseReason: 'session_ended' },
      });

      // Create billing charge
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (finalCostCents > 0 && wallet) {
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

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceCents: newBalance, lifetimeSpentCents: { increment: finalCostCents } },
        });

        await tx.billingCharge.create({
          data: {
            userId,
            chargeType: 'compute',
            sessionId,
            computeConfigId: session.computeConfigId,
            durationSeconds,
            rateCentsPerHour: session.computeConfig.basePricePerHourCents,
            amountCents: BigInt(finalCostCents),
            currency: 'INR',
            walletTransactionId: walletTxn.id,
          },
        });
      }

      // Create event
      await tx.sessionEvent.create({
        data: {
          sessionId,
          eventType: 'session_ended',
          payload: { reason: 'container_exited', durationSeconds, finalCostCents },
        },
      });
    });
  }

  // ============================================================================
  // NEW ENDPOINTS: Restart, Logs, Connection, Events
  // ============================================================================

  async restartSession(userId: string, sessionId: string): Promise<{ ok: boolean; message: string }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'running') {
      throw new ConflictException(`Session cannot be restarted from status: ${session.status}`);
    }

    if (!session.containerName) {
      throw new BadRequestException('Session has no container to restart');
    }

    try {
      await this.callOrchestration(`/sessions/${session.containerName}/restart`, 'POST');

      await this.prisma.sessionEvent.create({
        data: {
          sessionId,
          eventType: 'session_restarted',
          payload: { restartedBy: userId },
        },
      });

      this.logger.log(`Session ${sessionId} restarted by user ${userId}`);
      return { ok: true, message: 'Session restart initiated' };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to restart session ${sessionId}: ${errMsg}`);
      throw new ServiceUnavailableException('Failed to restart session');
    }
  }

  async getSessionLogs(userId: string, sessionId: string): Promise<SessionLogsResponse> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.containerName) {
      throw new BadRequestException('Session has no container');
    }

    try {
      const logsData = (await this.callOrchestration(
        `/sessions/${session.containerName}/logs`,
      )) as { containerName: string; logs: string; tail: number };

      return {
        containerName: logsData.containerName,
        logs: logsData.logs,
        tail: logsData.tail,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('404')) {
        throw new NotFoundException('Container not found');
      }
      this.logger.error(`Failed to get logs for session ${sessionId}: ${errMsg}`);
      throw new ServiceUnavailableException('Failed to retrieve session logs');
    }
  }

  async getSessionConnection(userId: string, sessionId: string): Promise<ConnectionResponse> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        status: true,
        sessionUrl: true,
        resourceSnapshot: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === 'running') {
      const snapshot = session.resourceSnapshot as Record<string, unknown> | null;
      if (
        snapshot?.encryptedPassword &&
        snapshot?.encryptedPasswordIv &&
        snapshot?.encryptedPasswordTag
      ) {
        try {
          const password = this.decryptPassword(
            snapshot.encryptedPassword as string,
            snapshot.encryptedPasswordIv as string,
            snapshot.encryptedPasswordTag as string,
          );
          return {
            status: 'ready',
            sessionUrl: session.sessionUrl || undefined,
            username: 'ubuntu',
            password,
          };
        } catch (err) {
          this.logger.error(`Failed to decrypt password for session ${sessionId}: ${err}`);
          return { status: 'unavailable' };
        }
      }
      // No encrypted password - session is running but credentials not yet available
      return { status: 'launching' };
    }

    if (session.status === 'starting' || session.status === 'pending') {
      return { status: 'launching' };
    }

    // ended, failed, stopping, etc.
    return { status: 'unavailable' };
  }

  async getSessionEvents(userId: string, sessionId: string): Promise<SessionEventResponse[]> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const events = await this.prisma.sessionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType,
      payload: e.payload as Record<string, unknown> | null,
      createdAt: e.createdAt,
    }));
  }
}
