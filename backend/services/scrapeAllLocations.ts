import fs from 'fs';
import path from 'path';

// Force read .env.local for MONGODB_URI when run from standalone CLI
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
}
if (!process.env.MONGODB_DB) {
  process.env.MONGODB_DB = 'it_career_hub';
}

import { runGoogleMapsSearch } from './mapsScrapeService';
import { CURATED_IT_COMPANIES, DiscoveredCompany } from './companyDiscoveryService';
import { getDb } from '../config/mongodb';

const TARGET_LOCATIONS = [
  'Coimbatore',
  'Chennai',
  'Bangalore',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'Gurgaon',
  'Noida'
];

const SEARCH_QUERIES = [
  'IT Software Company',
  'SaaS Product Company'
];

async function run() {
  const db = await getDb();
  const collection = db.collection<DiscoveredCompany>('companies');

  const allDiscovered: DiscoveredCompany[] = [...CURATED_IT_COMPANIES];
  const seenIds = new Set(allDiscovered.map(c => c.id));

  // Seed curated companies first
  for (const curated of CURATED_IT_COMPANIES) {
    await collection.updateOne(
      { id: curated.id },
      { $set: curated },
      { upsert: true }
    );
  }

  for (const location of TARGET_LOCATIONS) {
    console.log(`\n========================================`);
    console.log(`Starting Scraping for: ${location}`);
    console.log(`========================================\n`);

    for (const query of SEARCH_QUERIES) {
      console.log(`[Running Scraper] Query: "${query}" in "${location}"...`);

      try {
        const scrapeResult = await runGoogleMapsSearch({
          query,
          location,
          max_results: 15,
          timeout_ms: 30000
        });

        console.log(`Found ${scrapeResult.count} places from Google Maps.`);

        for (const place of scrapeResult.results) {
          if (!place.name) continue;

          const cleanId = place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${location.toLowerCase()}`;
          if (seenIds.has(cleanId)) continue;

          const formattedCompany: DiscoveredCompany = {
            id: cleanId,
            name: place.name,
            type: (place.category?.toLowerCase().includes('consult') || place.category?.toLowerCase().includes('service')) 
              ? 'Service' 
              : 'Product',
            categories: [place.category || 'Information Technology'],
            industries: ['Software', 'IT Services'],
            technologies: ['Web', 'Cloud', 'Software'],
            description: place.snippet || `${place.name} is an IT and software enterprise located in ${location}.`,
            website: place.website || undefined,
            phone: place.phone || undefined,
            address: {
              full: place.address || `${location}, India`,
              area: place.plus_code || location,
              city: location,
              state: 'India',
              country: 'India'
            },
            coordinates: {
              lat: place.latitude || 0,
              lng: place.longitude || 0
            },
            hiring: true,
            startup: false,
            relatedRoles: ['software-engineer', 'frontend-developer', 'backend-developer']
          };

          await collection.updateOne(
            { id: formattedCompany.id },
            { $set: formattedCompany },
            { upsert: true }
          );

          allDiscovered.push(formattedCompany);
          seenIds.add(cleanId);
          console.log(`✓ Saved to DB: ${formattedCompany.name}`);
        }
      } catch (err: any) {
        console.error(`Error scraping "${query}" in ${location}:`, err.message);
      }
    }
  }

  const outDir = path.join(process.cwd(), 'src', 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'companies.json');
  fs.writeFileSync(outPath, JSON.stringify(allDiscovered, null, 2), 'utf-8');

  console.log(`\n========================================`);
  console.log(`Done! Scraped companies are saved to DB and ${outPath}`);
  console.log(`========================================\n`);

  process.exit(0);
}

run().catch(console.error);