import { NextResponse } from 'next/server';
import { getInterviewHistory } from '@/backend/services/projectInterviewService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = await getInterviewHistory('default_student');
    return NextResponse.json({ success: true, history });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
