/**
 * Cleanup Script: Fix Generic Platform URLs in PostgreSQL
 *
 * Finds all events in the `events` table whose `registrationUrl` is a
 * generic platform page (e.g. https://devfolio.co/hackathons, https://unstop.com/)
 * and marks them as registrationAvailable: false with status PENDING_REVIEW.
 *
 * Usage:
 *   npx tsx --env-file=.env.local backend/scripts/fixGenericUrls.ts
 */

import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env.local'), override: false });
config({ path: path.resolve(process.cwd(), '.env'), override: false });

import { query, pool } from '../config/postgres';
import { isPlaceholderUrl } from '../utils/validateEventUrl';

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
  console.log('\n' + '='.repeat(60));
  console.log('  Fix Generic Platform URLs — PostgreSQL Cleanup');
  console.log('='.repeat(60));

  try {
    let fixed = 0;
    let alreadyClean = 0;

    const { rows: allEvents } = await query(
      `SELECT id, title, "registrationUrl", status FROM events WHERE "registrationUrl" IS NOT NULL AND "registrationUrl" != ''`
    );

    console.log(`Scanning ${allEvents.length} events with registrationUrl...\n`);

    for (const event of allEvents) {
      const url = event.registrationUrl as string | null;
      if (!url) continue;

      const isGeneric = KNOWN_GENERIC_URLS.includes(url.trim()) || isPlaceholderUrl(url);

      if (isGeneric) {
        const newStatus = event.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING_REVIEW';
        await query(
          `UPDATE events
           SET "registrationUrl" = NULL,
               "registrationAvailable" = false,
               status = $1,
               "updatedAt" = NOW()
           WHERE id = $2`,
          [newStatus, event.id]
        );

        console.log(`  ✅ Fixed: "${event.title}"`);
        console.log(`     Was: ${url}`);
        console.log(`     Now: null (registrationAvailable: false, status: ${newStatus})\n`);
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
    await pool.end();
  }
}

fixGenericUrls();

