import { NextResponse } from 'next/server';
import { submitAdaptiveAnswer } from '@/backend/interview/adaptiveInterviewEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, answer } = body;

    if (!sessionId || typeof answer !== 'string') {
      return NextResponse.json(
        { success: false, error: 'sessionId and answer string are required.' },
        { status: 400 }
      );
    }

    const result = await submitAdaptiveAnswer({
      sessionId,
      answer,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/project-interview/answer:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to evaluate answer' },
      { status: 500 }
    );
  }
}
