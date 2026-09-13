import { NextRequest, NextResponse } from 'next/server';
import { query, isPostgresConfigured } from '@/backend/config/postgres';
import { CURATED_IT_COMPANIES, DiscoveredCompany } from '@/backend/services/companyDiscoveryService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function mapRowToDiscoveredCompany(row: any): DiscoveredCompany {
  return {
    id: row.id,
    name: row.name,
    cin: row.cin || undefined,
    type: row.type || 'Product',
    categories: Array.isArray(row.categories) ? row.categories : (typeof row.categories === 'string' ? JSON.parse(row.categories) : []),
    industries: Array.isArray(row.industries) ? row.industries : (typeof row.industries === 'string' ? JSON.parse(row.industries) : []),
    technologies: Array.isArray(row.technologies) ? row.technologies : (typeof row.technologies === 'string' ? JSON.parse(row.technologies) : []),
    description: row.description || '',
    website: row.website || '',
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: typeof row.address === 'string' ? JSON.parse(row.address) : (row.address || { full: '', city: '', state: '', country: 'India' }),
    coordinates: typeof row.coordinates === 'string' ? JSON.parse(row.coordinates) : (row.coordinates || undefined),
    employeeCount: row.employee_count || undefined,
    foundedYear: row.founded_year || undefined,
    hiring: Boolean(row.hiring),
    startup: Boolean(row.startup),
    relatedRoles: Array.isArray(row.related_roles) ? row.related_roles : (typeof row.related_roles === 'string' ? JSON.parse(row.related_roles) : [])
  };
}

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
    if (!isPostgresConfigured()) {
      throw new Error('PostgreSQL is not configured');
    }

    // 1. Stats calculation endpoint
    if (action === 'stats') {
      const conditions: string[] = [];
      const params: any[] = [];
      if (city && city.toLowerCase() !== 'all' && city.toLowerCase() !== 'india') {
        conditions.push(`address->>'city' ILIKE $1`);
        params.push(city);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const andClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      const statsRes = await query(`
        SELECT
          (SELECT COUNT(*) FROM companies ${whereClause}) as total,
          (SELECT COUNT(*) FROM companies WHERE hiring = true ${andClause}) as hiring_count,
          (SELECT COUNT(*) FROM companies WHERE startup = true ${andClause}) as startups_count,
          (SELECT COUNT(*) FROM companies WHERE type IN ('Product', 'SaaS', 'FinTech') ${andClause}) as product_count,
          (SELECT COUNT(*) FROM companies WHERE type IN ('Service', 'Enterprise') ${andClause}) as service_count;
      `, params);

      const s = statsRes.rows[0] || {};

      return NextResponse.json({
        success: true,
        city: city || 'India',
        totalCompanies: parseInt(s.total || '0', 10),
        hiringCount: parseInt(s.hiring_count || '0', 10),
        startupsCount: parseInt(s.startups_count || '0', 10),
        productCount: parseInt(s.product_count || '0', 10),
        serviceCount: parseInt(s.service_count || '0', 10)
      });
    }

    // 2. Query filters
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (city && city.toLowerCase() !== 'all') {
      conditions.push(`address->>'city' ILIKE $${pIdx++}`);
      params.push(city);
    }

    if (type && type.toLowerCase() !== 'all') {
      conditions.push(`type ILIKE $${pIdx++}`);
      params.push(type);
    }

    if (hiring === 'true') {
      conditions.push(`hiring = true`);
    }

    if (search) {
      conditions.push(`(
        name ILIKE $${pIdx} OR
        description ILIKE $${pIdx} OR
        address->>'full' ILIKE $${pIdx} OR
        address->>'area' ILIKE $${pIdx} OR
        technologies::text ILIKE $${pIdx} OR
        categories::text ILIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as total FROM companies ${where};`, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / limit) || 1;

    const offset = (page - 1) * limit;
    const companiesRes = await query(`
      SELECT * FROM companies
      ${where}
      ORDER BY name ASC
      LIMIT $${pIdx++} OFFSET $${pIdx++};
    `, [...params, limit, offset]);

    let companies = companiesRes.rows.map(mapRowToDiscoveredCompany);

    // Fallback to in-memory curated list if table is empty
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
    console.error('PostgreSQL companies query failed, falling back to static list:', error.message);

    // Fallback in-memory response
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