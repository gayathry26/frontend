import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveredCompanies, getHubStats } from '../../../../backend/services/companyDiscoveryService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action') || 'list';

    if (action === 'stats') {
      const city = searchParams.get('city') || 'India';
      const stats = await getHubStats(city);
      return NextResponse.json(stats);
    }

    const city = searchParams.get('city') || searchParams.get('location') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const hiringStr = searchParams.get('hiring');
    const startupStr = searchParams.get('startup');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const hiring = hiringStr === 'true' ? true : hiringStr === 'false' ? false : undefined;
    const startup = startupStr === 'true' ? true : startupStr === 'false' ? false : undefined;

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
