import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';

  // Show current state before cleanup
  const sessions = await prisma.$queryRaw<any[]>`SELECT id, status, created_at FROM sessions WHERE user_id = ${userId}::uuid`;
  const charges = await prisma.$queryRaw<any[]>`SELECT id, created_at, amount_cents FROM billing_charges WHERE user_id = ${userId}::uuid`;
  const walletHolds = await prisma.$queryRaw<any[]>`SELECT id, status FROM wallet_holds WHERE user_id = ${userId}::uuid`;

  console.log(`=== Current State for User ${userId} ===`);
  console.log(`Sessions: ${sessions.length}`);
  sessions.forEach(s => console.log(`  ${s.id} | ${s.status} | created:${s.created_at}`));
  console.log(`Billing Charges: ${charges.length}`);
  charges.slice(0, 5).forEach(c => console.log(`  ${c.id} | ₹${Number(c.amount_cents)/100} | ${c.created_at}`));
  if (charges.length > 5) console.log(`  ... and ${charges.length - 5} more`);
  console.log(`Wallet Holds: ${walletHolds.length}`);

  // Order matters due to FK RESTRICT on sessionId:
  // 1. Delete session_events (has RESTRICT on sessionId)
  const evDeleted = await prisma.$executeRaw`
    DELETE FROM session_events
    WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ${userId}::uuid)
  `;
  console.log(`\nDeleted session_events: ${evDeleted}`);

  // 2. Delete billing_charges (has RESTRICT on sessionId) — keep graph empty after cleanup
  const bcDeleted = await prisma.$executeRaw`
    DELETE FROM billing_charges
    WHERE user_id = ${userId}::uuid
  `;
  console.log(`Deleted billing_charges: ${bcDeleted}`);

  // 3. Delete wallet_holds (has RESTRICT on sessionId)
  const whDeleted = await prisma.$executeRaw`
    DELETE FROM wallet_holds
    WHERE user_id = ${userId}::uuid
  `;
  console.log(`Deleted wallet_holds: ${whDeleted}`);

  // 4. Delete sessions (the main compute resources)
  const sessDeleted = await prisma.$executeRaw`
    DELETE FROM sessions
    WHERE user_id = ${userId}::uuid
  `;
  console.log(`Deleted sessions: ${sessDeleted}`);

  // Verify cleanup
  console.log(`\n=== Post-Cleanup State ===`);
  const remSessions = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM sessions WHERE user_id = ${userId}::uuid`;
  const remCharges = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM billing_charges WHERE user_id = ${userId}::uuid`;
  const remHolds = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM wallet_holds WHERE user_id = ${userId}::uuid`;
  console.log(`Sessions remaining: ${remSessions[0].cnt}`);
  console.log(`Billing charges remaining: ${remCharges[0].cnt}`);
  console.log(`Wallet holds remaining: ${remHolds[0].cnt}`);
  console.log(`\nStorage data (preserved):`);
  const storage = await prisma.$queryRaw<any[]>`
    SELECT id, quota_bytes, status FROM user_storage_volumes WHERE user_id = ${userId}::uuid
  `;
  console.log(`UserStorageVolume: ${storage.length} record(s)`);
  if (storage[0]) {
    console.log(`  quota: ${(Number(storage[0].quota_bytes)/(1024**3)).toFixed(2)} GB`);
    console.log(`  status: ${storage[0].status}`);
  }
  console.log(`\n✅ Cleanup complete. Graph will show past 12 hours of billing data.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
