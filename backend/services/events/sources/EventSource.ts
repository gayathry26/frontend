/**
 * Base interface for all event source adapters.
 * Every source (Devfolio, Unstop, Brabble, HackerEarth, etc.) implements this interface.
 */

export interface RawEvent {
  // Core identity
  externalId: string;         // Source-specific ID
  platform: string;           // e.g. "Devfolio", "Unstop", "HackerEarth"
  title: string;
  description?: string | null;
  organizerName?: string | null;
  organizerWebsite?: string | null;

  // Dates (ISO strings or raw from API)
  registrationDeadline?: string | null;
  startDate?: string | null;
  endDate?: string | null;

  // Location
  mode?: 'ONLINE' | 'OFFLINE' | 'HYBRID' | string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  venue?: string | null;

  // Content
  category?: string | null;    // Raw category string — will be normalized
  tags?: string[];             // Raw tag list
  skills?: string[];           // Raw skill names

  // Prize
  prizeAmount?: number | null;
  prizeCurrency?: string | null;
  prizeDescription?: string | null;

  // URLs — may be null / missing / invalid (validator will handle)
  registrationUrl?: string | null;
  sourceUrl?: string | null;   // Link back to platform listing page

  // Team size (ignored for normalization — kept for reference)
  minTeamSize?: number | null;
  maxTeamSize?: number | null;

  // Eligibility
  eligibility?: string[] | null;

  // Raw extra data from API (preserved for debugging)
  rawPayload?: Record<string, any>;
}

export interface FetchResult {
  events: RawEvent[];
  fetchedCount: number;
  error?: string | null;
}

export interface EventSource {
  /** Human-readable platform name, e.g. "Devfolio" */
  name: string;

  /** Whether this source can currently be reached (e.g. API key present) */
  isAvailable(): Promise<boolean>;

  /**
   * Fetches ALL available events from this source.
   * Implementations MUST paginate through all pages (not just page 1).
   * Returns a FetchResult containing all events and count.
   */
  fetchEvents(): Promise<FetchResult>;
}
