import { NextRequest, NextResponse } from 'next/server';
import { query, isPostgresConfigured } from '@/backend/config/postgres';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/survey
 * Collects working IT professional experience survey submissions into PostgreSQL table `professional_submissions`.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isPostgresConfigured()) {
      return NextResponse.json({ success: false, error: 'PostgreSQL is not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { roleId, roleTitle, yearsOfExperience, industry, technicalSkills, softSkills, tools, recommendedSkills } = body;

    if (!roleTitle || !String(roleTitle).trim()) {
      return NextResponse.json({ success: false, error: 'Role title is required.' }, { status: 400 });
    }

    const submissionRole = roleId || String(roleTitle).toLowerCase().replace(/\s+/g, '-');
    const title = String(roleTitle).trim();
    const exp = yearsOfExperience || '1-3 years';
    const ind = industry || 'Technology';
    const tech = Array.isArray(technicalSkills) ? technicalSkills : [];
    const soft = Array.isArray(softSkills) ? softSkills : [];
    const tls = Array.isArray(tools) ? tools : [];
    const rec = Array.isArray(recommendedSkills) ? recommendedSkills : [];
    const now = new Date().toISOString();

    const res = await query(`
      INSERT INTO professional_submissions (
        role_id, role_title, years_of_experience, industry,
        technical_skills, soft_skills, tools, recommended_skills,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)
      RETURNING *;
    `, [
      submissionRole,
      title,
      exp,
      ind,
      JSON.stringify(tech),
      JSON.stringify(soft),
      JSON.stringify(tls),
      JSON.stringify(rec),
      now
    ]);

    const created = res.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your IT professional experience has been recorded in PostgreSQL.',
      submission: {
        id: created.id,
        roleId: created.role_id,
        roleTitle: created.role_title,
        yearsOfExperience: created.years_of_experience,
        industry: created.industry,
        technicalSkills: tech,
        softSkills: soft,
        tools: tls,
        recommendedSkills: rec,
        status: created.status,
        createdAt: created.created_at
      }
    });
  } catch (error: any) {
    console.error('API Error submitting survey:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit professional survey' },
      { status: 500 }
    );
  }
}
