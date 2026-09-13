import { query, transaction, isPostgresConfigured } from '../config/postgres';
import { ITRole, RoleDocument } from '../types/role';
import { itRoles } from '../../src/data/itRoles';
import { revalidatePath } from 'next/cache';

/**
 * Maps a PostgreSQL database row to an ITRole object
 */
export function mapRowToITRole(row: any): ITRole {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description || '',
    scope: row.scope || '',
    jobMarketProjection: row.job_market_projection || '',
    codingLevel: row.coding_level || '',
    workMode: row.work_mode || '',
    dayToDayWork: row.day_to_day_work || '',
    status: row.status || 'approved',
    version: row.version || 1,
    verified: row.verified !== false,
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
    alternateNames: Array.isArray(row.alternate_names) ? row.alternate_names : (typeof row.alternate_names === 'string' ? JSON.parse(row.alternate_names) : []),
    technicalSkills: Array.isArray(row.technical_skills) ? row.technical_skills : (typeof row.technical_skills === 'string' ? JSON.parse(row.technical_skills) : []),
    softSkills: Array.isArray(row.soft_skills) ? row.soft_skills : (typeof row.soft_skills === 'string' ? JSON.parse(row.soft_skills) : []),
    tools: Array.isArray(row.tools) ? row.tools : (typeof row.tools === 'string' ? JSON.parse(row.tools) : []),
    industry: Array.isArray(row.industry) ? row.industry : (typeof row.industry === 'string' ? JSON.parse(row.industry) : []),
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : (typeof row.responsibilities === 'string' ? JSON.parse(row.responsibilities) : []),
    education: Array.isArray(row.education) ? row.education : (typeof row.education === 'string' ? JSON.parse(row.education) : []),
    locations: Array.isArray(row.locations) ? row.locations : (typeof row.locations === 'string' ? JSON.parse(row.locations) : []),
    relatedRoles: Array.isArray(row.related_roles) ? row.related_roles : (typeof row.related_roles === 'string' ? JSON.parse(row.related_roles) : []),
    careerLadder: Array.isArray(row.career_ladder) ? row.career_ladder : (typeof row.career_ladder === 'string' ? JSON.parse(row.career_ladder) : []),
    hiringCompanies: Array.isArray(row.hiring_companies) ? row.hiring_companies : (typeof row.hiring_companies === 'string' ? JSON.parse(row.hiring_companies) : []),
    stats: typeof row.stats === 'object' && row.stats !== null ? row.stats : (typeof row.stats === 'string' ? JSON.parse(row.stats) : {}),
    projects: typeof row.projects === 'object' && row.projects !== null ? row.projects : (typeof row.projects === 'string' ? JSON.parse(row.projects) : { beginner: [], intermediate: [], advanced: [] }),
    certifications: Array.isArray(row.certifications) ? row.certifications : (typeof row.certifications === 'string' ? JSON.parse(row.certifications) : []),
    learningResources: Array.isArray(row.learning_resources) ? row.learning_resources : (typeof row.learning_resources === 'string' ? JSON.parse(row.learning_resources) : []),
    roadmap: Array.isArray(row.roadmap) ? row.roadmap : (typeof row.roadmap === 'string' ? JSON.parse(row.roadmap) : []),
    assessmentQuestions: Array.isArray(row.assessment_questions) ? row.assessment_questions : (typeof row.assessment_questions === 'string' ? JSON.parse(row.assessment_questions) : []),
    interviewQuestions: Array.isArray(row.interview_questions) ? row.interview_questions : (typeof row.interview_questions === 'string' ? JSON.parse(row.interview_questions) : []),
    practicePlatforms: Array.isArray(row.practice_platforms) ? row.practice_platforms : (typeof row.practice_platforms === 'string' ? JSON.parse(row.practice_platforms) : []),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

/**
 * Auto-seeds PostgreSQL `roles` table from static `itRoles` dataset
 * if the table is empty.
 */
async function ensureRolesSeeded(): Promise<void> {
  try {
    const res = await query(`SELECT COUNT(*) as count FROM roles WHERE status != 'archived';`);
    const count = parseInt(res.rows[0]?.count || '0', 10);
    if (count === 0) {
      console.log('🌱 PostgreSQL roles table is empty. Auto-seeding initial IT roles dataset...');
      for (const role of itRoles) {
        await upsertRoleInDb(role, 'system-autoseed');
      }
      console.log(`✅ Auto-seeded ${itRoles.length} roles into PostgreSQL!`);
    }
  } catch (err: any) {
    console.error('Auto-seed check warning:', err.message);
  }
}

export async function getAllRolesFromDb(): Promise<ITRole[]> {
  try {
    if (!isPostgresConfigured()) {
      return itRoles;
    }
    await ensureRolesSeeded();

    const res = await query(`
      SELECT * FROM roles
      WHERE status != 'archived'
      ORDER BY title ASC;
    `);

    if (res.rows.length === 0) {
      return itRoles;
    }

    return res.rows.map(mapRowToITRole);
  } catch (error: any) {
    console.error('Error fetching roles from PostgreSQL:', error.message);
    return itRoles;
  }
}

export async function getRoleBySlugFromDb(slug: string): Promise<ITRole | null> {
  try {
    if (!isPostgresConfigured()) {
      const found = itRoles.find(r => r.id === slug);
      return found || null;
    }
    await ensureRolesSeeded();

    const res = await query(
      `SELECT * FROM roles WHERE id = $1 AND status != 'archived' LIMIT 1;`,
      [slug]
    );

    if (res.rows.length === 0) {
      // If specific role doc is missing in PostgreSQL, seed it from static dataset
      const fallbackStatic = itRoles.find(r => r.id === slug);
      if (fallbackStatic) {
        console.log(`🌱 Role '${slug}' missing in PostgreSQL. Upserting static template...`);
        return await upsertRoleInDb(fallbackStatic, 'system-autoseed');
      }
      return null;
    }

    return mapRowToITRole(res.rows[0]);
  } catch (error: any) {
    console.error(`Error fetching role ${slug} from PostgreSQL:`, error.message);
    const found = itRoles.find(r => r.id === slug);
    return found || null;
  }
}

export async function searchRolesFromDb(queryStr: string, tags: string[] = [], category: string | null = null): Promise<ITRole[]> {
  const allRoles = await getAllRolesFromDb();

  return allRoles.filter(role => {
    const matchesSearch = !queryStr || 
      role.title.toLowerCase().includes(queryStr.toLowerCase()) ||
      role.shortDescription.toLowerCase().includes(queryStr.toLowerCase()) ||
      role.category.toLowerCase().includes(queryStr.toLowerCase()) ||
      (role.alternateNames && role.alternateNames.some(name => name.toLowerCase().includes(queryStr.toLowerCase()))) ||
      (role.technicalSkills && role.technicalSkills.some(skill => skill.toLowerCase().includes(queryStr.toLowerCase())));

    const matchesTags = tags.length === 0 || 
      tags.some(tag => role.tags && role.tags.includes(tag as any));

    const matchesCategory = !category || role.category === category;

    return matchesSearch && matchesTags && matchesCategory;
  });
}

/**
 * Upserts a role into PostgreSQL `roles` table.
 * Uses Set deduplication to prevent duplicate skills.
 * Records version audit in `role_versions`.
 * Invalidates Next.js route caches.
 */
export async function upsertRoleInDb(roleData: ITRole, adminUser: string = 'admin'): Promise<ITRole> {
  if (!isPostgresConfigured()) {
    throw new Error('PostgreSQL is not configured.');
  }

  // Enforce skill deduplication
  const deduplicatedTechSkills = Array.from(
    new Set((roleData.technicalSkills || []).map(s => s.trim()).filter(Boolean))
  );
  const deduplicatedSoftSkills = Array.from(
    new Set((roleData.softSkills || []).map(s => s.trim()).filter(Boolean))
  );
  const deduplicatedTools = Array.from(
    new Set((roleData.tools || []).map(t => t.trim()).filter(Boolean))
  );

  const now = new Date().toISOString();

  const savedRole = await transaction(async (client) => {
    // Check if role exists
    const existingRes = await client.query('SELECT * FROM roles WHERE id = $1 LIMIT 1;', [roleData.id]);
    const existing = existingRes.rows[0];
    const currentVersion = existing?.version || 1;
    const newVersion = existing ? currentVersion + 1 : 1;

    const upsertSql = `
      INSERT INTO roles (
        id, title, category, short_description, scope, job_market_projection,
        coding_level, work_mode, day_to_day_work, status, version, verified,
        tags, alternate_names, technical_skills, soft_skills, tools, industry,
        responsibilities, education, locations, related_roles, career_ladder,
        hiring_companies, stats, projects, certifications, learning_resources,
        roadmap, assessment_questions, interview_questions, practice_platforms,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31, $32,
        $33, $34
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        short_description = EXCLUDED.short_description,
        scope = EXCLUDED.scope,
        job_market_projection = EXCLUDED.job_market_projection,
        coding_level = EXCLUDED.coding_level,
        work_mode = EXCLUDED.work_mode,
        day_to_day_work = EXCLUDED.day_to_day_work,
        status = EXCLUDED.status,
        version = EXCLUDED.version,
        verified = EXCLUDED.verified,
        tags = EXCLUDED.tags,
        alternate_names = EXCLUDED.alternate_names,
        technical_skills = EXCLUDED.technical_skills,
        soft_skills = EXCLUDED.soft_skills,
        tools = EXCLUDED.tools,
        industry = EXCLUDED.industry,
        responsibilities = EXCLUDED.responsibilities,
        education = EXCLUDED.education,
        locations = EXCLUDED.locations,
        related_roles = EXCLUDED.related_roles,
        career_ladder = EXCLUDED.career_ladder,
        hiring_companies = EXCLUDED.hiring_companies,
        stats = EXCLUDED.stats,
        projects = EXCLUDED.projects,
        certifications = EXCLUDED.certifications,
        learning_resources = EXCLUDED.learning_resources,
        roadmap = EXCLUDED.roadmap,
        assessment_questions = EXCLUDED.assessment_questions,
        interview_questions = EXCLUDED.interview_questions,
        practice_platforms = EXCLUDED.practice_platforms,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;

    const values = [
      roleData.id,
      roleData.title,
      roleData.category,
      roleData.shortDescription || '',
      roleData.scope || '',
      roleData.jobMarketProjection || '',
      roleData.codingLevel || '',
      roleData.workMode || '',
      roleData.dayToDayWork || '',
      roleData.status || 'approved',
      newVersion,
      roleData.verified !== false,
      JSON.stringify(roleData.tags || []),
      JSON.stringify(roleData.alternateNames || []),
      JSON.stringify(deduplicatedTechSkills),
      JSON.stringify(deduplicatedSoftSkills),
      JSON.stringify(deduplicatedTools),
      JSON.stringify(roleData.industry || []),
      JSON.stringify(roleData.responsibilities || []),
      JSON.stringify(roleData.education || []),
      JSON.stringify(roleData.locations || []),
      JSON.stringify(roleData.relatedRoles || []),
      JSON.stringify(roleData.careerLadder || []),
      JSON.stringify(roleData.hiringCompanies || []),
      JSON.stringify(roleData.stats || {}),
      JSON.stringify(roleData.projects || { beginner: [], intermediate: [], advanced: [] }),
      JSON.stringify(roleData.certifications || []),
      JSON.stringify(roleData.learningResources || []),
      JSON.stringify(roleData.roadmap || []),
      JSON.stringify(roleData.assessmentQuestions || []),
      JSON.stringify(roleData.interviewQuestions || []),
      JSON.stringify(roleData.practicePlatforms || []),
      existing?.created_at || now,
      now
    ];

    const result = await client.query(upsertSql, values);
    const updatedRow = result.rows[0];

    // Version audit tracking
    if (existing) {
      await client.query(`
        INSERT INTO role_versions (role_id, version, previous_data, new_data, approved_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [
        roleData.id,
        currentVersion,
        JSON.stringify(mapRowToITRole(existing)),
        JSON.stringify(mapRowToITRole(updatedRow)),
        adminUser,
        now
      ]);
    }

    return mapRowToITRole(updatedRow);
  });

  // Revalidate Next.js cache
  try {
    revalidatePath(`/roles/${roleData.id}`);
    revalidatePath('/');
    revalidatePath('/compare');
    revalidatePath('/admin/skill-converter');
  } catch (e) {}

  return savedRole;
}

export async function deleteRoleInDb(slug: string): Promise<boolean> {
  if (!isPostgresConfigured()) {
    throw new Error('PostgreSQL is not configured.');
  }

  const res = await query(`DELETE FROM roles WHERE id = $1;`, [slug]);
  const isDeleted = (res.rowCount ?? 0) > 0;

  try {
    revalidatePath(`/roles/${slug}`);
    revalidatePath('/roles');
    revalidatePath('/');
    revalidatePath('/compare');
    revalidatePath('/admin/data-management');
    revalidatePath('/admin/skill-converter');
  } catch (e) {}

  return isDeleted;
}

export async function addSkillToRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', skill: string): Promise<ITRole> {
  const cleanSkill = skill.trim();
  if (!cleanSkill) throw new Error('Skill name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const currentSkills = new Set(role[field] || []);
  currentSkills.add(cleanSkill);
  role[field] = Array.from(currentSkills);

  return upsertRoleInDb(role, 'admin');
}

export async function removeSkillFromRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', skill: string): Promise<ITRole> {
  const cleanSkill = skill.trim();
  if (!cleanSkill) throw new Error('Skill name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  role[field] = (role[field] || []).filter(s => s.toLowerCase() !== cleanSkill.toLowerCase());

  return upsertRoleInDb(role, 'admin');
}

export async function editSkillInRoleInDb(slug: string, field: 'technicalSkills' | 'softSkills', oldSkill: string, newSkill: string): Promise<ITRole> {
  const cleanNew = newSkill.trim();
  if (!cleanNew) throw new Error('New skill name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const skills = (role[field] || []).filter(s => s.toLowerCase() !== oldSkill.toLowerCase());
  skills.push(cleanNew);
  role[field] = Array.from(new Set(skills));

  return upsertRoleInDb(role, 'admin');
}

export async function getUniqueCategoriesFromDb(): Promise<string[]> {
  try {
    const res = await query(`
      SELECT DISTINCT category FROM roles WHERE status != 'archived' ORDER BY category ASC;
    `);
    return res.rows.map(r => r.category).filter(Boolean);
  } catch (e) {
    const allRoles = await getAllRolesFromDb();
    return Array.from(new Set(allRoles.map(r => r.category).filter(Boolean))).sort();
  }
}

export async function addProjectToRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', project: string): Promise<ITRole> {
  const cleanProject = project.trim();
  if (!cleanProject) throw new Error('Project name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const current = new Set(role.projects?.[level] || []);
  current.add(cleanProject);

  role.projects = {
    beginner: role.projects?.beginner || [],
    intermediate: role.projects?.intermediate || [],
    advanced: role.projects?.advanced || [],
    [level]: Array.from(current)
  };

  return upsertRoleInDb(role, 'admin');
}

export async function removeProjectFromRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', project: string): Promise<ITRole> {
  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const current = (role.projects?.[level] || []).filter(p => p !== project);

  role.projects = {
    beginner: role.projects?.beginner || [],
    intermediate: role.projects?.intermediate || [],
    advanced: role.projects?.advanced || [],
    [level]: current
  };

  return upsertRoleInDb(role, 'admin');
}

export async function editProjectInRoleInDb(slug: string, level: 'beginner' | 'intermediate' | 'advanced', oldProject: string, newProject: string): Promise<ITRole> {
  const cleanNew = newProject.trim();
  if (!cleanNew) throw new Error('New project name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const current = (role.projects?.[level] || []).filter(p => p !== oldProject);
  current.push(cleanNew);

  role.projects = {
    beginner: role.projects?.beginner || [],
    intermediate: role.projects?.intermediate || [],
    advanced: role.projects?.advanced || [],
    [level]: current
  };

  return upsertRoleInDb(role, 'admin');
}

export async function addCertificationToRoleInDb(slug: string, cert: { name: string; type: 'FREE' | 'PAID' }): Promise<ITRole> {
  const cleanName = cert.name.trim();
  if (!cleanName) throw new Error('Certification name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const certs = (role.certifications || []).filter(c => c.name.toLowerCase() !== cleanName.toLowerCase());
  certs.push({ name: cleanName, type: cert.type });
  role.certifications = certs;

  return upsertRoleInDb(role, 'admin');
}

export async function removeCertificationFromRoleInDb(slug: string, certName: string): Promise<ITRole> {
  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  role.certifications = (role.certifications || []).filter(c => c.name.toLowerCase() !== certName.toLowerCase());

  return upsertRoleInDb(role, 'admin');
}

export async function editCertificationInRoleInDb(slug: string, oldName: string, updatedCert: { name: string; type: 'FREE' | 'PAID' }): Promise<ITRole> {
  const cleanNewName = updatedCert.name.trim();
  if (!cleanNewName) throw new Error('New certification name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const certs = (role.certifications || []).filter(c => c.name.toLowerCase() !== oldName.toLowerCase());
  certs.push({ name: cleanNewName, type: updatedCert.type });
  role.certifications = certs;

  return upsertRoleInDb(role, 'admin');
}

export async function addToolToRoleInDb(slug: string, tool: string): Promise<ITRole> {
  const cleanTool = tool.trim();
  if (!cleanTool) throw new Error('Tool name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const tools = new Set(role.tools || []);
  tools.add(cleanTool);
  role.tools = Array.from(tools);

  return upsertRoleInDb(role, 'admin');
}

export async function removeToolFromRoleInDb(slug: string, tool: string): Promise<ITRole> {
  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  role.tools = (role.tools || []).filter(t => t.toLowerCase() !== tool.toLowerCase());

  return upsertRoleInDb(role, 'admin');
}

export async function editToolInRoleInDb(slug: string, oldTool: string, newTool: string): Promise<ITRole> {
  const cleanNew = newTool.trim();
  if (!cleanNew) throw new Error('New tool name cannot be empty.');

  const role = await getRoleBySlugFromDb(slug);
  if (!role) throw new Error(`Role ${slug} not found.`);

  const tools = (role.tools || []).filter(t => t.toLowerCase() !== oldTool.toLowerCase());
  tools.push(cleanNew);
  role.tools = Array.from(new Set(tools));

  return upsertRoleInDb(role, 'admin');
}
