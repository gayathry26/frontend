/**
 * Devfolio Public API Source Adapter
 *
 * Uses Devfolio's public GraphQL API to fetch hackathons open to Indian students.
 * Full pagination via `after` cursor-based pagination.
 *
 * API: POST https://api.devfolio.co/api/hackathons
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';

const DEVFOLIO_API_BASE = 'https://api.devfolio.co';
const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 15000;

interface DevfolioHackathon {
  id?: string;
  uuid?: string;
  slug?: string;
  name?: string;
  title?: string;
  tagline?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  submission_period_ends_at?: string;
  registration_closes_at?: string;
  is_online?: boolean;
  city?: string;
  state?: string;
  country?: string;
  prize_pool?: number | string | null;
  organization?: { name?: string; website?: string } | null;
  organiser_name?: string;
  tags?: string[];
  tech_tags?: string[];
  skills?: string[];
  url?: string;
  registration_link?: string;
  website?: string;
  status?: string;
  mode?: string;
}

interface DevfolioApiResponse {
  hackathons?: DevfolioHackathon[];
  data?: DevfolioHackathon[];
  results?: DevfolioHackathon[];
  count?: number;
  total?: number;
  next?: string | null;
  has_next?: boolean;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'IT-Career-Explorer/1.0',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns true if the given URL is a generic platform homepage or listing page,
 * NOT an event-specific registration URL.
 *
 * Examples of GENERIC (blocked) URLs:
 *   https://devfolio.co/
 *   https://devfolio.co/hackathons
 *   https://unstop.com/
 *   https://unstop.com/hackathons
 *
 * Examples of SPECIFIC (allowed) URLs:
 *   https://devfolio.co/hackathons/bangalore-ctf-2026
 *   https://unstop.com/hackathons/react-championship,12345
 */
function isGenericPlatformUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, ''); // strip trailing slash

    const genericPaths: string[] = [
      '',
      '/hackathons',
      '/events',
      '/competitions',
      '/challenges',
      '/opportunities',
      '/contests',
      '/programs',
      '/explore'
    ];

    return genericPaths.includes(path.toLowerCase());
  } catch {
    return true; // Unparseable URL = treat as invalid
  }
}

function normalizeDevfolioHackathon(raw: DevfolioHackathon): RawEvent {
  const skills: string[] = [
    ...(raw.tags || []),
    ...(raw.tech_tags || []),
    ...(raw.skills || [])
  ].filter(Boolean);

  // IMPORTANT: Use the ACTUAL URL from the API response.
  // NEVER construct a URL from the slug — that would invent a URL.
  // The API may provide: registration_link, url, website (in priority order).
  // sourceUrl = the listing page on Devfolio (for attribution), distinct from registrationUrl.
  const actualRegistrationUrl = raw.registration_link || raw.url || raw.website || null;
  const registrationUrl = actualRegistrationUrl && !isGenericPlatformUrl(actualRegistrationUrl)
    ? actualRegistrationUrl
    : null;

  // sourceUrl is the Devfolio listing page for this specific event.
  // We use slug-based URL ONLY for the source attribution link, NOT for registration.
  const sourceUrl = raw.slug ? `https://devfolio.co/hackathons/${raw.slug}` : null;

  let prizeAmount: number | null = null;
  if (typeof raw.prize_pool === 'number') prizeAmount = raw.prize_pool;
  else if (typeof raw.prize_pool === 'string') {
    const match = raw.prize_pool.match(/[\d,]+/);
    if (match) prizeAmount = parseInt(match[0].replace(',', ''), 10);
  }

  const orgName = raw.organization?.name || raw.organiser_name || null;
  const orgWebsite = raw.organization?.website || null;

  let mode: string | null = null;
  if (raw.mode) mode = raw.mode;
  else if (raw.is_online === true) mode = 'ONLINE';
  else if (raw.is_online === false) mode = 'OFFLINE';

  return {
    externalId: `devfolio-${raw.uuid || raw.id || raw.slug || Math.random().toString(36).slice(2)}`,
    platform: 'Devfolio',
    title: raw.name || raw.title || 'Devfolio Hackathon',
    description: raw.description || raw.tagline || null,
    organizerName: orgName,
    organizerWebsite: orgWebsite,
    registrationDeadline: raw.registration_closes_at || raw.submission_period_ends_at || raw.ends_at || null,
    startDate: raw.starts_at || null,
    endDate: raw.ends_at || null,
    mode: mode as any,
    country: raw.country || null,
    state: raw.state || null,
    city: raw.city || null,
    category: 'HACKATHON',
    tags: raw.tags || [],
    skills: [...new Set(skills)],
    prizeAmount,
    prizeCurrency: 'INR',
    registrationUrl,
    sourceUrl,
    eligibility: ['College Students', 'Developers'],
    rawPayload: raw as any
  };
}

export class DevfolioSource implements EventSource {
  name = 'Devfolio';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${DEVFOLIO_API_BASE}/api/hackathons?limit=1&page=1`,
        { method: 'GET' },
        5000
      );
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];
    let page = 1;
    let pagesFetched = 0;
    let error: string | null = null;

    try {
      while (true) {
        const url = `${DEVFOLIO_API_BASE}/api/hackathons?limit=${PAGE_SIZE}&page=${page}&status=open`;
        const res = await fetchWithTimeout(url, { method: 'GET' });

        if (!res.ok) {
          if (page === 1) throw new Error(`Devfolio API returned status ${res.status}`);
          console.warn(`[DevfolioSource] Page ${page} returned ${res.status}, stopping.`);
          break;
        }

        const data: DevfolioApiResponse = await res.json();
        const hackathons: DevfolioHackathon[] = data.hackathons || data.data || data.results || [];

        if (hackathons.length === 0) break;

        hackathons.forEach(h => allEvents.push(normalizeDevfolioHackathon(h)));
        pagesFetched++;

        // Check if more pages exist
        const total = data.total ?? data.count ?? 0;
        if (total > 0 && allEvents.length >= total) break;
        if (data.has_next === false) break;
        if (hackathons.length < PAGE_SIZE) break;

        page++;
        if (pagesFetched >= 30) {
          console.warn('[DevfolioSource] Reached page cap (30), stopping pagination.');
          break;
        }
      }

      console.log(`[DevfolioSource] Fetched ${allEvents.length} events across ${pagesFetched} page(s).`);
    } catch (err: any) {
      error = `DevfolioSource fetch error: ${err.message}`;
      console.error(`[DevfolioSource] ${error}`);
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
