/**
 * Event Normalizer
 *
 * Converts raw platform-specific event data (RawEvent) into our canonical EventDocument format.
 * - Maps category names (e.g. "hackathon" → "HACKATHON")
 * - Normalizes Indian state & city names (e.g. "Bombay" → "Mumbai", "Bangalore" → "Bengaluru")
 * - Normalizes mode strings (e.g. "online", "virtual" → "ONLINE")
 * - Validates and strips placeholder/fake registration URLs
 * - Computes registration status based on deadline
 */

import { RawEvent } from './sources/EventSource';
import { EventDocument, EventCategory, EventMode, EventStatus } from '../../types/event';
import { validateRegistrationUrl, isPlaceholderUrl } from '../../utils/validateEventUrl';

// ---------------------------------------------------------------------------
// Indian State & City Normalization Maps
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
  'kozhikode': 'Kozhikode',
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
// Category Normalization Map
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
// Helper Functions
// ---------------------------------------------------------------------------

export function normalizeCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const lower = city.trim().toLowerCase();
  return CITY_NORMALIZATION[lower] || city.trim();
}

export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  const lower = state.trim().toLowerCase();
  return STATE_NORMALIZATION[lower] || state.trim();
}

export function normalizeMode(mode: string | null | undefined): EventMode {
  if (!mode) return 'ONLINE';
  const lower = mode.toLowerCase().trim();
  if (['online', 'virtual', 'remote', 'digital', 'web', 'internet'].includes(lower)) return 'ONLINE';
  if (['hybrid', 'mixed', 'blended', 'both'].includes(lower)) return 'HYBRID';
  if (['offline', 'in-person', 'in person', 'onsite', 'on-site', 'physical', 'live'].includes(lower)) return 'OFFLINE';
  return 'ONLINE'; // Default to ONLINE for student-focused events
}

export function normalizeCategory(rawCategory: string | null | undefined): EventCategory {
  if (!rawCategory) return 'HACKATHON';
  const lower = rawCategory.toLowerCase().trim();
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  return 'HACKATHON'; // Default fallback
}

export function resolveStatus(registrationDeadline: string | null | undefined): EventStatus {
  if (!registrationDeadline) return 'OPEN';
  const deadline = new Date(registrationDeadline).getTime();
  if (isNaN(deadline)) return 'OPEN';
  const now = Date.now();
  if (now > deadline) return 'EXPIRED';
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft <= 48) return 'CLOSING_SOON';
  const daysLeft = hoursLeft / 24;
  if (daysLeft > 30) return 'UPCOMING';
  return 'OPEN';
}

export function generateSlug(title: string, platform: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/(^-|-$)/g, '');

  const platformSlug = platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idHash = externalId.replace(/[^a-z0-9]/gi, '').slice(-6);

  return `${base}-${platformSlug}-${idHash}`;
}

export function isIndiaRelevant(raw: RawEvent): boolean {
  // Always include ONLINE events — globally open to India students
  const mode = normalizeMode(raw.mode);
  if (mode === 'ONLINE') return true;

  // Check country field
  const countryLower = (raw.country || '').toLowerCase();
  if (countryLower.includes('india') || countryLower === 'in') return true;

  // Check state field — any Indian state means India-relevant
  const stateNorm = normalizeState(raw.state);
  if (stateNorm && STATE_NORMALIZATION[(raw.state || '').toLowerCase()]) return true;

  // City could reveal location
  const cityLower = (raw.city || '').toLowerCase();
  if (CITY_NORMALIZATION[cityLower]) return true;

  // If no location at all, assume it's potentially India-relevant
  if (!raw.country && !raw.state && !raw.city) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Main Normalizer
// ---------------------------------------------------------------------------

export function normalizeRawEvent(raw: RawEvent): EventDocument {
  const now = new Date().toISOString();
  const category = normalizeCategory(raw.category);
  const mode = normalizeMode(raw.mode);
  const city = normalizeCity(raw.city);
  const state = normalizeState(raw.state);
  const country = raw.country?.trim() || (mode === 'ONLINE' ? 'India/Global' : 'India');

  // URL validation — never allow placeholder URLs
  const { registrationUrl, registrationAvailable } = validateRegistrationUrl(raw.registrationUrl);
  const sourceUrl = raw.sourceUrl && !isPlaceholderUrl(raw.sourceUrl) ? raw.sourceUrl.trim() : null;

  const status = resolveStatus(raw.registrationDeadline);
  const title = raw.title || 'Untitled Opportunity';
  const slug = generateSlug(title, raw.platform, raw.externalId);

  // Normalize skills — deduplicate, trim, filter empties
  const skills = [...new Set((raw.skills || raw.tags || []).map(s => s.trim()).filter(Boolean))];

  // Prize
  const prize = raw.prizeAmount || raw.prizeDescription
    ? {
        amount: raw.prizeAmount ?? undefined,
        currency: raw.prizeCurrency || 'INR',
        description: raw.prizeDescription ?? undefined
      }
    : undefined;

  // Future dates if missing — keep them valid so they're not immediately "EXPIRED"
  const futureWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const futureThreeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();

  return {
    title,
    slug,
    description: raw.description || `Join this ${category.replace('_', ' ').toLowerCase()} opportunity.`,
    type: category,
    organizer: {
      name: raw.organizerName || raw.platform,
      website: raw.organizerWebsite ?? undefined
    },
    location: {
      country,
      state: state || null,
      city: city || null,
      mode
    },
    dates: {
      registrationDeadline: raw.registrationDeadline || futureWeek,
      startDate: raw.startDate || futureTwoWeeks,
      endDate: raw.endDate || futureThreeWeeks
    },
    eligibility: raw.eligibility?.length ? raw.eligibility : ['College Students', 'Developers'],
    skills: skills.length > 0 ? skills : ['Technology'],
    careerRoles: [],           // Populated later by eventRoleMatcher
    careerRoleMatches: [],     // Populated later by eventRoleMatcher
    prize,
    registrationUrl,
    registrationAvailable,
    source: {
      platform: raw.platform,
      sourceUrl: sourceUrl || undefined
    },
    sources: [{
      platform: raw.platform,
      sourceEventId: raw.externalId,
      sourceUrl: sourceUrl || registrationUrl || null
    }],
    status: registrationAvailable ? status : (status === 'EXPIRED' ? 'EXPIRED' : 'PENDING_REVIEW'),
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now
  } as EventDocument & { sources: any[] };
}
