import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

  // Find a compute config to use for historical charges (or the cheapest one)
  const computeConfig = await prisma.$queryRaw<any[]>`
    SELECT id, base_price_per_hour_cents FROM compute_configs
    ORDER BY base_price_per_hour_cents ASC LIMIT 1
  `;

  if (!computeConfig[0]) {
    console.error('No compute config found in DB!');
    process.exit(1);
  }
  const computeConfigId = String(computeConfig[0].id);
  const pricePerHour = Number(computeConfig[0].base_price_per_hour_cents);
  console.log(`Using compute config: ${computeConfigId} @ ₹${pricePerHour / 100}/hr`);

  // Create a single "historical" ended session for all past billing charges
  // (billing_charges requires a valid session_id FK)
  const histSessionId = '00000000-0000-0000-0000-000000000001';
  await prisma.$executeRawUnsafe(`
    INSERT INTO sessions (
      id, user_id, compute_config_id, session_type, status,
      started_at, ended_at, created_at, updated_at
    )
    SELECT
      $1::uuid,
      $2::uuid,
      $3::uuid,
      'stateful_desktop',
      'ended',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '7 days',
      NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE id = $1::uuid)
  `, histSessionId, userId, computeConfigId);
  console.log(`Created historical session: ${histSessionId}`);

  // Build rows: (id, session_id, user_id, compute_config_id, amount, rate, duration, currency, created_by, updated_by, created_at, updated_at)
  const rows: string[] = [];
  const now = new Date();

  for (let day = 6; day >= 0; day--) {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    d.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0);
    const amountCents = pricePerHour * 2;
    rows.push(
      `(gen_random_uuid()::uuid, '${histSessionId}'::uuid, '${userId}'::uuid, '${computeConfigId}'::uuid, ` +
      `${amountCents}::bigint, ${pricePerHour}::int, 7200::int, 'INR', NULL::uuid, '${d.toISOString()}'::timestamptz)`
    );
  }

  // Charges spread over past 12h for chart data
  const chartTimes = [
    now.getTime() - 11 * 3600 * 1000,
    now.getTime() - 9 * 3600 * 1000,
    now.getTime() - 7 * 3600 * 1000,
    now.getTime() - 5 * 3600 * 1000,
    now.getTime() - 3 * 3600 * 1000,
    now.getTime() - 1 * 3600 * 1000,
  ];
  const chartAmounts = [1500, 4500, 3000, 6000, 3000, 1500]; // ₹15..₹60 in cents

  for (let i = 0; i < chartTimes.length; i++) {
    const t = new Date(chartTimes[i]);
    rows.push(
      `(gen_random_uuid()::uuid, '${histSessionId}'::uuid, '${userId}'::uuid, '${computeConfigId}'::uuid, ` +
      `${chartAmounts[i]}::bigint, ${pricePerHour}::int, 3600::int, 'INR', NULL::uuid, '${t.toISOString()}'::timestamptz)`
    );
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO billing_charges (
      id, session_id, user_id, compute_config_id,
      amount_cents, rate_cents_per_hour, duration_seconds, currency,
      created_by, created_at
    )
    VALUES ${rows.join(',\n      ')}
  `);

  console.log(`\nInserted ${rows.length} billing charges:`);
  console.log(`  - 7 daily charges (past week) for rolling average`);
  console.log(`  - 6 hourly charges (past 12h) for chart`);

  // Verify
  const total = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt, SUM(amount_cents) as total FROM billing_charges WHERE user_id = ${userId}::uuid`;
  console.log(`\nTotal charges for user: ${total[0].cnt} (₹${Number(total[0].total) / 100})`);

  console.log(`\n✅ Sample data added. Restart backend to see graph populate.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
