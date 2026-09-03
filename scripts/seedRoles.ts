import { MongoClient } from 'mongodb';
import { itRoles } from '../src/data/itRoles';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'it_career_explorer';

async function seed() {
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment or .env.local');
    console.log('ℹ️ Usage: Set MONGODB_URI in .env.local and run `npx tsx scripts/seedRoles.ts`');
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB Atlas: ${uri.split('@')[1] || 'local'}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const rolesCollection = db.collection('roles');

    console.log('📦 Creating MongoDB database indexes...');
    await rolesCollection.createIndex({ id: 1 }, { unique: true });
    await rolesCollection.createIndex({ title: 1 });
    await rolesCollection.createIndex({ category: 1 });
    await rolesCollection.createIndex({ tags: 1 });
    await rolesCollection.createIndex({ status: 1 });
    await rolesCollection.createIndex({ updatedAt: -1 });

    console.log(`🚀 Seeding ${itRoles.length} IT career roles into collection '${dbName}.roles'...`);

    const now = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    for (const role of itRoles) {
      try {
        const docToSave = {
          ...role,
          status: 'approved',
          version: 1,
          verified: true,
          updatedAt: now,
          createdAt: now
        };

        await rolesCollection.updateOne(
          { id: role.id },
          { $set: docToSave },
          { upsert: true }
        );
        successCount++;
        console.log(`  ✓ Migrated: ${role.title} (${role.id})`);
      } catch (err: any) {
        failCount++;
        console.error(`  ✕ Failed to migrate ${role.id}:`, err.message);
      }
    }

    console.log(`\n🎉 Seed Completed!`);
    console.log(`  - Total roles processed: ${itRoles.length}`);
    console.log(`  - Successfully seeded: ${successCount}`);
    console.log(`  - Failures: ${failCount}`);

  } catch (error: any) {
    console.error('❌ Seed operation failed:', error);
  } finally {
    await client.close();
  }
}

seed();
