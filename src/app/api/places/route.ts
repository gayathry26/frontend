import { NextRequest, NextResponse } from 'next/server';
import { getAllCompaniesFromDb, CompanyItem } from '../../../../backend/services/companyService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface NormalizedPlace {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  category: 'Startup' | 'Product' | 'Service' | 'Enterprise';
  city: string;
  types: string[];
  rating?: number | null;
  reviews?: string | number | null;
  phone?: string | null;
  businessStatus?: string;
  websiteUri?: string | null;
  googleMapsUri?: string | null;
  technologies?: string[];
  industries?: string[];
  description?: string;
  source?: 'database';
}

function extractCity(address: string, defaultCity: string = 'Bengaluru'): string {
  const addrLower = (address || '').toLowerCase();
  if (addrLower.includes('coimbatore')) return 'coimbatore';
  if (addrLower.includes('bengaluru') || addrLower.includes('bangalore')) return 'bengaluru';
  if (addrLower.includes('chennai')) return 'chennai';
  if (addrLower.includes('hyderabad')) return 'hyderabad';
  if (addrLower.includes('mumbai')) return 'mumbai';
  if (addrLower.includes('delhi')) return 'delhi';
  if (addrLower.includes('pune')) return 'pune';
  if (addrLower.includes('noida')) return 'noida';
  if (addrLower.includes('kolkata')) return 'kolkata';
  
  const defLower = defaultCity.toLowerCase();
  if (defLower.includes('coimbatore')) return 'coimbatore';
  if (defLower.includes('bengaluru') || defLower.includes('bangalore')) return 'bengaluru';
  if (defLower.includes('chennai')) return 'chennai';
  if (defLower.includes('hyderabad')) return 'hyderabad';
  if (defLower.includes('mumbai')) return 'mumbai';
  if (defLower.includes('delhi')) return 'delhi';
  if (defLower.includes('pune')) return 'pune';
  if (defLower.includes('noida')) return 'noida';
  if (defLower.includes('kolkata')) return 'kolkata';
  
  return defaultCity ? defaultCity.toLowerCase() : 'bengaluru';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = (body.query || '').trim();
    const locationReq = (body.location || body.city || 'Bengaluru').trim();
    const searchTopic = body.what_to_scrape || (rawQuery.replace(/in\s+.*$/i, '').trim() || 'IT Companies');

    // Fetch IT Companies directly from Database
    const dbCompanies: CompanyItem[] = await getAllCompaniesFromDb();
    
    // Filter DB companies by location or search topic requested
    const locLower = locationReq.toLowerCase();
    const topicLower = searchTopic.toLowerCase();

    const filteredDb = dbCompanies.filter(c => {
      const matchLoc = !locationReq || locationReq === 'all' || 
        c.locations?.some(l => l.toLowerCase().includes(locLower) || locLower.includes(l.toLowerCase()));
      
      const matchTopic = !searchTopic || searchTopic === 'IT Companies' ||
        c.name.toLowerCase().includes(topicLower) ||
        c.type.toLowerCase().includes(topicLower) ||
        c.industries?.some(i => i.toLowerCase().includes(topicLower)) ||
        c.domains?.some(d => d.toLowerCase().includes(topicLower)) ||
        c.technologies?.some(t => t.toLowerCase().includes(topicLower));

      return matchLoc && matchTopic;
    });

    const targetList = filteredDb.length > 0 ? filteredDb : dbCompanies;

    // Map companies to NormalizedPlace format
    const places: NormalizedPlace[] = targetList.map((c) => {
      const address = (c.locations && c.locations.length > 0) ? `${c.locations.join(', ')}, India` : 'India';
      const category = (c.type.toUpperCase().includes('STARTUP') ? 'Startup' :
                        c.type.toUpperCase().includes('PRODUCT') || c.type.toUpperCase().includes('SAAS') ? 'Product' :
                        c.type.toUpperCase().includes('SERVICE') ? 'Service' : 'Enterprise') as 'Startup' | 'Product' | 'Service' | 'Enterprise';
      const city = extractCity(address, c.locations?.[0] || locationReq || 'bengaluru');

      return {
        id: c.id,
        displayName: { text: c.name },
        formattedAddress: address,
        category,
        city,
        types: c.domains || ['software_company', 'establishment'],
        rating: 4.8,
        websiteUri: c.website || null,
        googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name + ' ' + address)}`,
        technologies: c.technologies,
        industries: c.industries,
        description: c.description,
        source: 'database'
      };
    });

    return NextResponse.json({ success: true, places, source: 'database', location: locationReq });
  } catch (error: any) {
    console.error('Error in places API route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch places' }, { status: 500 });
  }
}
