import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update laas-node-01
  const node01 = await prisma.node.upsert({
    where: { hostname: 'laas-node-01' },
    update: {
      ipManagement: '100.88.57.107',
      ipStorage: '10.10.100.99',
    },
    create: {
      hostname: 'laas-node-01',
      displayName: 'LaaS Node 01 — RTX 4090',
      ipManagement: '100.88.57.107',
      ipCompute: '192.168.10.99',
      ipStorage: '10.10.100.99',
      cpuModel: 'AMD Ryzen 9 7950X3D',
      totalVcpu: 16,
      totalMemoryMb: 65536,
      totalGpuVramMb: 24576,
      gpuModel: 'RTX 4090',
      nvmeTotalGb: 2000,
      allocatedVcpu: 0,
      allocatedMemoryMb: 0,
      allocatedGpuVramMb: 0,
      maxConcurrentSessions: 8,
      status: 'healthy',
      currentSessionCount: 0,
      metadata: {
        reservedVcpu: 2,
        reservedMemoryMb: 10240,
        reservedGpuVramMb: 1024,
        allocatableVcpu: 14,
        allocatableMemoryMb: 55296,
        allocatableGpuVramMb: 23552,
        smTotal: 128,
        cudaArch: 'sm_89',
        driverVersion: '565.x',
      },
    },
  });
  console.log(`Updated node: ${node01.hostname} — ipManagement=${node01.ipManagement}, ipStorage=${node01.ipStorage}`);

  // Update laas-node-02 (create if missing)
  const node02 = await prisma.node.upsert({
    where: { hostname: 'laas-node-02' },
    update: {
      ipManagement: '100.94.157.114',
      ipStorage: '10.10.100.88',
    },
    create: {
      hostname: 'laas-node-02',
      displayName: 'LaaS Node 02 — RTX 4090',
      ipManagement: '100.94.157.114',
      ipCompute: '192.168.10.88',
      ipStorage: '10.10.100.88',
      cpuModel: 'AMD Ryzen 9 7950X3D',
      totalVcpu: 16,
      totalMemoryMb: 65536,
      totalGpuVramMb: 24576,
      gpuModel: 'RTX 4090',
      nvmeTotalGb: 2000,
      allocatedVcpu: 0,
      allocatedMemoryMb: 0,
      allocatedGpuVramMb: 0,
      maxConcurrentSessions: 8,
      status: 'healthy',
      currentSessionCount: 0,
      metadata: {
        reservedVcpu: 2,
        reservedMemoryMb: 10240,
        reservedGpuVramMb: 1024,
        allocatableVcpu: 14,
        allocatableMemoryMb: 55296,
        allocatableGpuVramMb: 23552,
        smTotal: 128,
        cudaArch: 'sm_89',
        driverVersion: '565.x',
      },
    },
  });
  console.log(`Updated node: ${node02.hostname} — ipManagement=${node02.ipManagement}, ipStorage=${node02.ipStorage}`);

  // Print all node records
  const allNodes = await prisma.node.findMany({ orderBy: { hostname: 'asc' } });
  console.log('\nAll nodes in database:');
  for (const node of allNodes) {
    console.log(`  ${node.hostname}: ipManagement=${node.ipManagement}, ipCompute=${node.ipCompute}, ipStorage=${node.ipStorage}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
