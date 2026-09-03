import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveredCompanies, getHubStats, DiscoveredCompany } from '../../../../backend/services/companyDiscoveryService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60;

function mapMapsToDiscoveredCompany(p: any, fallbackCity: string): DiscoveredCompany {
  const addr: string = p.address || `${fallbackCity}, India`;
  const cityLower = addr.toLowerCase();
  let city = fallbackCity || 'Bengaluru';
  if (cityLower.includes('coimbatore')) city = 'Coimbatore';
  else if (cityLower.includes('bengaluru') || cityLower.includes('bangalore')) city = 'Bangalore';
  else if (cityLower.includes('chennai')) city = 'Chennai';
  else if (cityLower.includes('hyderabad')) city = 'Hyderabad';
  else if (cityLower.includes('mumbai')) city = 'Mumbai';
  else if (cityLower.includes('pune')) city = 'Pune';
  else if (cityLower.includes('delhi')) city = 'Delhi';
  else if (cityLower.includes('noida')) city = 'Noida';

  const catRaw = (p.category || '').toLowerCase();
  let type: DiscoveredCompany['type'] = 'Enterprise';
  if (catRaw.includes('startup')) type = 'Startup';
  else if (catRaw.includes('saas') || catRaw.includes('product')) type = 'Product';
  else if (catRaw.includes('fintech')) type = 'FinTech';
  else if (catRaw.includes('service')) type = 'Service';

  return {
    id: p.place_id || `live-${(p.name||'place').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
    name: p.name || 'Unknown',
    type,
    categories: p.category ? [p.category] : ['Live Maps Result'],
    industries: p.category ? [p.category] : ['IT'],
    technologies: [],
    description: [p.category, p.rating ? `${p.rating} rating` : null].filter(Boolean).join(' · ') || `Live result from Google Maps: ${p.name}`,
    website: p.website || undefined,
    phone: p.phone || undefined,
    address: {
      full: addr,
      city,
      state: p.state || city,
      country: 'India',
    },
    coordinates: p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : undefined,
    // Maps does not expose whether a business is actively hiring.
    hiring: false,
    startup: type === 'Startup',
    relatedRoles: [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action') || 'list';

    if (action === 'stats') {
      const city = searchParams.get('city') || 'India';
      const stats = await getHubStats(city);
      return NextResponse.json(stats);
    }

    const live = searchParams.get('live') === 'true' || searchParams.get('source') === 'live' || searchParams.get('useLive') === 'true';

    const city = searchParams.get('city') || searchParams.get('location') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || searchParams.get('what_to_scrape') || searchParams.get('query') || '';
    const hiringStr = searchParams.get('hiring');
    const startupStr = searchParams.get('startup');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const hiring = hiringStr === 'true' ? true : hiringStr === 'false' ? false : undefined;
    const startup = startupStr === 'true' ? true : startupStr === 'false' ? false : undefined;

    // === LIVE MERGED MODE ===
    if (live) {
      const whatToScrape = search || category || type || 'IT Companies';
      const locationReq = city || 'India';
      const scrapeLimit = Math.min(50, Math.max(5, limit));
      try {
        const pyUrl = process.env.PYTHON_SCRAPER_URL || process.env.NEXT_PUBLIC_PYTHON_SCRAPER_URL;
        if (pyUrl) {
          try {
            const ctrl = new AbortController(); const t=setTimeout(()=>ctrl.abort(), 45000);
            const r = await fetch(`${pyUrl.replace(/\/$/,'')}/api/maps-scrape`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ what_to_scrape: whatToScrape, location: locationReq, result_limit: scrapeLimit }), signal: ctrl.signal });
            clearTimeout(t);
            if (r.ok) {
              const j = await r.json();
              const rawResults: any[] = j?.data?.results || j?.results || [];
              if (rawResults.length) {
                const companies = rawResults.map((p:any)=> mapMapsToDiscoveredCompany(p, locationReq));
                const total = companies.length;
                return NextResponse.json({ success: true, total, page: 1, limit: scrapeLimit, totalPages: 1, companies, source: 'live-maps', via: 'python-playwright', generated_at: j?.data?.generated_at });
              }
            }
          } catch {}
        }
        const { runGoogleMapsSearch } = await import('@/backend/services/mapsScrapeService');
        const data = await runGoogleMapsSearch({ query: whatToScrape, location: locationReq, max_results: scrapeLimit });
        const companies = data.results.map((p: any) => mapMapsToDiscoveredCompany(p, locationReq));
        const filteredLive = companies.filter(c=>{
          if (type && type.toLowerCase()!=='all' && c.type.toLowerCase()!==type.toLowerCase()) return false;
          if (hiring !== undefined && c.hiring !== hiring) return false;
          if (startup !== undefined && c.startup !== startup) return false;
          // `search` is the Maps discovery query (for example, "software companies"),
          // not a literal company-name filter. Applying it here incorrectly removes
          // valid results such as "Techvolt Software" from the live response.
          return true;
        });
        return NextResponse.json({ success: true, total: filteredLive.length, page: 1, limit: scrapeLimit, totalPages: 1, companies: filteredLive, source: 'live-maps', via: 'node-playwright', generated_at: data.generated_at });
      } catch (liveErr:any) {
        console.error('[companies live] failed, fallback to DB:', liveErr.message);
      }
    }

    const result = await getDiscoveredCompanies({
      city,
      type,
      category,
      hiring,
      startup,
      search,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/companies:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch companies' }, { status: 500 });
  }
}
