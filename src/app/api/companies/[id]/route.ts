import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../backend/config/mongodb';
import { CURATED_IT_COMPANIES, DiscoveredCompany } from '../../../../../backend/services/companyDiscoveryService';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const city = searchParams.get('city');
  const type = searchParams.get('type');
  const search = searchParams.get('search')?.trim();
  const hiring = searchParams.get('hiring');
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  try {
    const db = await getDb();
    const col = db.collection<DiscoveredCompany>('companies');

    // 1. Stats calculation endpoint
    if (action === 'stats') {
      const cityFilter: Record<string, any> = {};
      if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'india') {
        cityFilter['address.city'] = new RegExp(`^${city}$`, 'i');
      }

      const totalCompanies = await col.countDocuments(cityFilter);
      const hiringCount = await col.countDocuments({ ...cityFilter, hiring: true });
      const startupsCount = await col.countDocuments({ ...cityFilter, startup: true });
      const productCount = await col.countDocuments({
        ...cityFilter,
        type: { $in: ['Product', 'SaaS', 'FinTech'] }
      });
      const serviceCount = await col.countDocuments({
        ...cityFilter,
        type: { $in: ['Service', 'Enterprise'] }
      });

      return NextResponse.json({
        success: true,
        city: city || 'India',
        totalCompanies,
        hiringCount,
        startupsCount,
        productCount,
        serviceCount
      });
    }

    // 2. Query filters
    const filter: Record<string, any> = {};

    if (city && city.toLowerCase() !== 'all') {
      filter['address.city'] = new RegExp(`^${city}$`, 'i');
    }

    if (type && type.toLowerCase() !== 'all') {
      filter.type = new RegExp(`^${type}$`, 'i');
    }

    if (hiring === 'true') {
      filter.hiring = true;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { 'address.full': searchRegex },
        { 'address.area': searchRegex },
        { technologies: { $in: [searchRegex] } },
        { categories: { $in: [searchRegex] } }
      ];
    }

    const total = await col.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    let companies = await col
      .find(filter)
      .project({ _id: 0 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Fallback to in-memory list if the MongoDB collection is empty
    if (companies.length === 0 && !search && (!city || city === 'all')) {
      companies = CURATED_IT_COMPANIES as any;
    }

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      companies
    });
  } catch (error: any) {
    console.error('MongoDB query failed, falling back to static list:', error);

    // Fallback in-memory response when MongoDB is unreachable
    if (action === 'stats') {
      let pool = [...CURATED_IT_COMPANIES];
      if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'india') {
        pool = pool.filter(c => c.address?.city?.toLowerCase() === city.toLowerCase());
      }
      return NextResponse.json({
        success: true,
        city: city || 'India',
        totalCompanies: pool.length,
        hiringCount: pool.filter(c => c.hiring).length,
        startupsCount: pool.filter(c => c.startup).length,
        productCount: pool.filter(c => ['Product', 'SaaS', 'FinTech'].includes(c.type)).length,
        serviceCount: pool.filter(c => ['Service', 'Enterprise'].includes(c.type)).length
      });
    }

    return NextResponse.json({
      success: true,
      total: CURATED_IT_COMPANIES.length,
      page: 1,
      limit: CURATED_IT_COMPANIES.length,
      totalPages: 1,
      companies: CURATED_IT_COMPANIES
    });
  }
}