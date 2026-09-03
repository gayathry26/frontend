import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../backend/config/mongodb';
import { SEED_GEO_COMPANIES } from '@/backend/scripts/seedTechMap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
    }

    try {
      const db = await getDb();
      const col = db.collection('companies');
      const company = await col.findOne({ id });

      if (company) {
        const { _id, ...rest } = company as any;
        return NextResponse.json({ success: true, company: rest });
      }
    } catch {}

    // Fallback to seed data
    const seedFound = SEED_GEO_COMPANIES.find(c => c.id === id || c.name?.toLowerCase().includes(id.toLowerCase()));
    if (seedFound) {
      return NextResponse.json({ success: true, company: seedFound });
    }

    return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error in GET /api/companies/[id]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch company' }, { status: 500 });
  }
}
