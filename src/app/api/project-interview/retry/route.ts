import { NextResponse } from 'next/server';
import { retryQuestionEvaluation } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, questionId, newAnswer } = body;

    if (!sessionId || !questionId || !newAnswer) {
      return NextResponse.json({ success: false, error: 'sessionId, questionId, and newAnswer are required' }, { status: 400 });
    }

    const result = await retryQuestionEvaluation(sessionId, questionId, newAnswer);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
