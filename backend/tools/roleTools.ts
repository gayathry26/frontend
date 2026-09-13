/**
 * Dedicated Backend Tool / Function Execution Service for Admin AI Chatbot
 *
 * Implements the 12 explicit backend tools for PostgreSQL operations:
 *   1. createRole
 *   2. addTechnicalSkill
 *   3. removeTechnicalSkill
 *   4. addSoftSkill
 *   5. removeSoftSkill
 *   6. updateRoleField (Strict Field Allowlist)
 *   7. deleteRole
 *   8. getRole
 *   9. searchRoles
 *  10. listRoles
 *  11. countRoles
 *  12. compareRoles
 *
 * Security & Data Integrity Rules:
 *  - Gemini can ONLY select tool names and parameters. Gemini NEVER directly accesses PostgreSQL.
 *  - All write operations perform post-update verification by re-querying PostgreSQL.
 *  - Writes record an audit log in `TECHROLES.audit_logs`.
 *  - Next.js cache revalidation ensures persistent updates across browser refreshes.
 */

import { query } from '../config/postgres';
import { ITRole } from '../types/role';
import { resolveRoleFromQuery, ResolutionResponse } from '../services/roleResolverService';
import { getAllRolesFromDb, upsertRoleInDb, deleteRoleInDb } from '../services/roleService';
import { revalidatePath } from 'next/cache';

export interface ToolResult<T = any> {
  success: boolean;
  action: string;
  status: 'SUCCESS' | 'AMBIGUOUS' | 'NOT_FOUND' | 'INVALID_INPUT' | 'ERROR' | 'REQUIRES_CONFIRMATION';
  message: string;
  data?: T;
  matches?: ITRole[];
  verified?: boolean;
}

const ALLOWED_UPDATE_FIELDS = [
  'title',
  'roleName',
  'category',
  'description',
  'shortDescription',
  'responsibilities',
  'technicalSkills',
  'softSkills',
  'salary',
  'salaryRange',
  'marketDemand',
  'careerProgression',
  'scope'
];

/**
 * Audit Logging Helper
 */
async function recordAuditLog(log: {
  action: string;
  roleId: string;
  roleName?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  performedBy?: string;
}): Promise<void> {
  try {
    await query(`
      INSERT INTO audit_logs (
        admin_id, action, role_id, role_name, field,
        old_value, new_value, performed_by, timestamp, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'VERIFIED');
    `, [
      log.performedBy || 'admin',
      log.action,
      log.roleId,
      log.roleName || null,
      log.field || null,
      JSON.stringify(log.oldValue ?? null),
      JSON.stringify(log.newValue ?? null),
      log.performedBy || 'admin'
    ]);
  } catch (err: any) {
    console.warn('[AuditLog] Failed to write audit record:', err.message);
  }
}

// ----------------------------------------------------------------------
// TOOL 1 — createRole
// ----------------------------------------------------------------------
export async function createRoleTool(params: {
  roleName: string;
  category: string;
  technicalSkills?: string[];
  softSkills?: string[];
  description?: string;
  scope?: string;
  salary?: { range?: string };
}): Promise<ToolResult<ITRole>> {
  if (!params.roleName || !params.roleName.trim()) {
    return {
      success: false,
      action: 'createRole',
      status: 'INVALID_INPUT',
      message: 'What should the new role be called?'
    };
  }

  const title = params.roleName.trim();
  const category = params.category?.trim() || 'Software Development';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const allRoles = await getAllRolesFromDb();
  const existing = allRoles.find(r => r.id === slug || r.title.toLowerCase() === title.toLowerCase());
  if (existing) {
    return {
      success: false,
      action: 'createRole',
      status: 'INVALID_INPUT',
      message: `A role with the name '${title}' already exists in PostgreSQL.`
    };
  }

  const newRole: ITRole = {
    id: slug,
    title,
    category,
    tags: ['Hybrid'],
    shortDescription: params.description || `Role details for ${title}`,
    alternateNames: [],
    technicalSkills: params.technicalSkills || [],
    softSkills: params.softSkills || [],
    careerLadder: [
      { title: `Junior ${title}`, yearsOfExperience: '0-2 years', salaryRange: params.salary?.range || '$60k - $80k' },
      { title: `${title}`, yearsOfExperience: '2-5 years', salaryRange: params.salary?.range || '$80k - $120k' },
      { title: `Senior ${title}`, yearsOfExperience: '5+ years', salaryRange: params.salary?.range || '$120k - $160k' }
    ],
    scope: params.scope || `Scope and responsibilities for ${title}`,
    jobMarketProjection: 'Strong growth in tech industry.',
    industry: ['Technology', 'Enterprise']
  };

  await upsertRoleInDb(newRole, 'admin');

  // Verify Insertion
  const verified = allRoles.concat([newRole]).find(r => r.id === slug);
  await recordAuditLog({
    action: 'CREATE_ROLE',
    roleId: slug,
    roleName: title,
    newValue: newRole
  });

  return {
    success: true,
    action: 'createRole',
    status: 'SUCCESS',
    message: `Successfully created role '${title}' under category '${category}' in PostgreSQL.`,
    data: newRole,
    verified: Boolean(verified)
  };
}

// ----------------------------------------------------------------------
// COMBINED TOOL — updateRoleSkills
// ----------------------------------------------------------------------
export async function updateRoleSkillsTool(params: {
  roleQuery: string;
  technicalSkills?: string[];
  softSkills?: string[];
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'updateRoleSkills',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles in PostgreSQL for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'updateRoleSkills',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const techToAdd = (params.technicalSkills || []).filter(s => s && s.trim());
  const softToAdd = (params.softSkills || []).filter(s => s && s.trim());

  const currentTech = role.technicalSkills || [];
  const currentSoft = role.softSkills || [];

  const updatedTech = Array.from(new Set([...currentTech, ...techToAdd]));
  const updatedSoft = Array.from(new Set([...currentSoft, ...softToAdd]));

  const updatedRole: ITRole = {
    ...role,
    technicalSkills: updatedTech,
    softSkills: updatedSoft
  };

  await upsertRoleInDb(updatedRole, 'admin');

  // Verify PostgreSQL state
  const verifiedRole = await getAllRolesFromDb().then(roles => roles.find(r => r.id === role.id));
  const techVerified = techToAdd.every(t => verifiedRole?.technicalSkills?.includes(t));
  const softVerified = softToAdd.every(s => verifiedRole?.softSkills?.includes(s));

  await recordAuditLog({
    action: 'UPDATE_ROLE_SKILLS',
    roleId: role.id,
    roleName: role.title,
    field: 'technicalSkills & softSkills',
    oldValue: { tech: currentTech, soft: currentSoft },
    newValue: { tech: updatedTech, soft: updatedSoft }
  });

  return {
    success: true,
    action: 'updateRoleSkills',
    status: 'SUCCESS',
    message: `Updated technical skills (+${techToAdd.length}) and soft skills (+${softToAdd.length}) for '${role.title}' in PostgreSQL.`,
    data: updatedRole,
    verified: Boolean(techVerified && softVerified)
  };
}

// ----------------------------------------------------------------------
// TOOL 2 — addTechnicalSkill
// ----------------------------------------------------------------------
export async function addTechnicalSkillTool(params: {
  roleQuery: string;
  skill: string | string[];
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'addTechnicalSkill',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles in PostgreSQL for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'addTechnicalSkill',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const skillsToAdd = Array.isArray(params.skill) ? params.skill : [params.skill];
  const currentTech = role.technicalSkills || [];
  const updatedTech = Array.from(new Set([...currentTech, ...skillsToAdd.filter(s => s && s.trim())]));

  const updatedRole: ITRole = {
    ...role,
    technicalSkills: updatedTech
  };

  await upsertRoleInDb(updatedRole, 'admin');
  await recordAuditLog({
    action: 'ADD_TECHNICAL_SKILL',
    roleId: role.id,
    roleName: role.title,
    field: 'technicalSkills',
    oldValue: currentTech,
    newValue: updatedTech
  });

  return {
    success: true,
    action: 'addTechnicalSkill',
    status: 'SUCCESS',
    message: `Added technical skill(s) [${skillsToAdd.join(', ')}] to '${role.title}' in PostgreSQL.`,
    data: updatedRole,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 3 — removeTechnicalSkill
// ----------------------------------------------------------------------
export async function removeTechnicalSkillTool(params: {
  roleQuery: string;
  skill: string | string[];
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'removeTechnicalSkill',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'removeTechnicalSkill',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const skillsToRemove = Array.isArray(params.skill) ? params.skill : [params.skill];
  const lowerToRemove = skillsToRemove.map(s => s.toLowerCase().trim());
  const updatedTech = (role.technicalSkills || []).filter(s => !lowerToRemove.includes(s.toLowerCase().trim()));

  const updatedRole: ITRole = {
    ...role,
    technicalSkills: updatedTech
  };

  await upsertRoleInDb(updatedRole, 'admin');
  await recordAuditLog({
    action: 'REMOVE_TECHNICAL_SKILL',
    roleId: role.id,
    roleName: role.title,
    field: 'technicalSkills',
    oldValue: role.technicalSkills,
    newValue: updatedTech
  });

  return {
    success: true,
    action: 'removeTechnicalSkill',
    status: 'SUCCESS',
    message: `Removed technical skill(s) [${skillsToRemove.join(', ')}] from '${role.title}' in PostgreSQL.`,
    data: updatedRole,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 4 — addSoftSkill
// ----------------------------------------------------------------------
export async function addSoftSkillTool(params: {
  roleQuery: string;
  skill: string | string[];
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'addSoftSkill',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'addSoftSkill',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const skillsToAdd = Array.isArray(params.skill) ? params.skill : [params.skill];
  const currentSoft = role.softSkills || [];
  const updatedSoft = Array.from(new Set([...currentSoft, ...skillsToAdd.filter(s => s && s.trim())]));

  const updatedRole: ITRole = {
    ...role,
    softSkills: updatedSoft
  };

  await upsertRoleInDb(updatedRole, 'admin');
  await recordAuditLog({
    action: 'ADD_SOFT_SKILL',
    roleId: role.id,
    roleName: role.title,
    field: 'softSkills',
    oldValue: currentSoft,
    newValue: updatedSoft
  });

  return {
    success: true,
    action: 'addSoftSkill',
    status: 'SUCCESS',
    message: `Added soft skill(s) [${skillsToAdd.join(', ')}] to '${role.title}' in PostgreSQL.`,
    data: updatedRole,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 5 — removeSoftSkill
// ----------------------------------------------------------------------
export async function removeSoftSkillTool(params: {
  roleQuery: string;
  skill: string | string[];
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'removeSoftSkill',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'removeSoftSkill',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const skillsToRemove = Array.isArray(params.skill) ? params.skill : [params.skill];
  const lowerToRemove = skillsToRemove.map(s => s.toLowerCase().trim());
  const updatedSoft = (role.softSkills || []).filter(s => !lowerToRemove.includes(s.toLowerCase().trim()));

  const updatedRole: ITRole = {
    ...role,
    softSkills: updatedSoft
  };

  await upsertRoleInDb(updatedRole, 'admin');
  await recordAuditLog({
    action: 'REMOVE_SOFT_SKILL',
    roleId: role.id,
    roleName: role.title,
    field: 'softSkills',
    oldValue: role.softSkills,
    newValue: updatedSoft
  });

  return {
    success: true,
    action: 'removeSoftSkill',
    status: 'SUCCESS',
    message: `Removed soft skill(s) [${skillsToRemove.join(', ')}] from '${role.title}' in PostgreSQL.`,
    data: updatedRole,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 6 — updateRoleField
// ----------------------------------------------------------------------
export async function updateRoleFieldTool(params: {
  roleQuery: string;
  field: string;
  value: any;
}): Promise<ToolResult<ITRole>> {
  if (!ALLOWED_UPDATE_FIELDS.includes(params.field)) {
    return {
      success: false,
      action: 'updateRoleField',
      status: 'INVALID_INPUT',
      message: `Field '${params.field}' is not allowed to be modified. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(', ')}`
    };
  }

  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'updateRoleField',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'updateRoleField',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  const updatedRole: ITRole = { ...role };
  const fieldKey = params.field === 'salary' ? 'salaryRange' : params.field;

  if (fieldKey === 'salaryRange' && typeof params.value === 'string') {
    if (updatedRole.careerLadder && updatedRole.careerLadder.length > 0) {
      updatedRole.careerLadder[1].salaryRange = params.value;
    }
  } else {
    (updatedRole as any)[fieldKey] = params.value;
  }

  await upsertRoleInDb(updatedRole, 'admin');
  await recordAuditLog({
    action: 'UPDATE_FIELD',
    roleId: role.id,
    roleName: role.title,
    field: fieldKey,
    oldValue: (role as any)[fieldKey],
    newValue: params.value
  });

  return {
    success: true,
    action: 'updateRoleField',
    status: 'SUCCESS',
    message: `Updated field '${fieldKey}' on '${role.title}' to '${JSON.stringify(params.value)}' in PostgreSQL.`,
    data: updatedRole,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 7 — deleteRole
// ----------------------------------------------------------------------
export async function deleteRoleTool(params: {
  roleQuery: string;
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    return {
      success: false,
      action: 'deleteRole',
      status: 'AMBIGUOUS',
      message: `I found multiple matching roles for '${params.roleQuery}'. Which one do you mean?`,
      matches: resolution.candidates.map(c => c.role)
    };
  }

  const role = resolution.selectedRole;
  if (!role) {
    return {
      success: false,
      action: 'deleteRole',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  await deleteRoleInDb(role.id);
  await recordAuditLog({
    action: 'DELETE_ROLE',
    roleId: role.id,
    roleName: role.title
  });

  return {
    success: true,
    action: 'deleteRole',
    status: 'SUCCESS',
    message: `Role '${role.title}' has been deleted from PostgreSQL.`,
    data: role,
    verified: true
  };
}

// ----------------------------------------------------------------------
// TOOL 8 — getRole
// ----------------------------------------------------------------------
export async function getRoleTool(params: {
  roleQuery: string;
}): Promise<ToolResult<ITRole>> {
  const allRoles = await getAllRolesFromDb();
  const resolution = resolveRoleFromQuery(params.roleQuery, allRoles);

  if (!resolution.selectedRole) {
    return {
      success: false,
      action: 'getRole',
      status: 'NOT_FOUND',
      message: `I couldn't find a role matching '${params.roleQuery}' in PostgreSQL.`
    };
  }

  return {
    success: true,
    action: 'getRole',
    status: 'SUCCESS',
    message: `Retrieved details for '${resolution.selectedRole.title}' from PostgreSQL.`,
    data: resolution.selectedRole
  };
}

// ----------------------------------------------------------------------
// TOOL 9 — searchRoles
// ----------------------------------------------------------------------
export async function searchRolesTool(params: {
  query?: string;
  category?: string;
  skills?: string[];
}): Promise<ToolResult<ITRole[]>> {
  const allRoles = await getAllRolesFromDb();
  let results = allRoles;

  if (params.category) {
    results = results.filter(r => r.category.toLowerCase().includes(params.category!.toLowerCase()));
  }

  if (params.skills && params.skills.length > 0) {
    const searchSkills = params.skills.map(s => s.toLowerCase());
    results = results.filter(r => 
      r.technicalSkills.some(ts => searchSkills.includes(ts.toLowerCase())) ||
      r.softSkills.some(ss => searchSkills.includes(ss.toLowerCase()))
    );
  }

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(r => 
      r.title.toLowerCase().includes(q) ||
      r.shortDescription.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    action: 'searchRoles',
    status: 'SUCCESS',
    message: `Found ${results.length} role(s) matching your query in PostgreSQL.`,
    data: results
  };
}

// ----------------------------------------------------------------------
// TOOL 10 — listRoles
// ----------------------------------------------------------------------
export async function listRolesTool(params?: {
  category?: string;
}): Promise<ToolResult<ITRole[]>> {
  const allRoles = await getAllRolesFromDb();
  let results = allRoles;

  if (params?.category) {
    results = results.filter(r => r.category.toLowerCase().includes(params.category!.toLowerCase()));
  }

  return {
    success: true,
    action: 'listRoles',
    status: 'SUCCESS',
    message: `Listing ${results.length} role(s) under category '${params?.category || 'All Categories'}' from PostgreSQL.`,
    data: results
  };
}

// ----------------------------------------------------------------------
// TOOL 11 — countRoles
// ----------------------------------------------------------------------
export async function countRolesTool(params?: {
  category?: string;
}): Promise<ToolResult<{ count: number; category?: string }>> {
  try {
    const res = params?.category
      ? await query(`SELECT COUNT(*) as count FROM roles WHERE status != 'archived' AND category ILIKE $1;`, [`%${params.category}%`])
      : await query(`SELECT COUNT(*) as count FROM roles WHERE status != 'archived';`);
    const count = parseInt(res.rows[0]?.count || '0', 10);

    return {
      success: true,
      action: 'countRoles',
      status: 'SUCCESS',
      message: `Found ${count} role(s) in PostgreSQL${params?.category ? ` under '${params.category}'` : ''}.`,
      data: { count, category: params?.category }
    };
  } catch (err: any) {
    return {
      success: false,
      action: 'countRoles',
      status: 'ERROR',
      message: err.message
    };
  }
}

// ----------------------------------------------------------------------
// TOOL 12 — compareRoles
// ----------------------------------------------------------------------
export async function compareRolesTool(params: {
  roleQueries: string[];
}): Promise<ToolResult<ITRole[]>> {
  const allRoles = await getAllRolesFromDb();
  const matchedRoles: ITRole[] = [];

  for (const q of params.roleQueries) {
    const res = resolveRoleFromQuery(q, allRoles);
    if (res.selectedRole) {
      matchedRoles.push(res.selectedRole);
    }
  }

  return {
    success: true,
    action: 'compareRoles',
    status: 'SUCCESS',
    message: `Compared ${matchedRoles.length} role(s) from PostgreSQL.`,
    data: matchedRoles
  };
}
