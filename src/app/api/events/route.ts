import { NextResponse } from 'next/server';
import { getEvents } from '@/backend/services/eventService';
import { EventCategory, EventMode, EventStatus } from '@/backend/types/event';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = (searchParams.get('category') as EventCategory) || undefined;
    const mode = (searchParams.get('mode') as EventMode) || undefined;
    const state = searchParams.get('state') || undefined;
    const city = searchParams.get('city') || undefined;
    const role = searchParams.get('role') || undefined;
    const skill = searchParams.get('skill') || undefined;
    const status = (searchParams.get('status') as EventStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const events = await getEvents({
      category,
      mode,
      state,
      city,
      role,
      skill,
      status,
      search
    });

    return NextResponse.json({ events, count: events.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch events' }, { status: 500 });
  }
}
