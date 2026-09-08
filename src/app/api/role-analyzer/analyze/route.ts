import { NextResponse } from 'next/server';
import {
  calculateRoleMatch,
  generateRoleExplanations,
  generateCareerPath,
  getAvailableSkills,
} from '@/backend/services/roleAnalyzerService';
import { getUserProjects } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { skills, projectId } = body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least 3 skills to perform role analysis.' },
        { status: 400 }
      );
    }

    // Extract project evidence skills if user has a project in Project Interview engine
    let projectEvidenceSkills: string[] = [];
    try {
      const userProjects = await getUserProjects('default_student');
      const targetProj = projectId
        ? userProjects.find((p) => p.projectId === projectId)
        : userProjects[0];

      if (targetProj && targetProj.profile?.techStack) {
        projectEvidenceSkills = targetProj.profile.techStack;
      }
    } catch {}

    // Calculate deterministic weighted match
    const matches = calculateRoleMatch(skills, projectEvidenceSkills);

    // Generate AI natural language explanations for top roles
    const aiExplanations = await generateRoleExplanations(skills, matches);

    // Merge AI explanations into matches
    const enrichedMatches = matches.map((m) => {
      if (aiExplanations[m.roleId]) {
        return {
          ...m,
          aiExplanation: aiExplanations[m.roleId],
        };
      }
      return m;
    });

    const topRole = enrichedMatches[0];
    const careerPath = topRole ? generateCareerPath(topRole) : null;

    return NextResponse.json({
      success: true,
      matches: enrichedMatches,
      topRole,
      careerPath,
      projectEvidenceDetected: projectEvidenceSkills.length > 0,
      projectEvidenceSkills,
      analyzedSkillCount: skills.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/role-analyzer/analyze:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to complete role analysis.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    skills: getAvailableSkills(),
  });
}
