import { SKILLS_CATALOG, SkillItem } from '../data/skillsCatalog';
import { ROLES_CATALOG, RoleDefinition } from '../data/rolesCatalog';

export interface CategoryBreakdown {
  frontend: number;
  backend: number;
  database: number;
  apiDevelopment: number;
  devOps: number;
  dataAI: number;
}

export interface RoleMatchResult {
  roleId: string;
  roleName: string;
  description: string;
  score: number; // 0 to 100
  matchedSkills: string[];
  missingSkills: string[];
  preferredMatchedSkills: string[];
  projectEvidenceSkills: string[];
  synergiesDetected: string[];
  breakdown: CategoryBreakdown;
  aiExplanation?: string;
  whyFits?: {
    strongestMatch: string;
    skillCombinationReason: string;
    matchedSkillsList: string[];
    skillsToStrengthenList: string[];
  };
}

export interface SkillEvidenceItem {
  skill: string;
  source: 'SELF_DECLARED' | 'PROJECT_EVIDENCE' | 'VERIFIED';
}

async function callGeminiAI(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      }
    }
  } catch (err) {
    console.warn('Gemini API call failed in roleAnalyzerService:', err);
  }
  return null;
}

export function getAvailableSkills(): SkillItem[] {
  return SKILLS_CATALOG;
}

export function getRoleDefinitions(): RoleDefinition[] {
  return ROLES_CATALOG;
}

/**
 * Calculates category breakdown scores for a specific role
 */
function calculateCategoryBreakdown(selectedSkillsSet: Set<string>): CategoryBreakdown {
  const check = (skills: string[]) => {
    const matches = skills.filter((s) => selectedSkillsSet.has(s)).length;
    return Math.min(100, Math.round((matches / Math.max(1, skills.length)) * 100));
  };

  return {
    frontend: check(['React', 'Angular', 'Vue.js', 'Next.js', 'HTML', 'CSS', 'Tailwind CSS', 'Redux', 'TypeScript (Frontend)']),
    backend: check(['Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'NestJS', 'ASP.NET Core']),
    database: check(['MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase', 'DynamoDB', 'SQLite']),
    apiDevelopment: check(['REST APIs', 'GraphQL', 'Node.js', 'Express.js', 'FastAPI']),
    devOps: check(['Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud (GCP)', 'GitHub Actions', 'Terraform', 'Linux']),
    dataAI: check(['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Power BI', 'SQL']),
  };
}

/**
 * Deterministic Role Matching Engine based on skill weights, combination synergies, and project evidence
 */
export function calculateRoleMatch(
  selectedSkills: string[],
  projectEvidenceSkills: string[] = []
): RoleMatchResult[] {
  const selectedSet = new Set(selectedSkills.map((s) => s.trim()));
  const projectEvidenceSet = new Set(projectEvidenceSkills.map((s) => s.trim()));
  const allUserSkillsSet = new Set([...selectedSkills, ...projectEvidenceSkills].map((s) => s.trim()));

  const results: RoleMatchResult[] = [];

  for (const role of ROLES_CATALOG) {
    let rawScore = 0;
    let maxPossibleScore = 0;

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const preferredMatchedSkills: string[] = [];
    const projectEvSkills: string[] = [];
    const synergiesDetected: string[] = [];

    // Evaluate Required Skills
    for (const reqSkill of role.requiredSkills) {
      const weight = role.skillWeights[reqSkill] || 15;
      maxPossibleScore += weight;

      if (selectedSet.has(reqSkill)) {
        rawScore += weight;
        matchedSkills.push(reqSkill);
      } else if (projectEvidenceSet.has(reqSkill)) {
        rawScore += weight * 0.85; // Slight boost for project evidence
        projectEvSkills.push(reqSkill);
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    // Evaluate Preferred Skills
    for (const prefSkill of role.preferredSkills) {
      const weight = role.skillWeights[prefSkill] || 10;
      maxPossibleScore += weight * 0.6;

      if (selectedSet.has(prefSkill)) {
        rawScore += weight * 0.6;
        preferredMatchedSkills.push(prefSkill);
      } else if (projectEvidenceSet.has(prefSkill)) {
        rawScore += weight * 0.5;
        projectEvSkills.push(prefSkill);
        preferredMatchedSkills.push(prefSkill);
      }
    }

    // Evaluate Synergy Combinations
    let bonus = 0;
    if (role.synergyCombinations) {
      for (const syn of role.synergyCombinations) {
        const hasAll = syn.skills.every((sk) => allUserSkillsSet.has(sk));
        if (hasAll) {
          bonus += syn.bonusScore;
          synergiesDetected.push(syn.description);
        }
      }
    }

    // Normalize score to 0 - 100%
    let percentage = maxPossibleScore > 0 ? (rawScore / maxPossibleScore) * 100 + bonus : 0;
    
    // Penalize slightly if key required skills are completely missing
    if (matchedSkills.length === 0) {
      percentage = percentage * 0.2;
    } else if (matchedSkills.length < Math.ceil(role.requiredSkills.length * 0.4)) {
      percentage = percentage * 0.65;
    }

    const finalScore = Math.min(99, Math.max(12, Math.round(percentage)));

    const breakdown = calculateCategoryBreakdown(allUserSkillsSet);

    results.push({
      roleId: role.id,
      roleName: role.roleName,
      description: role.description,
      score: finalScore,
      matchedSkills: Array.from(new Set([...matchedSkills, ...preferredMatchedSkills])),
      missingSkills,
      preferredMatchedSkills,
      projectEvidenceSkills: projectEvSkills,
      synergiesDetected,
      breakdown,
      whyFits: {
        strongestMatch: `${role.roleName} (${finalScore}% compatibility)`,
        skillCombinationReason: synergiesDetected.length > 0
          ? synergiesDetected.join(' ')
          : `Your selected skills (${matchedSkills.slice(0, 4).join(', ')}) align well with this role's core responsibilities.`,
        matchedSkillsList: Array.from(new Set([...matchedSkills, ...preferredMatchedSkills])),
        skillsToStrengthenList: missingSkills.slice(0, 3),
      },
    });
  }

  // Sort descending by match score
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Optional AI Enrichment: Generates natural language explanations using Gemini based on structured score data
 */
export async function generateRoleExplanations(
  selectedSkills: string[],
  topMatches: RoleMatchResult[]
): Promise<Record<string, string>> {
  const top3 = topMatches.slice(0, 4);

  const prompt = `
You are a senior IT career guidance counselor and technical strategist.
The user selected their current comfortable skills: ${JSON.stringify(selectedSkills)}.

Based on a mathematical matching engine, here are their top discovered IT role matches:
${top3.map((m) => `- ${m.roleName}: ${m.score}% match (Matched: ${m.matchedSkills.join(', ')} | Missing: ${m.missingSkills.join(', ')})`).join('\n')}

Task:
Generate concise, highly encouraging, and realistic explanations for WHY each role is suitable based on their skill combination.

Return strict JSON mapping roleId to an explanation string:
{
  "${top3[0]?.roleId}": "string (2-3 sentences explaining why their skill combination fits this role)",
  "${top3[1]?.roleId}": "string",
  "${top3[2]?.roleId}": "string"
}
`;

  const aiRes = await callGeminiAI(prompt);
  if (aiRes && typeof aiRes === 'object') {
    return aiRes;
  }
  return {};
}

/**
 * Generates personalized career roadmap path for the #1 best fit role
 */
export function generateCareerPath(topRole: RoleMatchResult) {
  return {
    currentSkills: topRole.matchedSkills,
    topRoleName: topRole.roleName,
    matchScore: topRole.score,
    skillsToStrengthen: topRole.missingSkills.slice(0, 3),
    recommendedProject: `Build a production-grade ${topRole.roleName} application showcasing ${topRole.matchedSkills.slice(0, 3).join(' + ')} and ${topRole.missingSkills[0] || 'Cloud deployment'}.`,
    interviewPrepStep: `Practice technical interviews for ${topRole.roleName} using the AI Project Interview Prep feature.`,
    jobSearchStep: `Explore live ${topRole.roleName} opportunities in the Opportunities catalog.`,
  };
}
