import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const charges = await prisma.$queryRaw<
    { day: Date; charge_count: bigint; total_cents: bigint }[]
  >`
    SELECT DATE("created_at") as day,
           COUNT(*) as charge_count,
           SUM("amount_cents") as total_cents
    FROM "billing_charges"
    WHERE "created_at" >= ${sevenDaysAgo}
    GROUP BY DATE("created_at")
    ORDER BY day
  `;

  console.log('=== BILLING CHARGES PER DAY (LAST 7 DAYS) ===');
  let grandTotal = 0;
  for (const r of charges) {
    const cents = Number(r.total_cents);
    grandTotal += cents;
    const dayStr = r.day.toISOString().split('T')[0];
    console.log(
      `${dayStr} | Charges: ${r.charge_count} | Total: Rs.${(cents / 100).toFixed(2)} (${cents} paise)`,
    );
  }
  console.log('---');
  console.log(`Grand Total: Rs.${(grandTotal / 100).toFixed(2)}`);
  console.log(`7-day avg: Rs.${(grandTotal / 7 / 100).toFixed(2)}/day`);

  await prisma.$disconnect();
}

main().catch(console.error);
