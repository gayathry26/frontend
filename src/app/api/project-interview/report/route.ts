import { NextResponse } from 'next/server';
import { getSessionById } from '@/backend/interview/adaptiveInterviewEngine';
import { generateAssessmentReport } from '@/backend/reports/assessmentReport';
import { query, isPostgresConfigured } from '@/backend/config/postgres';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    let session = getSessionById(sessionId);

    if (!session && isPostgresConfigured()) {
      try {
        const res = await query(`SELECT data FROM adaptive_interview_sessions WHERE session_id = $1 LIMIT 1;`, [sessionId]);
        if (res.rows.length > 0) {
          session = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
        }
      } catch {}
    }

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const report = session.finalReport || generateAssessmentReport(session);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/report:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
