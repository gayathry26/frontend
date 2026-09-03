/**
 * Organizer Submissions Source Adapter
 *
 * Reads approved organizer-submitted events from MongoDB Atlas (status: PENDING_REVIEW)
 * and marks them for potential sync/inclusion in the public listing.
 *
 * This source does NOT call an external API — it reads from the local MongoDB collection.
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';
import { getDb, isMongoConfigured } from '../../../config/mongodb';
import { EventDocument } from '../../../types/event';

const COLLECTION_NAME = 'events';

export class SubmissionSource implements EventSource {
  name = 'OrganizerSubmission';

  async isAvailable(): Promise<boolean> {
    return isMongoConfigured();
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];
    let error: string | null = null;

    try {
      if (!isMongoConfigured()) {
        return { events: [], fetchedCount: 0, error: 'MongoDB not configured' };
      }

      const db = await getDb();
      const submissions = await db.collection<EventDocument>(COLLECTION_NAME)
        .find({ status: 'PENDING_REVIEW' })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

      for (const doc of submissions) {
        allEvents.push({
          externalId: `submission-${doc._id?.toString() || Math.random().toString(36).slice(2)}`,
          platform: 'OrganizerSubmission',
          title: doc.title,
          description: doc.description || null,
          organizerName: doc.organizer?.name || null,
          organizerWebsite: doc.organizer?.website || null,
          registrationDeadline: doc.dates?.registrationDeadline || null,
          startDate: doc.dates?.startDate || null,
          endDate: doc.dates?.endDate || null,
          mode: doc.location?.mode || null,
          country: doc.location?.country || null,
          state: doc.location?.state || null,
          city: doc.location?.city || null,
          category: doc.type || null,
          tags: [],
          skills: doc.skills || [],
          prizeAmount: doc.prize?.amount ?? null,
          prizeCurrency: doc.prize?.currency || null,
          prizeDescription: doc.prize?.description || null,
          registrationUrl: doc.registrationUrl || null,
          sourceUrl: null,
          eligibility: doc.eligibility || [],
          rawPayload: doc as any
        });
      }

      console.log(`[SubmissionSource] Loaded ${allEvents.length} pending organizer submission(s) from MongoDB.`);
    } catch (err: any) {
      error = `SubmissionSource error: ${err.message}`;
      console.error(`[SubmissionSource] ${error}`);
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
