/**
 * HackerEarth Public API Source Adapter
 *
 * Uses HackerEarth's public challenges API to fetch coding challenges, hackathons, and sprints.
 * Pagination: offset + limit
 *
 * API: GET https://www.hackerearth.com/api/v3/challenges/
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';

const HACKEREARTH_API_BASE = 'https://www.hackerearth.com';
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15000;

interface HackerEarthChallenge {
  id?: number | string;
  title?: string;
  description?: string;
  short_description?: string;
  start_date?: string;
  end_date?: string;
  challenge_type?: string;
  type?: string;
  status?: string;
  url?: string;
  challenge_url?: string;
  register_url?: string;
  register_link?: string;
  prize_in_cash?: number | null;
  total_prize?: string | null;
  prize?: string | null;
  organization_name?: string;
  organizer?: string;
  tags?: string[];
  skills_required?: string[];
  is_online?: boolean;
  country?: string;
  city?: string;
  state?: string;
  mode?: string;
  slug?: string;
}

interface HackerEarthApiResponse {
  results?: HackerEarthChallenge[];
  challenges?: HackerEarthChallenge[];
  data?: HackerEarthChallenge[];
  count?: number;
  total?: number;
  next?: string | null;
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

function mapHackerEarthCategory(raw: string | undefined): string {
  const cat = (raw || '').toLowerCase();
  if (cat.includes('hackathon')) return 'HACKATHON';
  if (cat.includes('sprint') || cat.includes('code') || cat.includes('compete')) return 'CODING_CONTEST';
  if (cat.includes('ctf') || cat.includes('capture')) return 'CTF';
  if (cat.includes('ideathon')) return 'IDEATHON';
  return 'CODING_CONTEST';
}

function normalizeHackerEarthChallenge(raw: HackerEarthChallenge): RawEvent {
  const skills: string[] = [...(raw.tags || []), ...(raw.skills_required || [])].filter(Boolean);

  let prizeAmount: number | null = null;
  let prizeDescription: string | null = null;
  if (raw.prize_in_cash) {
    prizeAmount = raw.prize_in_cash;
  } else if (raw.total_prize || raw.prize) {
    const prizeStr = raw.total_prize || raw.prize || '';
    const match = String(prizeStr).match(/[\d,]+/);
    if (match) prizeAmount = parseInt(match[0].replace(',', ''), 10);
    prizeDescription = prizeStr;
  }

  const challengeUrl = raw.challenge_url || raw.url || (raw.slug ? `https://www.hackerearth.com/challenges/${raw.slug}` : null);
  const registrationUrl = raw.register_url || raw.register_link || challengeUrl;

  return {
    externalId: `hackerearth-${raw.id || Math.random().toString(36).slice(2)}`,
    platform: 'HackerEarth',
    title: raw.title || 'HackerEarth Challenge',
    description: raw.description || raw.short_description || null,
    organizerName: raw.organization_name || raw.organizer || 'HackerEarth',
    organizerWebsite: 'https://www.hackerearth.com',
    registrationDeadline: raw.end_date || null,
    startDate: raw.start_date || null,
    endDate: raw.end_date || null,
    mode: (raw.is_online ? 'ONLINE' : raw.mode) as any || 'ONLINE',
    country: raw.country || 'India',
    state: raw.state || null,
    city: raw.city || null,
    category: mapHackerEarthCategory(raw.challenge_type || raw.type),
    tags: raw.tags || [],
    skills: [...new Set(skills)],
    prizeAmount,
    prizeCurrency: 'INR',
    prizeDescription,
    registrationUrl,
    sourceUrl: challengeUrl,
    eligibility: ['Developers', 'College Students', 'Professionals'],
    rawPayload: raw as any
  };
}

export class HackerEarthSource implements EventSource {
  name = 'HackerEarth';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${HACKEREARTH_API_BASE}/api/v3/challenges/?limit=1&offset=0`,
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

    try {
      while (offset < total) {
        const url = `${HACKEREARTH_API_BASE}/api/v3/challenges/?limit=${PAGE_SIZE}&offset=${offset}`;
        const res = await fetchWithTimeout(url);

        if (!res.ok) {
          if (pagesFetched === 0) throw new Error(`HackerEarth API returned status ${res.status}`);
          console.warn(`[HackerEarthSource] offset=${offset} returned ${res.status}, stopping.`);
          break;
        }

        const data: HackerEarthApiResponse = await res.json();
        const challenges: HackerEarthChallenge[] = data.results || data.challenges || data.data || [];

        if (challenges.length === 0) break;

        if (total === Infinity) {
          total = data.count ?? data.total ?? challenges.length;
        }

        challenges.forEach(c => allEvents.push(normalizeHackerEarthChallenge(c)));
        offset += PAGE_SIZE;
        pagesFetched++;

        if (!data.next) break; // Respect DRF-style next link
        if (pagesFetched >= 20) {
          console.warn('[HackerEarthSource] Reached page cap (20), stopping pagination.');
          break;
        }
      }

      console.log(`[HackerEarthSource] Fetched ${allEvents.length} events across ${pagesFetched} page(s).`);
    } catch (err: any) {
      error = `HackerEarthSource fetch error: ${err.message}`;
      console.error(`[HackerEarthSource] ${error}`);
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error
    };
  }
}
