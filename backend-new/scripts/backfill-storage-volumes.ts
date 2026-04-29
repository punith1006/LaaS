import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Backfill UserStorageVolume for all SSO users who are provisioned but missing a record
  const result = await prisma.$executeRaw`
    INSERT INTO user_storage_volumes (id, user_id, storage_uid, os_choice, quota_bytes, used_bytes, allocation_type, status, provisioned_at, created_at, updated_at)
    SELECT
      gen_random_uuid()::uuid,
      id,
      storage_uid,
      'ubuntu22',
      5368709120, -- 5GB in bytes
      0,
      'sso_default',
      'active',
      COALESCE(storage_provisioned_at, NOW()),
      NOW(),
      NOW()
    FROM users
    WHERE storage_uid IS NOT NULL
      AND storage_provisioning_status = 'provisioned'
      AND auth_type = 'university_sso'
      AND id NOT IN (SELECT user_id FROM user_storage_volumes)
  `;

  console.log(`Inserted ${result} UserStorageVolume record(s)`);

  // Update all existing UserStorageVolume records for provisioned SSO users
  // with the correct ZFS dataset path and NFS export path derived from storageUid
  const updated = await prisma.$executeRaw`
    UPDATE user_storage_volumes
    SET
      zfs_dataset_path = 'datapool/users/' || u.storage_uid,
      nfs_export_path = '/mnt/nfs/users/' || u.storage_uid,
      updated_at = NOW()
    FROM users u
    WHERE user_storage_volumes.user_id = u.id
      AND u.storage_provisioning_status = 'provisioned'
      AND u.auth_type = 'university_sso'
      AND (user_storage_volumes.zfs_dataset_path IS NULL OR user_storage_volumes.nfs_export_path IS NULL)
  `;

  console.log(`Updated ${updated} UserStorageVolume record(s) with zfs/nfs paths`);

  // Verify the test user
  const testUserId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  const vol = await prisma.$queryRaw<any[]>`
    SELECT id, user_id, storage_uid, quota_bytes, status, allocation_type, provisioned_at, zfs_dataset_path, nfs_export_path
    FROM user_storage_volumes WHERE user_id = ${testUserId}::uuid
  `;
  console.log(`\nTest user storage volume:`);
  vol.forEach(v => {
    console.log(`  id: ${v.id}`);
    console.log(`  storageUid: ${v.storage_uid}`);
    console.log(`  quota: ${(Number(v.quota_bytes as bigint) / (1024**3)).toFixed(2)} GB`);
    console.log(`  status: ${v.status}`);
    console.log(`  allocation_type: ${v.allocation_type}`);
    console.log(`  zfsDatasetPath: ${v.zfs_dataset_path}`);
    console.log(`  nfsExportPath: ${v.nfs_export_path}`);
    console.log(`  provisioned_at: ${v.provisioned_at}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
