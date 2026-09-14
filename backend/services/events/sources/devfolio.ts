/**
 * Devfolio Public API Source Adapter
 *
 * Fetches open hackathons from Devfolio's public REST API.
 *
 * API:
 * GET https://api.devfolio.co/api/hackathons
 *
 * Pagination:
 * page + limit
 *
 * Important:
 * - We only keep currently open/usable hackathons.
 * - We never invent dates.
 * - We prefer Devfolio's external application URL when available.
 * - If applications are hosted on Devfolio, the event's Devfolio
 *   hackathon page is used as the registration destination.
 */

import {
  EventSource,
  RawEvent,
  FetchResult,
} from './EventSource';

const DEVFOLIO_API_BASE = 'https://api.devfolio.co';

const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_PAGES = 30;

interface DevfolioHackathon {
  id?: string | number;
  uuid?: string;

  slug?: string;

  name?: string;
  title?: string;
  tagline?: string;
  desc?: string;
  description?: string;

  starts_at?: string | null;
  ends_at?: string | null;

  submission_period_ends_at?: string | null;
  registration_closes_at?: string | null;

  is_online?: boolean;
  private?: boolean;

  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;

  prize_pool?: number | string | null;

  organization?: {
    name?: string;
    website?: string;
  } | null;

  organiser_name?: string | null;

  tags?: string[];
  tech_tags?: string[];
  skills?: string[];

  url?: string | null;
  website?: string | null;
  registration_link?: string | null;

  status?: string | null;
  mode?: string | null;
  type?: string | null;

  team_min?: number | null;
  team_size?: number | string | null;

  hackathon_setting?: {
    reg_starts_at?: string | null;
    reg_ends_at?: string | null;

    external_apply_url?: string | null;

    site?: string | null;

    [key: string]: any;
  } | null;

  [key: string]: any;
}

interface DevfolioApiResponse {
  result?: DevfolioHackathon[];

  hackathons?: DevfolioHackathon[];

  data?: DevfolioHackathon[];

  results?: DevfolioHackathon[];

  count?: number;

  total?: number;

  pages?: number;

  page?: number;

  has_next?: boolean;

  next?: string | null;
}

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,

      signal: controller.signal,

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'IT-Career-Explorer/1.0',

        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check whether a URL is valid HTTP/HTTPS.
 */
function isValidUrl(
  url: string | null | undefined
): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

/**
 * Prevent generic Devfolio pages from being used
 * as registration destinations.
 */
function isGenericPlatformUrl(
  url: string
): boolean {
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
      '/contests',
      '/opportunities',
      '/explore',
    ];

    return genericPaths.includes(path);
  } catch {
    return true;
  }
}

/**
 * Get the canonical Devfolio hackathon page.
 *
 * Devfolio exposes a public page for each hackathon.
 */
function getDevfolioPageUrl(
  raw: DevfolioHackathon
): string | null {
  if (raw.slug) {
    return `https://devfolio.co/hackathons/${raw.slug}`;
  }

  if (
    isValidUrl(raw.url)
  ) {
    return raw.url!;
  }

  return null;
}

/**
 * Get the actual registration/application destination.
 *
 * Priority:
 *
 * 1. external_apply_url
 * 2. explicit registration_link
 * 3. Devfolio hackathon page
 *
 * Why is the Devfolio page allowed?
 *
 * Devfolio can host the application itself. Its documentation
 * describes users applying directly through the Devfolio
 * hackathon page.
 */
function getRegistrationUrl(
  raw: DevfolioHackathon
): string | null {
  const externalApplyUrl =
    raw.hackathon_setting
      ?.external_apply_url;

  if (
    isValidUrl(externalApplyUrl) &&
    !isGenericPlatformUrl(externalApplyUrl!)
  ) {
    return externalApplyUrl!;
  }

  if (
    isValidUrl(raw.registration_link) &&
    !isGenericPlatformUrl(raw.registration_link!)
  ) {
    return raw.registration_link!;
  }

  const devfolioPage =
    getDevfolioPageUrl(raw);

  if (devfolioPage) {
    return devfolioPage;
  }

  return null;
}

/**
 * Extract prize amount.
 */
function extractPrizeAmount(
  raw: DevfolioHackathon
): number | null {
  const value = raw.prize_pool;

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const match =
    String(value).match(/[\d,]+/);

  if (!match) {
    return null;
  }

  return parseInt(
    match[0].replace(/,/g, ''),
    10
  );
}

/**
 * Extract team size.
 */
function extractTeamSize(
  raw: DevfolioHackathon
): {
  min: number | null;
  max: number | null;
} {
  if (
    typeof raw.team_min === 'number'
  ) {
    const max =
      typeof raw.team_size === 'number'
        ? raw.team_size
        : null;

    return {
      min: raw.team_min,
      max,
    };
  }

  if (
    typeof raw.team_size === 'number'
  ) {
    return {
      min: null,
      max: raw.team_size,
    };
  }

  if (
    typeof raw.team_size === 'string'
  ) {
    const range =
      raw.team_size.match(
        /(\d+)\s*[-–]\s*(\d+)/
      );

    if (range) {
      return {
        min: Number(range[1]),
        max: Number(range[2]),
      };
    }

    const single =
      raw.team_size.match(/\d+/);

    if (single) {
      const value =
        Number(single[0]);

      return {
        min: value,
        max: value,
      };
    }
  }

  return {
    min: null,
    max: null,
  };
}

/**
 * Convert Devfolio mode to our normalized mode.
 */
function getMode(
  raw: DevfolioHackathon
): string | null {
  if (raw.mode) {
    return raw.mode;
  }

  if (raw.is_online === true) {
    return 'ONLINE';
  }

  if (raw.is_online === false) {
    return 'OFFLINE';
  }

  return null;
}

/**
 * Determine registration deadline.
 *
 * IMPORTANT:
 * Do not use event end date as a fake registration
 * deadline if Devfolio does not provide one.
 */
function getRegistrationDeadline(
  raw: DevfolioHackathon
): string | null {
  return (
    raw.hackathon_setting
      ?.reg_ends_at ||

    raw.registration_closes_at ||

    raw.submission_period_ends_at ||

    null
  );
}

/**
 * Determine whether registration is still open.
 *
 * We primarily trust the registration deadline.
 *
 * If no registration deadline exists, we don't
 * automatically reject the event.
 */
function isRegistrationStillOpen(
  raw: DevfolioHackathon
): boolean {
  const deadline =
    getRegistrationDeadline(raw);

  if (!deadline) {
    return true;
  }

  const timestamp =
    Date.parse(deadline);

  if (Number.isNaN(timestamp)) {
    return true;
  }

  return (
    timestamp >= Date.now()
  );
}

/**
 * Reject clearly unusable records.
 */
function isUsableHackathon(
  raw: DevfolioHackathon
): boolean {
  // Private hackathons should not appear
  // in the public student listing.
  if (raw.private === true) {
    return false;
  }

  // If the API explicitly says the event is closed,
  // don't include it.
  const status =
    String(raw.status || '')
      .toLowerCase();

  if (
    status === 'closed' ||
    status === 'expired' ||
    status === 'ended'
  ) {
    return false;
  }

  // Registration must not already be closed.
  if (
    !isRegistrationStillOpen(raw)
  ) {
    return false;
  }

  return true;
}

/**
 * Normalize one Devfolio hackathon.
 */
function normalizeDevfolioHackathon(
  raw: DevfolioHackathon
): RawEvent {
  const skills = [
    ...(raw.tags || []),
    ...(raw.tech_tags || []),
    ...(raw.skills || []),
  ]
    .map((value) =>
      String(value).trim()
    )
    .filter(Boolean);

  const uniqueSkills = [
    ...new Set(skills),
  ];

  const organizerName =
    raw.organization?.name ||
    raw.organiser_name ||
    null;

  const organizerWebsite =
    raw.organization?.website ||
    null;

  const registrationUrl =
    getRegistrationUrl(raw);

  const sourceUrl =
    getDevfolioPageUrl(raw);

  const teamSize =
    extractTeamSize(raw);

  const registrationDeadline =
    getRegistrationDeadline(raw);

  const startDate =
    raw.starts_at ||
    null;

  const endDate =
    raw.ends_at ||
    null;

  return {
    externalId:
      raw.uuid ||
      raw.id
        ? `devfolio-${
            raw.uuid || raw.id
          }`
        : `devfolio-${Buffer.from(
            raw.name ||
              raw.title ||
              'unknown'
          )
            .toString('base64')
            .slice(0, 20)}`,

    platform: 'Devfolio',

    title:
      raw.name ||
      raw.title ||
      'Devfolio Hackathon',

    description:
      raw.description ||
      raw.desc ||
      raw.tagline ||
      null,

    organizerName,

    organizerWebsite,

    registrationDeadline,

    startDate,

    endDate,

    mode:
      getMode(raw) as any,

    country:
      raw.country ||
      null,

    state:
      raw.state ||
      null,

    city:
      raw.city ||
      null,

    venue:
      raw.location ||
      null,

    category:
      'HACKATHON',

    tags:
      raw.tags || [],

    skills:
      uniqueSkills,

    prizeAmount:
      extractPrizeAmount(raw),

    prizeCurrency:
      'INR',

    prizeDescription:
      raw.prize_pool
        ? String(raw.prize_pool)
        : null,

    registrationUrl,

    sourceUrl,

    minTeamSize:
      teamSize.min,

    maxTeamSize:
      teamSize.max,

    /*
     * Don't invent eligibility.
     *
     * Devfolio's API response does not reliably
     * provide a universal eligibility field.
     */
    eligibility:
      null,

    rawPayload:
      raw as any,
  };
}

export class DevfolioSource
  implements EventSource {

  name = 'Devfolio';

  async isAvailable(): Promise<boolean> {
    try {
      const url =
        `${DEVFOLIO_API_BASE}` +
        `/api/hackathons` +
        `?limit=1&page=1&status=open`;

      const response =
        await fetchWithTimeout(
          url,
          {
            method: 'GET',
          },
          5000
        );

      return response.ok;
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
      while (
        page <= MAX_PAGES
      ) {
        const url =
          `${DEVFOLIO_API_BASE}` +
          `/api/hackathons` +
          `?limit=${PAGE_SIZE}` +
          `&page=${page}` +
          `&status=open`;

        const response =
          await fetchWithTimeout(
            url,
            {
              method: 'GET',
            }
          );

        if (!response.ok) {
          if (page === 1) {
            throw new Error(
              `Devfolio API returned status ${response.status}`
            );
          }

          console.warn(
            `[DevfolioSource] ` +
            `Page ${page} returned ` +
            `${response.status}. ` +
            `Stopping pagination.`
          );

          break;
        }

        const data:
          DevfolioApiResponse =
            await response.json();

        /*
         * The live API currently returns:
         *
         * {
         *   result: [...],
         *   count: ...,
         *   pages: ...
         * }
         *
         * Keep fallbacks for compatibility.
         */
        const hackathons =
          data.result ||
          data.hackathons ||
          data.data ||
          data.results ||
          [];

        if (
          !Array.isArray(hackathons) ||
          hackathons.length === 0
        ) {
          break;
        }

        for (
          const hackathon
          of hackathons
        ) {
          if (
            !isUsableHackathon(
              hackathon
            )
          ) {
            continue;
          }

          allEvents.push(
            normalizeDevfolioHackathon(
              hackathon
            )
          );
        }

        pagesFetched++;

        /*
         * Stop when we've reached the API's
         * reported page count.
         */
        if (
          typeof data.pages === 'number' &&
          page >= data.pages
        ) {
          break;
        }

        /*
         * Also stop if the API tells us
         * there isn't another page.
         */
        if (
          data.has_next === false
        ) {
          break;
        }

        /*
         * A short page normally means
         * there are no more records.
         */
        if (
          hackathons.length < PAGE_SIZE
        ) {
          break;
        }

        page++;
      }

      console.log(
        `[DevfolioSource] ` +
        `Fetched ${allEvents.length} ` +
        `open hackathons across ` +
        `${pagesFetched} page(s).`
      );
    } catch (err: any) {
      error =
        `DevfolioSource fetch error: ${
          err?.message ||
          String(err)
        }`;

      console.error(
        `[DevfolioSource] ${error}`
      );
    }

    return {
      events: allEvents,
      fetchedCount:
        allEvents.length,
      error,
    };
  }
}