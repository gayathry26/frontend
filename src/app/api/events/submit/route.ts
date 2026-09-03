import { NextResponse } from 'next/server';
import { submitOrganizerEvent } from '@/backend/services/eventService';
import { EventSubmissionSchema } from '@/backend/validations/eventSchemas';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = EventSubmissionSchema.parse(body);

    const event = await submitOrganizerEvent(validated);

    return NextResponse.json({
      success: true,
      message: 'Opportunity submitted successfully and is pending admin review.',
      event
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.errors || err.message || 'Validation error' }, { status: 400 });
  }
}
