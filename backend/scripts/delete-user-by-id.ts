/**
 * Script to delete a specific user by ID with all related records.
 * Deletes all related records across ALL tables in FK-dependency order.
 * 
 * Usage: npx tsx scripts/delete-user-by-id.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USER_ID = 'b3a4aeb9-14c2-4a6a-853c-bc2bd9247b5d';

async function main() {
  console.log(`\n========================================`);
  console.log(`Deleting user by ID: ${TARGET_USER_ID}`);
  console.log(`========================================\n`);

  // Step 1: Find the user
  const user = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) {
    console.log(`❌ User with ID "${TARGET_USER_ID}" not found. Nothing to delete.`);
    return;
  }

  console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})\n`);

  const userId = user.id;

  // Helper function to delete and log
  async function deleteAndLog(
    table: string,
    deleteFn: () => Promise<{ count: number }>
  ) {
    try {
      const result = await deleteFn();
      if (result.count > 0) {
        console.log(`  ✓ Deleted ${result.count} record(s) from ${table}`);
      }
      return result.count;
    } catch (error) {
      console.log(`  ⚠ Error deleting from ${table}: ${error}`);
      return 0;
    }
  }

  // ==========================================
  // PHASE 1: Delete deepest nested dependencies
  // ==========================================
  console.log('Phase 1: Deleting nested session/billing dependencies...');

  // Get all session IDs for this user
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length > 0) {
    // Delete session_events by sessionId
    await deleteAndLog('session_events', () =>
      prisma.sessionEvent.deleteMany({ where: { sessionId: { in: sessionIds } } })
    );

    // Delete node_resource_reservations by sessionId
    await deleteAndLog('node_resource_reservations', () =>
      prisma.nodeResourceReservation.deleteMany({
        where: { sessionId: { in: sessionIds } },
      })
    );
  }

  // Get all support ticket IDs for this user
  const supportTickets = await prisma.supportTicket.findMany({
    where: { userId },
    select: { id: true },
  });
  const ticketIds = supportTickets.map((t) => t.id);

  if (ticketIds.length > 0) {
    // Delete ticket_messages by ticketId
    await deleteAndLog('ticket_messages', () =>
      prisma.ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } })
    );
  }

  // Get all invoice IDs for this user
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);

  if (invoiceIds.length > 0) {
    // Delete invoice_line_items by invoiceId
    await deleteAndLog('invoice_line_items', () =>
      prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
    );
  }

  // Get mentor profile if exists
  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (mentorProfile) {
    // Get mentor booking IDs
    const mentorBookings = await prisma.mentorBooking.findMany({
      where: { mentorProfileId: mentorProfile.id },
      select: { id: true },
    });
    const mentorBookingIds = mentorBookings.map((b) => b.id);

    if (mentorBookingIds.length > 0) {
      // Delete mentor_reviews by mentorBookingId
      await deleteAndLog('mentor_reviews', () =>
        prisma.mentorReview.deleteMany({
          where: { mentorBookingId: { in: mentorBookingIds } },
        })
      );
    }

    // Delete mentor_availability_slots by mentorProfileId
    await deleteAndLog('mentor_availability_slots', () =>
      prisma.mentorAvailabilitySlot.deleteMany({
        where: { mentorProfileId: mentorProfile.id },
      })
    );

    // Delete mentor_bookings where this user is mentor
    await deleteAndLog('mentor_bookings (as mentor)', () =>
      prisma.mentorBooking.deleteMany({ where: { mentorProfileId: mentorProfile.id } })
    );
  }

  // Get referral if exists
  const referral = await prisma.referral.findUnique({
    where: { referrerUserId: userId },
    select: { id: true },
  });

  if (referral) {
    // Get referral conversion IDs
    const conversions = await prisma.referralConversion.findMany({
      where: { referralId: referral.id },
      select: { id: true },
    });
    const conversionIds = conversions.map((c) => c.id);

    // Delete referral_events by referralConversionId
    if (conversionIds.length > 0) {
      await deleteAndLog('referral_events (by conversion)', () =>
        prisma.referralEvent.deleteMany({
          where: { referralConversionId: { in: conversionIds } },
        })
      );
    }

    // Delete referral_events by referralId
    await deleteAndLog('referral_events (by referral)', () =>
      prisma.referralEvent.deleteMany({ where: { referralId: referral.id } })
    );

    // Delete referral_conversions by referralId
    await deleteAndLog('referral_conversions', () =>
      prisma.referralConversion.deleteMany({ where: { referralId: referral.id } })
    );
  }

  console.log('');

  // ==========================================
  // PHASE 2: Delete user's direct child records
  // ==========================================
  console.log('Phase 2: Deleting direct user-related records...');

  // Delete referral_conversion where user is the referred user
  await deleteAndLog('referral_conversions (as referred)', () =>
    prisma.referralConversion.deleteMany({ where: { referredUserId: userId } })
  );

  // Delete referral if exists
  if (referral) {
    await deleteAndLog('referrals', () =>
      prisma.referral.delete({ where: { id: referral.id } }).then(() => ({ count: 1 }))
    );
  }

  // Delete mentor_reviews where user is reviewer
  await deleteAndLog('mentor_reviews (as reviewer)', () =>
    prisma.mentorReview.deleteMany({ where: { reviewerUserId: userId } })
  );

  // Delete mentor_bookings where user is student
  await deleteAndLog('mentor_bookings (as student)', () =>
    prisma.mentorBooking.deleteMany({ where: { studentUserId: userId } })
  );

  // Delete mentor_profile
  await deleteAndLog('mentor_profiles', () =>
    prisma.mentorProfile.deleteMany({ where: { userId } })
  );

  // Delete lab_grades where user is grader
  await deleteAndLog('lab_grades (as grader)', () =>
    prisma.labGrade.deleteMany({ where: { gradedBy: userId } })
  );

  // Delete lab_submissions
  await deleteAndLog('lab_submissions', () =>
    prisma.labSubmission.deleteMany({ where: { userId } })
  );

  // Delete course_enrollments
  await deleteAndLog('course_enrollments', () =>
    prisma.courseEnrollment.deleteMany({ where: { userId } })
  );

  // Delete discussion_replies
  await deleteAndLog('discussion_replies', () =>
    prisma.discussionReply.deleteMany({ where: { authorId: userId } })
  );

  // Delete discussions
  await deleteAndLog('discussions', () =>
    prisma.discussion.deleteMany({ where: { authorId: userId } })
  );

  // Delete project_showcases
  await deleteAndLog('project_showcases', () =>
    prisma.projectShowcase.deleteMany({ where: { userId } })
  );

  // Delete user_achievements
  await deleteAndLog('user_achievements', () =>
    prisma.userAchievement.deleteMany({ where: { userId } })
  );

  // Delete notifications
  await deleteAndLog('notifications', () =>
    prisma.notification.deleteMany({ where: { userId } })
  );

  // Delete audit_logs
  await deleteAndLog('audit_logs', () =>
    prisma.auditLog.deleteMany({ where: { actorId: userId } })
  );

  // Delete user_feedback
  await deleteAndLog('user_feedback', () =>
    prisma.userFeedback.deleteMany({ where: { userId } })
  );

  // Also delete user_feedback where user is responder
  await deleteAndLog('user_feedback (as responder)', () =>
    prisma.userFeedback.deleteMany({ where: { respondedBy: userId } })
  );

  // Delete user_deletion_requests
  await deleteAndLog('user_deletion_requests', () =>
    prisma.userDeletionRequest.deleteMany({ where: { userId } })
  );

  // Also delete user_deletion_requests where user is requester
  await deleteAndLog('user_deletion_requests (as requester)', () =>
    prisma.userDeletionRequest.deleteMany({ where: { requestedBy: userId } })
  );

  // Delete support_tickets (messages already deleted)
  await deleteAndLog('support_tickets', () =>
    prisma.supportTicket.deleteMany({ where: { userId } })
  );

  // Also delete support_tickets where user is assignee
  await deleteAndLog('support_tickets (as assignee)', () =>
    prisma.supportTicket.deleteMany({ where: { assignedTo: userId } })
  );

  // Delete ticket_messages where user is sender
  await deleteAndLog('ticket_messages (as sender)', () =>
    prisma.ticketMessage.deleteMany({ where: { senderId: userId } })
  );

  // Delete recommendation_sessions
  await deleteAndLog('recommendation_sessions', () =>
    prisma.recommendationSession.deleteMany({ where: { userId } })
  );

  console.log('');

  // ==========================================
  // PHASE 3: Delete wallet-related records
  // ==========================================
  console.log('Phase 3: Deleting wallet and billing records...');

  // Get wallet if exists
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (wallet) {
    // Delete billing_charges linked to wallet transactions
    const walletTxns = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    });
    const walletTxnIds = walletTxns.map((t) => t.id);

    if (walletTxnIds.length > 0) {
      // First, null out walletTransactionId from billing_charges
      await prisma.$executeRaw`
        UPDATE billing_charges 
        SET wallet_transaction_id = NULL 
        WHERE wallet_transaction_id IN (${walletTxnIds.join(',')})
      `;
    }

    // Delete wallet_holds by walletId
    await deleteAndLog('wallet_holds (by wallet)', () =>
      prisma.walletHold.deleteMany({ where: { walletId: wallet.id } })
    );

    // Delete storage_extensions by walletTransactionId
    if (walletTxnIds.length > 0) {
      await prisma.$executeRaw`
        UPDATE storage_extensions 
        SET wallet_transaction_id = NULL 
        WHERE wallet_transaction_id IN (${walletTxnIds.join(',')})
      `;
    }

    // Delete wallet_transactions
    await deleteAndLog('wallet_transactions', () =>
      prisma.walletTransaction.deleteMany({ where: { walletId: wallet.id } })
    );
  }

  // Delete wallet_holds by userId
  await deleteAndLog('wallet_holds (by user)', () =>
    prisma.walletHold.deleteMany({ where: { userId } })
  );

  // Delete wallet_transactions by userId
  await deleteAndLog('wallet_transactions (by user)', () =>
    prisma.walletTransaction.deleteMany({ where: { userId } })
  );

  // Delete billing_charges
  await deleteAndLog('billing_charges', () =>
    prisma.billingCharge.deleteMany({ where: { userId } })
  );

  // Delete invoices (line items already deleted)
  await deleteAndLog('invoices', () =>
    prisma.invoice.deleteMany({ where: { userId } })
  );

  // Delete subscriptions
  await deleteAndLog('subscriptions', () =>
    prisma.subscription.deleteMany({ where: { userId } })
  );

  // Delete payment_transactions
  await deleteAndLog('payment_transactions', () =>
    prisma.paymentTransaction.deleteMany({ where: { userId } })
  );

  // Delete wallet
  if (wallet) {
    await deleteAndLog('wallets', () =>
      prisma.wallet.delete({ where: { id: wallet.id } }).then(() => ({ count: 1 }))
    );
  }

  console.log('');

  // ==========================================
  // PHASE 4: Delete session and booking records
  // ==========================================
  console.log('Phase 4: Deleting session and booking records...');

  // Delete sessions (events and reservations already deleted)
  await deleteAndLog('sessions', () =>
    prisma.session.deleteMany({ where: { userId } })
  );

  // Delete bookings
  await deleteAndLog('bookings', () =>
    prisma.booking.deleteMany({ where: { userId } })
  );

  console.log('');

  // ==========================================
  // PHASE 5: Delete storage-related records
  // ==========================================
  console.log('Phase 5: Deleting storage records...');

  // Get storage volumes
  const storageVolumes = await prisma.userStorageVolume.findMany({
    where: { userId },
    select: { id: true },
  });
  const storageVolumeIds = storageVolumes.map((v) => v.id);

  if (storageVolumeIds.length > 0) {
    // Delete billing_charges by storageVolumeId
    await deleteAndLog('billing_charges (by storage volume)', () =>
      prisma.billingCharge.deleteMany({
        where: { storageVolumeId: { in: storageVolumeIds } },
      })
    );

    // Handle os_switch_history references
    await prisma.$executeRaw`
      UPDATE os_switch_history 
      SET old_volume_id = NULL 
      WHERE old_volume_id IN (${storageVolumeIds.map(id => `'${id}'`).join(',')})
    `;
    await prisma.$executeRaw`
      UPDATE os_switch_history 
      SET new_volume_id = NULL 
      WHERE new_volume_id IN (${storageVolumeIds.map(id => `'${id}'`).join(',')})
    `;

    // Delete storage_extensions by storageVolumeId
    await deleteAndLog('storage_extensions (by volume)', () =>
      prisma.storageExtension.deleteMany({
        where: { storageVolumeId: { in: storageVolumeIds } },
      })
    );
  }

  // Delete storage_extensions by userId
  await deleteAndLog('storage_extensions (by user)', () =>
    prisma.storageExtension.deleteMany({ where: { userId } })
  );

  // Delete os_switch_history
  await deleteAndLog('os_switch_history', () =>
    prisma.osSwitchHistory.deleteMany({ where: { userId } })
  );

  // Delete user_files
  await deleteAndLog('user_files', () =>
    prisma.userFile.deleteMany({ where: { userId } })
  );

  // Delete user_storage_volumes
  await deleteAndLog('user_storage_volumes', () =>
    prisma.userStorageVolume.deleteMany({ where: { userId } })
  );

  console.log('');

  // ==========================================
  // PHASE 6: Delete auth and profile records
  // ==========================================
  console.log('Phase 6: Deleting auth and profile records...');

  // Delete otp_verifications
  await deleteAndLog('otp_verifications', () =>
    prisma.otpVerification.deleteMany({ where: { userId } })
  );

  // Delete user_policy_consents
  await deleteAndLog('user_policy_consents', () =>
    prisma.userPolicyConsent.deleteMany({ where: { userId } })
  );

  // Delete refresh_tokens
  await deleteAndLog('refresh_tokens', () =>
    prisma.refreshToken.deleteMany({ where: { userId } })
  );

  // Delete login_history
  await deleteAndLog('login_history', () =>
    prisma.loginHistory.deleteMany({ where: { userId } })
  );

  // Delete user_org_roles
  await deleteAndLog('user_org_roles', () =>
    prisma.userOrgRole.deleteMany({ where: { userId } })
  );

  // Delete user_group_members
  await deleteAndLog('user_group_members', () =>
    prisma.userGroupMember.deleteMany({ where: { userId } })
  );

  // Also delete user_group_members where user is adder
  await deleteAndLog('user_group_members (as adder)', () =>
    prisma.userGroupMember.deleteMany({ where: { addedBy: userId } })
  );

  // Delete user_departments
  await deleteAndLog('user_departments', () =>
    prisma.userDepartment.deleteMany({ where: { userId } })
  );

  // Delete user_profile
  await deleteAndLog('user_profiles', () =>
    prisma.userProfile.deleteMany({ where: { userId } })
  );

  console.log('');

  // ==========================================
  // PHASE 7: Delete the user record
  // ==========================================
  console.log('Phase 7: Deleting the user record...');

  try {
    await prisma.user.delete({ where: { id: userId } });
    console.log(`  ✓ Deleted user: ${user.email} (${userId})`);
  } catch (error) {
    console.log(`  ⚠ Error deleting user: ${error}`);
    console.log('\nAttempting to find remaining FK references...');

    // Try to identify what's blocking
    const remainingSessions = await prisma.session.count({ where: { userId } });
    const remainingWallet = await prisma.wallet.count({ where: { userId } });
    const remainingProfile = await prisma.userProfile.count({ where: { userId } });

    console.log(`Remaining sessions: ${remainingSessions}`);
    console.log(`Remaining wallets: ${remainingWallet}`);
    console.log(`Remaining profiles: ${remainingProfile}`);

    throw error;
  }

  console.log('\n========================================');
  console.log('✅ Successfully deleted user account!');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
