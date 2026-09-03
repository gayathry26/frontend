/**
 * Brabble API Source Adapter
 *
 * Brabble aggregates events from Devfolio, Unstop, Devpost, HackerEarth, MLH, and other platforms.
 * This adapter uses Brabble's public listings API to ingest the full aggregated India/global dataset.
 *
 * API: GET https://api.brabble.in/api/listings
 * Pagination: offset + limit + total
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';

const BRABBLE_API_BASE = 'https://api.brabble.in';
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15000;

interface BrabbleListing {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  organizer?: string | { name?: string; website?: string } | null;
  organizerName?: string;
  organizerWebsite?: string;

  registrationDeadline?: string;
  deadline?: string;
  endDate?: string;
  startDate?: string;
  start?: string;
  end?: string;

  mode?: string;
  eventMode?: string;
  isOnline?: boolean;
  location?: string | { country?: string; state?: string; city?: string; mode?: string } | null;
  city?: string;
  state?: string;
  country?: string;

  type?: string;
  category?: string;
  eventType?: string;
  tags?: string[];
  skills?: string[];
  techStack?: string[];

  prize?: number | string | { amount?: number; currency?: string; description?: string } | null;
  prizeAmount?: number;
  prizeCurrency?: string;
  prizeDescription?: string;

  registrationUrl?: string;
  applyUrl?: string;
  link?: string;
  url?: string;
  sourceUrl?: string;
  platformLink?: string;

  platform?: string;
  source?: string;
  sourcePlatform?: string;

  minTeamSize?: number;
  maxTeamSize?: number;
  eligibility?: string[];
}

interface BrabbleApiResponse {
  data?: BrabbleListing[];
  listings?: BrabbleListing[];
  results?: BrabbleListing[];
  items?: BrabbleListing[];
  total?: number;
  count?: number;
  offset?: number;
  limit?: number;
  success?: boolean;
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'IT-Career-Explorer/1.0 (+https://github.com/it-career-explorer)'
      }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function extractBrabbleEvents(data: BrabbleApiResponse): BrabbleListing[] {
  return data.data || data.listings || data.results || data.items || [];
}

function getTotal(data: BrabbleApiResponse, listingsLength: number): number {
  return data.total ?? data.count ?? listingsLength;
}

function normalizeBrabbleListing(raw: BrabbleListing): RawEvent {
  // Resolve organizer
  let orgName: string | null = null;
  let orgWebsite: string | null = null;
  if (typeof raw.organizer === 'string') {
    orgName = raw.organizer || null;
  } else if (raw.organizer && typeof raw.organizer === 'object') {
    orgName = raw.organizer.name || null;
    orgWebsite = raw.organizer.website || null;
  }
  orgName = orgName || raw.organizerName || null;
  orgWebsite = orgWebsite || raw.organizerWebsite || null;

  // Resolve location
  let country: string | null = null;
  let state: string | null = null;
  let city: string | null = null;
  let mode: string | null = null;

  if (typeof raw.location === 'object' && raw.location !== null) {
    country = raw.location.country || null;
    state = raw.location.state || null;
    city = raw.location.city || null;
    mode = raw.location.mode || null;
  } else if (typeof raw.location === 'string') {
    city = raw.location || null;
  }
  country = country || raw.country || null;
  state = state || raw.state || null;
  city = city || raw.city || null;

  // Resolve mode
  if (!mode) {
    if (raw.mode) mode = raw.mode;
    else if (raw.eventMode) mode = raw.eventMode;
    else if (raw.isOnline === true) mode = 'ONLINE';
    else if (raw.isOnline === false) mode = 'OFFLINE';
  }

  // Resolve prize
  let prizeAmount: number | null = null;
  let prizeCurrency: string | null = null;
  let prizeDescription: string | null = null;
  if (typeof raw.prize === 'number') {
    prizeAmount = raw.prize;
  } else if (typeof raw.prize === 'string') {
    prizeDescription = raw.prize;
    const match = raw.prize.match(/[\d,]+/);
    if (match) prizeAmount = parseInt(match[0].replace(',', ''), 10);
  } else if (raw.prize && typeof raw.prize === 'object') {
    prizeAmount = raw.prize.amount ?? raw.prizeAmount ?? null;
    prizeCurrency = raw.prize.currency ?? raw.prizeCurrency ?? null;
    prizeDescription = raw.prize.description ?? raw.prizeDescription ?? null;
  }

  // Resolve URLs
  const registrationUrl = raw.registrationUrl || raw.applyUrl || raw.link || raw.url || null;
  const sourceUrl = raw.sourceUrl || raw.platformLink || raw.link || raw.url || null;

  // Resolve platform
  const platform = raw.platform || raw.source || raw.sourcePlatform || 'Brabble';

  // Resolve skills
  const skills: string[] = [
    ...(raw.skills || []),
    ...(raw.techStack || []),
    ...(raw.tags || [])
  ].filter(Boolean);

  return {
    externalId: `brabble-${raw._id || raw.id || Math.random().toString(36).slice(2)}`,
    platform,
    title: raw.title || raw.name || 'Untitled Event',
    description: raw.description || raw.shortDescription || null,
    organizerName: orgName,
    organizerWebsite: orgWebsite,
    registrationDeadline: raw.registrationDeadline || raw.deadline || raw.end || null,
    startDate: raw.startDate || raw.start || null,
    endDate: raw.endDate || raw.end || null,
    mode: mode as any,
    country,
    state,
    city,
    category: raw.type || raw.category || raw.eventType || null,
    tags: raw.tags || [],
    skills: [...new Set(skills)],
    prizeAmount,
    prizeCurrency,
    prizeDescription,
    registrationUrl,
    sourceUrl: sourceUrl !== registrationUrl ? sourceUrl : null,
    minTeamSize: raw.minTeamSize || null,
    maxTeamSize: raw.maxTeamSize || null,
    eligibility: raw.eligibility || [],
    rawPayload: raw as any
  };
}

export class BrabbleSource implements EventSource {
  name = 'Brabble';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${BRABBLE_API_BASE}/api/listings?limit=1&offset=0`, 5000);
      return res.ok || res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];
    let offset = 0;
    let totalPages = 1;
    let pagesFetched = 0;
    let error: string | null = null;

    try {
      // First request — discover total
      const firstUrl = `${BRABBLE_API_BASE}/api/listings?limit=${PAGE_SIZE}&offset=0`;
      const firstRes = await fetchWithTimeout(firstUrl);

      if (!firstRes.ok) {
        throw new Error(`Brabble API returned status ${firstRes.status}`);
      }

      const firstData: BrabbleApiResponse = await firstRes.json();
      const firstListings = extractBrabbleEvents(firstData);
      const total = getTotal(firstData, firstListings.length);

      firstListings.forEach(listing => allEvents.push(normalizeBrabbleListing(listing)));
      offset = PAGE_SIZE;
      pagesFetched++;

      // Continue paginating through all available records
      while (offset < total) {
        try {
          const pageUrl = `${BRABBLE_API_BASE}/api/listings?limit=${PAGE_SIZE}&offset=${offset}`;
          const pageRes = await fetchWithTimeout(pageUrl);

          if (!pageRes.ok) {
            console.warn(`[BrabbleSource] Page at offset=${offset} returned ${pageRes.status}, stopping pagination.`);
            break;
          }

          const pageData: BrabbleApiResponse = await pageRes.json();
          const pageListings = extractBrabbleEvents(pageData);

          if (pageListings.length === 0) break; // No more results

          pageListings.forEach(listing => allEvents.push(normalizeBrabbleListing(listing)));
          offset += PAGE_SIZE;
          pagesFetched++;

          // Safety cap to prevent infinite loops
          if (pagesFetched > 50) {
            console.warn('[BrabbleSource] Reached page cap (50), stopping pagination.');
            break;
          }
        } catch (pageErr: any) {
          console.warn(`[BrabbleSource] Error at offset=${offset}: ${pageErr.message}`);
          break;
        }
      }

      console.log(`[BrabbleSource] Fetched ${allEvents.length} events across ${pagesFetched} page(s). Total reported: ${total}.`);
    } catch (err: any) {
      error = `BrabbleSource fetch error: ${err.message}`;
      console.error(`[BrabbleSource] ${error}`);
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
