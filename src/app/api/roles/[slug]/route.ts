import { NextResponse } from 'next/server';
import { getRoleBySlugFromDb, upsertRoleInDb, deleteRoleInDb } from '@/services/roleService';
import { ITRoleSchema } from '@/lib/validations/roleSchemas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const role = await getRoleBySlugFromDb(slug);
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const validated = ITRoleSchema.parse({ ...body, id: slug });

    const role = await upsertRoleInDb(validated);
    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || err.message || 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const deleted = await deleteRoleInDb(slug);
    if (!deleted) {
      return NextResponse.json({ error: 'Role not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
