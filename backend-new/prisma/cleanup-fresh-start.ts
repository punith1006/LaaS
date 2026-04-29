/**
 * Complete Database Cleanup Script for Fresh Start
 *
 * Wipes ALL user data while preserving system/platform configuration tables.
 * Designed for dev/test environment reset before multi-node testing.
 *
 * Run: npx ts-node prisma/cleanup-fresh-start.ts --force
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Tables that should be emptied (reporting only — actual deletion is via TRUNCATE CASCADE)
const USER_DATA_TABLES = [
  'users',
  'otp_verifications',
  'user_policy_consents',
  'refresh_tokens',
  'login_history',
  'user_org_roles',
  'user_profiles',
  'user_departments',
  'user_group_members',
  'user_storage_volumes',
  'storage_extensions',
  'os_switch_history',
  'user_files',
  'bookings',
  'sessions',
  'session_events',
  'node_resource_reservations',
  'wallets',
  'wallet_holds',
  'wallet_transactions',
  'subscriptions',
  'payment_transactions',
  'billing_charges',
  'invoices',
  'invoice_line_items',
  'courses',
  'course_enrollments',
  'labs',
  'lab_group_assignments',
  'lab_assignments',
  'lab_submissions',
  'lab_grades',
  'coursework_content',
  'mentor_profiles',
  'mentor_availability_slots',
  'mentor_bookings',
  'mentor_reviews',
  'discussions',
  'discussion_replies',
  'project_showcases',
  'user_achievements',
  'notifications',
  'audit_log',
  'user_deletion_requests',
  'support_tickets',
  'ticket_messages',
  'user_feedback',
  'referrals',
  'referral_conversions',
  'referral_events',
  'recommendation_sessions',
  'waitlist_entries',
];

// Tables that must be preserved
const PRESERVED_TABLES = [
  'nodes',
  'compute_configs',
  'organizations',
  'universities',
  'departments',
  'roles',
  'permissions',
  'role_permissions',
  'credit_packages',
  'subscription_plans',
  'system_settings',
  'feature_flags',
  'base_images',
  'node_base_images',
  'notification_templates',
  'achievements',
  'user_groups',
  'compute_config_access',
  'org_contracts',
  'org_resource_quotas',
  'university_idp_configs',
  'announcements',
];

async function getTableCounts(tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT COUNT(*)::text as count FROM "${table}"`,
      );
      counts[table] = parseInt(result[0].count, 10);
    } catch {
      counts[table] = -1;
    }
  }
  return counts;
}

async function askConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Type "yes" to permanently delete all user data: ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}') as exists`,
  );
  return result[0].exists;
}

async function main() {
  const force = process.argv.includes('--force');

  console.log('='.repeat(70));
  console.log('DATABASE CLEANUP: FRESH START');
  console.log('='.repeat(70));
  console.log('');
  console.log('This will COMPLETELY WIPE all user data from the database.');
  console.log('');
  console.log('TO BE DELETED:');
  console.log('  - All users, auth tokens, login history, profiles, departments, groups');
  console.log('  - All sessions, bookings, session events');
  console.log('  - All storage volumes, files, OS switch history');
  console.log('  - All billing charges, invoices, payments, wallets, transactions');
  console.log('  - All referrals, support tickets, notifications');
  console.log('  - All academic data: courses, labs, enrollments, grades, submissions');
  console.log('  - All mentorship data');
  console.log('  - All community data: discussions, showcases');
  console.log('  - All audit logs');
  console.log('  - All node resource reservations');
  console.log('');
  console.log('PRESERVED (system config):');
  console.log('  - nodes, compute_configs, organizations');
  console.log('  - universities, departments, user_groups');
  console.log('  - roles, permissions, role_permissions');
  console.log('  - credit_packages, subscription_plans');
  console.log('  - system_settings, feature_flags');
  console.log('  - base_images, node_base_images');
  console.log('  - notification_templates, achievements');
  console.log('');

  console.log('Scanning database...');
  const countsBefore = await getTableCounts(USER_DATA_TABLES);

  const tablesWithData = Object.entries(countsBefore)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalRecords = tablesWithData.reduce((sum, [_, count]) => sum + count, 0);

  if (totalRecords === 0) {
    console.log('No user data found. Database is already clean.');

    await prisma.$executeRawUnsafe(`
      UPDATE nodes
      SET allocated_vcpu = 0, allocated_memory_mb = 0, allocated_gpu_vram_mb = 0, current_session_count = 0;
    `);
    console.log('Node resource counters reset to 0.');
    return;
  }

  console.log(`Found ${totalRecords} total records to delete across ${tablesWithData.length} tables.`);
  console.log('');
  console.log('Tables with data:');
  for (const [table, count] of tablesWithData) {
    console.log(`  ${table}: ${count}`);
  }
  console.log('');

  if (!force) {
    const confirmed = await askConfirmation();
    if (!confirmed) {
      console.log('Aborted. No changes were made.');
      return;
    }
    console.log('');
  }

  console.log('Executing cleanup in transaction...');

  const hasCourseworkContent = await tableExists('coursework_content');

  await prisma.$transaction(async (tx) => {
    if (hasCourseworkContent) {
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE coursework_content, users RESTART IDENTITY CASCADE;`,
      );
    } else {
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE users RESTART IDENTITY CASCADE;`,
      );
    }

    await tx.$executeRawUnsafe(`
      UPDATE nodes
      SET allocated_vcpu = 0,
          allocated_memory_mb = 0,
          allocated_gpu_vram_mb = 0,
          current_session_count = 0;
    `);
  });

  console.log('');
  console.log('Cleanup executed. Verifying...');
  console.log('');

  const countsAfter = await getTableCounts(USER_DATA_TABLES);
  const preservedCounts = await getTableCounts(PRESERVED_TABLES);

  let allEmpty = true;
  const remainingTables: string[] = [];

  for (const table of USER_DATA_TABLES) {
    const count = countsAfter[table];
    if (count !== undefined && count > 0) {
      allEmpty = false;
      remainingTables.push(`${table}: ${count}`);
    }
  }

  console.log('='.repeat(70));
  console.log('DELETION SUMMARY');
  console.log('='.repeat(70));
  for (const table of USER_DATA_TABLES) {
    const before = countsBefore[table] || 0;
    const after = countsAfter[table] || 0;
    if (before > 0 || after > 0) {
      const deleted = before - after;
      console.log(`  ${table}: ${deleted} deleted (${after} remaining)`);
    }
  }
  console.log('');

  console.log('PRESERVED TABLES (verification):');
  for (const [table, count] of Object.entries(preservedCounts).sort((a, b) => b[1] - a[1])) {
    if (count >= 0) {
      console.log(`  ${table}: ${count} records`);
    }
  }
  console.log('');

  if (!allEmpty) {
    console.log('WARNING: The following tables still contain data:');
    for (const entry of remainingTables) {
      console.log(`  - ${entry}`);
    }
    console.log('');
    throw new Error('Cleanup verification failed — some user data tables were not fully emptied.');
  }

  console.log('All user data successfully deleted. Database is clean for fresh start!');
}

async function run() {
  try {
    await main();
  } catch (e) {
    console.error('\nFatal error during cleanup:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
