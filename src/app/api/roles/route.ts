import { NextResponse } from 'next/server';
import { getAllRolesFromDb, searchRolesFromDb, upsertRoleInDb } from '@/services/roleService';
import { ITRoleSchema } from '@/lib/validations/roleSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category');
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : [];

    if (query || category || tags.length > 0) {
      const filtered = await searchRolesFromDb(query, tags, category);
      return NextResponse.json({ roles: filtered, count: filtered.length });
    }

    const roles = await getAllRolesFromDb();
    return NextResponse.json({ roles, count: roles.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = ITRoleSchema.parse(body);

    const role = await upsertRoleInDb(validated);
    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.errors || err.message || 'Validation failed' },
      { status: 400 }
    );
  }
}
