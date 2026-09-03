/**
 * Cleanup Script: Fix Generic Platform URLs in MongoDB Atlas
 *
 * Finds all events in the `events` collection whose `registrationUrl` is a
 * generic platform page (e.g. https://devfolio.co/hackathons, https://unstop.com/)
 * and marks them as registrationAvailable: false with status PENDING_REVIEW.
 *
 * This script does NOT invent replacement URLs — it only removes invalid ones.
 * An admin or re-sync must supply the real event-specific URL.
 *
 * Usage:
 *   npx tsx --env-file=.env.local backend/scripts/fixGenericUrls.ts
 */

import path from 'path';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config({ path: path.resolve(process.cwd(), '.env.local'), override: false });
config({ path: path.resolve(process.cwd(), '.env'), override: false });

import { isPlaceholderUrl } from '../utils/validateEventUrl';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'TECHROLES';

const KNOWN_GENERIC_URLS = [
  'https://devfolio.co',
  'https://devfolio.co/',
  'https://devfolio.co/hackathons',
  'https://devfolio.co/hackathons/',
  'https://devfolio.co/explore',
  'http://devfolio.co',
  'http://devfolio.co/hackathons',
  'https://unstop.com',
  'https://unstop.com/',
  'https://unstop.com/hackathons',
  'https://unstop.com/competitions',
  'https://unstop.com/opportunities',
  'https://devpost.com',
  'https://devpost.com/',
  'https://devpost.com/hackathons',
  'https://www.hackerearth.com',
  'https://www.hackerearth.com/',
  'https://www.hackerearth.com/challenges',
  'https://mlh.io',
  'https://mlh.io/',
  'https://mlh.io/events',
  'https://hack2skill.com',
  'https://hack2skill.com/',
  'https://hack2skill.com/events'
];

async function fixGenericUrls() {
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Fix Generic Platform URLs — MongoDB Atlas Cleanup');
  console.log('='.repeat(60));

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('events');

    let fixed = 0;
    let alreadyClean = 0;

    const allEvents = await collection.find({
      registrationUrl: { $nin: [null, ''] }
    }).toArray();

    console.log(`Scanning ${allEvents.length} events with registrationUrl...\n`);

    for (const event of allEvents) {
      const url = event.registrationUrl as string | null;
      if (!url) continue;

      const isGeneric = KNOWN_GENERIC_URLS.includes(url.trim()) || isPlaceholderUrl(url);

      if (isGeneric) {
        await collection.updateOne(
          { _id: event._id },
          {
            $set: {
              registrationUrl: null,
              registrationAvailable: false,
              status: event.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING_REVIEW',
              updatedAt: new Date().toISOString(),
              _urlFixNote: `Generic URL removed: ${url}`
            }
          }
        );

        console.log(`  ✅ Fixed: "${event.title}"`);
        console.log(`     Was: ${url}`);
        console.log(`     Now: null (registrationAvailable: false, status: PENDING_REVIEW)\n`);
        fixed++;
      } else {
        alreadyClean++;
      }
    }

    console.log('='.repeat(60));
    console.log(`  SUMMARY`);
    console.log('='.repeat(60));
    console.log(`  Total events checked:  ${allEvents.length}`);
    console.log(`  Fixed (generic URL):   ${fixed}`);
    console.log(`  Already clean:         ${alreadyClean}`);
    console.log('='.repeat(60) + '\n');
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await client.close();
  }
}

fixGenericUrls();
