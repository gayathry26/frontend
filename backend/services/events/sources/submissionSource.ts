/**
 * Organizer Submissions Source Adapter
 *
 * Reads approved organizer-submitted events from PostgreSQL (status: PENDING_REVIEW)
 * and marks them for potential sync/inclusion in the public listing.
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';
import { query, isPostgresConfigured } from '../../../config/postgres';

export class SubmissionSource implements EventSource {
  name = 'OrganizerSubmission';

  async isAvailable(): Promise<boolean> {
    return isPostgresConfigured();
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];
    let error: string | null = null;

    try {
      if (!isPostgresConfigured()) {
        return { events: [], fetchedCount: 0, error: 'PostgreSQL not configured' };
      }

      const res = await query(`
        SELECT * FROM events
        WHERE status = 'PENDING_REVIEW'
        ORDER BY created_at DESC
        LIMIT 200;
      `);

      for (const row of res.rows) {
        const organizer = typeof row.organizer === 'string' ? JSON.parse(row.organizer) : (row.organizer || {});
        const location = typeof row.location === 'string' ? JSON.parse(row.location) : (row.location || {});
        const dates = typeof row.dates === 'string' ? JSON.parse(row.dates) : (row.dates || {});
        const prize = typeof row.prize === 'string' ? JSON.parse(row.prize) : (row.prize || {});
        const skills = Array.isArray(row.skills) ? row.skills : (typeof row.skills === 'string' ? JSON.parse(row.skills) : []);

        allEvents.push({
          externalId: `submission-${row.id}`,
          platform: 'OrganizerSubmission',
          title: row.title,
          description: row.description || null,
          organizerName: organizer.name || null,
          organizerWebsite: organizer.website || null,
          registrationDeadline: dates.registrationDeadline || null,
          startDate: dates.startDate || null,
          endDate: dates.endDate || null,
          mode: location.mode || null,
          country: location.country || null,
          state: location.state || null,
          city: location.city || null,
          category: row.type || null,
          tags: [],
          skills: skills,
          prizeAmount: prize.amount ?? null,
          prizeCurrency: prize.currency || null,
          prizeDescription: prize.description || null,
          registrationUrl: row.url || null,
          sourceUrl: row.url || null,
          rawPayload: row
        });
      }
    } catch (err: any) {
      error = err.message || 'Unknown error fetching submissions';
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
