import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const uri = process.env.MONGODB_URI?.trim();
const dbName = (process.env.MONGODB_DB_NAME || 'TECHROLES').trim();

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
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB Atlas database '${dbName}'...`);
  const client = new MongoClient(uri, { tlsInsecure: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('events');

    const allEvents = await collection.find({}).toArray();
    console.log(`🔍 Scanning ${allEvents.length} event documents for invalid/placeholder URLs...`);

    let scrubbedCount = 0;

    for (const evt of allEvents) {
      let isBadReg = false;
      let isBadSource = false;

      const regUrl = evt.registrationUrl || '';
      if (BLOCKED_PATTERNS.some(pat => regUrl.toLowerCase().includes(pat))) {
        isBadReg = true;
      }

      const sourceUrl = evt.source?.sourceUrl || '';
      if (BLOCKED_PATTERNS.some(pat => sourceUrl.toLowerCase().includes(pat))) {
        isBadSource = true;
      }

      if (isBadReg || isBadSource) {
        await collection.updateOne(
          { _id: evt._id },
          {
            $set: {
              registrationUrl: isBadReg ? null : evt.registrationUrl,
              registrationAvailable: isBadReg ? false : (evt.registrationAvailable ?? true),
              'source.sourceUrl': isBadSource ? null : evt.source?.sourceUrl,
              updatedAt: new Date().toISOString()
            }
          }
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
    await client.close();
  }
}

cleanInvalidUrls();
