import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllUsers() {
  console.log('Starting to clear all user data...\n');

  try {
    // Get count of users before deletion
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users to delete`);

    if (userCount === 0) {
      console.log('No users found. Database is already clean.');
      return;
    }

    // Delete in correct order to respect foreign key constraints
    // 1. Delete user-related data with foreign keys first

    console.log('\n1. Deleting user feedback...');
    const feedbackDeleted = await prisma.userFeedback.deleteMany({});
    console.log(`   Deleted ${feedbackDeleted.count} feedback records`);

    console.log('\n2. Deleting user deletion requests...');
    const deletionRequestsDeleted = await prisma.userDeletionRequest.deleteMany({});
    console.log(`   Deleted ${deletionRequestsDeleted.count} deletion requests`);

    console.log('\n3. Deleting notifications...');
    const notificationsDeleted = await prisma.notification.deleteMany({});
    console.log(`   Deleted ${notificationsDeleted.count} notifications`);

    console.log('\n4. Deleting user achievements...');
    const achievementsDeleted = await prisma.userAchievement.deleteMany({});
    console.log(`   Deleted ${achievementsDeleted.count} achievements`);

    console.log('\n5. Deleting user files...');
    const filesDeleted = await prisma.userFile.deleteMany({});
    console.log(`   Deleted ${filesDeleted.count} files`);

    console.log('\n6. Deleting user storage volumes...');
    const storageVolumesDeleted = await prisma.userStorageVolume.deleteMany({});
    console.log(`   Deleted ${storageVolumesDeleted.count} storage volumes`);

    console.log('\n7. Deleting OS switch histories...');
    const osSwitchHistoriesDeleted = await prisma.osSwitchHistory.deleteMany({});
    console.log(`   Deleted ${osSwitchHistoriesDeleted.count} OS switch histories`);

    console.log('\n9. Deleting user group members...');
    const groupMembersDeleted = await prisma.userGroupMember.deleteMany({});
    console.log(`   Deleted ${groupMembersDeleted.count} group members`);

    console.log('\n10. Deleting user departments...');
    const userDepartmentsDeleted = await prisma.userDepartment.deleteMany({});
    console.log(`   Deleted ${userDepartmentsDeleted.count} user departments`);

    console.log('\n11. Deleting user profiles...');
    const profilesDeleted = await prisma.userProfile.deleteMany({});
    console.log(`   Deleted ${profilesDeleted.count} profiles`);

    console.log('\n12. Deleting OTP verifications...');
    const otpDeleted = await prisma.otpVerification.deleteMany({});
    console.log(`   Deleted ${otpDeleted.count} OTP verifications`);

    console.log('\n13. Deleting user policy consents...');
    const policyConsentsDeleted = await prisma.userPolicyConsent.deleteMany({});
    console.log(`   Deleted ${policyConsentsDeleted.count} policy consents`);

    console.log('\n14. Deleting refresh tokens...');
    const refreshTokensDeleted = await prisma.refreshToken.deleteMany({});
    console.log(`   Deleted ${refreshTokensDeleted.count} refresh tokens`);

    console.log('\n15. Deleting login histories...');
    const loginHistoriesDeleted = await prisma.loginHistory.deleteMany({});
    console.log(`   Deleted ${loginHistoriesDeleted.count} login histories`);

    console.log('\n16. Deleting user org roles...');
    const userOrgRolesDeleted = await prisma.userOrgRole.deleteMany({});
    console.log(`   Deleted ${userOrgRolesDeleted.count} user org roles`);

    console.log('\n17. Deleting sessions...');
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`   Deleted ${sessionsDeleted.count} sessions`);

    console.log('\n18. Deleting wallet transactions...');
    const walletTransactionsDeleted = await prisma.walletTransaction.deleteMany({});
    console.log(`   Deleted ${walletTransactionsDeleted.count} wallet transactions`);

    console.log('\n19. Deleting wallets...');
    const walletsDeleted = await prisma.wallet.deleteMany({});
    console.log(`   Deleted ${walletsDeleted.count} wallets`);

    console.log('\n20. Deleting payment transactions...');
    const paymentTransactionsDeleted = await prisma.paymentTransaction.deleteMany({});
    console.log(`   Deleted ${paymentTransactionsDeleted.count} payment transactions`);

    console.log('\n21. Deleting bookings...');
    const bookingsDeleted = await prisma.booking.deleteMany({});
    console.log(`   Deleted ${bookingsDeleted.count} bookings`);

    console.log('\n22. Deleting subscriptions...');
    const subscriptionsDeleted = await prisma.subscription.deleteMany({});
    console.log(`   Deleted ${subscriptionsDeleted.count} subscriptions`);

    console.log('\n23. Deleting lab group assignments...');
    const labAssignmentsDeleted = await prisma.labGroupAssignment.deleteMany({});
    console.log(`   Deleted ${labAssignmentsDeleted.count} lab group assignments`);

    console.log('\n24. Deleting users...');
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`   Deleted ${usersDeleted.count} users`);

    console.log('\n✅ All user data cleared successfully!');
    console.log(`\nSummary: Deleted ${usersDeleted.count} users and all their related data.`);

  } catch (error) {
    console.error('\n❌ Error clearing user data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllUsers();
