# GPU Instance Resource Management — Architecture Plan

## Problem Statement

Users must be able to launch ANY compute tier (Spark/Blaze/Inferno/Supernova) at any time, in any combination, as long as the host has sufficient resources. The system must dynamically track resource usage across all running instances and gate new launches based on real-time availability — not static "max per tier" limits.

---

## Host Resource Pool (RTX 4090 Node)

| Resource | Total Available | Reserved for System | Allocatable |
|----------|----------------|--------------------|----|
| GPU VRAM | 24 GB (24564 MiB) | 1 GB (MPS daemon, driver) | **23 GB** |
| CPU Cores | 16 cores (32 threads) | 2 cores (OS, Docker, MPS) | **14 cores** |
| RAM | 64 GB | 4 GB (OS, Docker, monitoring) | **60 GB** |

---

## Tier Resource Requirements

| Tier | VRAM | vCPU | RAM | SM% |
|------|------|------|-----|-----|
| Spark | 2 GB | 2 | 4 GB | 8% |
| Blaze | 4 GB | 4 | 8 GB | 17% |
| Inferno | 8 GB | 8 | 16 GB | 33% |
| Supernova | 16 GB | 12 | 32 GB | 67% |

---

## Task 1: Resource Availability Logic

### Core Algorithm

When a user requests to launch a config, the system calculates:

```
available_vram = TOTAL_ALLOCATABLE_VRAM - SUM(running_sessions.gpuVramMb)
available_cpu  = TOTAL_ALLOCATABLE_CPU  - SUM(running_sessions.vcpu)
available_ram  = TOTAL_ALLOCATABLE_RAM  - SUM(running_sessions.memoryMb)

can_launch(config) = (
  config.gpuVramMb <= available_vram AND
  config.vcpu      <= available_cpu  AND
  config.memoryMb  <= available_ram
)
```

### Running Sessions Query

A session counts as "resource-consuming" if its status is one of: `pending`, `starting`, `running`, `reconnecting`.

Sessions in `stopping`, `ended`, `failed`, `terminated_idle`, `terminated_overuse` do NOT consume resources.

```sql
SELECT SUM(cc.vcpu), SUM(cc.memory_mb), SUM(cc.gpu_vram_mb)
FROM sessions s
JOIN compute_configs cc ON s.compute_config_id = cc.id
WHERE s.status IN ('pending', 'starting', 'running', 'reconnecting')
```

### Valid Permutation Examples (23 GB VRAM / 14 CPU / 60 GB RAM)

| Running Instances | VRAM Used | CPU Used | RAM Used | Can Launch Spark? | Can Launch Blaze? | Can Launch Inferno? | Can Launch Supernova? |
|---|---|---|---|---|---|---|---|
| None | 0 | 0 | 0 | Yes | Yes | Yes | Yes |
| 1x Supernova | 16 GB | 12 | 32 GB | Yes (2+16=18 <= 23) | No (12+4=16 > 14 CPU) | No | No |
| 2x Inferno | 16 GB | 16 > 14 | 32 GB | **NO** — CPU exceeded | No | No | No |
| 1x Inferno + 1x Blaze | 12 GB | 12 | 24 GB | Yes | No (CPU 12+4=16>14) | No | No |
| 3x Blaze | 12 GB | 12 | 24 GB | Yes | No (CPU) | No | No |
| 4x Spark | 8 GB | 8 | 16 GB | Yes | Yes | No (CPU 8+8=16>14) | No |
| 1x Blaze + 2x Spark | 8 GB | 8 | 16 GB | Yes | Yes | No | No |
| 6x Spark | 12 GB | 12 | 24 GB | Yes | No (CPU) | No | No |
| 7x Spark | 14 GB | 14 = 14 | 28 GB | **NO** — CPU at limit | No | No | No |

**Key Insight**: CPU is the primary bottleneck (14 allocatable cores), not VRAM (23 GB). The system correctly prevents over-allocation regardless of which resource hits the limit first.

---

## Task 2: Backend API Design

### Endpoint: `GET /api/compute/configs`

Returns all active compute configs with real-time availability.

**Response:**
```json
{
  "configs": [
    {
      "id": "uuid",
      "slug": "spark",
      "name": "Spark",
      "description": "Entry-level GPU compute...",
      "vcpu": 2,
      "memoryMb": 4096,
      "gpuVramMb": 2048,
      "gpuSmPercent": 8,
      "gpuModel": "RTX 4090",
      "basePricePerHourCents": 3500,
      "currency": "INR",
      "bestFor": "Small PyTorch inference...",
      "available": true,
      "maxLaunchable": 3
    },
    // ... other configs
  ],
  "resources": {
    "total": { "vramMb": 23552, "vcpu": 14, "ramMb": 61440 },
    "used": { "vramMb": 8192, "vcpu": 8, "ramMb": 16384 },
    "available": { "vramMb": 15360, "vcpu": 6, "ramMb": 45056 }
  },
  "runningInstances": 2
}
```

`maxLaunchable` = floor(min(available_vram/config.vram, available_cpu/config.vcpu, available_ram/config.ram))

### Endpoint: `POST /api/compute/sessions`

Creates a new session (resource reservation).

**Request:**
```json
{
  "computeConfigId": "uuid",
  "instanceName": "ml-experiment-01",
  "interfaceMode": "gui",
  "storageType": "stateful"
}
```

**Validation (atomic, in a transaction):**
1. Re-check resource availability (prevents race conditions)
2. Verify user has sufficient wallet balance (at least 1 hour of the config price)
3. If `storageType: "stateful"` — verify user has an active, reachable File Store
4. Create Session record with status `pending`
5. Return session ID

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "pending",
  "message": "Instance queued for launch"
}
```

### Endpoint: `GET /api/compute/sessions`

Lists the current user's sessions (for the instances list page).

### Endpoint: `POST /api/compute/sessions/:id/terminate`

Terminates a running session (sets status to `stopping`, triggers cleanup).

---

## Task 3: Race Condition Protection

When multiple users try to launch simultaneously, we need to prevent over-allocation:

**Approach: Pessimistic locking via database transaction**

```typescript
async launchSession(userId, configId, ...) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock: Select all active sessions FOR UPDATE
    const activeSessions = await tx.$queryRaw`
      SELECT s.id, cc.vcpu, cc.memory_mb, cc.gpu_vram_mb
      FROM sessions s
      JOIN compute_configs cc ON s.compute_config_id = cc.id
      WHERE s.status IN ('pending', 'starting', 'running', 'reconnecting')
      FOR UPDATE
    `;
    
    // 2. Calculate availability
    const used = sumResources(activeSessions);
    const config = await tx.computeConfig.findUnique({ where: { id: configId } });
    
    // 3. Check if resources are available
    if (!canLaunch(config, used, TOTAL_ALLOCATABLE)) {
      throw new ConflictException('Insufficient resources');
    }
    
    // 4. Create session (reserves resources)
    return tx.session.create({
      data: {
        userId, computeConfigId: configId,
        status: 'pending', instanceName, ...
      }
    });
  }, { isolationLevel: 'Serializable' });
}
```

The `FOR UPDATE` lock ensures that between checking availability and creating the session, no other transaction can create a conflicting session.

---

## Task 4: Frontend Integration

### Launch Page (`/instances/launch`)

1. **On load**: Fetch `GET /api/compute/configs` — replace hardcoded configs with DB data
2. **Config cards**: Show `available: true/false` per config
   - Available: normal selectable card
   - Unavailable: grayed out, "Unavailable — resources in use" badge, not selectable
3. **Resource bar** (optional): Show total/used/available as a visual bar at the top
4. **Footer "Launch Instance" click**: Call `POST /api/compute/sessions`
   - On success: redirect to `/instances` (session appears as "Pending")
   - On 409 Conflict: show "Resources no longer available" error, refresh availability
   - On 402 (insufficient balance): show "Insufficient credits" error

### Instances List Page (`/instances`)

1. **On load**: Fetch `GET /api/compute/sessions` — replace mock data with real sessions
2. **Table**: Show real session data (name, config, GPU, status, uptime, cost)
3. **Actions**: Stop/Terminate buttons call real APIs
4. **Auto-refresh**: Poll every 30s to update statuses and uptime

---

## Task 5: Wallet Balance Validation

Before launching, verify the user can afford at least 1 hour:

```typescript
const config = await prisma.computeConfig.findUnique({ where: { id: configId } });
const wallet = await prisma.wallet.findUnique({ where: { userId } });

const requiredBalance = config.basePricePerHourCents; // 1 hour minimum
const availableBalance = wallet.balanceCents - wallet.holdAmountCents;

if (availableBalance < requiredBalance) {
  throw new PaymentRequiredException('Insufficient wallet balance');
}

// Place a hold for 1 hour
await prisma.walletHold.create({
  data: {
    walletId: wallet.id,
    userId,
    sessionId: newSession.id,
    amountCents: requiredBalance,
    reason: 'compute_session_hold',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  }
});
```

---

## Task 6: Host Provisioning Service Integration (Future)

When a session transitions from `pending` to `starting`, the system calls the Python host service:

```
POST http://<host>:5000/launch
{
  "sessionId": "uuid",
  "userId": "uuid",
  "storageUid": "u_xxxx",
  "configSlug": "blaze",
  "vcpu": 4,
  "memoryMb": 8192,
  "gpuVramMb": 4096,
  "smPercent": 17,
  "interfaceMode": "gui",
  "storageType": "stateful",
  "nfsMountPath": "/mnt/nfs/users/u_xxxx"
}
```

The Python service then:
1. Validates host-level resources (double-check)
2. Assigns CPU cores (cpuset)
3. Assigns port numbers (nginx, selkies, display)
4. Launches Docker container with all flags
5. Returns container ID, ports, session URL
6. Backend updates session to `running` with connection details

**This task is deferred to the implementation phase.**

---

## Implementation Order

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Resource availability service (backend) | ComputeConfig seeded (done) |
| 2 | Compute configs API endpoint | Task 1 |
| 3 | Session creation API with race condition protection | Task 1, 2 |
| 4 | Session list/terminate APIs | Task 3 |
| 5 | Frontend: Wire launch page to real APIs | Task 2, 3 |
| 6 | Frontend: Wire instances list to real APIs | Task 4 |
| 7 | Wallet balance validation on launch | Task 3 |
| 8 | Host provisioning service (Python) | Task 3 (deferred) |

Tasks 1-4 can be done as backend work first, then Tasks 5-7 wire the frontend. Task 8 is the actual Docker container provisioning on the host, deferred to the next phase.