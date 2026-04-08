import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, keycloakSub: true, storageUid: true, storageProvisioningStatus: true, authType: true, createdAt: true }
  });
  console.log('=== ALL USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const vols = await p.userStorageVolume.findMany({
    select: { id: true, userId: true, storageUid: true, status: true, quotaBytes: true }
  });
  console.log('\n=== STORAGE VOLUMES ===');
  console.log(JSON.stringify(vols, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const wallets = await p.wallet.findMany({
    select: { id: true, userId: true, balanceCents: true }
  });
  console.log('\n=== WALLETS ===');
  console.log(JSON.stringify(wallets, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  await p.$disconnect();
}
main();
