/**
 * Role Resolver Service — Deterministic Database-Aware Role Matching
 *
 * Implements 5-level priority matching against MongoDB Atlas roles:
 *   LEVEL 1 — Exact Role ID / Slug
 *   LEVEL 2 — Exact Role Title
 *   LEVEL 3 — Phrase & Alias Match (Sorted by alias length descending)
 *   LEVEL 4 — Token / Word Boundary Match
 *   LEVEL 5 — Controlled Fuzzy Match
 *
 * Handles confidence scoring, multi-match disambiguation, and no-match filtering.
 */

import { ITRole } from '../types/role';

export interface RoleMatchResult {
  role: ITRole;
  score: number;
  matchType: 'EXACT_ID' | 'EXACT_TITLE' | 'ALIAS' | 'WORD_MATCH' | 'FUZZY';
  reason: string;
}

export interface ResolutionResponse {
  selectedRole: ITRole | null;
  candidates: RoleMatchResult[];
  matchType?: string;
  reason?: string;
  isAmbiguous: boolean;
  confidence: number;
}

const GLOBAL_ROLE_ALIASES: Record<string, string[]> = {
  'frontend-developer': [
    'frontend developer',
    'front end developer',
    'front-end developer',
    'frontend engineer',
    'frontend dev',
    'front end dev',
    'ui developer',
    'web developer',
    'front end',
    'front-end',
    'frontend'
  ],
  'backend-developer': [
    'backend developer',
    'back end developer',
    'back-end developer',
    'backend engineer',
    'backend dev',
    'back end dev',
    'server engineer',
    'back end',
    'back-end',
    'backend'
  ],
  'full-stack-developer': [
    'full stack developer',
    'full-stack developer',
    'fullstack developer',
    'full stack engineer',
    'full stack dev',
    'fullstack dev',
    'full stack',
    'full-stack',
    'fullstack'
  ],
  'devops-engineer': [
    'devops engineer',
    'dev-ops engineer',
    'dev ops engineer',
    'site reliability engineer',
    'cloud devops',
    'dev-ops',
    'dev ops',
    'devops',
    'sre'
  ],
  'data-scientist': [
    'data scientist',
    'machine learning engineer',
    'data science',
    'ml engineer',
    'ds'
  ],
  'ui-ux-designer': [
    'ui ux designer',
    'ui/ux designer',
    'ui-ux designer',
    'ui ux',
    'ui/ux',
    'ui-ux',
    'ui designer',
    'ux designer',
    'product designer'
  ],
  'cybersecurity-analyst': [
    'cybersecurity analyst',
    'cyber security analyst',
    'security analyst',
    'cybersecurity',
    'cyber security'
  ],
  'cloud-architect': [
    'cloud architect',
    'aws architect',
    'cloud engineer'
  ],
  'qa-engineer': [
    'qa engineer',
    'quality assurance engineer',
    'test engineer',
    'qa tester',
    'qa'
  ]
};

export function resolveRoleFromQuery(query: string, mongoRoles: ITRole[]): ResolutionResponse {
  if (!query || !query.trim() || mongoRoles.length === 0) {
    return { selectedRole: null, candidates: [], isAmbiguous: false, confidence: 0 };
  }

  // Clean and normalize target roleQuery string
  const cleanQuery = query.trim().toLowerCase().replace(/^["']|["']$/g, '');
  const slugifiedQuery = cleanQuery.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const scoredMatches: RoleMatchResult[] = [];

  // LEVEL 1 & 2: Exact ID, Slug & Title Matches
  for (const role of mongoRoles) {
    const roleIdLower = (role.id || '').toLowerCase();
    const titleLower = (role.title || '').toLowerCase();
    const cleanTitle = titleLower.replace(/\([^)]*\)/g, '').trim();

    if (cleanQuery === roleIdLower || slugifiedQuery === roleIdLower) {
      scoredMatches.push({
        role,
        score: 1.0,
        matchType: 'EXACT_ID',
        reason: `Matched exact role ID '${role.id}'`
      });
      continue;
    }

    if (cleanQuery === titleLower || cleanQuery === cleanTitle || slugifiedQuery === titleLower.replace(/[^a-z0-9]+/g, '-')) {
      scoredMatches.push({
        role,
        score: 0.99,
        matchType: 'EXACT_TITLE',
        reason: `Matched exact role title '${role.title}'`
      });
      continue;
    }
  }

  if (scoredMatches.length > 0) {
    scoredMatches.sort((a, b) => b.score - a.score);
    return {
      selectedRole: scoredMatches[0].role,
      candidates: scoredMatches,
      matchType: scoredMatches[0].matchType,
      reason: scoredMatches[0].reason,
      isAmbiguous: false,
      confidence: scoredMatches[0].score
    };
  }

  // LEVEL 3: Phrase & Alias Matching (Priority by alias phrase length descending)
  for (const role of mongoRoles) {
    const roleIdLower = (role.id || '').toLowerCase();
    const titleLower = (role.title || '').toLowerCase();
    const cleanTitle = titleLower.replace(/\([^)]*\)/g, '').trim();

    const aliases = Array.from(new Set<string>([
      titleLower,
      cleanTitle,
      ...(role.alternateNames || []).map(a => a.toLowerCase()),
      ...(GLOBAL_ROLE_ALIASES[roleIdLower] || [])
    ])).sort((a, b) => b.length - a.length); // Sort longest alias first!

    for (const alias of aliases) {
      if (alias.length >= 2 && isWordBoundaryMatch(cleanQuery, alias)) {
        const score = alias === cleanQuery ? 0.98 : Math.min(0.95, 0.88 + (alias.length * 0.005));
        scoredMatches.push({
          role,
          score: Number(score.toFixed(3)),
          matchType: 'ALIAS',
          reason: `Matched alias '${alias}' for '${role.title}'`
        });
        break; // Stop after top alias match for this role
      }
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);

  if (scoredMatches.length > 0) {
    const topMatch = scoredMatches[0];
    if (topMatch.score >= 0.85) {
      return {
        selectedRole: topMatch.role,
        candidates: scoredMatches,
        matchType: topMatch.matchType,
        reason: topMatch.reason,
        isAmbiguous: false,
        confidence: topMatch.score
      };
    }
  }

  // LEVEL 4: Word Boundary Match for Isolated Role Queries
  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 3);
  if (queryWords.length >= 1) {
    for (const role of mongoRoles) {
      const titleLower = (role.title || '').toLowerCase();
      const allWordsMatch = queryWords.every(w => titleLower.includes(w));
      if (allWordsMatch) {
        scoredMatches.push({
          role,
          score: 0.82,
          matchType: 'WORD_MATCH',
          reason: `Matched keyword '${cleanQuery}' in title '${role.title}'`
        });
      }
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);

  if (scoredMatches.length === 0) {
    return { selectedRole: null, candidates: [], isAmbiguous: false, confidence: 0 };
  }

  const topMatch = scoredMatches[0];
  const closeCandidates = scoredMatches.filter(c => topMatch.score - c.score <= 0.05);

  if (closeCandidates.length > 1 && topMatch.score < 0.90) {
    return {
      selectedRole: null,
      candidates: closeCandidates,
      isAmbiguous: true,
      confidence: topMatch.score
    };
  }

  return {
    selectedRole: topMatch.role,
    candidates: scoredMatches,
    matchType: topMatch.matchType,
    reason: topMatch.reason,
    isAmbiguous: false,
    confidence: topMatch.score
  };
}

function isWordBoundaryMatch(text: string, target: string): boolean {
  const regex = new RegExp(`(?:^|\\b)${escapeRegExp(target)}(?:\\b|$)`, 'i');
  return regex.test(text);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
