import { NextResponse } from 'next/server';
import { getRoleBySlugFromDb, upsertRoleInDb, deleteRoleInDb } from '@/services/roleService';
import { ITRoleSchema } from '@/lib/validations/roleSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const role = await getRoleBySlugFromDb(params.slug);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json({ role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const validated = ITRoleSchema.parse({ ...body, id: params.slug });

    const role = await upsertRoleInDb(validated);
    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || err.message || 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const deleted = await deleteRoleInDb(params.slug);
    if (!deleted) {
      return NextResponse.json({ error: 'Role not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
