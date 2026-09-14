/**
 * Event Aggregator — Main Orchestration Engine
 *
 * Coordinates the complete multi-source event ingestion pipeline:
 *
 * 1. Checks availability of all registered sources
 * 2. Fetches events from available sources in parallel
 * 3. Normalizes raw events into the canonical EventDocument format
 * 4. Filters for India-relevant events
 * 5. Deduplicates events across platforms
 * 6. Matches career roles
 * 7. Upserts events into PostgreSQL
 * 8. Logs sync metrics
 *
 * Important:
 * - A failure in one source must NEVER stop other sources.
 * - A failed source must NEVER cause existing database records to be deleted.
 * - Event dates must come from the source. Never fabricate dates.
 */

import { EventDocument } from '../../types/event';
import { EventSource } from './sources/EventSource';

import {
  isPostgresConfigured,
  query
} from '../../config/postgres';

import { upsertEvent } from '../eventService';

import { BrabbleSource } from './sources/brabble';
import { DevfolioSource } from './sources/devfolio';
import { SubmissionSource } from './sources/submissionSource';
import { UnstopSource } from './sources/unstop';

import {
  isIndiaRelevant,
  normalizeRawEvent
} from './eventNormalizer';

import {
  deduplicateEvents,
  EventWithSources
} from './eventDeduplicator';

import {
  matchRolesForAllEvents
} from './eventRoleMatcher';

// ---------------------------------------------------------------------------
// Sync Report
// ---------------------------------------------------------------------------

export interface SyncReport {
  syncId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;

  sourcesAttempted: string[];
  sourcesSucceeded: string[];
  sourcesFailed: string[];

  fetchedCount: number;
  indiaRelevantCount: number;
  afterDeduplicationCount: number;

  newCount: number;
  updatedCount: number;
  expiredCount: number;
  failedCount: number;

  errors: string[];
}

// ---------------------------------------------------------------------------
// Source Registry
// ---------------------------------------------------------------------------

/**
 * All active event sources.
 *
 * HackerEarth direct ingestion is intentionally disabled for now because
 * the current direct source has not been producing reliable event data.
 *
 * Brabble already aggregates multiple platforms, including HackerEarth,
 * so it provides broader coverage without requiring another fragile
 * integration here.
 */
export function getAllSources(): EventSource[] {
  return [
    new DevfolioSource(),
    new BrabbleSource(),
    new UnstopSource(),
    new SubmissionSource()
  ];
}

export function buildSourceRegistry(): EventSource[] {
  return getAllSources();
}

// ---------------------------------------------------------------------------
// PostgreSQL Helpers
// ---------------------------------------------------------------------------

async function fetchAllRoles(): Promise<any[]> {
  try {
    const res = await query(`
      SELECT
        id,
        title,
        category,
        technical_skills AS "technicalSkills"
      FROM roles
      LIMIT 500;
    `);

    return res.rows;
  } catch (err: any) {
    console.warn(
      '[Aggregator] Failed to fetch roles for matching:',
      err.message
    );

    return [];
  }
}

/**
 * Upsert one canonical event.
 *
 * The existing slug is used to determine whether this is an insert
 * or an update for reporting purposes.
 */
async function upsertEventToPostgres(
  event: EventWithSources
): Promise<'new' | 'updated' | 'failed'> {
  try {
    const existingRes = await query(
      `
        SELECT id
        FROM events
        WHERE slug = $1
        LIMIT 1;
      `,
      [event.slug]
    );

    const isUpdate = existingRes.rows.length > 0;

    await upsertEvent(event as EventDocument);

    return isUpdate ? 'updated' : 'new';
  } catch (err: any) {
    console.error(
      `[Aggregator] Failed to upsert event "${event.title}": ${err.message}`
    );

    return 'failed';
  }
}

async function writeSyncLog(report: SyncReport): Promise<void> {
  try {
    await query(
      `
        INSERT INTO event_sync_logs (
          sync_id,
          report,
          created_at
        )
        VALUES ($1, $2, NOW());
      `,
      [
        report.syncId,
        JSON.stringify(report)
      ]
    );
  } catch (err: any) {
    console.warn(
      '[Aggregator] Failed to write sync log:',
      err.message
    );
  }
}

// ---------------------------------------------------------------------------
// Main Aggregation Function
// ---------------------------------------------------------------------------

export async function runEventAggregation(
  options: {
    dryRun?: boolean;

    /**
     * If provided, only sources whose `name` matches one of these
     * values will be executed.
     */
    sources?: string[];
  } = {}
): Promise<SyncReport> {

  const syncId = `sync-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const report: SyncReport = {
    syncId,
    startedAt,
    completedAt: '',
    durationMs: 0,

    sourcesAttempted: [],
    sourcesSucceeded: [],
    sourcesFailed: [],

    fetchedCount: 0,
    indiaRelevantCount: 0,
    afterDeduplicationCount: 0,

    newCount: 0,
    updatedCount: 0,
    expiredCount: 0,
    failedCount: 0,

    errors: []
  };

  console.log(`\n${'='.repeat(70)}`);
  console.log(
    `[Aggregator] Starting sync ${syncId} at ${startedAt}`
  );
  console.log(`${'='.repeat(70)}`);

  // -------------------------------------------------------------------------
  // 1. Build source list
  // -------------------------------------------------------------------------

  const allSources = buildSourceRegistry();

  const activeSources = options.sources?.length
    ? allSources.filter(source =>
        options.sources!.includes(source.name)
      )
    : allSources;

  report.sourcesAttempted = activeSources.map(
    source => source.name
  );

  if (activeSources.length === 0) {
    report.errors.push(
      'No active event sources were found.'
    );

    console.warn(
      '[Aggregator] No active event sources found.'
    );
  }

  console.log(
    `[Aggregator] Active sources: ${
      activeSources.map(source => source.name).join(', ') || 'none'
    }`
  );

  // -------------------------------------------------------------------------
  // 2. Check source availability
  // -------------------------------------------------------------------------

  const availabilityChecks = await Promise.allSettled(
    activeSources.map(async source => ({
      source,
      available: await source.isAvailable()
    }))
  );

  const readySources: EventSource[] = [];

  availabilityChecks.forEach(result => {
    if (result.status === 'fulfilled') {
      const {
        source,
        available
      } = result.value;

      if (available) {
        readySources.push(source);
      } else {
        report.sourcesFailed.push(source.name);

        report.errors.push(
          `${source.name}: source is not available`
        );

        console.warn(
          `[Aggregator] ${source.name} is not available — skipping.`
        );
      }
    } else {
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);

      report.errors.push(
        `Source availability check failed: ${errorMessage}`
      );

      console.warn(
        `[Aggregator] Source availability check failed: ${errorMessage}`
      );
    }
  });

  console.log(
    `[Aggregator] ${readySources.length}/${activeSources.length} sources ready.`
  );

  // -------------------------------------------------------------------------
  // 3. Fetch all available sources in parallel
  // -------------------------------------------------------------------------

  const allRawEvents: any[] = [];

  const fetchResults = await Promise.allSettled(
    readySources.map(async source => {
      console.log(
        `[Aggregator] Fetching from ${source.name}...`
      );

      const result = await source.fetchEvents();

      return {
        source,
        result
      };
    })
  );

  fetchResults.forEach((result, index) => {

    const source = readySources[index];

    if (result.status === 'fulfilled') {

      const {
        result: fetchResult
      } = result.value;

      if (fetchResult.error) {

        report.sourcesFailed.push(source.name);

        report.errors.push(
          `${source.name}: ${fetchResult.error}`
        );

        console.warn(
          `[Aggregator] ${source.name} returned an error: ${fetchResult.error}`
        );

      } else {

        report.sourcesSucceeded.push(source.name);

        console.log(
          `[Aggregator] ${source.name}: fetched ${fetchResult.fetchedCount} events.`
        );
      }

      /**
       * Important:
       *
       * Even when a source reports an error, only the events it actually
       * returned are added. We never interpret a failed source as
       * "there are zero events".
       */
      allRawEvents.push(
        ...(fetchResult.events || [])
      );

      report.fetchedCount +=
        fetchResult.fetchedCount || 0;

    } else {

      const errMsg =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);

      report.sourcesFailed.push(source.name);

      report.errors.push(
        `${source.name}: fetch threw: ${errMsg}`
      );

      console.error(
        `[Aggregator] ${source.name} fetch failed: ${errMsg}`
      );
    }
  });

  console.log(
    `[Aggregator] Total raw events fetched: ${allRawEvents.length}`
  );

  // -------------------------------------------------------------------------
  // 4. Normalize raw events
  // -------------------------------------------------------------------------

  const normalizedEvents: EventWithSources[] = [];

  for (const raw of allRawEvents) {

    try {

      const normalized =
        normalizeRawEvent(raw) as EventWithSources;

      /**
       * Ensure every canonical event has source information.
       */
      if (!normalized.sources) {
        normalized.sources = [
          {
            platform: raw.platform,
            sourceEventId: raw.externalId,
            sourceUrl:
              raw.sourceUrl ||
              raw.registrationUrl ||
              null
          }
        ];
      }

      normalizedEvents.push(normalized);

    } catch (err: any) {

      report.errors.push(
        `Normalization error for "${raw.title}": ${err.message}`
      );

      console.warn(
        `[Aggregator] Failed to normalize "${raw.title}": ${err.message}`
      );
    }
  }

  console.log(
    `[Aggregator] Normalized events: ${normalizedEvents.length}`
  );

  // -------------------------------------------------------------------------
  // 5. Filter for India relevance
  // -------------------------------------------------------------------------

  const indiaRelevant =
    normalizedEvents.filter(event => {

      try {

        return isIndiaRelevant({
          externalId: '',
          platform:
            event.source?.platform || '',
          title: event.title,

          mode:
            event.location?.mode,

          country:
            event.location?.country || null,

          state:
            event.location?.state || null,

          city:
            event.location?.city || null
        });

      } catch (err) {

        /**
         * Do not silently remove an event if the filter itself crashes.
         */
        console.warn(
          `[Aggregator] India relevance check failed for "${event.title}". Including event.`
        );

        return true;
      }
    });

  report.indiaRelevantCount =
    indiaRelevant.length;

  console.log(
    `[Aggregator] India-relevant events: ${indiaRelevant.length}/${normalizedEvents.length}`
  );

  // -------------------------------------------------------------------------
  // 6. Deduplicate
  // -------------------------------------------------------------------------

  const deduplicated =
    deduplicateEvents(indiaRelevant);

  report.afterDeduplicationCount =
    deduplicated.length;

  console.log(
    `[Aggregator] After deduplication: ${deduplicated.length} canonical events`
  );

  // -------------------------------------------------------------------------
  // 7. Match career roles
  // -------------------------------------------------------------------------

  const allRoles =
  options.dryRun
    ? []
    : await fetchAllRoles();

matchRolesForAllEvents(
  deduplicated,
  allRoles
);

  // -------------------------------------------------------------------------
  // 8. PostgreSQL write
  // -------------------------------------------------------------------------

  if (!options.dryRun) {

    if (!isPostgresConfigured()) {

      report.errors.push(
        'PostgreSQL not configured — skipping database upsert.'
      );

      console.error(
        '[Aggregator] PostgreSQL is not configured.'
      );

    } else {

      // ---------------------------------------------------------------------
      // 8A. Upsert fresh events first
      // ---------------------------------------------------------------------

      let batchIndex = 0;

      for (const event of deduplicated) {

        /**
         * Never write events that the normalizer already determined
         * to be expired.
         */
        if (event.status === 'EXPIRED') {
          continue;
        }

        const result =
          await upsertEventToPostgres(event);

        if (result === 'new') {
          report.newCount++;
        } else if (result === 'updated') {
          report.updatedCount++;
        } else {
          report.failedCount++;
        }

        batchIndex++;

        if (batchIndex % 50 === 0) {

          console.log(
            `[Aggregator] Upserted ${batchIndex}/${deduplicated.length} events...`
          );
        }
      }

      console.log(
        `[Aggregator] DB upsert complete. New: ${report.newCount}, Updated: ${report.updatedCount}, Failed: ${report.failedCount}`
      );

      // ---------------------------------------------------------------------
      // 8B. Expire old events AFTER fresh data has been upserted
      // ---------------------------------------------------------------------

      try {

        const now =
          new Date().toISOString();

        const expireResult =
          await query(
            `
              UPDATE events
              SET
                status = 'EXPIRED',
                updated_at = NOW()
              WHERE
                type = 'HACKATHON'
                AND dates->>'registrationDeadline' IS NOT NULL
                AND (dates->>'registrationDeadline')::timestamptz < $1::timestamptz
                AND status NOT IN ('EXPIRED', 'CANCELLED');
            `,
            [now]
          );

        report.expiredCount =
          expireResult.rowCount ?? 0;

        console.log(
          `[Aggregator] Marked ${report.expiredCount} expired hackathons.`
        );

      } catch (err: any) {

        console.warn(
          '[Aggregator] Expire sweep failed:',
          err.message
        );

        report.errors.push(
          `Expire sweep failed: ${err.message}`
        );
      }
    }

  } else {

    console.log(
      '[Aggregator] DRY RUN — no database writes performed.'
    );
  }

  // -------------------------------------------------------------------------
  // 9. Complete report
  // -------------------------------------------------------------------------

  report.completedAt =
    new Date().toISOString();

  report.durationMs =
    Date.now() - startMs;

  // -------------------------------------------------------------------------
  // 10. Write sync log
  // -------------------------------------------------------------------------

  if (
    !options.dryRun &&
    isPostgresConfigured()
  ) {
    await writeSyncLog(report);
  }

  // -------------------------------------------------------------------------
  // Final output
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(70)}`);

  console.log(
    `[Aggregator] Sync ${syncId} complete in ${report.durationMs}ms`
  );

  console.log(
    `  Sources succeeded: ${
      report.sourcesSucceeded.join(', ') || 'none'
    }`
  );

  console.log(
    `  Sources failed: ${
      report.sourcesFailed.join(', ') || 'none'
    }`
  );

  console.log(
    `  Fetched: ${report.fetchedCount}`
  );

  console.log(
    `  India-relevant: ${report.indiaRelevantCount}`
  );

  console.log(
    `  After deduplication: ${report.afterDeduplicationCount}`
  );

  console.log(
    `  New: ${report.newCount}`
  );

  console.log(
    `  Updated: ${report.updatedCount}`
  );

  console.log(
    `  Expired: ${report.expiredCount}`
  );

  console.log(
    `  Failed: ${report.failedCount}`
  );

  if (report.errors.length > 0) {

    console.log(
      `  Errors: ${report.errors.length}`
    );

    report.errors.forEach(error => {
      console.log(`    - ${error}`);
    });
  }

  console.log(`${'='.repeat(70)}\n`);

  return report;
}