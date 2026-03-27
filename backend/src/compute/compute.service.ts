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
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { SessionTerminationReason } from '@prisma/client';
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
const RESOURCE_CONSUMING_STATUSES = [
  'pending',
  'starting',
  'running',
  'reconnecting',
];

// Statuses that can be terminated by user
const TERMINABLE_STATUSES = ['pending', 'starting', 'running', 'reconnecting'];

// Statuses that mean the session is already ended (idempotent termination)
const ALREADY_ENDED_STATUSES = [
  'stopping',
  'ended',
  'failed',
  'terminated_idle',
  'terminated_overuse',
];

@Injectable()
export class ComputeService {
  private readonly logger = new Logger(ComputeService.name);

  // Track active polling sessions to avoid duplicates
  private readonly activePollingMap = new Map<string, boolean>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================================================
  // ORCHESTRATION HTTP CLIENT HELPER
  // ============================================================================

  private async callOrchestration(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    const baseUrl =
      process.env.SESSION_ORCHESTRATION_URL || 'http://100.100.66.101:9998';
    const secret = process.env.SESSION_ORCHESTRATION_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
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
        throw new Error(
          `Orchestration ${method} ${path} failed: ${res.status} ${text}`,
        );
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

  private encryptPassword(password: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
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
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ============================================================================
  // HELPER: Get allocatable resources from node
  // ============================================================================

  private async getAllocatable(nodeId?: string) {
    const whereClause = nodeId
      ? { id: nodeId, status: 'healthy' as const }
      : { status: 'healthy' as const };
    const node = await this.prisma.node.findFirst({
      where: whereClause,
    });

    if (!node) {
      throw new ServiceUnavailableException(
        'No healthy compute nodes available',
      );
    }

    const metadata = node.metadata as Record<string, unknown> | null;
    return {
      node,
      allocatable: {
        vramMb:
          (metadata?.allocatableGpuVramMb as number) ??
          node.totalGpuVramMb - 1024,
        vcpu: (metadata?.allocatableVcpu as number) ?? node.totalVcpu - 2,
        ramMb:
          (metadata?.allocatableMemoryMb as number) ??
          node.totalMemoryMb - 10240,
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
        const byVram =
          config.gpuVramMb > 0
            ? Math.floor(available.vramMb / config.gpuVramMb)
            : Infinity;
        const byCpu =
          config.vcpu > 0 ? Math.floor(available.vcpu / config.vcpu) : Infinity;
        const byRam =
          config.memoryMb > 0
            ? Math.floor(available.ramMb / config.memoryMb)
            : Infinity;
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

  async launchSession(
    userId: string,
    dto: LaunchSessionDto,
  ): Promise<LaunchSessionResponse> {
    // Phase 1: Transaction - create session, reservation, wallet hold
    const txResult = await this.prisma.$transaction(
      async (tx) => {
        // 1. Validate config exists and is active
        const config = await tx.computeConfig.findUnique({
          where: { id: dto.computeConfigId },
        });
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
          throw new ServiceUnavailableException(
            'No healthy compute nodes available',
          );
        }
        const metadata = node.metadata as Record<string, unknown> | null;
        const allocatable = {
          vramMb:
            (metadata?.allocatableGpuVramMb as number) ??
            node.totalGpuVramMb - 1024,
          vcpu: (metadata?.allocatableVcpu as number) ?? node.totalVcpu - 2,
          ramMb:
            (metadata?.allocatableMemoryMb as number) ??
            node.totalMemoryMb - 10240,
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
            bottlenecks.push(
              `GPU VRAM (need ${config.gpuVramMb}MB, ${available.vramMb}MB free)`,
            );
          }
          if (config.vcpu > available.vcpu) {
            bottlenecks.push(
              `CPU (need ${config.vcpu} cores, ${available.vcpu} free)`,
            );
          }
          if (config.memoryMb > available.ramMb) {
            bottlenecks.push(
              `RAM (need ${config.memoryMb}MB, ${available.ramMb}MB free)`,
            );
          }
          throw new ConflictException(
            `Insufficient resources: ${bottlenecks.join(', ')}`,
          );
        }

        // 5. Check wallet balance (minimum 1 hour)
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          throw new BadRequestException(
            'Wallet not found. Please contact support.',
          );
        }
        if (wallet.isFrozen) {
          throw new ForbiddenException(
            'Wallet is frozen. Please contact support.',
          );
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
        const sessionType =
          dto.interfaceMode === 'gui' ? 'stateful_desktop' : 'ephemeral_cli';

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
      const orchResponse = (await this.callOrchestration(
        '/sessions/launch',
        'POST',
        {
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
        },
      )) as { containerName: string; launchId: string; sessionId: string };

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
      this.logger.error(
        `Orchestration launch failed for session ${session.id}: ${err}`,
      );
      await this.releaseSessionResources(
        session.id,
        'error_unrecoverable',
        `Orchestration launch failed: ${err}`,
      );

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
        this.logger.warn(
          `Session ${sessionId} launch timed out after ${timeoutMs}ms`,
        );
        await this.handleLaunchFailure(
          sessionId,
          'Launch timed out after 120 seconds',
        );
        this.activePollingMap.delete(sessionId);
        return;
      }

      try {
        const eventsData = (await this.callOrchestration(
          `/sessions/${containerName}/events`,
        )) as {
          events: Array<{
            step: string;
            message: string;
            ts: string;
            status: string;
          }>;
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
          const { encrypted, iv, tag } = this.encryptPassword(
            connInfo.password,
          );

          // Build session URL using node IP
          const nodeIp = node.ipCompute || '100.100.66.101';
          const sessionUrl = `http://${nodeIp}:${connInfo.nginxPort}/`;

          // Get current resource snapshot
          const currentSession = await this.prisma.session.findUnique({
            where: { id: sessionId },
            select: { resourceSnapshot: true },
          });
          const existingSnapshot =
            (currentSession?.resourceSnapshot as Record<string, unknown>) || {};

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

          // PREPAID BILLING: Charge first hour immediately when session starts
          await this.chargeInitialPrepaidHour(sessionId);

          this.logger.log(
            `Session ${sessionId} is now running at ${sessionUrl}`,
          );
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
        this.logger.warn(
          `Event polling error for session ${sessionId}: ${err}`,
        );
        // Continue polling on transient errors
        setTimeout(poll, pollIntervalMs);
      }
    };

    // Start the first poll
    setTimeout(poll, pollIntervalMs);
  }

  private async handleLaunchFailure(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    this.logger.error(`Session ${sessionId} launch failed: ${reason}`);
    await this.releaseSessionResources(sessionId, 'error_unrecoverable', reason);

    await this.prisma.sessionEvent.create({
      data: {
        sessionId,
        eventType: 'launch_failed',
        payload: { reason },
      },
    });
  }

  private async releaseSessionResources(
    sessionId: string,
    terminationReason: SessionTerminationReason,
    errorDetails?: string,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { nodeResourceReservation: true, computeConfig: true },
    });

    if (!session) return;

    // Log the detailed error message if provided
    if (errorDetails) {
      this.logger.error(
        `Session ${sessionId} release reason details: ${errorDetails}`,
      );
    }

    const now = new Date();

    // Update session to failed
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        endedAt: now,
        terminationReason: terminationReason,
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
          allocatedVcpu: {
            decrement: session.allocatedVcpu ?? session.computeConfig.vcpu,
          },
          allocatedMemoryMb: {
            decrement:
              session.allocatedMemoryMb ?? session.computeConfig.memoryMb,
          },
          allocatedGpuVramMb: {
            decrement:
              session.allocatedGpuVramMb ?? session.computeConfig.gpuVramMb,
          },
          currentSessionCount: { decrement: 1 },
        },
      });
    }

    // Release wallet holds
    await this.prisma.walletHold.updateMany({
      where: { sessionId, status: 'active' },
      data: {
        status: 'released',
        releasedAt: now,
        releaseReason: 'session_failed',
      },
    });
  }

  // ============================================================================
  // PREPAID BILLING: Charge first hour immediately when session starts running
  // ============================================================================

  private async chargeInitialPrepaidHour(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { computeConfig: true },
    });

    if (!session || !session.computeConfig) {
      this.logger.warn(
        `Cannot charge prepaid hour: session ${sessionId} not found or no config`,
      );
      return;
    }

    const chargeCents = session.computeConfig.basePricePerHourCents;
    if (chargeCents <= 0) {
      this.logger.debug(
        `Session ${sessionId} has zero cost config, skipping prepaid charge`,
      );
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findUnique({
          where: { userId: session.userId },
        });

        if (!wallet) {
          this.logger.warn(
            `No wallet found for user ${session.userId}, cannot charge prepaid hour`,
          );
          return;
        }

        const currentBalance = Number(wallet.balanceCents);
        if (currentBalance < chargeCents) {
          this.logger.warn(
            `Session ${sessionId}: Insufficient balance for prepaid hour (${currentBalance} < ${chargeCents})`,
          );
          // Note: Pre-launch validation should have caught this, but log as warning
          return;
        }

        // Spend limit pre-check: Check if adding 1 hour would exceed spend limit
        if (wallet.spendLimitEnabled && wallet.spendLimitCents) {
          const periodStart = this.getSpendLimitPeriodStart(
            wallet.spendLimitPeriod,
            wallet.spendLimitStartDate,
          );
          // For date_range, check if within range
          let withinRange = true;
          if (wallet.spendLimitPeriod === 'date_range') {
            const now = new Date();
            if (wallet.spendLimitStartDate && now < wallet.spendLimitStartDate) withinRange = false;
            if (wallet.spendLimitEndDate && now > wallet.spendLimitEndDate) withinRange = false;
          }
          if (withinRange) {
            const periodSpent = await tx.billingCharge.aggregate({
              where: { userId: session.userId, createdAt: { gte: periodStart } },
              _sum: { amountCents: true },
            });
            const totalSpent = Number(periodSpent._sum.amountCents || 0);
            if (totalSpent + chargeCents > Number(wallet.spendLimitCents)) {
              this.logger.warn(
                `Session ${sessionId}: would exceed spend limit (${totalSpent} + ${chargeCents} > ${wallet.spendLimitCents}), skipping initial charge`,
              );
              return; // Don't charge — the session will be caught by enforcement
            }
          }
        }

        const newBalance = BigInt(wallet.balanceCents) - BigInt(chargeCents);

        // 1. Create WalletTransaction (debit)
        const walletTxn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: session.userId,
            txnType: 'debit',
            amountCents: BigInt(chargeCents),
            balanceAfterCents: newBalance,
            referenceType: 'compute_billing',
            referenceId: session.id,
            description: `Compute charge - session launch (prepaid hour 1)`,
          },
        });

        // 2. Debit wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCents: newBalance,
            lifetimeSpentCents: { increment: chargeCents },
          },
        });

        // 3. Create BillingCharge record
        await tx.billingCharge.create({
          data: {
            userId: session.userId,
            chargeType: 'compute',
            sessionId: session.id,
            computeConfigId: session.computeConfigId,
            durationSeconds: 3600, // Prepaid for 1 hour
            rateCentsPerHour: session.computeConfig.basePricePerHourCents,
            amountCents: BigInt(chargeCents),
            currency: 'INR',
            walletTransactionId: walletTxn.id,
          },
        });

        // 4. Update session cumulative cost
        await tx.session.update({
          where: { id: session.id },
          data: {
            cumulativeCostCents: { increment: chargeCents },
            costLastUpdatedAt: new Date(),
          },
        });

        // 5. Capture the WalletHold (convert hold to actual charge)
        await tx.walletHold.updateMany({
          where: { sessionId: session.id, status: 'active' },
          data: {
            status: 'captured',
            releasedAt: new Date(),
            releaseReason: 'prepaid_hour_charged',
            capturedAmount: BigInt(chargeCents),
          },
        });

        this.logger.log(
          `Prepaid hour 1 charged: session=${sessionId} amount=${chargeCents} paise (₹${(chargeCents / 100).toFixed(2)})`,
        );
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to charge prepaid hour for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - session should still work, billing can be reconciled later
    }
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
          uptimeSeconds =
            session.durationSeconds ??
            Math.floor(
              (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
            );
        } else {
          uptimeSeconds = Math.floor(
            (now - session.startedAt.getTime()) / 1000,
          );
        }
      }

      // Calculate cost so far
      let costSoFarCents = 0;
      if (ALREADY_ENDED_STATUSES.includes(session.status)) {
        costSoFarCents = Number(session.cumulativeCostCents);
      } else if (session.startedAt && session.computeConfig) {
        const uptimeHours = uptimeSeconds / 3600;
        costSoFarCents = Math.ceil(
          uptimeHours * session.computeConfig.basePricePerHourCents,
        );
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
              basePricePerHourCents:
                session.computeConfig.basePricePerHourCents,
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

  async getSessionDetail(
    userId: string,
    sessionId: string,
  ): Promise<SessionDetailResponse> {
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
        uptimeSeconds =
          session.durationSeconds ??
          Math.floor(
            (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
          );
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
      costSoFarCents = Math.ceil(
        uptimeHours * session.computeConfig.basePricePerHourCents,
      );
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
      resourceSnapshot: session.resourceSnapshot as Record<
        string,
        unknown
      > | null,
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
            reservedGpuVramMb:
              session.nodeResourceReservation.reservedGpuVramMb,
            reservedHamiSmPercent:
              session.nodeResourceReservation.reservedHamiSmPercent,
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

  async terminateSession(
    userId: string,
    sessionId: string,
    terminationReason: SessionTerminationReason = 'user_requested',
  ) {
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
        this.logger.debug(
          `Session ${sessionId} already in terminal state: ${session.status}`,
        );
        return { updatedSession: session, containerName: null };
      }

      // 3. Verify session is in terminable status
      if (!TERMINABLE_STATUSES.includes(session.status)) {
        throw new ConflictException(
          `Session cannot be terminated from status: ${session.status}`,
        );
      }

      const now = new Date();

      // 4. Calculate duration if session was started
      let durationSeconds: number | null = null;
      if (session.startedAt) {
        durationSeconds = Math.floor(
          (now.getTime() - session.startedAt.getTime()) / 1000,
        );
      }

      // 5. Set session to stopping first
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'stopping',
          endedAt: now,
          terminationReason: terminationReason,
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
            allocatedVcpu: {
              decrement: session.allocatedVcpu ?? session.computeConfig.vcpu,
            },
            allocatedMemoryMb: {
              decrement:
                session.allocatedMemoryMb ?? session.computeConfig.memoryMb,
            },
            allocatedGpuVramMb: {
              decrement:
                session.allocatedGpuVramMb ?? session.computeConfig.gpuVramMb,
            },
            currentSessionCount: { decrement: 1 },
          },
        });
      }

      // 8. PREPAID BILLING: Calculate remaining charge (if any)
      // In prepaid model, user already paid for full hours at session launch and each cron cycle.
      // At termination, we calculate total expected cost and charge only the difference.
      const basePricePerHourCents = session.computeConfig.basePricePerHourCents;
      const alreadyBilledCents = Number(session.cumulativeCostCents);

      let totalCostCents = 0;
      let remainingChargeCents = 0;

      if (durationSeconds !== null && durationSeconds > 0) {
        // Calculate total hours (minimum 1 hour)
        const totalHours = Math.max(1, Math.ceil(durationSeconds / 3600));
        totalCostCents = totalHours * basePricePerHourCents;

        // Calculate how much more we need to charge (if any)
        remainingChargeCents = Math.max(0, totalCostCents - alreadyBilledCents);

        this.logger.log(
          `Session ${sessionId}: duration=${durationSeconds}s, totalHours=${totalHours}, ` +
            `totalCost=${totalCostCents}, alreadyBilled=${alreadyBilledCents}, remaining=${remainingChargeCents}`,
        );
      }

      // 9. Release any active wallet holds
      await tx.walletHold.updateMany({
        where: { sessionId, status: 'active' },
        data: {
          status: 'released',
          releasedAt: now,
          releaseReason:
            remainingChargeCents > 0
              ? 'session_final_billing'
              : 'session_terminated_prepaid_covered',
        },
      });

      // 10. Create final billing charge (only if there's remaining amount to charge)
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      let walletTransactionId: string | null = null;

      if (remainingChargeCents > 0 && wallet) {
        // Calculate remaining duration that wasn't billed (for the BillingCharge record)
        const alreadyBilledSeconds = Math.floor(
          (alreadyBilledCents / basePricePerHourCents) * 3600,
        );
        const remainingSeconds = Math.max(
          0,
          (durationSeconds ?? 0) - alreadyBilledSeconds,
        );

        const newBalance =
          BigInt(wallet.balanceCents) - BigInt(remainingChargeCents);
        const walletTxn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            txnType: 'debit',
            amountCents: BigInt(remainingChargeCents),
            balanceAfterCents: newBalance,
            referenceType: 'compute_billing',
            referenceId: sessionId,
            description: `Final compute charge: ${session.instanceName || session.id}`,
          },
        });
        walletTransactionId = walletTxn.id;

        // 11. Deduct from wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCents: newBalance,
            lifetimeSpentCents: { increment: remainingChargeCents },
          },
        });

        // Create final billing charge record
        await tx.billingCharge.create({
          data: {
            userId,
            chargeType: 'compute',
            sessionId,
            computeConfigId: session.computeConfigId,
            durationSeconds: remainingSeconds,
            rateCentsPerHour: basePricePerHourCents,
            amountCents: BigInt(remainingChargeCents),
            currency: 'INR',
            walletTransactionId,
          },
        });
      }

      // 12. Update session to ended with final total cost
      const updatedSession = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          // In prepaid model: final cost is the max of what was billed and actual usage
          cumulativeCostCents: BigInt(
            Math.max(alreadyBilledCents, totalCostCents),
          ),
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
            terminationReason: terminationReason,
            durationSeconds,
            totalCostCents,
            alreadyBilledCents,
            remainingChargeCents,
          },
        },
      });

      this.logger.log(
        `Session terminated: userId=${userId} sessionId=${sessionId} duration=${durationSeconds}s ` +
          `totalCost=${totalCostCents} paise (prepaid=${alreadyBilledCents}, final=${remainingChargeCents})`,
      );

      // 14. Call orchestration to stop container (after transaction commits we handle this)
      // Store containerName for post-transaction orchestration call
      return { updatedSession, containerName: session.containerName };
    });

    // After transaction: call orchestration to stop the container
    if (result.containerName) {
      try {
        await this.callOrchestration(
          `/sessions/${result.containerName}/stop`,
          'POST',
        );
        this.logger.log(
          `Container ${result.containerName} stopped via orchestration`,
        );
      } catch (err) {
        // Log but don't fail - container may already be gone (404) or orchestration may be down
        this.logger.warn(
          `Failed to stop container ${result.containerName} via orchestration: ${err}`,
        );
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
      const allocatableVram =
        (metadata?.allocatableGpuVramMb as number) ??
        node.totalGpuVramMb - 1024;
      const allocatableVcpu =
        (metadata?.allocatableVcpu as number) ?? node.totalVcpu - 2;
      const allocatableRam =
        (metadata?.allocatableMemoryMb as number) ?? node.totalMemoryMb - 10240;

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
    const formattedSessions: AdminSessionResponse[] = sessions.map(
      (session) => {
        // Calculate uptime
        let uptimeSeconds = 0;
        if (session.startedAt) {
          if (session.endedAt) {
            uptimeSeconds =
              session.durationSeconds ??
              Math.floor(
                (session.endedAt.getTime() - session.startedAt.getTime()) /
                  1000,
              );
          } else {
            uptimeSeconds = Math.floor(
              (now - session.startedAt.getTime()) / 1000,
            );
          }
        }

        // Calculate cost so far
        let costSoFarCents = 0;
        if (ALREADY_ENDED_STATUSES.includes(session.status)) {
          costSoFarCents = Number(session.cumulativeCostCents);
        } else if (session.startedAt && session.computeConfig) {
          const uptimeHours = uptimeSeconds / 3600;
          costSoFarCents = Math.ceil(
            uptimeHours * session.computeConfig.basePricePerHourCents,
          );
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
                basePricePerHourCents:
                  session.computeConfig.basePricePerHourCents,
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
      },
    );

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
          this.logger.log(
            `Promoting session ${session.id} to running (reconciliation)`,
          );
          await this.prisma.session.update({
            where: { id: session.id },
            data: {
              status: 'running',
              startedAt: session.startedAt ?? new Date(),
            },
          });
        }

        // Container exited but session is still 'running' - mark as ended
        if (
          !statusData.running &&
          statusData.status === 'exited' &&
          session.status === 'running'
        ) {
          this.logger.log(
            `Session ${session.id} container exited unexpectedly, settling billing`,
          );
          // Settle billing and mark as ended
          await this.settleSessionBilling(session.id, session.userId);
        }
      } catch (err) {
        // 404 means container not found - if session is active, mark as failed
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('404')) {
          this.logger.warn(
            `Container ${session.containerName} not found for active session ${session.id}`,
          );
          await this.releaseSessionResources(
            session.id,
            'error_unrecoverable',
            `Container ${session.containerName} not found`,
          );
        } else {
          this.logger.warn(
            `Reconciliation error for session ${session.id}: ${errMsg}`,
          );
        }
      }
    }
  }

  private async settleSessionBilling(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { computeConfig: true, nodeResourceReservation: true },
    });

    if (!session || !session.startedAt) return;

    const now = new Date();
    const durationSeconds = Math.floor(
      (now.getTime() - session.startedAt.getTime()) / 1000,
    );

    // PREPAID BILLING: Calculate remaining charge (if any)
    const basePricePerHourCents = session.computeConfig.basePricePerHourCents;
    const alreadyBilledCents = Number(session.cumulativeCostCents);

    // Calculate total hours (minimum 1 hour)
    const totalHours = Math.max(1, Math.ceil(durationSeconds / 3600));
    const totalCostCents = totalHours * basePricePerHourCents;

    // Calculate how much more we need to charge (if any)
    const remainingChargeCents = Math.max(
      0,
      totalCostCents - alreadyBilledCents,
    );

    await this.prisma.$transaction(async (tx) => {
      // Update session to ended
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: now,
          durationSeconds,
          cumulativeCostCents: BigInt(
            Math.max(alreadyBilledCents, totalCostCents),
          ),
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
            allocatedVcpu: {
              decrement: session.allocatedVcpu ?? session.computeConfig.vcpu,
            },
            allocatedMemoryMb: {
              decrement:
                session.allocatedMemoryMb ?? session.computeConfig.memoryMb,
            },
            allocatedGpuVramMb: {
              decrement:
                session.allocatedGpuVramMb ?? session.computeConfig.gpuVramMb,
            },
            currentSessionCount: { decrement: 1 },
          },
        });
      }

      // Release wallet holds
      await tx.walletHold.updateMany({
        where: { sessionId, status: 'active' },
        data: {
          status: 'released',
          releasedAt: now,
          releaseReason:
            remainingChargeCents > 0
              ? 'session_settle_billing'
              : 'session_ended_prepaid_covered',
        },
      });

      // Create final billing charge (only if there's remaining amount to charge)
      if (remainingChargeCents > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (wallet) {
          const alreadyBilledSeconds = Math.floor(
            (alreadyBilledCents / basePricePerHourCents) * 3600,
          );
          const remainingSeconds = Math.max(
            0,
            durationSeconds - alreadyBilledSeconds,
          );

          const newBalance =
            BigInt(wallet.balanceCents) - BigInt(remainingChargeCents);
          const walletTxn = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId,
              txnType: 'debit',
              amountCents: BigInt(remainingChargeCents),
              balanceAfterCents: newBalance,
              referenceType: 'compute_billing',
              referenceId: sessionId,
              description: `Final compute charge (container exit): ${session.instanceName || session.id}`,
            },
          });

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balanceCents: newBalance,
              lifetimeSpentCents: { increment: remainingChargeCents },
            },
          });

          await tx.billingCharge.create({
            data: {
              userId,
              chargeType: 'compute',
              sessionId,
              computeConfigId: session.computeConfigId,
              durationSeconds: remainingSeconds,
              rateCentsPerHour: basePricePerHourCents,
              amountCents: BigInt(remainingChargeCents),
              currency: 'INR',
              walletTransactionId: walletTxn.id,
            },
          });
        }
      }

      // Create event
      await tx.sessionEvent.create({
        data: {
          sessionId,
          eventType: 'session_ended',
          payload: {
            reason: 'container_exited',
            durationSeconds,
            totalCostCents,
            alreadyBilledCents,
            remainingChargeCents,
          },
        },
      });
    });
  }

  // ============================================================================
  // PREPAID HOURLY COMPUTE BILLING (Cron job)
  // Charges running sessions 1 full hour in advance every hour
  // ============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyComputeBilling(): Promise<void> {
    const billingHour = new Date();
    // Round down to the start of current hour for idempotency key
    billingHour.setMinutes(0, 0, 0);

    this.logger.log(
      `Starting hourly compute billing cycle for ${billingHour.toISOString()}`,
    );

    try {
      // Find all sessions with status = 'running' and startedAt != null
      const runningSessions = await this.prisma.session.findMany({
        where: {
          status: 'running',
          startedAt: { not: null },
        },
        include: {
          computeConfig: true,
        },
      });

      if (runningSessions.length === 0) {
        this.logger.debug('No running sessions to bill');
        return;
      }

      this.logger.log(
        `Processing hourly billing for ${runningSessions.length} running session(s)`,
      );

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const session of runningSessions) {
        try {
          const result = await this.processSessionHourlyBilling(
            {
              id: session.id,
              userId: session.userId,
              instanceName: session.instanceName || session.id,
              startedAt: session.startedAt,
              computeConfigId: session.computeConfigId,
              computeConfig: session.computeConfig,
            },
            billingHour,
          );
          if (result === 'charged') {
            successCount++;
            // After successful charge, check spend limit enforcement
            await this.checkAndEnforceSpendLimit(session.userId);
          } else if (result === 'skipped') {
            skipCount++;
          }
        } catch (error: unknown) {
          errorCount++;
          this.logger.error(
            `Failed hourly billing for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(
        `Compute billing cycle complete: ${successCount} charged, ${skipCount} skipped, ${errorCount} errors`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Compute billing cycle failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Process hourly billing for a single running session.
   * PREPAID MODEL: Charges 1 FULL HOUR in advance for the next hour of usage.
   */
  private async processSessionHourlyBilling(
    session: {
      id: string;
      userId: string;
      instanceName: string;
      startedAt: Date | null;
      computeConfigId: string;
      computeConfig: { basePricePerHourCents: number } | null;
    },
    billingHour: Date,
  ): Promise<'charged' | 'skipped'> {
    if (!session.startedAt || !session.computeConfig) {
      return 'skipped';
    }

    const rateCentsPerHour = session.computeConfig.basePricePerHourCents;
    if (rateCentsPerHour <= 0) {
      return 'skipped';
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Idempotency check: has this session already been charged for this hour?
      const existingCharge = await tx.billingCharge.findFirst({
        where: {
          sessionId: session.id,
          chargeType: 'compute',
          createdAt: {
            gte: billingHour,
            lt: new Date(billingHour.getTime() + 3600000), // +1 hour
          },
        },
      });

      if (existingCharge) {
        this.logger.debug(
          `Session ${session.id} already charged for ${billingHour.toISOString()}, skipping`,
        );
        return 'skipped';
      }

      // 2. Count how many hours have already been billed for this session (for description)
      const billedHoursCount = await tx.billingCharge.count({
        where: {
          sessionId: session.id,
          chargeType: 'compute',
        },
      });
      const hourNumber = billedHoursCount + 1; // Next hour to charge

      // 3. PREPAID: Always charge 1 full hour in advance
      const chargeCents = rateCentsPerHour;

      // 4. Get user's wallet
      const wallet = await tx.wallet.findFirst({
        where: { userId: session.userId },
      });

      if (!wallet) {
        this.logger.warn(
          `No wallet found for user ${session.userId}, skipping prepaid charge`,
        );
        return 'skipped';
      }

      const currentBalance = Number(wallet.balanceCents);

      // 5. Check if wallet has sufficient balance for prepaid charge
      if (currentBalance < chargeCents) {
        this.logger.warn(
          `Session ${session.id}: Insufficient balance for prepaid hour ${hourNumber} (${currentBalance} < ${chargeCents}). Session may be terminated.`,
        );
        // TODO: Could mark session for termination here if desired
        return 'skipped';
      }

      const newBalance = BigInt(wallet.balanceCents) - BigInt(chargeCents);

      // 6. Create WalletTransaction (debit)
      const walletTxn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: session.userId,
          txnType: 'debit',
          amountCents: BigInt(chargeCents),
          balanceAfterCents: newBalance,
          referenceType: 'compute_billing',
          referenceId: session.id,
          description: `Prepaid compute - Hour ${hourNumber}: ${session.instanceName || session.id}`,
        },
      });

      // 7. Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: newBalance,
          lifetimeSpentCents: { increment: chargeCents },
        },
      });

      // 8. Create BillingCharge record (always 3600 seconds / 1 hour for prepaid)
      await tx.billingCharge.create({
        data: {
          userId: session.userId,
          chargeType: 'compute',
          sessionId: session.id,
          computeConfigId: session.computeConfigId,
          durationSeconds: 3600, // Prepaid for 1 hour
          rateCentsPerHour: rateCentsPerHour,
          amountCents: BigInt(chargeCents),
          currency: 'INR',
          walletTransactionId: walletTxn.id,
        },
      });

      // 9. Update session's cumulative cost
      await tx.session.update({
        where: { id: session.id },
        data: {
          cumulativeCostCents: { increment: chargeCents },
          costLastUpdatedAt: new Date(),
        },
      });

      this.logger.log(
        `Prepaid hour ${hourNumber} charged: session=${session.id} amount=${chargeCents} paise (₹${(chargeCents / 100).toFixed(2)})`,
      );

      return 'charged';
    });
  }

  // ============================================================================
  // NEW ENDPOINTS: Restart, Logs, Connection, Events
  // ============================================================================

  async restartSession(
    userId: string,
    sessionId: string,
  ): Promise<{ ok: boolean; message: string }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'running') {
      throw new ConflictException(
        `Session cannot be restarted from status: ${session.status}`,
      );
    }

    if (!session.containerName) {
      throw new BadRequestException('Session has no container to restart');
    }

    try {
      await this.callOrchestration(
        `/sessions/${session.containerName}/restart`,
        'POST',
      );

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

  async getSessionLogs(
    userId: string,
    sessionId: string,
  ): Promise<SessionLogsResponse> {
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
      this.logger.error(
        `Failed to get logs for session ${sessionId}: ${errMsg}`,
      );
      throw new ServiceUnavailableException('Failed to retrieve session logs');
    }
  }

  async getSessionConnection(
    userId: string,
    sessionId: string,
  ): Promise<ConnectionResponse> {
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
      const snapshot = session.resourceSnapshot as Record<
        string,
        unknown
      > | null;
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
          this.logger.error(
            `Failed to decrypt password for session ${sessionId}: ${err}`,
          );
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

  async getSessionEvents(
    userId: string,
    sessionId: string,
  ): Promise<SessionEventResponse[]> {
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

  // ============================================================================
  // SPEND LIMIT ENFORCEMENT HELPERS
  // ============================================================================

  /**
   * Get the start of the current spend limit period
   * @param period - 'daily', 'weekly', 'monthly', or 'date_range'
   * @param startDate - Required for 'date_range' period
   */
  private getSpendLimitPeriodStart(period: string | null, startDate?: Date | null): Date {
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
   * Format the period label for user-friendly display
   */
  private formatPeriodLabel(period: string | null, startDate: Date | null, endDate: Date | null): string {
    switch (period) {
      case 'daily':
        return 'today';
      case 'monthly':
        return 'this month';
      case 'date_range': {
        const fmt = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (startDate && endDate) return `${fmt(startDate)} - ${fmt(endDate)}`;
        return 'custom period';
      }
      default:
        return 'today';
    }
  }

  /**
   * Check if user has exceeded spend limit and take enforcement action.
   * - At 85% threshold: send warning email
   * - At 100% threshold: terminate all running compute sessions
   */
  private async checkAndEnforceSpendLimit(userId: string): Promise<void> {
    // 1. Fetch wallet with spend limit fields
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (!wallet || !wallet.spendLimitEnabled || !wallet.spendLimitCents) return;

    // 2. Determine period start
    const periodStart = this.getSpendLimitPeriodStart(
      wallet.spendLimitPeriod,
      wallet.spendLimitStartDate,
    );

    // For date_range: check if current date is within range
    if (wallet.spendLimitPeriod === 'date_range') {
      const now = new Date();
      if (wallet.spendLimitStartDate && now < wallet.spendLimitStartDate) return;
      if (wallet.spendLimitEndDate && now > wallet.spendLimitEndDate) return;
    }

    // 3. Get total spent in current period
    const periodSpent = await this.prisma.billingCharge.aggregate({
      where: { userId, createdAt: { gte: periodStart } },
      _sum: { amountCents: true },
    });
    const totalSpentCents = Number(periodSpent._sum.amountCents || 0);
    const limitCents = Number(wallet.spendLimitCents);

    // 4. Check 85% threshold — send warning email
    const threshold85 = Math.floor(limitCents * 0.85);
    if (totalSpentCents >= threshold85 && !wallet.spendLimitWarning85Sent) {
      try {
        const periodLabel = this.formatPeriodLabel(
          wallet.spendLimitPeriod,
          wallet.spendLimitStartDate,
          wallet.spendLimitEndDate,
        );
        await this.mailService.sendSpendLimitWarningEmail(wallet.user.email, {
          firstName: wallet.user.firstName || 'User',
          currentSpendRupees: (totalSpentCents / 100).toFixed(2),
          limitRupees: (limitCents / 100).toFixed(2),
          percentUsed: Math.round((totalSpentCents / limitCents) * 100),
          period: periodLabel,
          remainingRupees: (Math.max(0, limitCents - totalSpentCents) / 100).toFixed(2),
        });

        await this.prisma.wallet.update({
          where: { userId },
          data: { spendLimitWarning85Sent: true },
        });

        this.logger.log(`Sent 85% spend limit warning to user ${userId}`);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to send spend limit warning email: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 5. Check 100% — terminate all running compute sessions
    if (totalSpentCents >= limitCents) {
      this.logger.warn(
        `User ${userId} has reached spend limit (${totalSpentCents} >= ${limitCents}). Terminating all compute sessions.`,
      );

      const runningSessions = await this.prisma.session.findMany({
        where: { userId, status: 'running' },
        include: { computeConfig: true },
      });

      const terminatedSessions: Array<{ name: string; config: string; uptime: string }> = [];

      for (const session of runningSessions) {
        try {
          // Use the existing terminateSession method with spend_limit_exceeded reason
          await this.terminateSession(userId, session.id, 'spend_limit_exceeded');

          const uptimeMs = session.startedAt ? Date.now() - session.startedAt.getTime() : 0;
          const uptimeHours = Math.floor(uptimeMs / 3600000);
          const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

          terminatedSessions.push({
            name: session.containerName || session.id,
            config: session.computeConfig?.name || 'Unknown',
            uptime: `${uptimeHours}h ${uptimeMinutes}m`,
          });
        } catch (err: unknown) {
          this.logger.error(
            `Failed to terminate session ${session.id} for spend limit: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Send enforcement email
      if (terminatedSessions.length > 0) {
        try {
          const periodLabel = this.formatPeriodLabel(
            wallet.spendLimitPeriod,
            wallet.spendLimitStartDate,
            wallet.spendLimitEndDate,
          );
          await this.mailService.sendSpendLimitEnforcedEmail(wallet.user.email, {
            firstName: wallet.user.firstName || 'User',
            limitRupees: (limitCents / 100).toFixed(2),
            totalSpentRupees: (totalSpentCents / 100).toFixed(2),
            period: periodLabel,
            terminatedCount: terminatedSessions.length,
            terminatedSessions,
          });
        } catch (err: unknown) {
          this.logger.error(
            `Failed to send spend limit enforcement email: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Audit log
      try {
        await this.auditService.log({
          userId,
          action: 'spend_limit.enforced',
          category: 'billing',
          status: 'success',
          details: {
            limitCents,
            totalSpentCents,
            terminatedSessionCount: terminatedSessions.length,
            terminatedSessionNames: terminatedSessions.map((s) => s.name),
          },
        });
      } catch {
        // Don't let audit failures break enforcement
      }
    }
  }
}
