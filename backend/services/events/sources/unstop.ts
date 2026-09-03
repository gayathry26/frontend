/**
 * Unstop (formerly Dare2Compete) Source Adapter
 *
 * Uses Unstop's public listing API to fetch competitions, hackathons, and contests.
 * Pagination: offset + limit
 *
 * API: GET https://unstop.com/api/public/opportunity/search-result
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';

const UNSTOP_API_BASE = 'https://unstop.com';
const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 15000;

interface UnstopOpportunity {
  id?: number | string;
  title?: string;
  name?: string;
  description?: string;
  short_description?: string;
  organisation?: { name?: string; logo?: string; website?: string } | null;
  organiser?: string;
  start?: string;
  end?: string;
  reg_start?: string;
  reg_end?: string;
  deadline?: string;
  event_type?: string;
  type?: string;
  category?: string;
  opportunity_type?: string;
  is_online?: boolean | number;
  mode?: string;
  city?: string;
  state?: string;
  country?: string;
  tags?: string[] | { name?: string }[];
  skills?: string[] | { name?: string }[];
  prize?: string | number | null;
  prize_pool?: string | number | null;
  total_prize?: string | number | null;
  url?: string;
  link?: string;
  registration_link?: string;
  apply_link?: string;
  website?: string;
  team_size?: string;
  min_team_size?: number;
  max_team_size?: number;
}

interface UnstopApiResponse {
  data?: {
    data?: UnstopOpportunity[];
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
  };
  opportunities?: UnstopOpportunity[];
  total?: number;
  count?: number;
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'IT-Career-Explorer/1.0'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns true if the URL is a generic platform homepage or top-level listing page
 * (NOT an event-specific URL). Such URLs must never be used as registrationUrl.
 */
function isGenericPlatformUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    const genericPaths = [
      '', '/hackathons', '/events', '/competitions', '/challenges',
      '/opportunities', '/contests', '/programs', '/explore', '/jobs'
    ];
    return genericPaths.includes(path.toLowerCase());
  } catch {
    return true;
  }
}


function extractTags(raw: string[] | { name?: string }[] | undefined): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean);
}

function extractPrize(raw: UnstopOpportunity): { amount: number | null; description: string | null } {
  const prizeRaw = raw.prize || raw.prize_pool || raw.total_prize;
  if (!prizeRaw) return { amount: null, description: null };
  if (typeof prizeRaw === 'number') return { amount: prizeRaw, description: null };
  const match = String(prizeRaw).match(/[\d,]+/);
  return {
    amount: match ? parseInt(match[0].replace(',', ''), 10) : null,
    description: String(prizeRaw)
  };
}

function normalizeUnstopOpportunity(raw: UnstopOpportunity): RawEvent {
  const tags = extractTags(raw.tags as any);
  const skills = extractTags(raw.skills as any);
  const allSkills = [...new Set([...skills, ...tags])];

  const { amount: prizeAmount, description: prizeDescription } = extractPrize(raw);

  const orgName = raw.organisation?.name || raw.organiser || null;
  const orgWebsite = raw.organisation?.website || raw.website || null;

  let mode: string | null = null;
  if (raw.mode) mode = raw.mode;
  else if (raw.is_online === true || raw.is_online === 1) mode = 'ONLINE';
  else if (raw.is_online === false || raw.is_online === 0) mode = 'OFFLINE';

  // Use the ACTUAL registration URL from the API response.
  // Unstop may return it as: registration_link, apply_link, url, or link.
  // NEVER construct a URL from the event ID unless the API provides a path.
  const apiProvidedUrl = raw.registration_link || raw.apply_link || raw.url || raw.link || null;
  const registrationUrl = apiProvidedUrl && !isGenericPlatformUrl(apiProvidedUrl)
    ? apiProvidedUrl
    : null;

  // sourceUrl: Unstop event pages follow the pattern /p/<slug>,<id> or /hackathons/<slug>,<id>.
  // The most reliable source-specific URL uses the numeric ID with the event type path.
  // We store this as a source attribution link, NOT as the registrationUrl.
  const eventTypePath = (raw.event_type || raw.type || '').toLowerCase().includes('workshop')
    ? 'p'
    : (raw.event_type || raw.type || '').toLowerCase().includes('job')
      ? 'jobs'
      : 'hackathons';
  const sourceUrl = raw.id ? `https://unstop.com/${eventTypePath}/${raw.id}` : null;

  // Map Unstop category to our EventCategory
  const rawCategory = raw.event_type || raw.type || raw.category || raw.opportunity_type || 'HACKATHON';

  return {
    externalId: `unstop-${raw.id || Math.random().toString(36).slice(2)}`,
    platform: 'Unstop',
    title: raw.title || raw.name || 'Untitled Opportunity',
    description: raw.description || raw.short_description || null,
    organizerName: orgName,
    organizerWebsite: orgWebsite,
    registrationDeadline: raw.reg_end || raw.deadline || raw.end || null,
    startDate: raw.start || raw.reg_start || null,
    endDate: raw.end || null,
    mode: mode as any,
    country: raw.country || null,
    state: raw.state || null,
    city: raw.city || null,
    category: rawCategory,
    tags,
    skills: allSkills,
    prizeAmount,
    prizeCurrency: 'INR',
    prizeDescription,
    registrationUrl,
    sourceUrl,
    minTeamSize: raw.min_team_size || null,
    maxTeamSize: raw.max_team_size || null,
    eligibility: ['College Students', 'Professionals'],
    rawPayload: raw as any
  };
}

export class UnstopSource implements EventSource {
  name = 'Unstop';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${UNSTOP_API_BASE}/api/public/opportunity/search-result?limit=1&start=0&type=hackathon`,
        5000
      );
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];
    let offset = 0;
    let total = Infinity;
    let pagesFetched = 0;
    let error: string | null = null;

    // Categories to fetch: hackathon, competition, quiz, job
    const types = ['hackathon', 'competition', 'quiz'];

    try {
      for (const type of types) {
        offset = 0;
        total = Infinity;

        while (offset < total) {
          const url = `${UNSTOP_API_BASE}/api/public/opportunity/search-result?limit=${PAGE_SIZE}&start=${offset}&type=${type}`;
          const res = await fetchWithTimeout(url);

          if (!res.ok) {
            console.warn(`[UnstopSource] ${type} at offset=${offset} returned ${res.status}, skipping.`);
            break;
          }

          const json: UnstopApiResponse = await res.json();
          const nested = json?.data;
          const opportunities: UnstopOpportunity[] = nested?.data || json.opportunities || [];

          if (opportunities.length === 0) break;

          if (total === Infinity) {
            total = nested?.total ?? json.total ?? json.count ?? opportunities.length;
          }

          opportunities.forEach(o => allEvents.push(normalizeUnstopOpportunity(o)));
          offset += PAGE_SIZE;
          pagesFetched++;

          if (opportunities.length < PAGE_SIZE) break;
          if (pagesFetched >= 30) {
            console.warn('[UnstopSource] Reached page cap (30), stopping pagination.');
            break;
          }
        }
      }

      console.log(`[UnstopSource] Fetched ${allEvents.length} events across ${pagesFetched} page(s).`);
    } catch (err: any) {
      error = `UnstopSource fetch error: ${err.message}`;
      console.error(`[UnstopSource] ${error}`);
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
