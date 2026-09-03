import { getDb, isMongoConfigured } from '../config/mongodb';
import { ITRole, RoleDocument } from '../types/role';

export interface MatchRoleResult {
  matchedRole: ITRole | null;
  matchType: 'ID' | 'SLUG' | 'EXACT_TITLE' | 'ALIAS' | 'FUZZY' | 'NONE';
  confidence: number;
}

/**
 * Deterministically resolves a role document from MongoDB Atlas for an extracted role title.
 */
export async function resolveRoleDeterministically(extractedTitle: string): Promise<MatchRoleResult> {
  if (!extractedTitle || !String(extractedTitle).trim()) {
    return { matchedRole: null, matchType: 'NONE', confidence: 0 };
  }

  const cleanTitle = extractedTitle.trim();
  const targetSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (!isMongoConfigured()) {
    return { matchedRole: null, matchType: 'NONE', confidence: 0 };
  }

  const db = await getDb();
  const collection = db.collection<RoleDocument>('roles');
  const allRoles = await collection.find({ status: { $ne: 'archived' } }).toArray();

  // 1. Direct ID match
  const matchId = allRoles.find(r => r.id === targetSlug || r.id === cleanTitle);
  if (matchId) {
    return { matchedRole: mapDocumentToITRole(matchId), matchType: 'ID', confidence: 1.0 };
  }

  // 2. Exact Title match (case-insensitive)
  const matchTitle = allRoles.find(r => r.title.toLowerCase() === cleanTitle.toLowerCase());
  if (matchTitle) {
    return { matchedRole: mapDocumentToITRole(matchTitle), matchType: 'EXACT_TITLE', confidence: 0.98 };
  }

  // 3. Approved Aliases / Alternate Names match
  const matchAlias = allRoles.find(r => 
    r.alternateNames && r.alternateNames.some(alt => alt.toLowerCase() === cleanTitle.toLowerCase())
  );
  if (matchAlias) {
    return { matchedRole: mapDocumentToITRole(matchAlias), matchType: 'ALIAS', confidence: 0.92 };
  }

  // 4. Controlled Fuzzy Substring match
  const matchFuzzy = allRoles.find(r => {
    const rTitle = r.title.toLowerCase();
    const eTitle = cleanTitle.toLowerCase();
    return rTitle.includes(eTitle) || eTitle.includes(rTitle);
  });
  if (matchFuzzy) {
    return { matchedRole: mapDocumentToITRole(matchFuzzy), matchType: 'FUZZY', confidence: 0.85 };
  }

  return { matchedRole: null, matchType: 'NONE', confidence: 0 };
}

function mapDocumentToITRole(doc: RoleDocument): ITRole {
  const { _id, ...rest } = doc;
  return {
    ...rest,
    tags: rest.tags || [],
    alternateNames: rest.alternateNames || [],
    technicalSkills: rest.technicalSkills || [],
    softSkills: rest.softSkills || [],
    tools: rest.tools || [],
    careerLadder: rest.careerLadder || [],
    industry: rest.industry || []
  };
}
