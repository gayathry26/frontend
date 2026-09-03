import { NextRequest, NextResponse } from 'next/server';
import { generateNextBestActions, StudentProfile } from '@/backend/services/decisionEngineService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/student/decision-engine
 * Generates personalized "YOUR NEXT BEST 3 ACTIONS" based on student profile and target role.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile: StudentProfile = {
      collegeYear: body.collegeYear || '3rd Year',
      targetRoleId: body.targetRoleId || 'full-stack-developer',
      currentSkills: Array.isArray(body.currentSkills) ? body.currentSkills : [],
      currentTools: Array.isArray(body.currentTools) ? body.currentTools : [],
      completedProjects: Array.isArray(body.completedProjects) ? body.completedProjects : [],
      certifications: Array.isArray(body.certifications) ? body.certifications : []
    };

    const result = await generateNextBestActions(profile);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('API Error in decision-engine:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate next actions' },
      { status: 500 }
    );
  }
}
