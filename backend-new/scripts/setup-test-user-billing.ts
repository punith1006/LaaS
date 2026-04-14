import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestUserBilling() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  console.log('Setting up billing data for test user...\n');

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`User with ID ${userId} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);

    // Set billing values for test user
    const creditBalanceCents = 50000; // ₹500
    const spendLimitCents = 8000; // ₹80
    const spendLimitPeriod = 'daily';
    const spendLimitEnabled = true;

    // Check if wallet exists, create if not
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balanceCents: creditBalanceCents,
          currency: 'INR',
          lifetimeCreditsCents: creditBalanceCents,
          lifetimeSpentCents: 0,
          spendLimitCents,
          spendLimitPeriod,
          spendLimitEnabled,
        },
      });
      console.log(`✅ Created wallet with balance: ₹${creditBalanceCents / 100}`);
    } else {
      wallet = await prisma.wallet.update({
        where: { userId },
        data: {
          balanceCents: creditBalanceCents,
          spendLimitCents,
          spendLimitPeriod,
          spendLimitEnabled,
        },
      });
      console.log(`✅ Updated wallet balance: ₹${creditBalanceCents / 100}`);
    }

    // Create a credit transaction for the initial balance
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        txnType: 'credit_purchase',
        amountCents: creditBalanceCents,
        balanceAfterCents: creditBalanceCents,
        description: 'Initial test credit',
      },
    });
    console.log(`✅ Created credit transaction`);

    // Create some billing charges for the chart (last 7 days)
    const today = new Date();
    const computeConfig = await prisma.computeConfig.findFirst({
      where: { isActive: true },
    });

    if (!computeConfig) {
      console.log('⚠️ No compute config found, skipping billing charges');
    } else {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(10, 0, 0, 0);
        
        // Random spend between ₹10-₹30 for demo
        const amountCents = Math.floor(Math.random() * 2000) + 1000;
        
        // Create a session first
        const session = await prisma.session.create({
          data: {
            userId,
            computeConfigId: computeConfig.id,
            sessionType: 'stateful_desktop',
            status: 'ended',
            startedAt: date,
            endedAt: new Date(date.getTime() + 3600000), // 1 hour later
          },
        });

        await prisma.billingCharge.create({
          data: {
            userId,
            sessionId: session.id,
            computeConfigId: computeConfig.id,
            durationSeconds: 3600,
            rateCentsPerHour: computeConfig.basePricePerHourCents,
            amountCents: BigInt(amountCents),
            currency: 'INR',
            createdAt: date,
          },
        });
      }
      console.log(`✅ Created 7 days of billing charges for chart`);
    }

    console.log('\n📊 Test user billing setup complete!');
    console.log(`   Credit Balance: ₹${creditBalanceCents / 100}`);
    console.log(`   Spend Limit: ₹${spendLimitCents / 100} ${spendLimitPeriod}`);
    console.log(`   Compute Config: ${computeConfig?.name || 'N/A'} @ ₹${computeConfig?.basePricePerHourCents || 0}/hour`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestUserBilling();
