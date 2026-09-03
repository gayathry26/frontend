import { NextRequest, NextResponse } from 'next/server';
import { getAllCompaniesFromDb, CompanyItem } from '../../../../backend/services/companyService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

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

function mapMapsResultToPlace(p: any, locationReq: string): NormalizedPlace {
  const addr: string = p.address || p.formatted_address || `${p.location || locationReq}, India`;
  const catRaw = (p.category || '').toUpperCase();
  const category = (catRaw.includes('STARTUP') ? 'Startup' :
                    catRaw.includes('PRODUCT') || catRaw.includes('SAAS') ? 'Product' :
                    catRaw.includes('SERVICE') ? 'Service' : 'Enterprise') as NormalizedPlace['category'];
  const city = extractCity(addr, p.city || locationReq || 'bengaluru');
  return {
    id: p.place_id || p.maps_url || `live-${(p.name||'place').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
    displayName: { text: p.name || 'Unknown Place' },
    formattedAddress: addr,
    category,
    city,
    types: p.types || ['establishment'],
    rating: p.rating ? Number(String(p.rating).replace(',','.')) : null,
    reviews: p.reviews || null,
    phone: p.phone || null,
    businessStatus: p.open_status || undefined,
    websiteUri: p.website || p.websiteUri || null,
    googleMapsUri: p.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.name||'')+' '+addr)}`,
    technologies: p.technologies || [],
    industries: p.industries || (p.category ? [p.category] : []),
    description: p.snippet || p.raw_text_excerpt || p.category || undefined,
    source: 'live-maps' as any,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || searchParams.get('what_to_scrape') || '';
  const location = searchParams.get('location') || searchParams.get('city') || 'Bengaluru';
  const live = searchParams.get('live') === 'true' || searchParams.get('source') === 'live';
  const limit = Number(searchParams.get('limit') || '20');
  // delegate to POST logic
  const fakeReq = {
    json: async () => ({ query, location, what_to_scrape: query, live, result_limit: limit })
  } as unknown as NextRequest;
  // minimal shim – reuse POST directly with constructed body
  if (live) {
    try {
      const { runGoogleMapsSearch } = await import('@/backend/services/mapsScrapeService');
      const data = await runGoogleMapsSearch({ query: query || 'IT Companies', location, max_results: limit });
      const places = data.results.map((p: any) => mapMapsResultToPlace(p, location));
      return NextResponse.json({ success: true, places, source: 'live-maps', location, count: places.length, generated_at: data.generated_at });
    } catch (e: any) {
      console.error('[places GET live] fallback to db:', e.message);
    }
  }
  return POST(fakeReq as any);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = (body.query || '').trim();
    const locationReq = (body.location || body.city || 'Bengaluru').trim();
    const searchTopic = body.what_to_scrape || (rawQuery.replace(/in\s+.*$/i, '').trim() || 'IT Companies');
    const wantsLive = body.live === true || body.source === 'live' || body.useLive === true || body.live === 'true';
    const limit = Math.min(100, Math.max(1, Number(body.result_limit || body.limit || 20)));

    // === LIVE MODE: headless Google Maps via Playwright (merged engine) ===
    if (wantsLive) {
      try {
        // Prefer Python sidecar if configured
        const pyUrl = process.env.PYTHON_SCRAPER_URL || process.env.NEXT_PUBLIC_PYTHON_SCRAPER_URL;
        if (pyUrl) {
          try {
            const ctrl = new AbortController(); const t=setTimeout(()=>ctrl.abort(), 45000);
            const r = await fetch(`${pyUrl.replace(/\/$/,'')}/api/maps-scrape`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ what_to_scrape: searchTopic, location: locationReq, result_limit: limit }), signal: ctrl.signal });
            clearTimeout(t);
            if (r.ok) {
              const j = await r.json();
              const rawResults: any[] = j?.data?.results || j?.results || [];
              if (rawResults.length) {
                const places = rawResults.map((p: any) => mapMapsResultToPlace(p, locationReq));
                return NextResponse.json({ success: true, places, source: 'live-maps', location: locationReq, count: places.length, via: 'python-playwright' });
              }
            }
          } catch {}
        }
        const { runGoogleMapsSearch } = await import('@/backend/services/mapsScrapeService');
        const data = await runGoogleMapsSearch({ query: searchTopic, location: locationReq, max_results: limit });
        const places = data.results.map((p: any) => mapMapsResultToPlace(p, locationReq));
        return NextResponse.json({ success: true, places, source: 'live-maps', location: locationReq, count: places.length, generated_at: data.generated_at, via: 'node-playwright' });
      } catch (liveErr: any) {
        console.error('[places POST live] failed, falling back to DB:', liveErr.message);
        // fall through to DB fallback
      }
    }

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
