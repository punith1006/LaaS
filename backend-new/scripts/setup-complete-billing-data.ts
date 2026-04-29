import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupCompleteBillingData() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  console.log('Setting up complete billing data for test user...\n');

  try {
    // 1. Get or create compute config
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
      console.log(`✅ Created compute config: ₹${computeConfig.basePricePerHourCents / 100}/hour`);
    } else {
      console.log(`✅ Found compute config: ₹${computeConfig.basePricePerHourCents / 100}/hour`);
    }

    // 2. Create wallet if not exists
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balanceCents: BigInt(50000), // ₹500
          currency: 'INR',
          lifetimeCreditsCents: BigInt(50000),
          lifetimeSpentCents: BigInt(0),
          spendLimitCents: 8000, // ₹80 daily limit
          spendLimitPeriod: 'daily',
          spendLimitEnabled: true,
        },
      });
      console.log(`✅ Created wallet with ₹500 balance, ₹80 daily limit`);
    } else {
      // Update wallet
      wallet = await prisma.wallet.update({
        where: { userId },
        data: {
          balanceCents: BigInt(50000),
          spendLimitCents: 8000,
          spendLimitPeriod: 'daily',
          spendLimitEnabled: true,
        },
      });
      console.log(`✅ Updated wallet: ₹500 balance, ₹80 daily limit`);
    }

    // 3. Delete existing sessions and billing charges for this user
    await prisma.billingCharge.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    console.log('✅ Cleared existing sessions and billing charges');

    // 4. Create today's hourly billing data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentHour = new Date().getHours();
    
    // Simulate realistic usage pattern throughout the day
    // Usage varies by hour to create fluctuating chart
    const hourlyUsagePattern = [
      { hour: 0, duration: 0 },   // Midnight - no usage
      { hour: 1, duration: 0 },   // 1 AM - no usage
      { hour: 2, duration: 0 },   // 2 AM - no usage
      { hour: 3, duration: 0 },   // 3 AM - no usage
      { hour: 4, duration: 0 },   // 4 AM - no usage
      { hour: 5, duration: 0 },   // 5 AM - no usage
      { hour: 6, duration: 0 },   // 6 AM - no usage
      { hour: 7, duration: 0 },   // 7 AM - no usage
      { hour: 8, duration: 1 },   // 8 AM - 1 hour (morning start)
      { hour: 9, duration: 2 },   // 9 AM - 2 hours (active work)
      { hour: 10, duration: 1 },  // 10 AM - 1 hour
      { hour: 11, duration: 0 },  // 11 AM - break
      { hour: 12, duration: 0 },  // 12 PM - lunch break
      { hour: 13, duration: 1 },  // 1 PM - 1 hour (afternoon start)
      { hour: 14, duration: 2 },  // 2 PM - 2 hours (active work)
      { hour: 15, duration: 1 },  // 3 PM - 1 hour
      { hour: 16, duration: 0 },  // 4 PM - break
      { hour: 17, duration: 1 },  // 5 PM - 1 hour
      { hour: 18, duration: 0 },  // 6 PM - dinner
      { hour: 19, duration: 0 },  // 7 PM - evening break
      { hour: 20, duration: 1 },  // 8 PM - 1 hour (evening work)
      { hour: 21, duration: 2 },  // 9 PM - 2 hours (night work)
      { hour: 22, duration: 1 },  // 10 PM - 1 hour
      { hour: 23, duration: 0 },  // 11 PM - wind down
    ];

    let totalDailySpend = 0;

    for (const usage of hourlyUsagePattern) {
      // Only create billing if there's usage and it's before/equal to current hour
      if (usage.duration > 0 && usage.hour <= currentHour) {
        const sessionStart = new Date(today);
        sessionStart.setHours(usage.hour, 0, 0, 0);
        
        const amountCents = usage.duration * computeConfig.basePricePerHourCents;
        totalDailySpend += amountCents;

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

        console.log(`✅ ${usage.hour.toString().padStart(2, '0')}:00 - ${usage.duration}h = ₹${amountCents / 100}`);
      }
    }

    // 5. Create one active session for current spend rate
    const activeSessionStart = new Date();
    activeSessionStart.setMinutes(0, 0, 0);
    
    await prisma.session.create({
      data: {
        userId,
        computeConfigId: computeConfig.id,
        sessionType: 'stateful_desktop',
        status: 'running',
        startedAt: activeSessionStart,
        actualGpuVramMb: 4096,
      },
    });
    console.log(`\n✅ Created active session (current rate: ₹${computeConfig.basePricePerHourCents / 100}/hr)`);

    // 6. Create historical data for past 6 days (for rolling average)
    for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      
      // Random daily usage between 1-6 hours
      const dailyHours = Math.floor(Math.random() * 6) + 1;
      const amountCents = dailyHours * computeConfig.basePricePerHourCents;
      
      const session = await prisma.session.create({
        data: {
          userId,
          computeConfigId: computeConfig.id,
          sessionType: 'stateful_desktop',
          status: 'ended',
          startedAt: date,
          endedAt: new Date(date.getTime() + dailyHours * 3600000),
          actualGpuVramMb: 4096,
        },
      });

      await prisma.billingCharge.create({
        data: {
          userId,
          sessionId: session.id,
          computeConfigId: computeConfig.id,
          durationSeconds: dailyHours * 3600,
          rateCentsPerHour: computeConfig.basePricePerHourCents,
          amountCents: BigInt(amountCents),
          currency: 'INR',
          createdAt: date,
        },
      });
    }
    console.log(`✅ Created 6 days of historical billing data`);

    console.log('\n📊 Billing data setup complete!');
    console.log(`   - Wallet balance: ₹${Number(wallet.balanceCents) / 100}`);
    console.log(`   - Daily spend limit: ₹${(wallet as any).spendLimitCents ? Number((wallet as any).spendLimitCents) / 100 : 0}`);
    console.log(`   - Today's spend: ₹${totalDailySpend / 100}`);
    console.log(`   - Current rate: ₹${computeConfig.basePricePerHourCents / 100}/hr`);
    console.log('\nRefresh the billing tab to see live values.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupCompleteBillingData();
