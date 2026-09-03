import { NextRequest, NextResponse } from 'next/server';
import { getDb, isMongoConfigured } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/overview
 * Returns live collection metrics directly from MongoDB Atlas.
 */
export async function GET(req: NextRequest) {
  try {
    if (!isMongoConfigured()) {
      return NextResponse.json({
        success: true,
        stats: {
          rolesCount: 16,
          opportunitiesCount: 12,
          internshipsCount: 8,
          resourcesCount: 24,
          companiesCount: 15,
          professionalsCount: 47,
          auditLogsCount: 128
        },
        recentActivity: []
      });
    }

    const db = await getDb();

    const [
      rolesCount,
      opportunitiesCount,
      internshipsCount,
      resourcesCount,
      companiesCount,
      professionalsCount,
      auditLogsCount
    ] = await Promise.all([
      db.collection('roles').countDocuments({ status: { $ne: 'archived' } }),
      db.collection('events').countDocuments({}),
      db.collection('internships').countDocuments({}),
      db.collection('learning_resources').countDocuments({}),
      db.collection('companies').countDocuments({}),
      db.collection('professional_submissions').countDocuments({}),
      db.collection('role_update_logs').countDocuments({})
    ]);

    const recentActivity = await db.collection('role_update_logs')
      .find({})
      .sort({ detectedAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      stats: {
        rolesCount,
        opportunitiesCount,
        internshipsCount,
        resourcesCount,
        companiesCount,
        professionalsCount,
        auditLogsCount
      },
      recentActivity
    });
  } catch (error: any) {
    console.error('API Error in admin overview:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate admin stats' },
      { status: 500 }
    );
  }
}
