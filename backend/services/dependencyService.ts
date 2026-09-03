export interface SkillDependencyNode {
  skill: string;
  prerequisites: string[];
  nextSkills: string[];
  stagePriority: 'CORE_FOUNDATION' | 'INTERMEDIATE_PRACTICE' | 'ADVANCED_SPECIALIZATION' | 'DO_NOT_PRIORITIZE_YET';
  advice?: string;
}

export const SKILL_DEPENDENCY_TREE: Record<string, SkillDependencyNode> = {
  'Kubernetes': {
    skill: 'Kubernetes',
    prerequisites: ['Docker', 'Linux Fundamentals', 'Networking & REST APIs'],
    nextSkills: ['Service Mesh (Istio)', 'Infrastructure as Code (Terraform)'],
    stagePriority: 'DO_NOT_PRIORITIZE_YET',
    advice: 'Lower priority for early stage. Master Docker containerization and REST APIs first before managing Kubernetes clusters.'
  },
  'Transformers / LLMs': {
    skill: 'Transformers / LLMs',
    prerequisites: ['Python', 'NumPy / Pandas', 'Machine Learning', 'Deep Learning'],
    nextSkills: ['RAG Applications', 'Agentic AI Systems'],
    stagePriority: 'ADVANCED_SPECIALIZATION',
    advice: 'Build strong Python data structures and ML foundations before tuning transformer architectures.'
  },
  'Next.js': {
    skill: 'Next.js',
    prerequisites: ['HTML / CSS', 'JavaScript (ES6+)', 'React Fundamentals'],
    nextSkills: ['Server Components', 'GraphQL / TRPC'],
    stagePriority: 'INTERMEDIATE_PRACTICE',
    advice: 'Master React state management and component hooks prior to server-side rendering.'
  }
};

export function evaluateSkillPrioritization(targetSkill: string, userKnownSkills: string[]): {
  isReadyToLearn: boolean;
  missingPrereqs: string[];
  advice: string;
} {
  const userSet = new Set(userKnownSkills.map(s => s.toLowerCase()));
  const node = SKILL_DEPENDENCY_TREE[targetSkill];

  if (!node) {
    return {
      isReadyToLearn: true,
      missingPrereqs: [],
      advice: 'Skill is appropriate for your current progression stage.'
    };
  }

  const missingPrereqs = node.prerequisites.filter(p => !userSet.has(p.toLowerCase()));
  const isReadyToLearn = missingPrereqs.length === 0;

  return {
    isReadyToLearn,
    missingPrereqs,
    advice: isReadyToLearn
      ? `Great! You have mastered the required prerequisites (${node.prerequisites.join(', ')}). Ready to start ${targetSkill}.`
      : node.advice || `Focus on prerequisite skills (${missingPrereqs.join(', ')}) before starting ${targetSkill}.`
  };
}
