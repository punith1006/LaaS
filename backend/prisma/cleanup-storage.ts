/**
 * Cleanup script for storage-related data for a specific storage_uid.
 *
 * This script ONLY cleans up storage data for the specified user.
 * It does NOT touch wallets, sessions, compute data, or any other users.
 *
 * Run: npx ts-node prisma/cleanup-storage.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_STORAGE_UID = 'u_096931e469e21d2992d9cbcc';

async function cleanupStorage() {
  console.log('='.repeat(60));
  console.log('Storage Cleanup Script');
  console.log('='.repeat(60));
  console.log(`Target storage_uid: ${TARGET_STORAGE_UID}`);
  console.log('');

  // Step 1: Find the UserStorageVolume record
  const storageVolume = await prisma.userStorageVolume.findFirst({
    where: { storageUid: TARGET_STORAGE_UID },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          storageUid: true,
          storageProvisioningStatus: true,
        },
      },
    },
  });

  if (!storageVolume) {
    console.log(`No UserStorageVolume found with storageUid: ${TARGET_STORAGE_UID}`);
    console.log('Nothing to clean up.');
    return;
  }

  console.log('Found UserStorageVolume:');
  console.log(`  ID: ${storageVolume.id}`);
  console.log(`  Name: ${storageVolume.name}`);
  console.log(`  Storage UID: ${storageVolume.storageUid}`);
  console.log(`  Status: ${storageVolume.status}`);
  console.log(`  Quota: ${Number(storageVolume.quotaBytes) / (1024 * 1024 * 1024)} GB`);
  console.log(`  ZFS Path: ${storageVolume.zfsDatasetPath || 'N/A'}`);
  console.log(`  NFS Path: ${storageVolume.nfsExportPath || 'N/A'}`);
  console.log('');

  console.log('Associated User:');
  console.log(`  ID: ${storageVolume.user.id}`);
  console.log(`  Email: ${storageVolume.user.email}`);
  console.log(`  Name: ${storageVolume.user.firstName} ${storageVolume.user.lastName}`);
  console.log(`  User storageUid: ${storageVolume.user.storageUid || 'null'}`);
  console.log(`  User storageProvisioningStatus: ${storageVolume.user.storageProvisioningStatus || 'null'}`);
  console.log('');

  // Step 2: Find related BillingCharges
  const billingCharges = await prisma.billingCharge.findMany({
    where: { storageVolumeId: storageVolume.id },
    select: {
      id: true,
      chargeType: true,
      amountCents: true,
      createdAt: true,
    },
  });

  console.log(`Found ${billingCharges.length} BillingCharge record(s) linked to this storage volume:`);
  for (const charge of billingCharges) {
    console.log(`  - ID: ${charge.id}, Type: ${charge.chargeType}, Amount: ₹${Number(charge.amountCents) / 100}, Created: ${charge.createdAt.toISOString()}`);
  }
  console.log('');

  // Step 3: Find related StorageExtensions
  const storageExtensions = await prisma.storageExtension.findMany({
    where: { storageVolumeId: storageVolume.id },
    select: {
      id: true,
      extensionType: true,
      extensionBytes: true,
      createdAt: true,
    },
  });

  console.log(`Found ${storageExtensions.length} StorageExtension record(s) linked to this storage volume:`);
  for (const ext of storageExtensions) {
    console.log(`  - ID: ${ext.id}, Type: ${ext.extensionType}, Extension: ${Number(ext.extensionBytes) / (1024 * 1024 * 1024)} GB, Created: ${ext.createdAt.toISOString()}`);
  }
  console.log('');

  // Summary of what will be deleted
  console.log('='.repeat(60));
  console.log('CLEANUP SUMMARY - The following will be deleted/updated:');
  console.log('='.repeat(60));
  console.log(`1. Delete ${billingCharges.length} BillingCharge record(s)`);
  console.log(`2. Delete ${storageExtensions.length} StorageExtension record(s)`);
  console.log(`3. Delete 1 UserStorageVolume record (ID: ${storageVolume.id})`);
  console.log(`4. Reset User storage fields for user ID: ${storageVolume.user.id}`);
  console.log('   - storageUid: null');
  console.log('   - storageProvisioningStatus: null');
  console.log('   - storageProvisionedAt: null');
  console.log('   - storageProvisioningError: null');
  console.log('');

  // Execute the cleanup in a transaction
  console.log('Executing cleanup in a transaction...');
  console.log('');

  await prisma.$transaction(async (tx) => {
    // 1. Delete BillingCharges linked to this storage volume
    if (billingCharges.length > 0) {
      const deletedCharges = await tx.billingCharge.deleteMany({
        where: { storageVolumeId: storageVolume.id },
      });
      console.log(`✓ Deleted ${deletedCharges.count} BillingCharge record(s)`);
    } else {
      console.log('✓ No BillingCharge records to delete');
    }

    // 2. Delete StorageExtensions linked to this storage volume
    if (storageExtensions.length > 0) {
      const deletedExtensions = await tx.storageExtension.deleteMany({
        where: { storageVolumeId: storageVolume.id },
      });
      console.log(`✓ Deleted ${deletedExtensions.count} StorageExtension record(s)`);
    } else {
      console.log('✓ No StorageExtension records to delete');
    }

    // 3. Delete the UserStorageVolume record
    await tx.userStorageVolume.delete({
      where: { id: storageVolume.id },
    });
    console.log(`✓ Deleted UserStorageVolume record (ID: ${storageVolume.id})`);

    // 4. Reset User storage fields
    await tx.user.update({
      where: { id: storageVolume.user.id },
      data: {
        storageUid: null,
        storageProvisioningStatus: null,
        storageProvisionedAt: null,
        storageProvisioningError: null,
      },
    });
    console.log(`✓ Reset User storage fields for user ID: ${storageVolume.user.id}`);
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('Cleanup completed successfully!');
  console.log('='.repeat(60));
}

// Run the cleanup
cleanupStorage()
  .catch((error) => {
    console.error('Error during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
