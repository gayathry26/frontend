/**
 * Event Aggregator — Main Orchestration Engine
 *
 * Coordinates the complete multi-source event ingestion pipeline:
 * 1. Checks availability of all registered sources
 * 2. Fetches events from all available sources in parallel (with fault tolerance)
 * 3. Normalizes all raw events into canonical EventDocument format
 * 4. Filters for India-relevance
 * 5. Deduplicates across platforms
 * 6. Matches career roles for all deduplicated events
 * 7. Upserts into MongoDB Atlas `events` collection
 * 8. Logs sync metrics to `eventSyncLogs` collection
 *
 * Designed so that a single source failure NEVER prevents other sources from completing.
 */
import { EventDocument } from '../../types/event';
import { EventSource } from './sources/EventSource';
import { query, isPostgresConfigured } from '../../config/postgres';
import { upsertEvent } from '../eventService';

import { BrabbleSource } from './sources/brabble';
import { DevfolioSource } from './sources/devfolio';
import { UnstopSource } from './sources/unstop';
import { HackerEarthSource } from './sources/hackerearth';
import { SubmissionSource } from './sources/submissionSource';

import { normalizeRawEvent, isIndiaRelevant } from './eventNormalizer';
import { deduplicateEvents, EventWithSources } from './eventDeduplicator';
import { matchRolesForAllEvents } from './eventRoleMatcher';

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

export function getAllSources(): EventSource[] {
  return [
    new DevfolioSource(),
    new BrabbleSource(),
    new UnstopSource(),
    new HackerEarthSource(),
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
      SELECT id, title, category, technical_skills as "technicalSkills"
      FROM roles
      LIMIT 500;
    `);
    return res.rows;
  } catch (err: any) {
    console.warn('[Aggregator] Failed to fetch roles for matching:', err.message);
    return [];
  }
}

async function upsertEventToPostgres(
  event: EventWithSources
): Promise<'new' | 'updated' | 'failed'> {
  try {
    const existingRes = await query(`SELECT id FROM events WHERE slug = $1 LIMIT 1;`, [event.slug]);
    const isUpdate = existingRes.rows.length > 0;
    await upsertEvent(event as EventDocument);
    return isUpdate ? 'updated' : 'new';
  } catch (err: any) {
    console.error(`[Aggregator] Failed to upsert event "${event.title}": ${err.message}`);
    return 'failed';
  }
}

async function writeSyncLog(report: SyncReport): Promise<void> {
  try {
    await query(`
      INSERT INTO event_sync_logs (sync_id, report, created_at)
      VALUES ($1, $2, NOW());
    `, [report.syncId, JSON.stringify(report)]);
  } catch (err: any) {
    console.warn('[Aggregator] Failed to write sync log:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Main Aggregation Function
// ---------------------------------------------------------------------------

export async function runEventAggregation(options: {
  dryRun?: boolean;
  sources?: string[]; // If provided, only run these sources by name
} = {}): Promise<SyncReport> {
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

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Aggregator] Starting sync ${syncId} at ${startedAt}`);
  console.log(`${'='.repeat(60)}`);

  // 1. Build source list
  const allSources = buildSourceRegistry();
  const activeSources = options.sources?.length
    ? allSources.filter(s => options.sources!.includes(s.name))
    : allSources;

  // 2. Check availability in parallel
  const availabilityChecks = await Promise.allSettled(
    activeSources.map(async (source) => ({
      source,
      available: await source.isAvailable()
    }))
  );

  const readySources = availabilityChecks
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.available)
    .map(r => r.value.source);

  const unavailableSources = activeSources.filter(s => !readySources.includes(s));
  unavailableSources.forEach(s => {
    report.sourcesFailed.push(s.name);
    report.errors.push(`${s.name}: not available (API down or network error)`);
    console.warn(`[Aggregator] Source "${s.name}" is not available — skipping.`);
  });

  console.log(`[Aggregator] ${readySources.length}/${activeSources.length} sources ready.`);

  // 3. Fetch from all ready sources in parallel (fault-tolerant)
  const allRawEvents: any[] = [];
  report.sourcesAttempted = activeSources.map(s => s.name);

  const fetchResults = await Promise.allSettled(
    readySources.map(async (source) => {
      console.log(`[Aggregator] Fetching from ${source.name}...`);
      const result = await source.fetchEvents();
      return { source, result };
    })
  );

  for (const res of fetchResults) {
    if (res.status === 'fulfilled') {
      const { source, result } = res.value;
      if (result.error) {
        report.sourcesFailed.push(source.name);
        report.errors.push(`${source.name}: ${result.error}`);
        console.warn(`[Aggregator] ${source.name} encountered error: ${result.error}`);
      } else {
        report.sourcesSucceeded.push(source.name);
        console.log(`[Aggregator] ${source.name}: fetched ${result.fetchedCount} events.`);
      }
      allRawEvents.push(...result.events);
      report.fetchedCount += result.fetchedCount;
    } else {
      const source = readySources[fetchResults.indexOf(res)];
      const errMsg = (res.reason as Error)?.message || 'Unknown error';
      report.sourcesFailed.push(source?.name || 'Unknown');
      report.errors.push(`${source?.name}: Fetch threw: ${errMsg}`);
      console.error(`[Aggregator] Source fetch threw: ${errMsg}`);
    }
  }

  console.log(`[Aggregator] Total raw events fetched: ${allRawEvents.length}`);

  // 4. Normalize all raw events
  const normalizedEvents: EventWithSources[] = [];
  for (const raw of allRawEvents) {
    try {
      const normalized = normalizeRawEvent(raw) as EventWithSources;
      if (!normalized.sources) {
        normalized.sources = [{
          platform: raw.platform,
          sourceEventId: raw.externalId,
          sourceUrl: raw.sourceUrl || raw.registrationUrl || null
        }];
      }
      normalizedEvents.push(normalized);
    } catch (err: any) {
      report.errors.push(`Normalization error for "${raw.title}": ${err.message}`);
    }
  }

  // 5. Filter for India-relevance
  const indiaRelevant = normalizedEvents.filter(e => {
    try {
      // Build a minimal RawEvent-compatible object from the normalized EventDocument
      return isIndiaRelevant({
        externalId: '',
        platform: e.source?.platform || '',
        title: e.title,
        mode: e.location?.mode,
        country: e.location?.country || null,
        state: e.location?.state || null,
        city: e.location?.city || null
      });
    } catch {
      return true; // Include if filter fails
    }
  });
  report.indiaRelevantCount = indiaRelevant.length;
  console.log(`[Aggregator] India-relevant events: ${indiaRelevant.length}/${normalizedEvents.length}`);

  // 6. Deduplicate across platforms
  const deduplicated = deduplicateEvents(indiaRelevant);
  report.afterDeduplicationCount = deduplicated.length;
  console.log(`[Aggregator] After deduplication: ${deduplicated.length} canonical events`);

  // 7. Match career roles
  const allRoles = await fetchAllRoles();
  matchRolesForAllEvents(deduplicated, allRoles);

  // 8. Upsert into PostgreSQL
  if (!options.dryRun) {
    if (!isPostgresConfigured()) {
      report.errors.push('PostgreSQL not configured — skipping database upsert.');
      console.error('[Aggregator] PostgreSQL not configured.');
    } else {
      // Mark expired events in DB
      try {
        const now = new Date().toISOString();
        const expireResult = await query(`
          UPDATE events
          SET status = 'EXPIRED', updated_at = NOW()
          WHERE (dates->>'registrationDeadline') < $1
            AND status NOT IN ('EXPIRED', 'CANCELLED');
        `, [now]);
        report.expiredCount = expireResult.rowCount ?? 0;
        console.log(`[Aggregator] Marked ${report.expiredCount} expired events.`);
      } catch (err: any) {
        console.warn('[Aggregator] Expire sweep failed:', err.message);
      }

      // Upsert all deduplicated events
      let batchIndex = 0;
      for (const event of deduplicated) {
        if (event.status === 'EXPIRED') {
          report.expiredCount++;
          continue;
        }

        const result = await upsertEventToPostgres(event);
        if (result === 'new') report.newCount++;
        else if (result === 'updated') report.updatedCount++;
        else report.failedCount++;

        batchIndex++;
        if (batchIndex % 50 === 0) {
          console.log(`[Aggregator] Upserted ${batchIndex}/${deduplicated.length} events...`);
        }
      }

      console.log(`[Aggregator] DB sync complete. New: ${report.newCount}, Updated: ${report.updatedCount}, Failed: ${report.failedCount}`);

      // Write sync log
      report.completedAt = new Date().toISOString();
      report.durationMs = Date.now() - startMs;
      await writeSyncLog(report);
    }
  } else {
    console.log('[Aggregator] DRY RUN — no DB writes performed.');
  }

  report.completedAt = new Date().toISOString();
  report.durationMs = Date.now() - startMs;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Aggregator] Sync ${syncId} complete in ${report.durationMs}ms`);
  console.log(`  Sources: ${report.sourcesSucceeded.join(', ') || 'none'}`);
  console.log(`  Fetched: ${report.fetchedCount} | India-Relevant: ${report.indiaRelevantCount} | After Dedup: ${report.afterDeduplicationCount}`);
  console.log(`  New: ${report.newCount} | Updated: ${report.updatedCount} | Expired: ${report.expiredCount} | Failed: ${report.failedCount}`);
  console.log(`${'='.repeat(60)}\n`);

  return report;
}
