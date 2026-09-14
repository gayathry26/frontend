/**
 * Event Normalizer
 *
 * Converts platform-specific RawEvent data into the canonical EventDocument format.
 *
 * Important rules:
 * - Never invent dates.
 * - Never invent eligibility.
 * - Never invent prize information.
 * - Only use real registration URLs.
 * - Normalize Indian cities/states.
 * - Normalize event mode/category.
 * - Determine status from the real registration deadline.
 */

import { RawEvent } from './sources/EventSource';
import {
  EventDocument,
  EventCategory,
  EventMode,
  EventStatus
} from '../../types/event';
import {
  validateRegistrationUrl,
  isPlaceholderUrl
} from '../../utils/validateEventUrl';

// ---------------------------------------------------------------------------
// Indian State & City Normalization
// ---------------------------------------------------------------------------

const CITY_NORMALIZATION: Record<string, string> = {
  'bombay': 'Mumbai',
  'calcutta': 'Kolkata',
  'madras': 'Chennai',
  'bangalore': 'Bengaluru',
  'bengaluru': 'Bengaluru',
  'mysore': 'Mysuru',
  'poona': 'Pune',
  'pondicherry': 'Puducherry',
  'banaras': 'Varanasi',
  'new bombay': 'Navi Mumbai',
  'navi mumbai': 'Navi Mumbai',
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'vizag': 'Visakhapatnam',
  'vizagapatnam': 'Visakhapatnam',
  'trivandrum': 'Thiruvananthapuram',
  'calicut': 'Kozhikode',
  'cochin': 'Kochi',
  'ernakulam': 'Kochi',
  'thrissur': 'Thrissur',
  'trichur': 'Thrissur',
  'coimbatore': 'Coimbatore',
  'trichy': 'Tiruchirappalli',
  'tiruchirappalli': 'Tiruchirappalli',
  'madurai': 'Madurai',
  'salem': 'Salem',
  'vellore': 'Vellore',
  'tirupati': 'Tirupati',
  'vijaywada': 'Vijayawada',
  'vijayawada': 'Vijayawada',
  'rajahmundry': 'Rajamahendravaram',
  'hubli': 'Hubballi',
  'hubballi': 'Hubballi',
  'mangalore': 'Mangaluru',
  'mangaluru': 'Mangaluru',
  'belgaum': 'Belagavi',
  'belagavi': 'Belagavi',
  'shimoga': 'Shivamogga',
  'shivamogga': 'Shivamogga',
  'nanded': 'Nanded',
  'aurangabad': 'Chhatrapati Sambhajinagar',
  'nagpur': 'Nagpur',
  'nasik': 'Nashik',
  'nashik': 'Nashik',
  'solapur': 'Solapur',
  'kolhapur': 'Kolhapur',
  'thane': 'Thane',
  'delhi': 'Delhi',
  'new delhi': 'New Delhi',
  'noida': 'Noida',
  'faridabad': 'Faridabad',
  'ghaziabad': 'Ghaziabad',
  'lucknow': 'Lucknow',
  'kanpur': 'Kanpur',
  'agra': 'Agra',
  'allahabad': 'Prayagraj',
  'prayagraj': 'Prayagraj',
  'varanasi': 'Varanasi',
  'patna': 'Patna',
  'ranchi': 'Ranchi',
  'bhubaneswar': 'Bhubaneswar',
  'bhuvaneshwar': 'Bhubaneswar',
  'jaipur': 'Jaipur',
  'jodhpur': 'Jodhpur',
  'udaipur': 'Udaipur',
  'ahmedabad': 'Ahmedabad',
  'surat': 'Surat',
  'vadodara': 'Vadodara',
  'baroda': 'Vadodara',
  'rajkot': 'Rajkot',
  'chandigarh': 'Chandigarh',
  'amritsar': 'Amritsar',
  'ludhiana': 'Ludhiana',
  'jalandhar': 'Jalandhar',
  'bhopal': 'Bhopal',
  'indore': 'Indore',
  'gwalior': 'Gwalior',
  'raipur': 'Raipur',
  'dehradun': 'Dehradun',
  'guwahati': 'Guwahati',
  'dispur': 'Dispur',
  'shillong': 'Shillong',
  'imphal': 'Imphal',
  'aizawl': 'Aizawl',
  'agartala': 'Agartala',
  'kohima': 'Kohima',
  'itanagar': 'Itanagar',
  'gangtok': 'Gangtok',
  'shimla': 'Shimla',
  'srinagar': 'Srinagar',
  'jammu': 'Jammu',
  'leh': 'Leh',
  'panaji': 'Panaji',
  'panjim': 'Panaji',
  'margao': 'Margao'
};

const STATE_NORMALIZATION: Record<string, string> = {
  'tamilnadu': 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  'tn': 'Tamil Nadu',
  'karnataka': 'Karnataka',
  'kerala': 'Kerala',
  'andhra pradesh': 'Andhra Pradesh',
  'ap': 'Andhra Pradesh',
  'telangana': 'Telangana',
  'ts': 'Telangana',
  'maharashtra': 'Maharashtra',
  'mh': 'Maharashtra',
  'goa': 'Goa',
  'gujarat': 'Gujarat',
  'gj': 'Gujarat',
  'rajasthan': 'Rajasthan',
  'rj': 'Rajasthan',
  'delhi': 'Delhi',
  'ncr': 'Delhi',
  'new delhi': 'Delhi',
  'uttar pradesh': 'Uttar Pradesh',
  'up': 'Uttar Pradesh',
  'bihar': 'Bihar',
  'br': 'Bihar',
  'jharkhand': 'Jharkhand',
  'jhk': 'Jharkhand',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'od': 'Odisha',
  'west bengal': 'West Bengal',
  'wb': 'West Bengal',
  'bengal': 'West Bengal',
  'assam': 'Assam',
  'as': 'Assam',
  'meghalaya': 'Meghalaya',
  'manipur': 'Manipur',
  'mizoram': 'Mizoram',
  'tripura': 'Tripura',
  'nagaland': 'Nagaland',
  'arunachal pradesh': 'Arunachal Pradesh',
  'sikkim': 'Sikkim',
  'himachal pradesh': 'Himachal Pradesh',
  'hp': 'Himachal Pradesh',
  'uttarakhand': 'Uttarakhand',
  'uk': 'Uttarakhand',
  'uttaranchal': 'Uttarakhand',
  'madhya pradesh': 'Madhya Pradesh',
  'mp': 'Madhya Pradesh',
  'chhattisgarh': 'Chhattisgarh',
  'cg': 'Chhattisgarh',
  'punjab': 'Punjab',
  'pb': 'Punjab',
  'haryana': 'Haryana',
  'hr': 'Haryana',
  'jammu and kashmir': 'Jammu & Kashmir',
  'j&k': 'Jammu & Kashmir',
  'jk': 'Jammu & Kashmir',
  'ladakh': 'Ladakh',
  'chandigarh': 'Chandigarh',
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry'
};

// ---------------------------------------------------------------------------
// Category Normalization
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, EventCategory> = {
  'hackathon': 'HACKATHON',
  'hack': 'HACKATHON',
  'hackhour': 'HACKATHON',

  'coding contest': 'CODING_CONTEST',
  'coding_contest': 'CODING_CONTEST',
  'coding challenge': 'CODING_CONTEST',
  'programming contest': 'CODING_CONTEST',
  'competitive programming': 'CODING_CONTEST',
  'sprint': 'CODING_CONTEST',
  'code': 'CODING_CONTEST',
  'compete': 'CODING_CONTEST',
  'competition': 'CODING_CONTEST',
  'quiz': 'CODING_CONTEST',

  'ctf': 'CTF',
  'capture the flag': 'CTF',
  'security challenge': 'CTF',

  'workshop': 'WORKSHOP',
  'bootcamp': 'WORKSHOP',
  'training': 'WORKSHOP',

  'webinar': 'WEBINAR',
  'online talk': 'WEBINAR',
  'virtual talk': 'WEBINAR',

  'conference': 'CONFERENCE',
  'summit': 'CONFERENCE',
  'symposium': 'CONFERENCE',
  'conclave': 'CONFERENCE',

  'tech fest': 'TECH_FEST',
  'techfest': 'TECH_FEST',
  'tech_fest': 'TECH_FEST',
  'fest': 'TECH_FEST',

  'ideathon': 'IDEATHON',
  'idea': 'IDEATHON',

  'open source': 'OPEN_SOURCE',
  'open_source': 'OPEN_SOURCE',
  'opensource': 'OPEN_SOURCE',

  'career fair': 'CAREER_FAIR',
  'career_fair': 'CAREER_FAIR',
  'job fair': 'CAREER_FAIR',
  'placement fair': 'CAREER_FAIR',

  'project competition': 'PROJECT_COMPETITION',
  'project_competition': 'PROJECT_COMPETITION'
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function normalizeCity(
  city: string | null | undefined
): string | null {
  if (!city) return null;

  const trimmed = city.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  return CITY_NORMALIZATION[lower] || trimmed;
}

export function normalizeState(
  state: string | null | undefined
): string | null {
  if (!state) return null;

  const trimmed = state.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  return STATE_NORMALIZATION[lower] || trimmed;
}

export function normalizeMode(
  mode: string | null | undefined
): EventMode {
  if (!mode) return 'ONLINE';

  const lower = mode.toLowerCase().trim();

  if (
    [
      'online',
      'virtual',
      'remote',
      'digital',
      'web',
      'internet'
    ].includes(lower)
  ) {
    return 'ONLINE';
  }

  if (
    [
      'hybrid',
      'mixed',
      'blended',
      'both'
    ].includes(lower)
  ) {
    return 'HYBRID';
  }

  if (
    [
      'offline',
      'in-person',
      'in person',
      'onsite',
      'on-site',
      'physical',
      'live'
    ].includes(lower)
  ) {
    return 'OFFLINE';
  }

  // We do not know the exact mode, so ONLINE is the safest
  // compatibility fallback for existing data.
  return 'ONLINE';
}

export function normalizeCategory(
  rawCategory: string | null | undefined
): EventCategory {
  if (!rawCategory) return 'HACKATHON';

  const lower = rawCategory.toLowerCase().trim();

  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return 'HACKATHON';
}

/**
 * Calculate event status using the REAL registration deadline.
 *
 * Important:
 * Missing deadline is NOT treated as an upcoming event.
 * We return PENDING_REVIEW so the UI can avoid presenting
 * it as definitely open.
 */
export function resolveStatus(
  registrationDeadline: string | null | undefined
): EventStatus {
  if (!registrationDeadline) {
    return 'PENDING_REVIEW';
  }

  const deadline = new Date(registrationDeadline).getTime();

  if (Number.isNaN(deadline)) {
    return 'PENDING_REVIEW';
  }

  const now = Date.now();

  if (deadline <= now) {
    return 'EXPIRED';
  }

  const hoursLeft =
    (deadline - now) / (1000 * 60 * 60);

  if (hoursLeft <= 48) {
    return 'CLOSING_SOON';
  }

  const daysLeft = hoursLeft / 24;

  if (daysLeft > 30) {
    return 'UPCOMING';
  }

  return 'OPEN';
}

export function generateSlug(
  title: string,
  platform: string,
  externalId: string
): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/(^-|-$)/g, '');

  const platformSlug = platform
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const idHash = externalId
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6);

  return `${base}-${platformSlug}-${idHash}`;
}

// ---------------------------------------------------------------------------
// India Relevance
// ---------------------------------------------------------------------------

export function isIndiaRelevant(raw: RawEvent): boolean {
  const mode = normalizeMode(raw.mode);

  // Online events can generally be accessed by Indian students.
  if (mode === 'ONLINE') {
    return true;
  }

  // Explicit India country.
  const countryLower = (raw.country || '')
    .trim()
    .toLowerCase();

  if (
    countryLower === 'india' ||
    countryLower === 'in' ||
    countryLower.includes('india')
  ) {
    return true;
  }

  // Known Indian state.
  if (raw.state) {
    const stateLower = raw.state.trim().toLowerCase();

    if (STATE_NORMALIZATION[stateLower]) {
      return true;
    }
  }

  // Known Indian city.
  if (raw.city) {
    const cityLower = raw.city.trim().toLowerCase();

    if (CITY_NORMALIZATION[cityLower]) {
      return true;
    }
  }

  // Do NOT automatically assume unknown-location offline
  // events are India-relevant.
  return false;
}

// ---------------------------------------------------------------------------
// Main Normalizer
// ---------------------------------------------------------------------------

export function normalizeRawEvent(
  raw: RawEvent
): EventDocument {
  const now = new Date().toISOString();

  const category = normalizeCategory(raw.category);
  const mode = normalizeMode(raw.mode);

  const city = normalizeCity(raw.city);
  const state = normalizeState(raw.state);

  const country =
    raw.country?.trim() ||
    (mode === 'ONLINE' ? 'Global' : null);

  // -------------------------------------------------------------------------
  // Registration URL
  // -------------------------------------------------------------------------

  const {
    registrationUrl,
    registrationAvailable
  } = validateRegistrationUrl(raw.registrationUrl);

  const sourceUrl =
    raw.sourceUrl &&
    !isPlaceholderUrl(raw.sourceUrl)
      ? raw.sourceUrl.trim()
      : null;

  // -------------------------------------------------------------------------
  // Dates
  // -------------------------------------------------------------------------

  // IMPORTANT:
  // We NEVER generate fake dates.
  //
  // If the source doesn't provide a date, it stays null.
  // This prevents old/incomplete events from appearing as
  // future hackathons.

  const registrationDeadline =
    raw.registrationDeadline || null;

  const startDate =
    raw.startDate || null;

  const endDate =
    raw.endDate || null;

  const status = resolveStatus(registrationDeadline);

  // -------------------------------------------------------------------------
  // Basic fields
  // -------------------------------------------------------------------------

  const title =
    raw.title?.trim() || 'Untitled Opportunity';

  const slug = generateSlug(
    title,
    raw.platform,
    raw.externalId
  );

  // -------------------------------------------------------------------------
  // Description
  // -------------------------------------------------------------------------

  // Do not fabricate a description.
  const description =
    raw.description?.trim() || null;

  // -------------------------------------------------------------------------
  // Skills
  // -------------------------------------------------------------------------

  const skills = [
    ...new Set(
      (raw.skills || raw.tags || [])
        .map(skill => skill.trim())
        .filter(Boolean)
    )
  ];

  // -------------------------------------------------------------------------
  // Eligibility
  // -------------------------------------------------------------------------

  // Keep only eligibility actually supplied by the source.
  const eligibility =
    raw.eligibility?.length
      ? [...new Set(
          raw.eligibility
            .map(item => item.trim())
            .filter(Boolean)
        )]
      : [];

  // -------------------------------------------------------------------------
  // Prize
  // -------------------------------------------------------------------------

  let prize:
    | {
        amount?: number;
        currency?: string;
        description?: string;
      }
    | undefined;

  if (
    raw.prizeAmount != null ||
    raw.prizeDescription
  ) {
    prize = {
      amount:
        raw.prizeAmount != null
          ? raw.prizeAmount
          : undefined,

      currency:
        raw.prizeCurrency || undefined,

      description:
        raw.prizeDescription || undefined
    };
  }

  // -------------------------------------------------------------------------
  // Final canonical event
  // -------------------------------------------------------------------------

  return {
    title,

    slug,

    description,

    type: category,

    organizer: {
      name:
        raw.organizerName?.trim() ||
        raw.platform,

      website:
        raw.organizerWebsite?.trim() || undefined
    },

    location: {
      country,
      state: state || null,
      city: city || null,
      mode
    },

    dates: {
      registrationDeadline,
      startDate,
      endDate
    },

    eligibility,

    skills,

    careerRoles: [],

    careerRoleMatches: [],

    prize,

    registrationUrl,

    registrationAvailable,

    source: {
      platform: raw.platform,
      sourceUrl: sourceUrl || undefined
    },

    sources: [
      {
        platform: raw.platform,
        sourceEventId: raw.externalId,
        sourceUrl:
          sourceUrl ||
          registrationUrl ||
          null
      }
    ],

    status:
      registrationAvailable
        ? status
        : (
            status === 'EXPIRED'
              ? 'EXPIRED'
              : 'PENDING_REVIEW'
          ),

    lastSyncedAt: now,

    createdAt: now,

    updatedAt: now
  } as EventDocument & { sources: any[] };
}