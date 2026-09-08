import { NextResponse } from 'next/server';
import { ingestProjectDocumentation } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { readmeContent } = body;

    if (!readmeContent || typeof readmeContent !== 'string' || !readmeContent.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide valid README content.' },
        { status: 400 }
      );
    }

    const analysis = await ingestProjectDocumentation(readmeContent);

    return NextResponse.json({
      success: true,
      projectProfile: analysis.profile,
      claims: analysis.claims,
      initialQuestions: [],
      readmeContent: readmeContent.trim(),
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/analyze:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to analyze project README' }, { status: 500 });
  }
}
