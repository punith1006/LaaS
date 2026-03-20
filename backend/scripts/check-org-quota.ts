import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check the org
  const orgId = '118c6670-7d5e-4294-a095-9e620efa7e2b';
  const orgQuota = await prisma.$queryRaw<any[]>`
    SELECT * FROM org_resource_quotas WHERE organization_id = ${orgId}::uuid
  `;
  console.log(`OrgResourceQuota rows: ${orgQuota.length}`);
  if (orgQuota.length > 0) {
    console.log(JSON.stringify(orgQuota[0], null, 2));
  }

  // Show the actual quota bytes for LaaS Academy
  // Default maxStoragePerUserMb = 15360 (15 GB)
  // If user has 5GB, maybe there's a different table or it was set differently
  console.log(`\nDefault maxStoragePerUserMb in schema: 15360 MB = 15 GB`);

  // Check if there's a storage_quota table we missed
  const tables = await prisma.$queryRaw<any[]>`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%storage%'
  `;
  console.log(`\nStorage-related tables:`);
  tables.forEach(t => console.log(`  ${t.table_name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
