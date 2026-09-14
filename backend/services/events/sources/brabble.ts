 /**
  * Brabble API Source Adapter
  *
  * Brabble is used as an additional discovery source.
  *
  * Current API:
  * GET https://brabble.ai/api/listings
  *
  * Authentication:
  * Authorization: Bearer <BRABBLE_API_KEY>
  *
  * We request:
  *   hub=hackathons
  *   type=HACKATHON
  *
  * Brabble already removes expired listings and returns
  * the organiser's registration URL.
  */

import {
  EventSource,
  RawEvent,
  FetchResult,
} from './EventSource';

const BRABBLE_API_BASE =
  'https://brabble.ai';

const PAGE_SIZE = 200;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_PAGES = 50;

interface BrabbleListing {
  id?: string;

  title?: string;

  organiser?: string;

  type?: string;

  kind?: 'competition' | 'contest' | string;

  platform?: string;

  url?: string;

  shareUrl?: string;

  deadline?: string;

  mode?: 'ONLINE' | 'OFFLINE' | 'HYBRID' | string;

  city?: string;

  prize?: {
    label?: string;
    inr?: number | null;
  } | null;

  team?: string;

  fee?: string;

  eligibility?: string[];

  registered?: number | null;
}

interface BrabbleApiResponse {
  refreshedAt?: string;

  origin?: 'store' | 'live' | string;

  total?: number;

  count?: number;

  offset?: number;

  limit?: number;

  listings?: BrabbleListing[];

  attribution?: string;

  docs?: string;
}

/**
 * Fetch Brabble API with timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const apiKey =
    process.env.BRABBLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'BRABBLE_API_KEY is not configured'
    );
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    return await fetch(url, {
      signal: controller.signal,

      headers: {
        Accept:
          'application/json',

        'User-Agent':
          'IT-Career-Explorer/1.0',

        Authorization:
          `Bearer ${apiKey}`,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse team size strings such as:
 *
 * "1-4"
 * "2-5"
 * "Individual"
 */
function extractTeamSize(
  team: string | undefined
): {
  min: number | null;
  max: number | null;
} {
  if (!team) {
    return {
      min: null,
      max: null,
    };
  }

  const value =
    team.trim();

  const range =
    value.match(
      /(\d+)\s*[-–]\s*(\d+)/
    );

  if (range) {
    return {
      min: Number(range[1]),
      max: Number(range[2]),
    };
  }

  const single =
    value.match(/\d+/);

  if (single) {
    const number =
      Number(single[0]);

    return {
      min: number,
      max: number,
    };
  }

  return {
    min: null,
    max: null,
  };
}

/**
 * Extract prize.
 *
 * Brabble's prize.inr is already the best
 * available parsed INR value.
 */
function extractPrize(
  listing: BrabbleListing
): {
  amount: number | null;
  currency: string | null;
  description: string | null;
} {
  const amount =
    listing.prize?.inr ??
    null;

  const description =
    listing.prize?.label ||
    null;

  return {
    amount,
    currency:
      amount !== null
        ? 'INR'
        : null,
    description,
  };
}

/**
 * Check whether the listing is still open.
 *
 * Brabble promises expired listings are removed,
 * but we perform our own safety check as well.
 */
function isStillOpen(
  deadline: string | undefined
): boolean {
  if (!deadline) {
    return false;
  }

  const timestamp =
    Date.parse(deadline);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return (
    timestamp >= Date.now()
  );
}

/**
 * Normalize one Brabble listing.
 */
function normalizeBrabbleListing(
  raw: BrabbleListing
): RawEvent {
  const teamSize =
    extractTeamSize(raw.team);

  const prize =
    extractPrize(raw);

  /*
   * Brabble's `url` is the organiser/platform
   * destination where registration happens.
   *
   * `shareUrl` is Brabble's own page and should
   * NOT be used as the student's registration URL.
   */
  const registrationUrl =
    raw.url || null;

  /*
   * Brabble itself is the discovery source.
   * The organiser URL is kept as registrationUrl.
   *
   * We don't have to expose shareUrl to students.
   */
  const sourceUrl =
    raw.shareUrl ||
    raw.url ||
    null;

  return {
    externalId:
      raw.id
        ? `brabble-${raw.id}`
        : `brabble-${Buffer.from(
            raw.title || 'unknown'
          )
            .toString('base64')
            .slice(0, 20)}`,

    platform:
      `Brabble:${raw.platform || 'Unknown'}`,

    title:
      raw.title ||
      'Untitled Hackathon',

    description:
      null,

    organizerName:
      raw.organiser ||
      null,

    /*
     * Brabble does not provide an organiser
     * website separately.
     */
    organizerWebsite:
      null,

    /*
     * Brabble's deadline has meaning depending
     * on `kind`.
     *
     * For hackathons we requested type=HACKATHON,
     * and competition-style entries use deadline
     * as the application closing time.
     */
    registrationDeadline:
      raw.deadline ||
      null,

    /*
     * Brabble does not expose a separate start
     * date in its current listing schema.
     *
     * Do NOT invent one.
     */
    startDate:
      null,

    endDate:
      null,

    mode:
      raw.mode as any,

    /*
     * Brabble city is free text and can sometimes
     * be empty or "See listing".
     */
    country:
      'India',

    state:
      null,

    city:
      raw.city &&
      raw.city !== 'See listing'
        ? raw.city
        : null,

    venue:
      null,

    category:
      'HACKATHON',

    tags:
      [],

    skills:
      [],

    prizeAmount:
      prize.amount,

    prizeCurrency:
      prize.currency,

    prizeDescription:
      prize.description,

    registrationUrl,

    sourceUrl,

    minTeamSize:
      teamSize.min,

    maxTeamSize:
      teamSize.max,

    eligibility:
      Array.isArray(
        raw.eligibility
      )
        ? raw.eligibility
        : null,

    rawPayload:
      raw as any,
  };
}

export class BrabbleSource
  implements EventSource {

  name = 'Brabble';

  async isAvailable(): Promise<boolean> {
    try {
      if (
        !process.env.BRABBLE_API_KEY
      ) {
        console.warn(
          '[BrabbleSource] ' +
          'BRABBLE_API_KEY is not configured.'
        );

        return false;
      }

      const url =
        `${BRABBLE_API_BASE}` +
        `/api/listings` +
        `?hub=hackathons` +
        `&type=HACKATHON` +
        `&limit=1` +
        `&offset=0`;

      const response =
        await fetchWithTimeout(
          url,
          5000
        );

      return response.ok;
    } catch (error: any) {
      console.warn(
        '[BrabbleSource] ' +
        `Availability check failed: ${
          error?.message ||
          String(error)
        }`
      );

      return false;
    }
  }

  async fetchEvents(): Promise<FetchResult> {
    const allEvents: RawEvent[] = [];

    let offset = 0;

    let total =
      Infinity;

    let pagesFetched = 0;

    let error:
      string | null = null;

    try {
      while (
        offset < total &&
        pagesFetched < MAX_PAGES
      ) {
        const url =
          `${BRABBLE_API_BASE}` +
          `/api/listings` +
          `?hub=hackathons` +
          `&type=HACKATHON` +
          `&limit=${PAGE_SIZE}` +
          `&offset=${offset}`;

        const response =
          await fetchWithTimeout(
            url
          );

        if (!response.ok) {
          throw new Error(
            `Brabble API returned status ${response.status}`
          );
        }

        const data:
          BrabbleApiResponse =
            await response.json();

        const listings =
          Array.isArray(
            data.listings
          )
            ? data.listings
            : [];

        if (
          listings.length === 0
        ) {
          break;
        }

        if (
          typeof data.total ===
          'number'
        ) {
          total =
            data.total;
        } else {
          total =
            listings.length;
        }

        for (
          const listing
          of listings
        ) {
          /*
           * Extra validation.
           *
           * The API already filters to HACKATHON,
           * but don't trust an unexpected response.
           */
          if (
            String(
              listing.type || ''
            ).toUpperCase() !==
            'HACKATHON'
          ) {
            continue;
          }

          /*
           * Brabble promises expired listings are
           * removed. Still validate locally.
           */
          if (
            !isStillOpen(
              listing.deadline
            )
          ) {
            continue;
          }

          /*
           * Registration destination must exist.
           */
          if (!listing.url) {
            continue;
          }

          allEvents.push(
            normalizeBrabbleListing(
              listing
            )
          );
        }

        pagesFetched++;

        /*
         * API echoes the actual limit after clamping.
         */
        const returnedLimit =
          data.limit ||
          PAGE_SIZE;

        offset +=
          returnedLimit;

        /*
         * Short page = no more records.
         */
        if (
          listings.length <
          returnedLimit
        ) {
          break;
        }
      }

      console.log(
        `[BrabbleSource] ` +
        `Fetched ${allEvents.length} ` +
        `open hackathons across ` +
        `${pagesFetched} page(s). ` +
        `Total reported: ${total}.`
      );
    } catch (err: any) {
      error =
        `BrabbleSource fetch error: ${
          err?.message ||
          String(err)
        }`;

      console.error(
        `[BrabbleSource] ${error}`
      );
    }

    return {
      events:
        allEvents,

      fetchedCount:
        allEvents.length,

      error,
    };
  }
}