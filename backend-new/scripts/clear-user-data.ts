import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUserData() {
  console.log('Clearing all user-related data...\n');

  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete login history
    const loginHistoryCount = await prisma.loginHistory.deleteMany({});
    console.log(`✓ Deleted ${loginHistoryCount.count} login history records`);

    // 2. Delete refresh tokens
    const refreshTokenCount = await prisma.refreshToken.deleteMany({});
    console.log(`✓ Deleted ${refreshTokenCount.count} refresh tokens`);

    // 3. Delete user org roles
    const userOrgRoleCount = await prisma.userOrgRole.deleteMany({});
    console.log(`✓ Deleted ${userOrgRoleCount.count} user organization roles`);

    // 4. Delete user storage volumes
    const storageVolumeCount = await prisma.userStorageVolume.deleteMany({});
    console.log(`✓ Deleted ${storageVolumeCount.count} user storage volumes`);

    // 5. Delete sessions
    const sessionCount = await prisma.session.deleteMany({});
    console.log(`✓ Deleted ${sessionCount.count} sessions`);

    // 6. Delete user policy consents
    const policyConsentCount = await prisma.userPolicyConsent.deleteMany({});
    console.log(`✓ Deleted ${policyConsentCount.count} user policy consents`);

    // 7. Finally delete all users (except keep the basic roles and organizations)
    const userCount = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${userCount.count} users`);

    console.log('\n✅ All user data cleared successfully!');
    console.log('You can now start fresh with new user registrations.');

  } catch (error) {
    console.error('\n❌ Error clearing user data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearUserData();
