import { getRoleBySlugFromDb } from './roleService';
import { getEventsForCareerRole } from './eventService';

export interface StudentProfile {
  collegeYear?: '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | 'Graduate';
  targetRoleId: string;
  currentSkills: string[];
  currentTools: string[];
  completedProjects: string[];
  certifications?: string[];
}

export interface NextActionItem {
  id: string;
  title: string;
  category: 'LEARN_SKILL' | 'BUILD_PROJECT' | 'APPLY_OPPORTUNITY' | 'GET_CERTIFIED' | 'INTERVIEW_PREP';
  description: string;
  priority: number;
  reason: string;
  actionUrl?: string;
}

export async function generateNextBestActions(profile: StudentProfile): Promise<{
  targetRoleTitle: string;
  readinessScore: number;
  nextActions: NextActionItem[];
}> {
  const role = await getRoleBySlugFromDb(profile.targetRoleId || 'full-stack-developer');
  const roleTitle = role ? role.title : 'Full-Stack Developer';

  const reqTech = role ? role.technicalSkills : ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'];
  const reqSoft = role ? role.softSkills : ['Problem Solving', 'Communication'];
  const reqTools = role ? role.tools || ['Git', 'GitHub', 'VS Code', 'Docker', 'Postman'] : ['Git', 'GitHub', 'VS Code'];

  const allReqs = [...reqTech, ...reqSoft, ...reqTools];
  const userSet = new Set([...profile.currentSkills, ...profile.currentTools]);

  const knownCount = allReqs.filter(s => userSet.has(s)).length;
  const readinessScore = allReqs.length > 0 ? Math.round((knownCount / allReqs.length) * 100) : 0;

  const missingTech = reqTech.filter(s => !userSet.has(s));
  const missingTools = reqTools.filter(t => !userSet.has(t));

  const actions: NextActionItem[] = [];

  // Action 1: Learn Top Missing Skill or Tool
  if (missingTech.length > 0) {
    const topSkill = missingTech[0];
    actions.push({
      id: 'action-learn-skill',
      title: `Master ${topSkill} Fundamentals`,
      category: 'LEARN_SKILL',
      description: `${topSkill} is a key requirement for ${roleTitle}s. Learn the core syntax, concepts, and best practices.`,
      priority: 1,
      reason: `Required for ${roleTitle} role (Missing from your current profile)`,
      actionUrl: `/roles/${profile.targetRoleId || 'full-stack-developer'}`
    });
  } else if (missingTools.length > 0) {
    const topTool = missingTools[0];
    actions.push({
      id: 'action-learn-tool',
      title: `Set Up & Practice ${topTool}`,
      category: 'LEARN_SKILL',
      description: `${topTool} is heavily used by working ${roleTitle} professionals daily.`,
      priority: 1,
      reason: `Essential daily tool for ${roleTitle}`,
      actionUrl: `/roles/${profile.targetRoleId || 'full-stack-developer'}`
    });
  } else {
    actions.push({
      id: 'action-advanced-mastery',
      title: `Deep-Dive into System Architecture`,
      category: 'LEARN_SKILL',
      description: `You have mastered core skills for ${roleTitle}. Focus on performance optimization and scalable design.`,
      priority: 1,
      reason: `100% Core Requirements Matched`
    });
  }

  // Action 2: Build Recommended Project
  const projBeginner = role?.projects?.beginner || [];
  const projInter = role?.projects?.intermediate || [];
  const projAdv = role?.projects?.advanced || [];

  let recProject = 'Build a Full-Stack Portfolio Application';
  if (readinessScore < 40 && projBeginner.length > 0) recProject = projBeginner[0];
  else if (readinessScore < 75 && projInter.length > 0) recProject = projInter[0];
  else if (projAdv.length > 0) recProject = projAdv[0];

  actions.push({
    id: 'action-build-project',
    title: `Build Milestone Project: ${recProject}`,
    category: 'BUILD_PROJECT',
    description: `Demonstrate your ${roleTitle} skills by building and deploying ${recProject} to GitHub.`,
    priority: 2,
    reason: `Adds verified project evidence to your profile for ${readinessScore}% readiness level`,
    actionUrl: `/roles/${profile.targetRoleId || 'full-stack-developer'}`
  });

  // Action 3: Opportunity / Hackathon or Certification
  try {
    const activeEvents = await getEventsForCareerRole(roleTitle);
    if (activeEvents.length > 0) {
      const topEvt = activeEvents[0];
      actions.push({
        id: 'action-opportunity',
        title: `Apply / Participate: ${topEvt.title}`,
        category: 'APPLY_OPPORTUNITY',
        description: `Join this ${topEvt.category} matching ${roleTitle} in ${topEvt.location?.city || 'India'}.`,
        priority: 3,
        reason: `Live opportunity matching your target career path (Deadline: ${topEvt.dateInfo?.registrationDeadline || 'Upcoming'})`,
        actionUrl: topEvt.registrationURL || `/opportunities/${topEvt.slug}`
      });
    } else {
      const certName = role?.certifications?.[0]?.name || 'Industry Cloud Certification';
      actions.push({
        id: 'action-cert',
        title: `Earn Recommended Certification: ${certName}`,
        category: 'GET_CERTIFIED',
        description: `Validate your expertise for ${roleTitle} by earning ${certName}.`,
        priority: 3,
        reason: `Industry-recognized certification for ${roleTitle}`,
        actionUrl: `/roles/${profile.targetRoleId || 'full-stack-developer'}`
      });
    }
  } catch (err) {
    actions.push({
      id: 'action-interview-prep',
      title: `Practice ${roleTitle} Technical Interview Q&A`,
      category: 'INTERVIEW_PREP',
      description: `Review scenario questions and coding problem sets for ${roleTitle}.`,
      priority: 3,
      reason: `Boosts your technical interview confidence`,
      actionUrl: `/roles/${profile.targetRoleId || 'full-stack-developer'}`
    });
  }

  return {
    targetRoleTitle: roleTitle,
    readinessScore,
    nextActions: actions
  };
}
