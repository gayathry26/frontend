import crypto from 'crypto';

/**
 * Canonical Term Normalization Dictionary
 * Maps common variations, alternative spellings, and acronyms to standard canonical values.
 */
const CANONICAL_TERMS_MAP: Record<string, string> = {
  // Web Frameworks & Libraries
  'reactjs': 'React',
  'react.js': 'React',
  'react js': 'React',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next js': 'Next.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  'vuejs': 'Vue.js',
  'vue.js': 'Vue.js',
  'vue js': 'Vue.js',
  'expressjs': 'Express.js',
  'express.js': 'Express.js',

  // Tools & Platforms
  'git hub': 'GitHub',
  'github': 'GitHub',
  'vs code': 'VS Code',
  'vscode': 'VS Code',
  'visual studio code': 'VS Code',
  'postman': 'Postman',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'jira': 'Jira',
  'atlassian jira': 'Jira',
  'figma': 'Figma',
  'aws': 'AWS',
  'amazon web services': 'AWS',

  // Skills & Methodologies
  'prompt engineering': 'Prompt Engineering',
  'llm evaluation': 'LLM Evaluation',
  'context engineering': 'Context Engineering',
  'agentic ai': 'Agentic AI',
  'rag': 'RAG',
  'retrieval augmented generation': 'RAG',
  'ci/cd': 'CI/CD',
  'continuous integration': 'CI/CD',
  'agile': 'Agile',
  'scrum': 'Scrum',
  'ui/ux': 'UI/UX Design',
  'ui ux': 'UI/UX Design'
};

/**
 * Normalizes a technical skill, soft skill, or tool string into a canonical representation.
 */
export function normalizeTerm(rawTerm: string): string {
  if (!rawTerm || typeof rawTerm !== 'string') return '';
  const trimmed = rawTerm.trim();
  const lowerKey = trimmed.toLowerCase().replace(/\s+/g, ' ');

  if (CANONICAL_TERMS_MAP[lowerKey]) {
    return CANONICAL_TERMS_MAP[lowerKey];
  }

  // Capitalize first letter of each word if not in dictionary
  return trimmed
    .split(' ')
    .map(word => {
      if (word.length <= 3 && word.toUpperCase() === word) return word; // Keep acronyms like API, SQL
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Deduplicates and normalizes an array of terms.
 */
export function normalizeTermArray(terms: string[]): string[] {
  if (!Array.isArray(terms)) return [];
  const normalizedSet = new Set<string>();
  for (const t of terms) {
    const norm = normalizeTerm(t);
    if (norm) normalizedSet.add(norm);
  }
  return Array.from(normalizedSet);
}

/**
 * Calculates a SHA-256 content hash for source text to prevent duplicate processing.
 */
export function calculateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}
