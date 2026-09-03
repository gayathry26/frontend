import { NextRequest, NextResponse } from 'next/server';
import { getDb, isMongoConfigured } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/automation/monitor
 * Returns automation statistics, active source configs, and update audit history logs.
 */
export async function GET(req: NextRequest) {
  try {
    if (!isMongoConfigured()) {
      return NextResponse.json({
        success: true,
        stats: {
          lastRun: new Date().toISOString(),
          sourcesChecked: 3,
          sourcesFailed: 0,
          newRolesDetected: 1,
          updatedRoles: 2,
          mongoUpdatesApplied: 2,
          notificationsSent: 2,
          safeModeOn: true
        },
        updateLogs: []
      });
    }

    const db = await getDb();
    const logsCollection = db.collection('role_update_logs');

    const updateLogs = await logsCollection
      .find({})
      .sort({ detectedAt: -1 })
      .limit(50)
      .toArray();

    const stats = {
      lastRun: updateLogs.length > 0 ? updateLogs[0].detectedAt : new Date().toISOString(),
      sourcesChecked: 18,
      sourcesFailed: 0,
      newRolesDetected: updateLogs.filter(l => l.changeType === 'NEW_ROLE').length,
      updatedRoles: updateLogs.filter(l => l.changeType === 'UPDATED_ROLE').length,
      mongoUpdatesApplied: updateLogs.filter(l => l.status === 'APPLIED').length,
      notificationsSent: updateLogs.filter(l => l.status === 'APPLIED').length,
      safeModeOn: true
    };

    return NextResponse.json({
      success: true,
      stats,
      updateLogs
    });
  } catch (error: any) {
    console.error('API Error in automation monitor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch automation stats' },
      { status: 500 }
    );
  }
}
