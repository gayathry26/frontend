import { NextRequest, NextResponse } from 'next/server';
import { addProjectToRoleInDb, removeProjectFromRoleInDb, editProjectInRoleInDb, getRoleBySlugFromDb } from '@/backend/services/roleService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/admin/roles/[slug]/projects
 * Atomic project management endpoint:
 *  - action: "ADD_PROJECT" | "REMOVE_PROJECT" | "EDIT_PROJECT"
 *  - level: "beginner" | "intermediate" | "advanced"
 *  - project: string
 *  - oldProject: string (for edit)
 *  - newProject: string (for edit)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const body = await req.json();
    const { action, level, project, oldProject, newProject } = body;

    if (!level || !['beginner', 'intermediate', 'advanced'].includes(level)) {
      return NextResponse.json({ success: false, error: "Level must be 'beginner', 'intermediate', or 'advanced'." }, { status: 400 });
    }

    let updatedRole;

    switch (action) {
      case 'ADD_PROJECT': {
        if (!project || !String(project).trim()) {
          return NextResponse.json({ success: false, error: 'Project name cannot be empty.' }, { status: 400 });
        }
        updatedRole = await addProjectToRoleInDb(slug, level, String(project));
        break;
      }
      case 'REMOVE_PROJECT': {
        if (!project || !String(project).trim()) {
          return NextResponse.json({ success: false, error: 'Project name cannot be empty.' }, { status: 400 });
        }
        updatedRole = await removeProjectFromRoleInDb(slug, level, String(project));
        break;
      }
      case 'EDIT_PROJECT': {
        if (!oldProject || !newProject || !String(newProject).trim()) {
          return NextResponse.json({ success: false, error: 'Old and new project names are required.' }, { status: 400 });
        }
        updatedRole = await editProjectInRoleInDb(slug, level, String(oldProject), String(newProject));
        break;
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported action: '${action}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Project operation '${action}' on level '${level}' completed successfully in MongoDB Atlas.`,
      role: updatedRole
    });
  } catch (error: any) {
    console.error('API Error managing projects:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform project operation in MongoDB Atlas' },
      { status: 500 }
    );
  }
}
