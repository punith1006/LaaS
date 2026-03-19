import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const charges = await prisma.billingCharge.findMany({
    where: {
      userId,
      createdAt: { gte: today, lt: tomorrow },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  console.log('Today billing charges by hour:');
  const byHour: Record<number, number> = {};
  charges.forEach(c => {
    const hour = new Date(c.createdAt).getHours();
    byHour[hour] = (byHour[hour] || 0) + Number(c.amountCents);
  });
  
  for (let h = 0; h < 24; h++) {
    if (byHour[h]) {
      console.log(`  ${h.toString().padStart(2, '0')}:00 - Rs${byHour[h] / 100}`);
    }
  }
  
  console.log('\nTotal charges:', charges.length);
  
  await prisma.$disconnect();
}

check();
