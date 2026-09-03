import { NextResponse } from 'next/server';
import { approveContribution } from '@/services/contributionService';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const reviewerName = body.reviewerName || 'Admin';
    const adminNotes = body.adminNotes;

    const result = await approveContribution(params.id, reviewerName, adminNotes);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contribution approved and published to live MongoDB database.',
      role: result.updatedRole
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval failed' }, { status: 500 });
  }
}
