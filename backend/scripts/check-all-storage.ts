import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

  // 1. User record
  const user = await prisma.user.findUnique({ where: { id: userId } });
  console.log('\n=== User Record ===');
  console.log(`  email: ${user?.email}, authType: ${user?.authType}`);
  console.log(`  storageUid: ${user?.storageUid}`);
  console.log(`  storageProvisioningStatus: ${user?.storageProvisioningStatus}`);
  console.log(`  storageProvisionedAt: ${user?.storageProvisionedAt}`);
  console.log(`  osChoice: ${user?.osChoice}, defaultOrgId: ${user?.defaultOrgId}`);

  // 2. UserStorageVolume
  const volumes = await prisma.$queryRaw<any[]>`
    SELECT id, user_id, storage_uid, status, quota_bytes, used_bytes, nfs_export_path, zfs_dataset_path
    FROM user_storage_volumes WHERE user_id = ${userId}::uuid
  `;
  console.log(`\n=== UserStorageVolume (${volumes.length}) ===`);
  volumes.forEach(v => {
    const gb = Number(v.quota_bytes as bigint) / (1024**3);
    console.log(`  id:${v.id}, status:${v.status}, quota:${gb.toFixed(2)}GB, used:${(Number(v.used_bytes as bigint)/(1024**3)).toFixed(2)}GB, path:${v.nfs_export_path}`);
  });

  // 3. StorageExtension via raw SQL
  const extensions = await prisma.$queryRaw<any[]>`
    SELECT id, user_id, storage_volume_id, extension_type, previous_quota_bytes, new_quota_bytes, extension_bytes
    FROM storage_extensions WHERE user_id = ${userId}::uuid
  `;
  console.log(`\n=== StorageExtension (${extensions.length}) ===`);
  extensions.forEach(e => {
    console.log(`  type:${e.extension_type}, prev:${(Number(e.previous_quota_bytes as bigint)/(1024**3)).toFixed(2)}GB, new:${(Number(e.new_quota_bytes as bigint)/(1024**3)).toFixed(2)}GB`);
  });

  // 4. Organization info
  if (user?.defaultOrgId) {
    const org = await prisma.$queryRaw<any[]>`
      SELECT id, name, org_type FROM organizations WHERE id = ${user.defaultOrgId}::uuid
    `;
    console.log(`\n=== Organization (${org.length}) ===`);
    org.forEach(o => console.log(`  id:${o.id}, name:${o.name}, type:${o.org_type}`));

    // OrgResourceQuota
    const orgQuota = await prisma.$queryRaw<any[]>`
      SELECT organization_id, max_storage_per_user_mb, max_concurrent_stateful_per_user FROM org_resource_quotas WHERE organization_id = ${user.defaultOrgId}::uuid
    `;
    console.log(`\n=== OrgResourceQuota (${orgQuota.length}) ===`);
    orgQuota.forEach(q => {
      const maxMb = Number(q.max_storage_per_user_mb as bigint);
      console.log(`  maxStoragePerUserMb: ${maxMb} MB = ${(maxMb / 1024).toFixed(2)} GB`);
      console.log(`  maxConcurrentStatefulPerUser: ${q.max_concurrent_stateful_per_user}`);
    });
  }

  // 5. All active storage volumes (recent)
  const allVols = await prisma.$queryRaw<any[]>`
    SELECT user_id, storage_uid, status, quota_bytes, used_bytes, nfs_export_path
    FROM user_storage_volumes WHERE status = 'active'
    ORDER BY created_at DESC LIMIT 10
  `;
  console.log(`\n=== All Active StorageVolumes (recent 10) ===`);
  allVols.forEach(v => {
    console.log(`  userId:${v.user_id}, uid:${v.storage_uid}, quota:${(Number(v.quota_bytes as bigint)/(1024**3)).toFixed(2)}GB, path:${v.nfs_export_path}`);
  });

  // 6. Any storage record for this user (any status)
  const anyVols = await prisma.$queryRaw<any[]>`
    SELECT id, user_id, status, quota_bytes, used_bytes, created_at
    FROM user_storage_volumes WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
  `;
  // Backfill UserStorageVolume for existing provisioned users
  const backfill = await prisma.$executeRaw`
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
  console.log(`\n=== Backfill: inserted ${backfill} UserStorageVolume records ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
