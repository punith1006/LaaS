import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'student@laas-academy.com' },
    select: {
      id: true,
      email: true,
      firstName: true,
      storageUid: true,
      storageProvisioningStatus: true,
    },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('=== USER ===');
  console.log(`  Name: ${user.firstName}`);
  console.log(`  Storage UID: ${user.storageUid}`);
  console.log(`  Provisioning Status: ${user.storageProvisioningStatus}`);

  // Storage volume
  const vol = await prisma.userStorageVolume.findFirst({
    where: { userId: user.id, status: 'active' },
  });
  const quotaGb = vol ? Math.round((Number(vol.quotaBytes) / (1024 ** 3)) * 100) / 100 : 0;
  const usedGb = vol ? Math.round((Number(vol.usedBytes) / (1024 ** 3)) * 100) / 100 : 0;
  console.log('\n=== STORAGE ===');
  console.log(`  Quota: ${quotaGb} GB`);
  console.log(`  Used (DB cached): ${usedGb} GB`);
  console.log(`  Status badge should show: ${user.storageProvisioningStatus === 'provisioned' ? 'Live' : user.storageProvisioningStatus}`);

  // Sessions
  const totalSessions = await prisma.session.count({ where: { userId: user.id } });
  const activeSessions = await prisma.session.count({
    where: { userId: user.id, status: { in: ['pending', 'running'] } },
  });
  console.log('\n=== SESSIONS ===');
  console.log(`  Total: ${totalSessions}`);
  console.log(`  Active (pending/running): ${activeSessions}`);

  // Resources (datasets/notebooks are placeholders)
  console.log('\n=== RESOURCES ===');
  console.log('  Datasets: 0 (placeholder - model not implemented)');
  console.log('  Notebooks: 0 (placeholder - model not implemented)');

  console.log('\n=== EXPECTED UI ===');
  console.log(`  Storage card: ${usedGb} / ${quotaGb} GB  [LIVE]`);
  console.log(`  Active Sessions: ${activeSessions}  (${totalSessions} total sessions)`);
  console.log(`  Resources: 0  (0 datasets, 0 notebooks)`);

  await prisma.$disconnect();
}

main().catch(console.error);
