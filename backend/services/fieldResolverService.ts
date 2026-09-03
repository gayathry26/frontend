/**
 * Field Resolver Service
 *
 * Maps natural language field variations and typos into canonical MongoDB role schema field names.
 */

export type CanonicalField =
  | 'technicalSkills'
  | 'softSkills'
  | 'salaryRange'
  | 'shortDescription'
  | 'scope'
  | 'jobMarketProjection'
  | 'category'
  | 'tags';

const FIELD_ALIAS_MAP: Record<string, CanonicalField> = {
  // Soft Skills
  'softskills': 'softSkills',
  'soft skills': 'softSkills',
  'soft-skill': 'softSkills',
  'soft skill': 'softSkills',
  'soft_skill': 'softSkills',
  'soft_skills': 'softSkills',
  'interpersonal skills': 'softSkills',
  'people skills': 'softSkills',

  // Technical Skills
  'technicalskills': 'technicalSkills',
  'technical skills': 'technicalSkills',
  'technical-skill': 'technicalSkills',
  'technical skill': 'technicalSkills',
  'tech skills': 'technicalSkills',
  'tech skill': 'technicalSkills',
  'techskills': 'technicalSkills',
  'skills': 'technicalSkills',
  'skill': 'technicalSkills',
  'tech': 'technicalSkills',
  'technologies': 'technicalSkills',
  'stack': 'technicalSkills',
  'tools': 'technicalSkills',

  // Salary / Pay
  'salary': 'salaryRange',
  'salary range': 'salaryRange',
  'pay': 'salaryRange',
  'compensation': 'salaryRange',
  'average salary': 'salaryRange',
  'package': 'salaryRange',
  'lpa': 'salaryRange',

  // Description
  'description': 'shortDescription',
  'desc': 'shortDescription',
  'summary': 'shortDescription',
  'overview': 'shortDescription',
  'about': 'shortDescription',

  // Scope / Responsibilities
  'scope': 'scope',
  'responsibilities': 'scope',
  'responsibility': 'scope',
  'duties': 'scope',
  'roles and responsibilities': 'scope',
  'role scope': 'scope',

  // Job Market Demand
  'market demand': 'jobMarketProjection',
  'demand': 'jobMarketProjection',
  'job market': 'jobMarketProjection',
  'growth': 'jobMarketProjection',
  'projection': 'jobMarketProjection',

  // Category
  'category': 'category',
  'domain': 'category',
  'field': 'category',
  'department': 'category',

  // Tags
  'tags': 'tags',
  'tag': 'tags',
  'type': 'tags'
};

/**
 * Resolves a natural language field name to a canonical role schema field.
 */
export function resolveRoleField(rawField?: string | null): CanonicalField {
  if (!rawField || !rawField.trim()) return 'technicalSkills';

  const clean = rawField.trim().toLowerCase();

  if (FIELD_ALIAS_MAP[clean]) {
    return FIELD_ALIAS_MAP[clean];
  }

  // Substring match heuristics
  if (clean.includes('soft')) return 'softSkills';
  if (clean.includes('tech') || clean.includes('tool') || clean.includes('stack') || clean.includes('skill')) return 'technicalSkills';
  if (clean.includes('sal') || clean.includes('pay') || clean.includes('lpa') || clean.includes('comp')) return 'salaryRange';
  if (clean.includes('desc') || clean.includes('summary')) return 'shortDescription';
  if (clean.includes('resp') || clean.includes('duty') || clean.includes('scope')) return 'scope';
  if (clean.includes('demand') || clean.includes('market') || clean.includes('growth')) return 'jobMarketProjection';
  if (clean.includes('cat') || clean.includes('domain')) return 'category';
  if (clean.includes('tag')) return 'tags';

  return 'technicalSkills'; // Default fallback
}

/**
 * Capitalizes and normalizes skill values for clean storage.
 * e.g., "codex" -> "Codex", "react" -> "React", "devops" -> "DevOps"
 */
export function normalizeValue(val: string): string {
  if (!val || !val.trim()) return '';

  const clean = val.trim();

  const KNOWN_CASING: Record<string, string> = {
    'react': 'React',
    'react.js': 'React.js',
    'reactjs': 'React.js',
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'vue': 'Vue.js',
    'vue.js': 'Vue.js',
    'vuejs': 'Vue.js',
    'angular': 'Angular',
    'node': 'Node.js',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'aws': 'AWS',
    'python': 'Python',
    'java': 'Java',
    'figma': 'Figma',
    'devops': 'DevOps',
    'codex': 'Codex'
  };

  const words = clean.split(/\s+/);
  const normalizedWords = words.map(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9\.]/g, '');
    if (KNOWN_CASING[lower]) {
      return KNOWN_CASING[lower];
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return normalizedWords.join(' ');
}
