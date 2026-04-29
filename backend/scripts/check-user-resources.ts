import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

  // Storage volumes
  const storageVolumes = await prisma.userStorageVolume.findMany({
    where: { userId },
  });
  console.log('\n=== Storage Volumes ===');
  storageVolumes.forEach(v => {
    console.log(`  id: ${v.id}`);
    console.log(`  status: ${v.status}`);
    console.log(`  quotaBytes: ${v.quotaBytes} = ${Number(v.quotaBytes) / (1024 ** 3)} GB`);
    console.log(`  usedBytes: ${v.usedBytes} = ${Number(v.usedBytes) / (1024 ** 3)} GB`);
    console.log(`  zfsDatasetPath: ${v.zfsDatasetPath}`);
    console.log(`  nfsExportPath: ${v.nfsExportPath}`);
    console.log('  ---');
  });

  // Active sessions
  const activeSessions = await prisma.session.findMany({
    where: { userId, status: 'running' },
    include: { computeConfig: true },
  });
  console.log('\n=== Active Sessions ===');
  activeSessions.forEach(s => {
    console.log(`  sessionId: ${s.id}`);
    console.log(`  status: ${s.status}`);
    console.log(`  computeConfig: ${s.computeConfig?.name}`);
    console.log(`  vcpu: ${s.computeConfig?.vcpu}`);
    console.log(`  memoryMb: ${s.computeConfig?.memoryMb}`);
    console.log(`  gpuVramMb: ${s.actualGpuVramMb}`);
    console.log(`  price/hr: ₹${(s.computeConfig?.basePricePerHourCents ?? 0) / 100}`);
    console.log('  ---');
  });

  // All sessions (recent)
  const recentSessions = await prisma.session.findMany({
    where: { userId },
    include: { computeConfig: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\n=== Recent Sessions (last 5) ===');
  recentSessions.forEach(s => {
    console.log(`  ${s.status} | ${s.computeConfig?.name} | vcpu:${s.computeConfig?.vcpu} | gpu:${s.actualGpuVramMb}MB`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
