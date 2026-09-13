import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { query, pool } from '../config/postgres';

const BLOCKED_PATTERNS = [
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  'devfolio.co/hackathons',
  'devfolio.co/explore',
  'unstop.com/hackathons',
  'unstop.com/competitions',
  'unstop.com/opportunities',
  'devpost.com/hackathons',
  'hackerearth.com/challenges'
];

async function cleanInvalidUrls() {
  console.log(`🔌 Connecting to PostgreSQL database...`);

  try {
    const { rows: allEvents } = await query(`SELECT id, title, "registrationUrl", "registrationAvailable", source FROM events;`);
    console.log(`🔍 Scanning ${allEvents.length} event documents for invalid/placeholder URLs...`);

    let scrubbedCount = 0;

    for (const evt of allEvents) {
      let isBadReg = false;
      let isBadSource = false;

      const regUrl = evt.registrationUrl || '';
      if (BLOCKED_PATTERNS.some(pat => regUrl.toLowerCase().includes(pat))) {
        isBadReg = true;
      }

      const sourceObj = typeof evt.source === 'object' && evt.source !== null ? evt.source : {};
      const sourceUrl = sourceObj.sourceUrl || '';
      if (BLOCKED_PATTERNS.some(pat => sourceUrl.toLowerCase().includes(pat))) {
        isBadSource = true;
      }

      if (isBadReg || isBadSource) {
        const newSource = { ...sourceObj };
        if (isBadSource) newSource.sourceUrl = null;

        await query(
          `UPDATE events
           SET "registrationUrl" = $1,
               "registrationAvailable" = $2,
               source = $3,
               "updatedAt" = NOW()
           WHERE id = $4`,
          [
            isBadReg ? null : evt.registrationUrl,
            isBadReg ? false : (evt.registrationAvailable ?? true),
            JSON.stringify(newSource),
            evt.id
          ]
        );
        scrubbedCount++;
        console.log(`  ✓ Scrubbed invalid URL from Event: ${evt.title}`);
      }
    }

    console.log(`\n🎉 Scrub Operation Completed!`);
    console.log(`  - Total events scanned: ${allEvents.length}`);
    console.log(`  - Invalid URL documents scrubbed: ${scrubbedCount}`);

  } catch (error: any) {
    console.error('❌ Scrub operation failed:', error);
  } finally {
    await pool.end();
  }
}

cleanInvalidUrls();

