import { query, isPostgresConfigured } from '../config/postgres';

export interface AuditLogDocument {
  _id?: string;
  adminId: string;
  action: string;
  roleId?: string;
  roleName?: string;
  field?: string;
  before?: any;
  after?: any;
  timestamp: string;
  status: 'success' | 'failed';
  details?: string;
  performedBy?: string;
}

function mapRowToAuditLog(row: any): AuditLogDocument {
  return {
    _id: String(row.id),
    adminId: row.admin_id || 'admin',
    action: row.action,
    roleId: row.role_id || undefined,
    roleName: row.role_name || undefined,
    field: row.field || undefined,
    before: row.before_state,
    after: row.after_state,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    status: row.status || 'success',
    details: row.details || undefined,
    performedBy: row.performed_by || 'admin'
  };
}

export async function logAdminAction(logData: Omit<AuditLogDocument, 'timestamp'>): Promise<void> {
  try {
    if (!isPostgresConfigured()) return;
    const now = new Date().toISOString();

    await query(`
      INSERT INTO audit_logs (
        admin_id, action, role_id, role_name, field,
        before_state, after_state, details, status, performed_by, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
    `, [
      logData.adminId || 'admin',
      logData.action,
      logData.roleId || null,
      logData.roleName || null,
      logData.field || null,
      JSON.stringify(logData.before || null),
      JSON.stringify(logData.after || null),
      logData.details || null,
      logData.status || 'success',
      logData.performedBy || logData.adminId || 'admin',
      now
    ]);
  } catch (error) {
    console.error('Failed to write admin audit log to PostgreSQL:', error);
  }
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogDocument[]> {
  try {
    if (!isPostgresConfigured()) return [];

    const res = await query(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT $1;
    `, [limit]);

    return res.rows.map(mapRowToAuditLog);
  } catch (error) {
    console.error('Failed to fetch admin audit logs from PostgreSQL:', error);
    return [];
  }
}
