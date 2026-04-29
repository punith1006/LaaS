import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function fixStorageStatus() {
  console.log('Checking and fixing storage provisioning status...\n');

  try {
    // Get all users with storage that shows as failed or pending
    const users = await prisma.user.findMany({
      where: {
        storageUid: { not: null },
        OR: [
          { storageProvisioningStatus: 'failed' },
          { storageProvisioningStatus: 'pending' },
        ],
      },
      select: {
        id: true,
        email: true,
        storageUid: true,
        storageProvisioningStatus: true,
        storageProvisioningError: true,
      },
    });

    console.log(`Found ${users.length} users with storage issues\n`);

    for (const user of users) {
      console.log(`Checking user: ${user.email}`);
      console.log(`  Storage UID: ${user.storageUid}`);
      console.log(`  Current status: ${user.storageProvisioningStatus}`);
      console.log(`  Error: ${user.storageProvisioningError || 'N/A'}`);

      // Check if the storage actually exists on the host
      try {
        const result = execSync(
          `zfs list -H -o name datapool/users/${user.storageUid}`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        
        if (result.trim() === `datapool/users/${user.storageUid}`) {
          console.log(`  ✓ Storage exists on host!`);
          
          // Update the database to mark as provisioned
          await prisma.user.update({
            where: { id: user.id },
            data: {
              storageProvisioningStatus: 'provisioned',
              storageProvisionedAt: new Date(),
              storageProvisioningError: null,
            },
          });
          console.log(`  ✓ Updated database status to 'provisioned'\n`);
        } else {
          console.log(`  ✗ Storage not found on host\n`);
        }
      } catch (error) {
        console.log(`  ✗ Error checking storage: ${error}\n`);
      }
    }

    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixStorageStatus();
