import { NextResponse } from 'next/server';
import { submitContribution, getContributions } from '@/services/contributionService';
import { RoleContributionSubmissionSchema } from '@/lib/validations/roleSchemas';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const status = statusParam || undefined;

    const contributions = await getContributions(status);
    return NextResponse.json({ contributions, count: contributions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch contributions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RoleContributionSubmissionSchema.parse(body);

    const contribution = await submitContribution(
      validated.roleId,
      validated.contributor,
      validated.submittedData,
      validated.source || 'IT Professional Web Submission'
    );

    return NextResponse.json({
      success: true,
      message: 'Contribution submitted successfully and is pending admin review.',
      contribution
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || err.message || 'Validation error' }, { status: 400 });
  }
}
