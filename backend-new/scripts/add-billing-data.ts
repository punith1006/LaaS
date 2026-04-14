import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBillingData() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  console.log('Adding billing data for test user...\n');

  try {
    // 1. Create a compute config if not exists
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
      console.log(`✅ Created compute config: ${computeConfig.name} @ ₹${computeConfig.basePricePerHourCents / 100}/hour`);
    } else {
      console.log(`✅ Found compute config: ${computeConfig.name} @ ₹${computeConfig.basePricePerHourCents / 100}/hour`);
    }

    // 2. Create billing charges for the last 7 days
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(10, 0, 0, 0);
      
      // Random usage between 1-3 hours
      const hoursUsed = Math.floor(Math.random() * 3) + 1;
      const amountCents = hoursUsed * computeConfig.basePricePerHourCents;
      
      // Create a session
      const session = await prisma.session.create({
        data: {
          userId,
          computeConfigId: computeConfig.id,
          sessionType: 'stateful_desktop',
          status: 'ended',
          startedAt: date,
          endedAt: new Date(date.getTime() + hoursUsed * 3600000),
          actualGpuVramMb: 4096,
        },
      });

      // Create billing charge
      await prisma.billingCharge.create({
        data: {
          userId,
          sessionId: session.id,
          computeConfigId: computeConfig.id,
          durationSeconds: hoursUsed * 3600,
          rateCentsPerHour: computeConfig.basePricePerHourCents,
          amountCents: BigInt(amountCents),
          currency: 'INR',
          createdAt: date,
        },
      });

      console.log(`✅ Day ${7 - i}: ${hoursUsed}h usage = ₹${amountCents / 100}`);
    }

    // 3. Create one active session for current spend rate
    const activeSession = await prisma.session.create({
      data: {
        userId,
        computeConfigId: computeConfig.id,
        sessionType: 'stateful_desktop',
        status: 'running',
        startedAt: new Date(),
        actualGpuVramMb: 4096,
      },
    });
    console.log(`\n✅ Created active session (current spend rate: ₹${computeConfig.basePricePerHourCents / 100}/hr)`);

    console.log('\n📊 Billing data setup complete!');
    console.log('Refresh the billing tab to see live values.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addBillingData();
