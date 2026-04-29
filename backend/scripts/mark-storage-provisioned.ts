import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markStorageProvisioned() {
  const storageUid = process.argv[2];
  
  if (!storageUid) {
    console.error('Usage: npx ts-node scripts/mark-storage-provisioned.ts <storage_uid>');
    console.error('Example: npx ts-node scripts/mark-storage-provisioned.ts u_4f92d8e4045d71fdb82fc46d');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { storageUid },
    });

    if (!user) {
      console.error(`User with storageUid ${storageUid} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Current status: ${user.storageProvisioningStatus}`);
    console.log(`Current error: ${user.storageProvisioningError || 'N/A'}`);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        storageProvisioningStatus: 'provisioned',
        storageProvisionedAt: new Date(),
        storageProvisioningError: null,
      },
    });

    console.log(`\n✅ Updated storage status to 'provisioned' for ${user.email}`);
    console.log(`Storage UID: ${storageUid}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markStorageProvisioned();
