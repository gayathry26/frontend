import { NextResponse } from 'next/server';
import { getSessionById } from '@/backend/interview/adaptiveInterviewEngine';
import { generateAssessmentReport } from '@/backend/reports/assessmentReport';
import { getDb, isMongoConfigured } from '@/backend/config/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    let session = getSessionById(sessionId);

    if (!session && isMongoConfigured()) {
      try {
        const db = await getDb();
        const doc = await db.collection('adaptive_interview_sessions').findOne({ sessionId });
        if (doc) {
          session = doc as any;
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
