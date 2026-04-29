import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateTodayBilling() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  console.log('Populating TODAY\'s billing data with realistic usage...\n');

  try {
    // Get compute config
    const computeConfig = await prisma.computeConfig.findFirst({
      where: { slug: 'gpu-desktop-standard' },
    });

    if (!computeConfig) {
      console.error('❌ Compute config not found!');
      process.exit(1);
    }

    const hourlyRate = computeConfig.basePricePerHourCents; // ₹15/hour
    console.log(`✅ Using compute config: ₹${hourlyRate / 100}/hour`);

    // Delete existing sessions and charges for today to avoid duplicates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Only delete ENDED sessions for today (keep active ones)
    const todayEndedSessions = await prisma.session.findMany({
      where: {
        userId,
        status: 'ended',
        startedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    for (const session of todayEndedSessions) {
      await prisma.billingCharge.deleteMany({
        where: { sessionId: session.id },
      });
      await prisma.session.delete({
        where: { id: session.id },
      });
    }
    console.log(`✅ Cleared ${todayEndedSessions.length} ended sessions for today`);
    
    // Check if there's an active session
    const activeSession = await prisma.session.findFirst({
      where: {
        userId,
        status: 'running',
      },
      include: { computeConfig: true },
    });
    
    if (activeSession) {
      console.log(`✅ Keeping active session (rate: ₹${activeSession.computeConfig?.basePricePerHourCents || 0}/hr)`);
    }

    // Create realistic usage pattern for today
    // Usage varies throughout the day to create fluctuating chart
    const usagePattern = [
      { hour: 0, duration: 0 },    // Midnight - no usage
      { hour: 1, duration: 0 },    // 1 AM - no usage
      { hour: 2, duration: 0 },    // 2 AM - no usage
      { hour: 3, duration: 0 },    // 3 AM - no usage
      { hour: 4, duration: 0 },    // 4 AM - no usage
      { hour: 5, duration: 0 },    // 5 AM - no usage
      { hour: 6, duration: 0 },    // 6 AM - no usage
      { hour: 7, duration: 0 },    // 7 AM - no usage
      { hour: 8, duration: 1 },    // 8 AM - 1 hour (morning start)
      { hour: 9, duration: 2 },    // 9 AM - 2 hours (active work)
      { hour: 10, duration: 1 },   // 10 AM - 1 hour
      { hour: 11, duration: 0 },   // 11 AM - break
      { hour: 12, duration: 0 },   // 12 PM - lunch
      { hour: 13, duration: 1 },   // 1 PM - 1 hour (afternoon)
      { hour: 14, duration: 2 },   // 2 PM - 2 hours (active work)
      { hour: 15, duration: 1 },   // 3 PM - 1 hour
      { hour: 16, duration: 0 },   // 4 PM - break
      { hour: 17, duration: 1 },   // 5 PM - 1 hour
      { hour: 18, duration: 0 },   // 6 PM - dinner
      { hour: 19, duration: 0 },   // 7 PM - evening break
      { hour: 20, duration: 1 },   // 8 PM - 1 hour (evening work)
      { hour: 21, duration: 2 },   // 9 PM - 2 hours (night work)
      { hour: 22, duration: 1 },   // 10 PM - 1 hour
      { hour: 23, duration: 0 },   // 11 PM - wind down
    ];

    let totalSpend = 0;

    for (const usage of usagePattern) {
      if (usage.duration > 0) {
        const sessionStart = new Date(today);
        sessionStart.setHours(usage.hour, 0, 0, 0);
        
        const amountCents = usage.duration * hourlyRate;
        totalSpend += amountCents;

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
            rateCentsPerHour: hourlyRate,
            amountCents: BigInt(amountCents),
            currency: 'INR',
            createdAt: sessionStart,
          },
        });

        console.log(`✅ ${usage.hour.toString().padStart(2, '0')}:00 - ${usage.duration}h = ₹${amountCents / 100}`);
      }
    }

    console.log(`\n📊 Total today's spend: ₹${totalSpend / 100}`);
    
    // Create an active session if none exists
    if (!activeSession) {
      const now = new Date();
      await prisma.session.create({
        data: {
          userId,
          computeConfigId: computeConfig.id,
          sessionType: 'stateful_desktop',
          status: 'running',
          startedAt: now,
          actualGpuVramMb: 4096,
        },
      });
      console.log(`✅ Created active session (rate: ₹${hourlyRate / 100}/hr)`);
    }
    
    console.log('Refresh the billing tab to see the updated chart with fluctuating data!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateTodayBilling();
