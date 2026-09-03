import { getDb, isMongoConfigured } from '../config/mongodb';

export interface AuditLogDocument {
  _id?: string;
  adminId: string;
  action: string;
  roleId?: string;
  before?: any;
  after?: any;
  timestamp: string;
  status: 'success' | 'failed';
  details?: string;
}

const COLLECTION_NAME = 'adminAuditLogs';

export async function logAdminAction(logData: Omit<AuditLogDocument, 'timestamp'>): Promise<void> {
  try {
    if (!isMongoConfigured()) return;
    const db = await getDb();
    const doc: AuditLogDocument = {
      ...logData,
      timestamp: new Date().toISOString()
    };
    await db.collection<AuditLogDocument>(COLLECTION_NAME).insertOne(doc);
  } catch (error) {
    console.error('Failed to write admin audit log:', error);
  }
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogDocument[]> {
  try {
    if (!isMongoConfigured()) return [];
    const db = await getDb();
    const docs = await db.collection<AuditLogDocument>(COLLECTION_NAME)
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return docs.map(doc => ({
      ...doc,
      _id: doc._id?.toString()
    }));
  } catch (error) {
    console.error('Failed to fetch admin audit logs:', error);
    return [];
  }
}
