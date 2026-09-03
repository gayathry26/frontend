/**
 * Event Deduplicator
 *
 * Merges duplicate event listings from different platforms into a single
 * canonical EventDocument. Duplicates are detected using normalized title similarity,
 * organizer name similarity, and date overlap.
 *
 * When a duplicate is found, the canonical event's `sources` array is extended
 * to include all contributing platform sources. The best available registration
 * URL is always preferred.
 */

import { EventDocument } from '../../types/event';
import { isPlaceholderUrl } from '../../utils/validateEventUrl';

export interface EventWithSources extends EventDocument {
  sources: Array<{
    platform: string;
    sourceEventId?: string;
    sourceUrl?: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Similarity Helpers
// ---------------------------------------------------------------------------

function slugifyForDedup(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(slugifyForDedup(a).split(' ').filter(t => t.length > 2));
  const tokensB = new Set(slugifyForDedup(b).split(' ').filter(t => t.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union; // Jaccard similarity
}

function datesOverlap(
  startA: string | undefined,
  startB: string | undefined,
  toleranceDays = 7
): boolean {
  if (!startA || !startB) return true; // Cannot disprove — treat as possible match
  const a = new Date(startA).getTime();
  const b = new Date(startB).getTime();
  if (isNaN(a) || isNaN(b)) return true;
  return Math.abs(a - b) <= toleranceDays * 24 * 60 * 60 * 1000;
}

function isDuplicate(a: EventDocument, b: EventDocument): boolean {
  const titleSimilarity = tokenSimilarity(a.title, b.title);
  if (titleSimilarity < 0.6) return false; // Titles must be at least 60% similar

  // Same type helps confirm
  const sameType = a.type === b.type;

  // Organizer similarity (if both present)
  let orgSimilarity = 0.5; // neutral if unknown
  if (a.organizer.name && b.organizer.name) {
    orgSimilarity = tokenSimilarity(a.organizer.name, b.organizer.name);
  }

  // Date proximity
  const dateMatch = datesOverlap(a.dates?.startDate, b.dates?.startDate, 14);

  // Decision matrix
  if (titleSimilarity >= 0.85 && dateMatch) return true; // Very high title match + date = duplicate
  if (titleSimilarity >= 0.7 && sameType && dateMatch && orgSimilarity >= 0.5) return true;

  return false;
}

// ---------------------------------------------------------------------------
// URL Selection — prefer the registration URL that is most reliable
// ---------------------------------------------------------------------------

function selectBestUrl(
  existing: string | null | undefined,
  incoming: string | null | undefined
): string | null {
  const bothValid = (url: string | null | undefined) =>
    url && !isPlaceholderUrl(url) && url.startsWith('http');

  if (bothValid(existing) && bothValid(incoming)) {
    // Prefer the one that is NOT a generic platform landing page
    const isGeneric = (url: string) =>
      /\/(hackathons|events|competitions|challenges)\/?$/.test(url);
    if (isGeneric(existing!) && !isGeneric(incoming!)) return incoming!;
    return existing!; // Keep existing as tie-breaker
  }
  if (bothValid(existing)) return existing!;
  if (bothValid(incoming)) return incoming!;
  return null;
}

// ---------------------------------------------------------------------------
// Merge Canonical Event
// ---------------------------------------------------------------------------

function mergeEvents(canonical: EventWithSources, duplicate: EventWithSources): EventWithSources {
  const now = new Date().toISOString();

  // Merge sources array (avoiding duplicates)
  const existingPlatforms = new Set(canonical.sources.map(s => s.platform));
  const newSources = duplicate.sources.filter(s => !existingPlatforms.has(s.platform));

  // Select best URLs
  const bestRegUrl = selectBestUrl(canonical.registrationUrl, duplicate.registrationUrl);
  const bestRegAvailable = Boolean(bestRegUrl);

  // Merge skills (union)
  const mergedSkills = [...new Set([
    ...(canonical.skills || []),
    ...(duplicate.skills || [])
  ])];

  // Merge descriptions — prefer longer, more informative
  const description =
    (canonical.description || '').length >= (duplicate.description || '').length
      ? canonical.description
      : duplicate.description;

  return {
    ...canonical,
    registrationUrl: bestRegUrl,
    registrationAvailable: bestRegAvailable,
    skills: mergedSkills,
    description: description || canonical.description,
    sources: [...canonical.sources, ...newSources],
    updatedAt: now,
    lastSyncedAt: now
  };
}

// ---------------------------------------------------------------------------
// Main Deduplication Function
// ---------------------------------------------------------------------------

export function deduplicateEvents(events: EventWithSources[]): EventWithSources[] {
  const canonical: EventWithSources[] = [];
  let duplicatesFound = 0;

  for (const event of events) {
    let merged = false;

    for (let i = 0; i < canonical.length; i++) {
      if (isDuplicate(canonical[i], event)) {
        canonical[i] = mergeEvents(canonical[i], event);
        merged = true;
        duplicatesFound++;
        break;
      }
    }

    if (!merged) {
      canonical.push(event);
    }
  }

  console.log(`[Deduplicator] Input: ${events.length} events. Output: ${canonical.length} canonical events. Duplicates merged: ${duplicatesFound}.`);

  return canonical;
}
