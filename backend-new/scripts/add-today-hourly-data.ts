import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTodayHourlyData() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  console.log('Adding today\'s hourly billing data for test user...\n');

  try {
    // Get or create compute config
    let computeConfig = await prisma.computeConfig.findFirst({
      where: { slug: 'gpu-desktop-standard' },
    });

    if (!computeConfig) {
      computeConfig = await prisma.computeConfig.create({
        data: {
          slug: 'gpu-desktop-standard',
          name: 'GPU Desktop Standard',
          sessionType: 'stateful_desktop',
          vcpu: 4,
          memoryMb: 16384,
          gpuVramMb: 8192,
          basePricePerHourCents: 1500, // ₹15/hour
          currency: 'INR',
          isActive: true,
          sortOrder: 1,
        },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create billing charges for different hours today
    // Simulate usage: 2 hours at 9am, 1 hour at 1pm, 3 hours at 3pm
    const usagePattern = [
      { hour: 9, duration: 2 },
      { hour: 13, duration: 1 },
      { hour: 15, duration: 3 },
    ];

    for (const usage of usagePattern) {
      const sessionStart = new Date(today);
      sessionStart.setHours(usage.hour, 0, 0, 0);
      
      const amountCents = usage.duration * computeConfig.basePricePerHourCents;

      // Create session
      const session = await prisma.session.create({
        data: {
          userId,
          computeConfigId: computeConfig.id,
          sessionType: 'stateful_desktop',
          status: 'ended',
          startedAt: sessionStart,
          endedAt: new Date(sessionStart.getTime() + usage.duration * 3600000),
          actualGpuVramMb: 4096,
        },
      });

      // Create billing charge
      await prisma.billingCharge.create({
        data: {
          userId,
          sessionId: session.id,
          computeConfigId: computeConfig.id,
          durationSeconds: usage.duration * 3600,
          rateCentsPerHour: computeConfig.basePricePerHourCents,
          amountCents: BigInt(amountCents),
          currency: 'INR',
          createdAt: sessionStart,
        },
      });

      console.log(`✅ ${usage.hour}:00 - ${usage.duration}h usage = ₹${amountCents / 100}`);
    }

    console.log('\n📊 Today\'s hourly data added!');
    console.log('Refresh the billing tab to see the updated chart.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTodayHourlyData();
