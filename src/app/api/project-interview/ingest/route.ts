import { NextResponse } from 'next/server';
import { ingestProjectDocumentation } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readmeContent, projectId } = body;

    if (!readmeContent || typeof readmeContent !== 'string' || !readmeContent.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid Markdown README content.' },
        { status: 400 }
      );
    }

    const result = await ingestProjectDocumentation(readmeContent, projectId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/ingest:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to ingest project documentation' }, { status: 500 });
  }
}
