import { NextRequest, NextResponse } from 'next/server';
import { addToolToRoleInDb, removeToolFromRoleInDb, editToolInRoleInDb, getRoleBySlugFromDb } from '@/backend/services/roleService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/admin/roles/[slug]/tools
 * Atomic tool management endpoint:
 *  - action: "ADD_TOOL" | "REMOVE_TOOL" | "EDIT_TOOL"
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const body = await req.json();
    const { action, tool, oldTool, newTool } = body;

    let updatedRole;

    switch (action) {
      case 'ADD_TOOL': {
        if (!tool || !String(tool).trim()) {
          return NextResponse.json({ success: false, error: 'Tool name is required.' }, { status: 400 });
        }
        updatedRole = await addToolToRoleInDb(slug, String(tool));
        break;
      }
      case 'REMOVE_TOOL': {
        if (!tool || !String(tool).trim()) {
          return NextResponse.json({ success: false, error: 'Tool name is required.' }, { status: 400 });
        }
        updatedRole = await removeToolFromRoleInDb(slug, String(tool));
        break;
      }
      case 'EDIT_TOOL': {
        if (!oldTool || !newTool || !String(newTool).trim()) {
          return NextResponse.json({ success: false, error: 'Old and new tool names are required.' }, { status: 400 });
        }
        updatedRole = await editToolInRoleInDb(slug, String(oldTool), String(newTool));
        break;
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported action: '${action}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Tool operation '${action}' completed successfully in MongoDB Atlas.`,
      role: updatedRole
    });
  } catch (error: any) {
    console.error('API Error managing tools:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform tool operation in MongoDB Atlas' },
      { status: 500 }
    );
  }
}
