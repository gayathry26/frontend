import { NextResponse } from 'next/server';
import { submitAnswerAndGetNext } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, answer, answerMode } = body;

    if (!sessionId || !answer) {
      return NextResponse.json({ success: false, error: 'sessionId and answer are required' }, { status: 400 });
    }

    const result = await submitAnswerAndGetNext({
      sessionId,
      answer,
      answerMode: answerMode || 'text',
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error in /api/project-interview/answer:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
