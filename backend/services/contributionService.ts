import { query, transaction, isPostgresConfigured } from '../config/postgres';
import { ContributionDocument, ContributorInfo, ITRole, RoleVersionDocument } from '../types/role';
import { getRoleBySlugFromDb, upsertRoleInDb } from './roleService';

function mapRowToContribution(row: any): ContributionDocument {
  return {
    _id: String(row.id),
    roleId: row.role_id,
    contributor: typeof row.contributor === 'string' ? JSON.parse(row.contributor) : (row.contributor || {}),
    submittedData: typeof row.submitted_data === 'string' ? JSON.parse(row.submitted_data) : (row.submitted_data || {}),
    source: row.source || 'IT Professional Submission',
    status: row.status || 'pending',
    adminNotes: row.admin_notes || undefined,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

export async function submitContribution(
  roleId: string,
  contributor: ContributorInfo,
  submittedData: Partial<ITRole>,
  source: string = 'IT Professional Submission'
): Promise<ContributionDocument> {
  const now = new Date().toISOString();
  const doc: ContributionDocument = {
    roleId,
    contributor,
    submittedData,
    source,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };

  if (!isPostgresConfigured()) {
    return { ...doc, _id: 'temp-id-' + Date.now() };
  }

  const res = await query(`
    INSERT INTO contributions (
      role_id, contributor, submitted_data, source, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $5)
    RETURNING *;
  `, [
    roleId,
    JSON.stringify(contributor),
    JSON.stringify(submittedData),
    source,
    now
  ]);

  return mapRowToContribution(res.rows[0]);
}

export async function getContributions(status?: 'pending' | 'approved' | 'rejected'): Promise<ContributionDocument[]> {
  if (!isPostgresConfigured()) {
    return [];
  }

  const sql = status
    ? `SELECT * FROM contributions WHERE status = $1 ORDER BY created_at DESC;`
    : `SELECT * FROM contributions ORDER BY created_at DESC;`;
  const params = status ? [status] : [];

  const res = await query(sql, params);
  return res.rows.map(mapRowToContribution);
}

export async function approveContribution(
  contributionId: string,
  reviewerName: string = 'Admin',
  adminNotes?: string
): Promise<{ success: boolean; updatedRole?: ITRole; error?: string }> {
  if (!isPostgresConfigured()) {
    return { success: false, error: 'PostgreSQL connection not configured.' };
  }

  const idNum = parseInt(contributionId, 10);
  if (isNaN(idNum)) {
    return { success: false, error: 'Invalid contribution ID' };
  }

  return await transaction(async (client) => {
    const checkRes = await client.query(`SELECT * FROM contributions WHERE id = $1 FOR UPDATE;`, [idNum]);
    if (checkRes.rows.length === 0) {
      return { success: false, error: 'Contribution not found' };
    }

    const contribution = mapRowToContribution(checkRes.rows[0]);
    if (contribution.status === 'approved') {
      return { success: false, error: 'Contribution has already been approved' };
    }

    const existingRole = await getRoleBySlugFromDb(contribution.roleId);
    const baseRole: ITRole = existingRole || {
      id: contribution.roleId,
      title: contribution.submittedData.title || contribution.roleId,
      category: contribution.submittedData.category || 'General IT',
      tags: contribution.submittedData.tags || ['Hybrid'],
      shortDescription: contribution.submittedData.shortDescription || '',
      alternateNames: contribution.submittedData.alternateNames || [],
      technicalSkills: contribution.submittedData.technicalSkills || [],
      softSkills: contribution.submittedData.softSkills || [],
      careerLadder: contribution.submittedData.careerLadder || [],
      scope: contribution.submittedData.scope || '',
      jobMarketProjection: contribution.submittedData.jobMarketProjection || '',
      industry: contribution.submittedData.industry || []
    };

    const mergedRole: ITRole = {
      ...baseRole,
      ...contribution.submittedData,
      id: baseRole.id
    };

    const updatedRole = await upsertRoleInDb(mergedRole, reviewerName);

    const now = new Date().toISOString();
    await client.query(`
      UPDATE contributions
      SET status = 'approved',
          admin_notes = $1,
          reviewed_at = $2,
          reviewer_name = $3,
          updated_at = $2
      WHERE id = $4;
    `, [adminNotes || contribution.adminNotes || null, now, reviewerName, idNum]);

    return { success: true, updatedRole };
  });
}

export async function rejectContribution(
  contributionId: string,
  reviewerName: string = 'Admin',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPostgresConfigured()) {
    return { success: false, error: 'PostgreSQL connection not configured.' };
  }

  const idNum = parseInt(contributionId, 10);
  if (isNaN(idNum)) {
    return { success: false, error: 'Invalid contribution ID' };
  }

  const now = new Date().toISOString();
  const res = await query(`
    UPDATE contributions
    SET status = 'rejected',
        admin_notes = $1,
        reviewed_at = $2,
        reviewer_name = $3,
        updated_at = $2
    WHERE id = $4;
  `, [adminNotes || 'Rejected during review', now, reviewerName, idNum]);

  if ((res.rowCount ?? 0) === 0) {
    return { success: false, error: 'Contribution not found' };
  }

  return { success: true };
}

export async function getRoleVersionHistory(roleId: string): Promise<RoleVersionDocument[]> {
  if (!isPostgresConfigured()) return [];

  const res = await query(`
    SELECT * FROM role_versions
    WHERE role_id = $1
    ORDER BY version DESC;
  `, [roleId]);

  return res.rows.map(row => ({
    _id: String(row.id),
    roleId: row.role_id,
    version: row.version,
    previousData: typeof row.previous_data === 'string' ? JSON.parse(row.previous_data) : row.previous_data,
    newData: typeof row.new_data === 'string' ? JSON.parse(row.new_data) : row.new_data,
    approvedBy: row.approved_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  }));
}
