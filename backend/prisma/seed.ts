import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  'super_admin',
  'org_admin',
  'billing_admin',
  'faculty',
  'lab_instructor',
  'mentor',
  'student',
  'external_student',
  'public_user',
];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      create: {
        name,
        displayName: name.replace(/_/g, ' '),
        isSystem: true,
      },
      update: {},
    });
  }

  const publicOrg = await prisma.organization.upsert({
    where: { slug: 'public' },
    create: {
      name: 'Public',
      slug: 'public',
      orgType: 'public_',
      isActive: true,
    },
    update: {},
  });

  const laasAcademyOrg = await prisma.organization.upsert({
    where: { slug: 'laas-academy' },
    create: {
      name: 'LaaS Academy',
      slug: 'laas-academy',
      orgType: 'university',
      isActive: true,
    },
    update: {},
  });

  console.log('Seeded roles and public org:', publicOrg.slug);
  console.log('Seeded LaaS Academy org:', laasAcademyOrg.slug);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
