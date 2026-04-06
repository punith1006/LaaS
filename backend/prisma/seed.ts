import { PrismaClient, SessionType } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  'super_admin',
  'org_admin',
  'billing_admin',
  'faculty',
  'lab_instructor',
  'mentor',
  'student',
  'external_student',
  'public_user',
];

const COMPUTE_CONFIGS = [
  {
    slug: 'spark',
    name: 'Spark',
    description: 'Entry-level GPU compute for learning, light inference, and small experiments.',
    sessionType: SessionType.stateful_desktop,
    tier: 'gpu',
    vcpu: 2,
    memoryMb: 4096,        // 4 GB
    gpuVramMb: 2048,       // 2 GB
    gpuExclusive: false,
    hamiSmPercent: 8,      // 8% of RTX 4090's 128 SMs
    gpuModel: 'RTX 4090',
    maxConcurrentPerNode: 8,
    basePricePerHourCents: 3500,  // ₹35/hr
    currency: 'INR',
    sortOrder: 1,
    isActive: true,
    bestFor: 'Small PyTorch inference, Jupyter notebooks with CUDA, educational projects',
  },
  {
    slug: 'blaze',
    name: 'Blaze',
    description: 'Standard GPU compute for development, moderate ML training, and data science.',
    sessionType: SessionType.stateful_desktop,
    tier: 'gpu',
    vcpu: 4,
    memoryMb: 8192,        // 8 GB
    gpuVramMb: 4096,       // 4 GB
    gpuExclusive: false,
    hamiSmPercent: 17,     // 17% SM
    gpuModel: 'RTX 4090',
    maxConcurrentPerNode: 4,
    basePricePerHourCents: 6500,  // ₹65/hr
    currency: 'INR',
    sortOrder: 2,
    isActive: true,
    bestFor: 'Model fine-tuning, GPU-accelerated rendering, professional development',
  },
  {
    slug: 'inferno',
    name: 'Inferno',
    description: 'Advanced GPU compute for heavy ML training, 3D rendering, and simulations.',
    sessionType: SessionType.stateful_desktop,
    tier: 'gpu',
    vcpu: 8,
    memoryMb: 16384,       // 16 GB
    gpuVramMb: 8192,       // 8 GB
    gpuExclusive: false,
    hamiSmPercent: 33,     // 33% SM
    gpuModel: 'RTX 4090',
    maxConcurrentPerNode: 2,
    basePricePerHourCents: 10500, // ₹105/hr
    currency: 'INR',
    sortOrder: 3,
    isActive: true,
    bestFor: 'Large model training, complex 3D rendering, GPU-intensive simulations',
  },
  {
    slug: 'supernova',
    name: 'Supernova',
    description: 'Premium GPU compute with near-exclusive access for research and large-scale workloads.',
    sessionType: SessionType.stateful_desktop,
    tier: 'gpu-exclusive',
    vcpu: 12,
    memoryMb: 32768,       // 32 GB
    gpuVramMb: 16384,      // 16 GB
    gpuExclusive: false,   // Not truly exclusive (67% SM, not 100%)
    hamiSmPercent: 67,     // 67% SM
    gpuModel: 'RTX 4090',
    maxConcurrentPerNode: 1,
    basePricePerHourCents: 15500, // ₹155/hr
    currency: 'INR',
    sortOrder: 4,
    isActive: true,
    bestFor: 'Large-scale deep learning, exclusive research sessions, production inference',
  },
];

async function main() {
  // Seed roles
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      create: {
        name,
        displayName: name.replace(/_/g, ' '),
        isSystem: true,
      },
      update: {},
    });
  }

  // Seed organizations
  const publicOrg = await prisma.organization.upsert({
    where: { slug: 'public' },
    create: {
      name: 'Public',
      slug: 'public',
      orgType: 'public_',
      isActive: true,
    },
    update: {},
  });

  const laasAcademyOrg = await prisma.organization.upsert({
    where: { slug: 'laas-academy' },
    create: {
      name: 'LaaS Academy',
      slug: 'laas-academy',
      orgType: 'university',
      isActive: true,
    },
    update: {},
  });

  // Seed KSRCE University
  const ksrceUniversity = await prisma.university.upsert({
    where: { slug: 'ksrce' },
    update: {},
    create: {
      name: 'K.S. Rangasamy College of Engineering',
      shortName: 'KSRCE',
      slug: 'ksrce',
      domainSuffixes: ['@ksrc.in'],
      country: 'IN',
      timezone: 'Asia/Kolkata',
      isActive: true,
    },
  });

  // Seed KSRCE Organization (linked to University)
  const ksrceOrg = await prisma.organization.upsert({
    where: { slug: 'ksrce' },
    update: {},
    create: {
      name: 'KSRCE',
      slug: 'ksrce',
      orgType: 'university',
      universityId: ksrceUniversity.id,
      isActive: true,
    },
  });

  console.log('Seeded KSRCE university and organization:', {
    universityId: ksrceUniversity.id,
    orgId: ksrceOrg.id,
  });

  // Seed GPU compute configs
  for (const config of COMPUTE_CONFIGS) {
    await prisma.computeConfig.upsert({
      where: { slug: config.slug },
      create: config,
      update: {
        name: config.name,
        description: config.description,
        sessionType: config.sessionType,
        tier: config.tier,
        vcpu: config.vcpu,
        memoryMb: config.memoryMb,
        gpuVramMb: config.gpuVramMb,
        gpuExclusive: config.gpuExclusive,
        hamiSmPercent: config.hamiSmPercent,
        gpuModel: config.gpuModel,
        maxConcurrentPerNode: config.maxConcurrentPerNode,
        basePricePerHourCents: config.basePricePerHourCents,
        currency: config.currency,
        sortOrder: config.sortOrder,
        isActive: config.isActive,
        bestFor: config.bestFor,
      },
    });
  }

  // Seed the RTX 4090 compute node
  const node = await prisma.node.upsert({
    where: { hostname: 'laas-node-01' },
    update: {},
    create: {
      hostname: 'laas-node-01',
      displayName: 'LaaS Node 01 — RTX 4090',
      ipCompute: '192.168.10.92',
      ipStorage: '192.168.10.92',
      cpuModel: 'AMD Ryzen 9 7950X3D',
      totalVcpu: 16,
      totalMemoryMb: 65536,          // 64 GB
      totalGpuVramMb: 24576,         // 24 GB (24564 MiB ≈ 24576 MB)
      gpuModel: 'RTX 4090',
      nvmeTotalGb: 2000,             // 2TB NVMe
      allocatedVcpu: 0,
      allocatedMemoryMb: 0,
      allocatedGpuVramMb: 0,
      maxConcurrentSessions: 8,      // Max theoretical (all Spark)
      status: 'healthy',
      currentSessionCount: 0,
      metadata: {
        reservedVcpu: 2,              // OS/Docker/MPS reserved
        reservedMemoryMb: 10240,      // 10 GB reserved
        reservedGpuVramMb: 1024,      // ~1 GB reserved for MPS daemon
        allocatableVcpu: 14,
        allocatableMemoryMb: 55296,   // 54 GB
        allocatableGpuVramMb: 23552,  // 23 GB
        smTotal: 128,
        cudaArch: 'sm_89',
        driverVersion: '565.x',
      },
    },
  });
  console.log(`  Node seeded: ${node.hostname} (${node.gpuModel})`);

  console.log('Seeded roles and public org:', publicOrg.slug);
  console.log('Seeded LaaS Academy org:', laasAcademyOrg.slug);
  console.log('Seeded', COMPUTE_CONFIGS.length, 'GPU compute configs:', COMPUTE_CONFIGS.map(c => c.slug).join(', '));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
