/**
 * Unstop Source Adapter
 *
 * Fetches currently available hackathons from Unstop's public API.
 *
 * API:
 * GET https://unstop.com/api/public/opportunity/search-result
 *
 * We intentionally fetch ONLY:
 *   type=hackathon
 *
 * Unstop is treated as a primary source.
 */

import { EventSource, RawEvent, FetchResult } from './EventSource';

const UNSTOP_API_BASE = 'https://unstop.com';
const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_PAGES = 30;

interface UnstopOpportunity {
  id?: number | string;

  title?: string;
  name?: string;

  description?: string;
  short_description?: string;

  organisation?: {
    name?: string;
    logo?: string;
    website?: string;
  } | null;

  organiser?: string;

  // Dates
  start?: string;
  end?: string;
  start_date?: string;
  end_date?: string;

  reg_start?: string;
  reg_end?: string;
  registration_start?: string;
  registration_end?: string;

  deadline?: string;

  // Classification
  event_type?: string;
  type?: string;
  category?: string;
  opportunity_type?: string;

  // Mode/location
  is_online?: boolean | number;
  mode?: string;

  city?: string;
  state?: string;
  country?: string;

  address?: string;
  address_with_country_logo?: string;

  // Skills/tags
  tags?: string[] | { name?: string }[];
  skills?: string[] | { name?: string }[];
  required_skills?: string[] | { name?: string }[];

  // Prize
  prize?: string | number | null;
  prize_pool?: string | number | null;
  total_prize?: string | number | null;

  prizes?: unknown;

  // URLs
  url?: string;
  link?: string;
  registration_link?: string;
  apply_link?: string;
  website?: string;

  seo_url?: string;
  short_url?: string;

  // Team
  team_size?: string;
  min_team_size?: number;
  max_team_size?: number;

  // Registration / eligibility information
  regnRequirements?: any;
  registration_requirements?: any;
  eligibility?: string[] | string;
  filters?: any;

  [key: string]: any;
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

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IT-Career-Explorer/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convert different Unstop array formats into strings.
 */
function extractTags(
  raw:
    | string[]
    | { name?: string }[]
    | undefined
): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item: any) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      return String(item?.name || '').trim();
    })
    .filter(Boolean);
}

/**
 * Extract prize information.
 */
function extractPrize(raw: UnstopOpportunity): {
  amount: number | null;
  description: string | null;
} {
  const prizeRaw =
    raw.prize ??
    raw.prize_pool ??
    raw.total_prize ??
    null;

  if (
    prizeRaw === null ||
    prizeRaw === undefined ||
    prizeRaw === ''
  ) {
    return {
      amount: null,
      description: null,
    };
  }

  if (typeof prizeRaw === 'number') {
    return {
      amount: prizeRaw,
      description: null,
    };
  }

  const description = String(prizeRaw).trim();

  const match = description.match(/[\d,]+/);

  return {
    amount: match
      ? parseInt(match[0].replace(/,/g, ''), 10)
      : null,
    description,
  };
}

/**
 * Check whether a URL is a usable event-specific URL.
 */
function isValidUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generic platform URLs must never be used as registration URLs.
 */
function isGenericPlatformUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    const path = parsed.pathname
      .replace(/\/+$/, '')
      .toLowerCase();

    const genericPaths = [
      '',
      '/',
      '/hackathons',
      '/events',
      '/competitions',
      '/challenges',
      '/opportunities',
      '/contests',
      '/programs',
      '/explore',
      '/jobs',
      '/all-opportunities',
    ];

    return genericPaths.includes(path);
  } catch {
    return true;
  }
}

/**
 * Pick the best registration URL available from Unstop.
 *
 * Priority:
 * 1. registration_link
 * 2. apply_link
 * 3. event-specific seo_url
 * 4. event-specific url/link
 *
 * We do NOT manufacture URLs from the ID.
 */
function getRegistrationUrl(
  raw: UnstopOpportunity
): string | null {
  const candidates = [
    raw.registration_link,
    raw.apply_link,
    raw.seo_url,
    raw.url,
    raw.link,
  ];

  for (const candidate of candidates) {
    if (
      isValidUrl(candidate) &&
      !isGenericPlatformUrl(candidate!)
    ) {
      return candidate!;
    }
  }

  return null;
}

/**
 * Get Unstop's canonical event page.
 *
 * seo_url is preferred because it is supplied by Unstop itself.
 */
function getSourceUrl(
  raw: UnstopOpportunity
): string | null {
  const candidates = [
    raw.seo_url,
    raw.url,
    raw.link,
  ];

  for (const candidate of candidates) {
    if (isValidUrl(candidate)) {
      return candidate!;
    }
  }

  return null;
}

/**
 * Extract eligibility information without inventing values.
 */
function extractEligibility(
  raw: UnstopOpportunity
): string[] {
  const result: string[] = [];

  if (Array.isArray(raw.eligibility)) {
    result.push(
      ...raw.eligibility
        .map((item) => String(item).trim())
        .filter(Boolean)
    );
  } else if (typeof raw.eligibility === 'string') {
    result.push(raw.eligibility.trim());
  }

  const requirements =
    raw.regnRequirements ||
    raw.registration_requirements;

  if (requirements) {
    const possibleFields = [
      requirements.eligibility,
      requirements.eligibilities,
      requirements.eligible_for,
      requirements.education,
    ];

    for (const field of possibleFields) {
      if (Array.isArray(field)) {
        result.push(
          ...field
            .map((item: any) =>
              typeof item === 'string'
                ? item.trim()
                : String(item?.name || '').trim()
            )
            .filter(Boolean)
        );
      } else if (typeof field === 'string') {
        result.push(field.trim());
      }
    }
  }

  return [...new Set(result.filter(Boolean))];
}

/**
 * Extract team size when Unstop provides it as:
 *
 * - min_team_size / max_team_size
 * - "1-5"
 * - "2"
 */
function extractTeamSize(raw: UnstopOpportunity): {
  min: number | null;
  max: number | null;
} {
  if (
    typeof raw.min_team_size === 'number' ||
    typeof raw.max_team_size === 'number'
  ) {
    return {
      min:
        typeof raw.min_team_size === 'number'
          ? raw.min_team_size
          : null,

      max:
        typeof raw.max_team_size === 'number'
          ? raw.max_team_size
          : null,
    };
  }

  const teamSize = String(
    raw.team_size || ''
  ).trim();

  if (!teamSize) {
    return {
      min: null,
      max: null,
    };
  }

  const range = teamSize.match(/(\d+)\s*[-–]\s*(\d+)/);

  if (range) {
    return {
      min: Number(range[1]),
      max: Number(range[2]),
    };
  }

  const single = teamSize.match(/\d+/);

  if (single) {
    const value = Number(single[0]);

    return {
      min: value,
      max: value,
    };
  }

  return {
    min: null,
    max: null,
  };
}

/**
 * Normalize a single Unstop opportunity.
 */
function normalizeUnstopOpportunity(
  raw: UnstopOpportunity
): RawEvent {
  const tags = extractTags(raw.tags);

  const skills = [
    ...extractTags(raw.skills),
    ...extractTags(raw.required_skills),
  ];

  const allSkills = [
    ...new Set(
      [...skills, ...tags]
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];

  const {
    amount: prizeAmount,
    description: prizeDescription,
  } = extractPrize(raw);

  const organizerName =
    raw.organisation?.name ||
    raw.organiser ||
    null;

  const organizerWebsite =
    raw.organisation?.website ||
    raw.website ||
    null;

  // Determine mode.
  let mode: string | null = null;

  if (raw.mode) {
    mode = raw.mode;
  } else if (
    raw.is_online === true ||
    raw.is_online === 1
  ) {
    mode = 'ONLINE';
  } else if (
    raw.is_online === false ||
    raw.is_online === 0
  ) {
    mode = 'OFFLINE';
  }

  const registrationUrl =
    getRegistrationUrl(raw);

  const sourceUrl =
    getSourceUrl(raw);

  /*
   * Prefer explicit registration dates.
   * DO NOT invent dates.
   */
  const registrationDeadline =
    raw.reg_end ||
    raw.registration_end ||
    raw.deadline ||
    null;

  const startDate =
    raw.start ||
    raw.start_date ||
    null;

  const endDate =
    raw.end ||
    raw.end_date ||
    null;

  const teamSize =
    extractTeamSize(raw);

  const eligibility =
    extractEligibility(raw);

  return {
    externalId:
      raw.id !== undefined &&
      raw.id !== null
        ? `unstop-${raw.id}`
        : `unstop-${Buffer.from(
            raw.title || 'unknown'
          )
            .toString('base64')
            .slice(0, 20)}`,

    platform: 'Unstop',

    title:
      raw.title ||
      raw.name ||
      'Untitled Hackathon',

    description:
      raw.description ||
      raw.short_description ||
      null,

    organizerName,

    organizerWebsite,

    registrationDeadline,

    startDate,

    endDate,

    mode: mode as any,

    country:
      raw.country ||
      'India',

    state:
      raw.state ||
      null,

    city:
      raw.city ||
      null,

    venue:
      raw.address ||
      raw.address_with_country_logo ||
      null,

    category:
      'HACKATHON',

    tags,

    skills: allSkills,

    prizeAmount,

    prizeCurrency:
      'INR',

    prizeDescription,

    registrationUrl,

    sourceUrl,

    minTeamSize:
      teamSize.min,

    maxTeamSize:
      teamSize.max,

    eligibility:
      eligibility.length > 0
        ? eligibility
        : null,

    rawPayload:
      raw as any,
  };
}

export class UnstopSource implements EventSource {
  name = 'Unstop';

  async isAvailable(): Promise<boolean> {
    try {
      const url =
        `${UNSTOP_API_BASE}` +
        `/api/public/opportunity/search-result` +
        `?limit=1&start=0&type=hackathon`;

      const response =
        await fetchWithTimeout(url, 5000);

      return response.ok;
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
      while (
        offset < total &&
        pagesFetched < MAX_PAGES
      ) {
        const url =
          `${UNSTOP_API_BASE}` +
          `/api/public/opportunity/search-result` +
          `?limit=${PAGE_SIZE}` +
          `&start=${offset}` +
          `&type=hackathon`;

        const response =
          await fetchWithTimeout(url);

        if (!response.ok) {
          console.warn(
            `[UnstopSource] offset=${offset} returned ${response.status}`
          );

          break;
        }

        const json: UnstopApiResponse =
          await response.json();

        const nested =
          json?.data;

        const opportunities =
          nested?.data ||
          json.opportunities ||
          [];

        if (
          !Array.isArray(opportunities) ||
          opportunities.length === 0
        ) {
          break;
        }

        if (total === Infinity) {
          total =
            nested?.total ??
            json.total ??
            json.count ??
            opportunities.length;
        }

        /*
         * Extra safety:
         * only accept actual hackathons.
         *
         * The API request already uses type=hackathon,
         * but keeping this check prevents unrelated
         * opportunities from entering the database if
         * Unstop changes its response.
         */
        for (const opportunity of opportunities) {
          const rawType = String(
            opportunity.event_type ||
            opportunity.type ||
            opportunity.category ||
            opportunity.opportunity_type ||
            ''
          ).toLowerCase();

          const isHackathon =
            rawType.includes('hackathon') ||
            rawType === '';

          if (!isHackathon) {
            continue;
          }

          allEvents.push(
            normalizeUnstopOpportunity(
              opportunity
            )
          );
        }

        pagesFetched++;

        offset += opportunities.length;

        /*
         * If the API returned fewer than the requested
         * page size, there is no next page.
         */
        if (
          opportunities.length < PAGE_SIZE
        ) {
          break;
        }
      }

      console.log(
        `[UnstopSource] Fetched ` +
        `${allEvents.length} hackathons ` +
        `across ${pagesFetched} page(s).`
      );
    } catch (err: any) {
      error =
        `UnstopSource fetch error: ${
          err?.message || String(err)
        }`;

      console.error(
        `[UnstopSource] ${error}`
      );
    }

    return {
      events: allEvents,
      fetchedCount: allEvents.length,
      error,
    };
  }
}
