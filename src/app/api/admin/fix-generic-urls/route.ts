/**
 * One-time cleanup API endpoint: GET /api/admin/fix-generic-urls
 *
 * Finds all events in PostgreSQL whose registrationUrl is a generic platform
 * homepage or listing page and marks them registrationAvailable: false.
 *
 * This endpoint is ADMIN-ONLY.
 */

import { NextResponse } from 'next/server';
import { query, isPostgresConfigured } from '@/backend/config/postgres';
import { isPlaceholderUrl } from '@/backend/utils/validateEventUrl';

const KNOWN_GENERIC_URLS = new Set([
  'https://devfolio.co',
  'https://devfolio.co/',
  'http://devfolio.co',
  'https://devfolio.co/hackathons',
  'https://devfolio.co/hackathons/',
  'http://devfolio.co/hackathons',
  'https://devfolio.co/explore',
  'https://unstop.com',
  'https://unstop.com/',
  'https://unstop.com/hackathons',
  'https://unstop.com/competitions',
  'https://unstop.com/opportunities',
  'https://devpost.com',
  'https://devpost.com/',
  'https://devpost.com/hackathons',
  'https://www.hackerearth.com',
  'https://www.hackerearth.com/',
  'https://www.hackerearth.com/challenges',
  'https://mlh.io',
  'https://mlh.io/',
  'https://mlh.io/events',
  'https://hack2skill.com',
  'https://hack2skill.com/',
  'https://hack2skill.com/events'
]);

export async function GET() {
  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'PostgreSQL not configured' }, { status: 503 });
  }

  const { rows: allEvents } = await query(
    `SELECT id, title, "registrationUrl", status FROM events WHERE "registrationUrl" IS NOT NULL AND "registrationUrl" != ''`
  );

  const fixed: string[] = [];
  const clean: string[] = [];
  const errors: string[] = [];

  for (const event of allEvents) {
    const url = event.registrationUrl as string | null;
    if (!url) continue;

    const urlTrimmed = url.trim();
    const isGeneric = KNOWN_GENERIC_URLS.has(urlTrimmed) || isPlaceholderUrl(urlTrimmed);

    if (isGeneric) {
      try {
        const newStatus = event.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING_REVIEW';
        await query(
          `UPDATE events
           SET "registrationUrl" = NULL,
               "registrationAvailable" = false,
               status = $1,
               "updatedAt" = NOW()
           WHERE id = $2`,
          [newStatus, event.id]
        );
        fixed.push(`${event.title} (was: ${url})`);
      } catch (err: any) {
        errors.push(`${event.title}: ${err.message}`);
      }
    } else {
      clean.push(event.title);
    }
  }

  return NextResponse.json({
    success: true,
    checked: allEvents.length,
    fixed: fixed.length,
    clean: clean.length,
    errors: errors.length,
    fixedEvents: fixed,
    cleanEvents: clean,
    errorDetails: errors
  });
}
