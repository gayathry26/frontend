import { NextResponse } from 'next/server';
import { getEventBySlug } from '@/backend/services/eventService';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const event = await getEventBySlug(resolvedParams.slug);

    if (!event) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch event details' }, { status: 500 });
  }
}
