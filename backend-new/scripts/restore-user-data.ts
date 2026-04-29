import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_ID = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

async function restoreUserData() {
  console.log('=== User Data Restoration Script ===\n');
  console.log(`Target user: ${USER_ID} (punith.vs74064@gmail.com)\n`);

  // ── Step 1: Look up prerequisite IDs ────────────────────────────────────────
  console.log('Step 1: Looking up prerequisite IDs...');

  let ksrceOrgId: string;
  let studentRoleId: string;

  try {
    const ksrceOrg = await prisma.organization.findFirst({
      where: { slug: 'ksrce' },
    });
    if (!ksrceOrg) throw new Error('KSRCE organization not found (slug="ksrce"). Run seed first.');
    ksrceOrgId = ksrceOrg.id;
    console.log(`  ✅ KSRCE org ID: ${ksrceOrgId}`);
  } catch (err) {
    console.error('  ❌ Failed to find KSRCE org:', err);
    process.exit(1);
  }

  try {
    const studentRole = await prisma.role.findFirst({
      where: { name: 'student' },
    });
    if (!studentRole) throw new Error('Student role not found (name="student"). Run seed first.');
    studentRoleId = studentRole.id;
    console.log(`  ✅ Student role ID: ${studentRoleId}`);
  } catch (err) {
    console.error('  ❌ Failed to find student role:', err);
    process.exit(1);
  }

  // ── Step 2: Create User record ───────────────────────────────────────────────
  console.log('\nStep 2: Creating User record...');
  try {
    // Check if the canonical user ID already exists
    const existingById = await prisma.user.findUnique({ where: { id: USER_ID } });

    if (existingById) {
      console.log(`  ⚠️  User with correct ID already exists: ${existingById.id} — skipping create`);
    } else {
      // Check for a stale record with the same email but wrong ID (e.g. leftover from OAuth test)
      const staleByEmail = await prisma.user.findUnique({ where: { email: 'punith.vs74064@gmail.com' } });
      if (staleByEmail) {
        console.log(`  ⚠️  Stale user found with ID=${staleByEmail.id}, authType=${staleByEmail.authType}`);
        console.log(`      Reassigning stale user email to free up the unique constraint...`);
        // Rename the stale user's email so we can insert the canonical ID without deleting audit logs etc.
        await prisma.$executeRaw`UPDATE users SET email = ${'stale_' + staleByEmail.id + '@replaced.local'} WHERE id = ${staleByEmail.id}::uuid`;
        console.log(`      ✅ Stale user email remapped — original record preserved with audit history`);
      }

      const user = await prisma.user.create({
        data: {
          id: USER_ID,
          email: 'punith.vs74064@gmail.com',
          emailVerifiedAt: new Date(),
          firstName: 'Punith',
          lastName: 'VS',
          displayName: 'Punith VS',
          authType: 'university_sso',
          oauthProvider: 'keycloak',
          defaultOrgId: ksrceOrgId,
          storageUid: 'u_a3e6e9f9b971548f6c358870',
          storageProvisioningStatus: 'provisioned',
          storageProvisionedAt: new Date('2026-03-15'),
          osChoice: 'ubuntu22',
          isActive: true,
          onboardingCompletedAt: new Date('2026-03-15'),
          // keycloakSub intentionally left NULL — auto-linked on next SSO login
        },
      });
      console.log(`  ✅ User created: ${user.id} (${user.email})`);
    }
  } catch (err) {
    console.error('  ❌ Failed to create user:', err);
    process.exit(1);
  }

  // ── Step 3: Create UserOrgRole ───────────────────────────────────────────────
  console.log('\nStep 3: Creating UserOrgRole (student in KSRCE)...');
  try {
    // Check existence first — no upsert available without unique constraint matching all three fields
    const existing = await prisma.userOrgRole.findFirst({
      where: {
        userId: USER_ID,
        organizationId: ksrceOrgId,
        roleId: studentRoleId,
      },
    });

    if (existing) {
      console.log(`  ⚠️  UserOrgRole already exists: ${existing.id} (skipped)`);
    } else {
      const orgRole = await prisma.userOrgRole.create({
        data: {
          userId: USER_ID,
          organizationId: ksrceOrgId,
          roleId: studentRoleId,
        },
      });
      console.log(`  ✅ UserOrgRole created: ${orgRole.id}`);
    }
  } catch (err) {
    console.error('  ❌ Failed to create UserOrgRole:', err);
    process.exit(1);
  }

  // ── Step 4: Create UserStorageVolume ─────────────────────────────────────────
  console.log('\nStep 4: Creating UserStorageVolume...');
  try {
    const existingVol = await prisma.userStorageVolume.findFirst({
      where: { userId: USER_ID, name: 'Primary Storage' },
    });

    if (existingVol) {
      console.log(`  ⚠️  UserStorageVolume already exists: ${existingVol.id} (skipped)`);
    } else {
      const volume = await prisma.userStorageVolume.create({
        data: {
          userId: USER_ID,
          name: 'Primary Storage',
          storageUid: 'u_a3e6e9f9b971548f6c358870',
          zfsDatasetPath: 'datapool/users/u_a3e6e9f9b971548f6c358870',
          nfsExportPath: '/mnt/nfs/users/u_a3e6e9f9b971548f6c358870',
          containerMountPath: '/home/user',
          osChoice: 'ubuntu22',
          quotaBytes: BigInt(12782227456), // 11.9 GB
          usedBytes: BigInt(3338848256),   // ~3.11 GB (from ZFS output)
          allocationType: 'sso_default',
          status: 'active',
          provisionedAt: new Date('2026-03-15'),
        },
      });
      console.log(`  ✅ UserStorageVolume created: ${volume.id}`);
      console.log(`     quota=${volume.quotaBytes} bytes, used=${volume.usedBytes} bytes`);
    }
  } catch (err) {
    console.error('  ❌ Failed to create UserStorageVolume:', err);
    process.exit(1);
  }

  // ── Step 5: Create Wallet ─────────────────────────────────────────────────────
  console.log('\nStep 5: Creating Wallet...');
  let walletId: string;
  try {
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId: USER_ID },
    });

    if (existingWallet) {
      walletId = existingWallet.id;
      console.log(`  ⚠️  Wallet already exists: ${walletId} (balance: ₹${Number(existingWallet.balanceCents) / 100}, skipped)`);
    } else {
      const wallet = await prisma.wallet.create({
        data: {
          userId: USER_ID,
          balanceCents: BigInt(50000),           // ₹500
          currency: 'INR',
          lifetimeCreditsCents: BigInt(50000),
          lifetimeSpentCents: BigInt(0),
          spendLimitCents: 8000,                 // ₹80 daily
          spendLimitPeriod: 'daily',
          spendLimitEnabled: true,
        },
      });
      walletId = wallet.id;
      console.log(`  ✅ Wallet created: ${walletId}`);
      console.log(`     balance=₹${Number(wallet.balanceCents) / 100}, daily limit=₹${wallet.spendLimitCents! / 100}`);
    }
  } catch (err) {
    console.error('  ❌ Failed to create Wallet:', err);
    process.exit(1);
  }

  // ── Step 6: Create initial WalletTransaction ──────────────────────────────────
  console.log('\nStep 6: Creating initial WalletTransaction...');
  try {
    const existingTxn = await prisma.walletTransaction.findFirst({
      where: {
        walletId,
        userId: USER_ID,
        txnType: 'credit_purchase',
        description: 'Initial platform credit',
      },
    });

    if (existingTxn) {
      console.log(`  ⚠️  Initial WalletTransaction already exists: ${existingTxn.id} (skipped)`);
    } else {
      const txn = await prisma.walletTransaction.create({
        data: {
          walletId,
          userId: USER_ID,
          txnType: 'credit_purchase',
          amountCents: BigInt(50000),
          balanceAfterCents: BigInt(50000),
          description: 'Initial platform credit',
        },
      });
      console.log(`  ✅ WalletTransaction created: ${txn.id}`);
      console.log(`     type=${txn.txnType}, amount=₹${Number(txn.amountCents) / 100}`);
    }
  } catch (err) {
    console.error('  ❌ Failed to create WalletTransaction:', err);
    process.exit(1);
  }

  // ── Step 7: Create UserProfile ────────────────────────────────────────────────
  console.log('\nStep 7: Creating UserProfile...');
  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId: USER_ID },
      create: {
        userId: USER_ID,
        themePreference: 'dark',
        isOnboardingComplete: true,
        collegeName: 'K.S. Rangasamy College of Engineering',
      },
      update: {}, // don't overwrite if exists
    });
    console.log(`  ✅ UserProfile upserted: ${profile.id}`);
    console.log(`     theme=${profile.themePreference}, college=${profile.collegeName}`);
  } catch (err) {
    console.error('  ❌ Failed to upsert UserProfile:', err);
    process.exit(1);
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n=== Restoration Complete ===');
  console.log(`User ID      : ${USER_ID}`);
  console.log(`Email        : punith.vs74064@gmail.com`);
  console.log(`Org          : KSRCE (${ksrceOrgId})`);
  console.log(`Role         : student (${studentRoleId})`);
  console.log(`Storage UID  : u_a3e6e9f9b971548f6c358870`);
  console.log(`Wallet       : ${walletId!} — ₹500 balance`);
  console.log(`keycloakSub  : NULL (will auto-link on next SSO login)`);
  console.log('\nNext step: run setup-complete-billing-data.ts to restore billing history.\n');
}

restoreUserData()
  .catch((e) => {
    console.error('Unhandled error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
