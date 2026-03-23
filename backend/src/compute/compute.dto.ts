import { IsString, IsNotEmpty, IsUUID, IsIn, Length, Matches } from 'class-validator';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class LaunchSessionDto {
  @IsUUID()
  computeConfigId: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 64)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Instance name must be lowercase alphanumeric with hyphens, 3-64 chars',
  })
  instanceName: string;

  @IsIn(['gui', 'cli'])
  interfaceMode: 'gui' | 'cli';

  @IsIn(['stateful', 'ephemeral'])
  storageType: 'stateful' | 'ephemeral';
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface ResourceValues {
  vramMb: number;
  vcpu: number;
  ramMb: number;
}

export interface ResourceSummary {
  total: ResourceValues;
  used: ResourceValues;
  available: ResourceValues;
}

export interface ComputeConfigResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string | null;
  sessionType: string;
  vcpu: number;
  memoryMb: number;
  gpuVramMb: number;
  gpuModel: string | null;
  hamiSmPercent: number | null;
  basePricePerHourCents: number;
  currency: string;
  bestFor: string | null;
  sortOrder: number;
  // Availability info
  available: boolean;
  maxLaunchable: number;
}

export interface ComputeConfigsResponse {
  configs: ComputeConfigResponse[];
  resources: ResourceSummary;
  runningInstances: number;
}

export interface SessionResponse {
  id: string;
  userId: string;
  instanceName: string | null;
  containerName: string | null;
  sessionType: string;
  storageMode: string;
  status: string;
  sessionUrl: string | null;
  nfsMountPath: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  // Computed fields
  uptimeSeconds: number;
  costSoFarCents: number;
  // Resource allocation
  allocatedVcpu: number | null;
  allocatedMemoryMb: number | null;
  allocatedGpuVramMb: number | null;
  allocatedHamiSmPercent: number | null;
  // Config info
  computeConfig: {
    id: string;
    slug: string;
    name: string;
    vcpu: number;
    memoryMb: number;
    gpuVramMb: number;
    gpuModel: string | null;
    basePricePerHourCents: number;
  } | null;
  // Node info
  node: {
    id: string;
    hostname: string;
    gpuModel: string | null;
  } | null;
  // Termination info
  terminationReason: string | null;
  terminatedBy: string | null;
  terminatedAt: Date | null;
  cumulativeCostCents: number;
  durationSeconds: number | null;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
}

export interface SessionDetailResponse extends SessionResponse {
  resourceSnapshot: Record<string, unknown> | null;
  walletHolds: {
    id: string;
    amountCents: number;
    status: string;
    holdReason: string | null;
    createdAt: Date;
    releasedAt: Date | null;
  }[];
  billingCharges: {
    id: string;
    chargeType: string;
    durationSeconds: number;
    rateCentsPerHour: number;
    amountCents: number;
    createdAt: Date;
  }[];
  nodeResourceReservation: {
    id: string;
    reservedVcpu: number;
    reservedMemoryMb: number;
    reservedGpuVramMb: number;
    reservedHamiSmPercent: number | null;
    status: string;
    reservedAt: Date;
    releasedAt: Date | null;
  } | null;
}

export interface NodeResourceStatus {
  nodeId: string;
  hostname: string;
  displayName: string | null;
  gpuModel: string | null;
  status: string;
  total: ResourceValues;
  allocated: ResourceValues;
  available: ResourceValues;
  sessionCount: number;
  maxConcurrentSessions: number | null;
  lastHeartbeatAt: Date | null;
}

export interface AdminSessionResponse extends SessionResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AdminSessionListResponse {
  sessions: AdminSessionResponse[];
  total: number;
}
