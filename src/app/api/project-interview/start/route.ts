import { NextResponse } from 'next/server';
import { startInterviewSession } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, mode } = body;

    const session = await startInterviewSession({
      userId: 'default_student',
      projectId: projectId || 'default_project_docs',
      mode: mode || 'FULL',
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Error in /api/project-interview/start:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to start interview session' }, { status: 500 });
  }
}
