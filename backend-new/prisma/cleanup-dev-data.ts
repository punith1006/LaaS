import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Wipe user-related data so auth flow can be re-tested from a clean state

  await prisma.loginHistory.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.userPolicyConsent.deleteMany({});
  await prisma.otpVerification.deleteMany({});
  await prisma.userOrgRole.deleteMany({});

  await prisma.user.deleteMany({});
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

