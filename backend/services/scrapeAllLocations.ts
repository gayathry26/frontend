import fs from 'fs';
import path from 'path';

// Pre-load environment variables from .env.local
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

import { runGoogleMapsSearch } from './mapsScrapeService';
import { CURATED_IT_COMPANIES, DiscoveredCompany } from './companyDiscoveryService';
import { query, isPostgresConfigured } from '../config/postgres';

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
  'SaaS Product Company',
  'Web Development Agency',
  'AI Startup',
  'Cloud Consulting Company'
];

// Noise categories from Google Maps to discard
const IGNORED_CATEGORIES = [
  'repair',
  'computer repair',
  'used computer store',
  'computer store',
  'electronics store',
  'coaching',
  'tuition',
  'training institute',
  'vocational school'
];

// Helper: Infer company type accurately
function inferCompanyType(name: string, category: string, query: string): DiscoveredCompany['type'] {
  const text = `${name} ${category} ${query}`.toLowerCase();
  if (text.includes('saas') || text.includes('product') || text.includes('platform')) return 'SaaS';
  if (text.includes('startup') || text.includes('ai') || text.includes('labs')) return 'Startup';
  if (text.includes('fintech') || text.includes('pay') || text.includes('bank')) return 'FinTech';
  if (text.includes('consult') || text.includes('service') || text.includes('agency') || text.includes('solutions')) return 'Service';
  return 'Product';
}

// Helper: Infer technologies based on query and name
function inferTechnologies(name: string, query: string): string[] {
  const text = `${name} ${query}`.toLowerCase();
  const stack = new Set<string>(['Web', 'Software']);

  if (text.includes('ai') || text.includes('ml') || text.includes('data')) {
    stack.add('Python');
    stack.add('Machine Learning');
  }
  if (text.includes('cloud') || text.includes('consulting')) {
    stack.add('AWS');
    stack.add('Cloud Infra');
  }
  if (text.includes('web') || text.includes('agency')) {
    stack.add('React');
    stack.add('Node.js');
  }
  if (text.includes('saas')) {
    stack.add('Cloud');
    stack.add('PostgreSQL');
  }

  return Array.from(stack);
}

// Helper: Infer relevant roles
function inferRelatedRoles(type: string, query: string): string[] {
  const q = query.toLowerCase();
  const roles = new Set<string>(['software-engineer', 'frontend-developer', 'backend-developer']);

  if (q.includes('ai')) {
    roles.add('ai-engineer');
    roles.add('data-scientist');
  }
  if (q.includes('cloud')) {
    roles.add('cloud-architect');
    roles.add('devops-engineer');
  }
  if (type === 'Product' || type === 'SaaS') {
    roles.add('product-manager');
    roles.add('ui-ux-designer');
  }

  return Array.from(roles);
}

async function run() {
  if (isPostgresConfigured()) {
    console.log('✓ PostgreSQL configured. Saving records live to database.');
  } else {
    console.warn('⚠️ PostgreSQL is not configured. Falling back to src/data/companies.json.');
  }

  // Load existing file backup if present to avoid overwriting previously scraped companies
  let existingCompanies: DiscoveredCompany[] = [...CURATED_IT_COMPANIES];
  const outDir = path.join(process.cwd(), 'src', 'data');
  const outPath = path.join(outDir, 'companies.json');

  if (fs.existsSync(outPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      if (Array.isArray(existingData) && existingData.length > 0) {
        existingCompanies = existingData;
      }
    } catch {}
  }

  const allDiscovered: DiscoveredCompany[] = [...existingCompanies];
  const seenIds = new Set(allDiscovered.map(c => c.id));

  // Seed initial curated if DB is available
  if (isPostgresConfigured()) {
    for (const curated of CURATED_IT_COMPANIES) {
      await query(`
        INSERT INTO companies (
          id, name, slug, logo, website, description, industry,
          company_type, size, location, locations, address, coordinates,
          hiring, startup, related_roles, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
      `, [
        curated.id,
        curated.name,
        curated.id,
        null,
        curated.website || null,
        curated.description,
        'Technology',
        curated.type,
        '50-500',
        curated.address.city,
        JSON.stringify([curated.address.city]),
        JSON.stringify(curated.address),
        JSON.stringify(curated.coordinates),
        curated.hiring,
        curated.startup,
        JSON.stringify(curated.relatedRoles)
      ]).catch(() => null);
    }
  }

  for (const location of TARGET_LOCATIONS) {
    console.log(`\n========================================`);
    console.log(`Starting Scraping for: ${location}`);
    console.log(`========================================\n`);

    for (const searchQuery of SEARCH_QUERIES) {
      console.log(`[Running Scraper] Query: "${searchQuery}" in "${location}"...`);

      try {
        const scrapeResult = await runGoogleMapsSearch({
          query: searchQuery,
          location,
          max_results: 50,
          timeout_ms: 60000 // 60s to allow scrolling for 50 records
        });

        console.log(`Found ${scrapeResult.count} places from Google Maps.`);

        for (const place of scrapeResult.results) {
          if (!place.name) continue;

          // Filter out repair centers, retail stores, and computer hardware shops
          const cat = (place.category || '').toLowerCase();
          if (IGNORED_CATEGORIES.some(ic => cat.includes(ic))) {
            continue;
          }

          const cleanId = place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${location.toLowerCase()}`;
          if (seenIds.has(cleanId)) continue;

          const inferredType = inferCompanyType(place.name, place.category || '', searchQuery);
          const inferredTech = inferTechnologies(place.name, searchQuery);
          const inferredRoles = inferRelatedRoles(inferredType, searchQuery);

          const formattedCompany: DiscoveredCompany = {
            id: cleanId,
            name: place.name,
            type: inferredType,
            categories: [place.category || 'Information Technology'],
            industries: ['Software', 'IT Services'],
            technologies: inferredTech,
            description: place.snippet || `${place.name} is an IT enterprise located in ${location}.`,
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
            startup: inferredType === 'Startup',
            relatedRoles: inferredRoles
          };

          if (isPostgresConfigured()) {
            await query(`
              INSERT INTO companies (
                id, name, slug, logo, website, description, industry,
                company_type, size, location, locations, address, coordinates,
                hiring, startup, related_roles, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                industry = EXCLUDED.industry,
                company_type = EXCLUDED.company_type,
                size = EXCLUDED.size,
                location = EXCLUDED.location,
                locations = EXCLUDED.locations,
                address = EXCLUDED.address,
                coordinates = EXCLUDED.coordinates,
                hiring = EXCLUDED.hiring,
                startup = EXCLUDED.startup,
                related_roles = EXCLUDED.related_roles,
                updated_at = NOW();
            `, [
              formattedCompany.id,
              formattedCompany.name,
              formattedCompany.id,
              null,
              formattedCompany.website || null,
              formattedCompany.description,
              formattedCompany.industries[0] || 'Software',
              formattedCompany.type,
              '50-500',
              formattedCompany.address.city,
              JSON.stringify([formattedCompany.address.city]),
              JSON.stringify(formattedCompany.address),
              JSON.stringify(formattedCompany.coordinates),
              formattedCompany.hiring,
              formattedCompany.startup,
              JSON.stringify(formattedCompany.relatedRoles)
            ]).catch(() => null);
          }

          allDiscovered.push(formattedCompany);
          seenIds.add(cleanId);
          console.log(`✓ Added: ${formattedCompany.name}`);
        }
      } catch (err: any) {
        console.error(`Error scraping "${searchQuery}" in ${location}:`, err.message);
      }
    }
  }

  // File write
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(allDiscovered, null, 2), 'utf-8');

  console.log(`\n========================================`);
  console.log(`Done! Saved ${allDiscovered.length} total companies to ${outPath}`);
  console.log(`========================================\n`);

  process.exit(0);
}

run().catch(console.error);