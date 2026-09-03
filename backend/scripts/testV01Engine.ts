import { getDiscoveredCompanies, getHubStats } from '../services/companyDiscoveryService';

async function test() {
  console.log('=== Testing v0.1 IT Company Discovery Engine ===');

  const allRes = await getDiscoveredCompanies({ limit: 100 });
  console.log(`Total Curated IT Companies across India: ${allRes.total}`);

  const cities = ['Chennai', 'Bangalore', 'Coimbatore', 'Hyderabad', 'Mumbai', 'Pune', 'Gurgaon', 'Noida'];

  for (const city of cities) {
    const cRes = await getDiscoveredCompanies({ city });
    const cStats = await getHubStats(city);
    console.log(`\nHub: ${city.toUpperCase()}`);
    console.log(`  - Total Companies: ${cStats.totalCompanies}`);
    console.log(`  - Actively Hiring: ${cStats.hiringCount}`);
    console.log(`  - Product & SaaS: ${cStats.productCount}`);
    cRes.companies.forEach((c, i) => {
      console.log(`    ${i + 1}. ${c.name} [${c.type}] - ${c.address.area}`);
    });
  }

  process.exit(0);
}

test();
