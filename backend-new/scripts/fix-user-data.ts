import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const USER_ID = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

async function main() {
  console.log('=== FIXING USER DATA ===\n');

  // ---------------------------------------------------------------
  // 1. Remove all fake billing data (sessions, charges, wallet txns)
  // ---------------------------------------------------------------
  console.log('--- Step 1: Removing fake billing data ---');

  // Delete billing charges for this user
  const deletedCharges = await p.billingCharge.deleteMany({ where: { userId: USER_ID } });
  console.log(`  Deleted ${deletedCharges.count} billing charges`);

  // Delete session events first, then sessions
  const userSessions = await p.session.findMany({ where: { userId: USER_ID }, select: { id: true } });
  const sessionIds = userSessions.map(s => s.id);
  if (sessionIds.length > 0) {
    const deletedEvents = await p.sessionEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
    console.log(`  Deleted ${deletedEvents.count} session events`);
    // Delete wallet holds linked to sessions
    await p.walletHold.deleteMany({ where: { sessionId: { in: sessionIds } } });
    // Delete node resource reservations linked to sessions
    await p.nodeResourceReservation.deleteMany({ where: { sessionId: { in: sessionIds } } });
  }
  const deletedSessions = await p.session.deleteMany({ where: { userId: USER_ID } });
  console.log(`  Deleted ${deletedSessions.count} sessions`);

  // Delete wallet transactions
  const wallet = await p.wallet.findUnique({ where: { userId: USER_ID } });
  if (wallet) {
    const deletedTxns = await p.walletTransaction.deleteMany({ where: { walletId: wallet.id } });
    console.log(`  Deleted ${deletedTxns.count} wallet transactions`);
    // Delete the wallet itself (user will create via UI)
    await p.wallet.delete({ where: { userId: USER_ID } });
    console.log('  Deleted wallet (user will add credits via UI)');
  }

  // Delete the fake gpu-desktop-standard compute config
  const fakeConfig = await p.computeConfig.findFirst({ where: { slug: 'gpu-desktop-standard' } });
  if (fakeConfig) {
    await p.computeConfig.delete({ where: { id: fakeConfig.id } });
    console.log('  Deleted fake "gpu-desktop-standard" compute config');
  }

  // ---------------------------------------------------------------
  // 2. Fix user auth type: public_oauth (Google), not university_sso
  // ---------------------------------------------------------------
  console.log('\n--- Step 2: Fixing user auth type ---');

  // Look up orgs
  const publicOrg = await p.organization.findUnique({ where: { slug: 'public' } });
  if (!publicOrg) throw new Error('Public org not found');

  await p.user.update({
    where: { id: USER_ID },
    data: {
      authType: 'public_oauth',
      oauthProvider: 'google',
      defaultOrgId: publicOrg.id,
    },
  });
  console.log('  Updated authType → public_oauth, oauthProvider → google');
  console.log('  Updated defaultOrgId → Public org');

  // Fix UserOrgRole: remove KSRCE student role, add public_user in Public org
  await p.userOrgRole.deleteMany({ where: { userId: USER_ID } });
  console.log('  Cleared old org roles');

  const publicUserRole = await p.role.findUnique({ where: { name: 'public_user' } });
  if (publicUserRole) {
    await p.userOrgRole.create({
      data: {
        userId: USER_ID,
        organizationId: publicOrg.id,
        roleId: publicUserRole.id,
      },
    });
    console.log('  Assigned public_user role in Public org');
  }

  // ---------------------------------------------------------------
  // 3. Fix storage: quota = 15 GB, used = 11.9 GB
  // ---------------------------------------------------------------
  console.log('\n--- Step 3: Fixing storage volume ---');

  const QUOTA_15GB = BigInt(Math.round(15 * 1024 * 1024 * 1024));    // 16106127360
  const USED_11_9GB = BigInt(Math.round(11.9 * 1024 * 1024 * 1024)); // 12780208538

  await p.userStorageVolume.updateMany({
    where: { userId: USER_ID, storageUid: 'u_a3e6e9f9b971548f6c358870' },
    data: {
      quotaBytes: QUOTA_15GB,
      usedBytes: USED_11_9GB,
      usedBytesUpdatedAt: new Date(),
    },
  });
  console.log(`  Updated quota → 15 GB (${QUOTA_15GB})`);
  console.log(`  Updated used → 11.9 GB (${USED_11_9GB})`);

  // ---------------------------------------------------------------
  // 4. Also delete the stale user if it exists
  // ---------------------------------------------------------------
  console.log('\n--- Step 4: Cleanup stale user ---');
  const STALE_USER_ID = '13315c8c-596d-4ee4-ab49-aafad99f9595';
  try {
    // Check for any dependent records
    await p.userOrgRole.deleteMany({ where: { userId: STALE_USER_ID } });
    await p.loginHistory.deleteMany({ where: { userId: STALE_USER_ID } });
    await p.refreshToken.deleteMany({ where: { userId: STALE_USER_ID } });
    await p.auditLog.deleteMany({ where: { actorId: STALE_USER_ID } });
    await p.user.delete({ where: { id: STALE_USER_ID } });
    console.log('  Deleted stale user 13315c8c');
  } catch (e: any) {
    console.log('  Stale user cleanup:', e.message?.substring(0, 80));
  }

  // Also delete the student1 test user if exists
  const STUDENT_USER_ID = '6cbc807f-6052-4204-911d-038cc52db960';
  try {
    await p.userOrgRole.deleteMany({ where: { userId: STUDENT_USER_ID } });
    await p.userStorageVolume.deleteMany({ where: { userId: STUDENT_USER_ID } });
    await p.loginHistory.deleteMany({ where: { userId: STUDENT_USER_ID } });
    await p.refreshToken.deleteMany({ where: { userId: STUDENT_USER_ID } });
    await p.auditLog.deleteMany({ where: { actorId: STUDENT_USER_ID } });
    await p.user.delete({ where: { id: STUDENT_USER_ID } });
    console.log('  Deleted test student1 user 6cbc807f');
  } catch (e: any) {
    console.log('  Student user cleanup:', e.message?.substring(0, 80));
  }

  // ---------------------------------------------------------------
  // 5. Verify final state
  // ---------------------------------------------------------------
  console.log('\n=== FINAL STATE ===');
  const user = await p.user.findUnique({
    where: { id: USER_ID },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      authType: true, oauthProvider: true, keycloakSub: true,
      storageUid: true, storageProvisioningStatus: true,
    },
  });
  console.log('User:', JSON.stringify(user, null, 2));

  const vol = await p.userStorageVolume.findFirst({
    where: { userId: USER_ID },
    select: { storageUid: true, quotaBytes: true, usedBytes: true, status: true },
  });
  console.log('Storage:', JSON.stringify(vol, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const allUsers = await p.user.findMany({ select: { id: true, email: true, authType: true } });
  console.log('All users:', JSON.stringify(allUsers, null, 2));

  await p.$disconnect();
  console.log('\n✅ All fixes applied successfully');
}

main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
