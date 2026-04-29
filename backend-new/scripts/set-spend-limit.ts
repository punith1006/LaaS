import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  
  // Set spend limit to ₹500 = 50000 cents
  const result = await prisma.$executeRaw`
    UPDATE wallets 
    SET spend_limit_cents = 50000, spend_limit_enabled = true
    WHERE user_id = ${userId}::uuid
  `;
  
  console.log('Updated rows:', result);
  
  // Verify
  const wallet = await prisma.$queryRaw<Array<{
    balance_cents: bigint;
    spend_limit_cents: number;
    spend_limit_enabled: boolean;
  }>>`
    SELECT balance_cents, spend_limit_cents, spend_limit_enabled
    FROM wallets WHERE user_id = ${userId}::uuid
  `;
  
  console.log('Wallet state:');
  if (wallet[0]) {
    const w = wallet[0];
    console.log(`  Balance: ₹${Number(w.balance_cents) / 100}`);
    console.log(`  Spend limit: ₹${(w.spend_limit_cents ?? 0) / 100}`);
    console.log(`  Limit enabled: ${w.spend_limit_enabled}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
