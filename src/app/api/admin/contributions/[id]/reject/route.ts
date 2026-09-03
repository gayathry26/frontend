import { NextResponse } from 'next/server';
import { rejectContribution } from '@/services/contributionService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reviewerName = body.reviewerName || 'Admin';
    const adminNotes = body.adminNotes || 'Rejected during review';

    const result = await rejectContribution(id, reviewerName, adminNotes);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contribution rejected.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Rejection failed' }, { status: 500 });
  }
}
