import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { itRoles } from '../../src/data/itRoles';
import { pool } from '../config/postgres';
import { upsertRoleInDb } from '../services/roleService';

async function seed() {
  console.log(`🔌 Connecting to PostgreSQL database...`);

  try {
    console.log(`🚀 Seeding ${itRoles.length} IT career roles into PostgreSQL 'roles' table...`);

    let successCount = 0;
    let failCount = 0;

    for (const role of itRoles) {
      try {
        await upsertRoleInDb(role, 'seed-script');
        successCount++;
        console.log(`  ✓ Seeded: ${role.title} (${role.id})`);
      } catch (err: any) {
        failCount++;
        console.error(`  ✕ Failed to seed ${role.id}:`, err.message);
      }
    }

    console.log(`\n🎉 Seed Completed!`);
    console.log(`  - Total roles processed: ${itRoles.length}`);
    console.log(`  - Successfully seeded: ${successCount}`);
    console.log(`  - Failures: ${failCount}`);

  } catch (error: any) {
    console.error('❌ Seed operation failed:', error);
  } finally {
    await pool.end();
  }
}

seed();

