import { NextRequest, NextResponse } from 'next/server';
import { addSkillToRoleInDb, removeSkillFromRoleInDb, editSkillInRoleInDb, getRoleBySlugFromDb } from '@/backend/services/roleService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * POST /api/admin/roles/[slug]/skills
 * Atomic skill management endpoint:
 *  - action: "ADD_TECHNICAL_SKILL" | "REMOVE_TECHNICAL_SKILL" | "EDIT_TECHNICAL_SKILL"
 *  - action: "ADD_SOFT_SKILL" | "REMOVE_SOFT_SKILL" | "EDIT_SOFT_SKILL"
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const existing = await getRoleBySlugFromDb(slug);

    if (!existing) {
      return NextResponse.json({ success: false, error: `Role '${slug}' not found in MongoDB Atlas.` }, { status: 404 });
    }

    const body = await req.json();
    const { action, skill, oldSkill, newSkill } = body;

    let updatedRole;

    switch (action) {
      case 'ADD_TECHNICAL_SKILL': {
        if (!skill || !String(skill).trim()) {
          return NextResponse.json({ success: false, error: 'Skill name is required.' }, { status: 400 });
        }
        updatedRole = await addSkillToRoleInDb(slug, 'technicalSkills', String(skill));
        break;
      }
      case 'REMOVE_TECHNICAL_SKILL': {
        if (!skill || !String(skill).trim()) {
          return NextResponse.json({ success: false, error: 'Skill name is required.' }, { status: 400 });
        }
        updatedRole = await removeSkillFromRoleInDb(slug, 'technicalSkills', String(skill));
        break;
      }
      case 'EDIT_TECHNICAL_SKILL': {
        if (!oldSkill || !newSkill || !String(newSkill).trim()) {
          return NextResponse.json({ success: false, error: 'Old and new skill names are required.' }, { status: 400 });
        }
        updatedRole = await editSkillInRoleInDb(slug, 'technicalSkills', String(oldSkill), String(newSkill));
        break;
      }
      case 'ADD_SOFT_SKILL': {
        if (!skill || !String(skill).trim()) {
          return NextResponse.json({ success: false, error: 'Skill name is required.' }, { status: 400 });
        }
        updatedRole = await addSkillToRoleInDb(slug, 'softSkills', String(skill));
        break;
      }
      case 'REMOVE_SOFT_SKILL': {
        if (!skill || !String(skill).trim()) {
          return NextResponse.json({ success: false, error: 'Skill name is required.' }, { status: 400 });
        }
        updatedRole = await removeSkillFromRoleInDb(slug, 'softSkills', String(skill));
        break;
      }
      case 'EDIT_SOFT_SKILL': {
        if (!oldSkill || !newSkill || !String(newSkill).trim()) {
          return NextResponse.json({ success: false, error: 'Old and new skill names are required.' }, { status: 400 });
        }
        updatedRole = await editSkillInRoleInDb(slug, 'softSkills', String(oldSkill), String(newSkill));
        break;
      }
      default:
        return NextResponse.json({ success: false, error: `Unsupported action: '${action}'.` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Skill operation '${action}' completed successfully in MongoDB Atlas.`,
      role: updatedRole
    });
  } catch (error: any) {
    console.error(`API Error managing skills for role [${params}]:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform skill operation in MongoDB Atlas' },
      { status: 500 }
    );
  }
}
