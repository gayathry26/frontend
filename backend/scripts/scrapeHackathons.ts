// backend/scripts/scrapeHackathons.ts

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

interface UnstopPrize {
  rank?: string;
  cash?: number | string;
  currencyCode?: string | null;
  others?: string;
}

interface UnstopOrganisation {
  id?: number;
  name?: string;
}

interface UnstopAddress {
  address?: string;
  city?: string;
  state?: string;
  country?: string | null;
}

interface UnstopRegistrationRequirements {
  start_regn_dt?: string;
  end_regn_dt?: string;
}

interface UnstopRound {
  title?: string;
  start_date?: string;
  end_date?: string;
}

interface UnstopOpportunity {
  id: number;
  title?: string;
  type?: string;
  subtype?: string;
  details?: string;
  seo_url?: string;
  short_url?: string;
  status?: string;
  region?: string;
  sub_region?: string;
  start_date?: string;
  end_date?: string;
  banner_mobile?: {
    image_url?: string;
  };
  logoUrl2?: string;
  organisation?: UnstopOrganisation;
  prizes?: UnstopPrize[];
  address_with_country_logo?: UnstopAddress;
  locations?: unknown[];
  rounds?: UnstopRound[];
  regnRequirements?: UnstopRegistrationRequirements;
}

interface UnstopResponse {
  data?: {
    current_page?: number;
    last_page?: number;
    total?: number;
    data?: UnstopOpportunity[];
  };
}

interface Hackathon {
  id: string;
  title: string;
  organizer: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: string;
  city: string;
  state: string;
  country: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  registrationUrl: string;
  prize: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clean HTML tags, strip double-encoded Windows-1252/UTF-8 mojibake,
 * and normalize punctuation into clean ASCII.
 */
function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value);

  // 1. Strip HTML tags & standard HTML entities
  text = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-');

  // 2. Decode Unicode byte patterns resulting from UTF-8 interpreted as Latin-1 / Windows-1252
  // Catches: â€˜ (\u00E2\u20AC\u02DC), â€™ (\u00E2\u20AC\u2122), â€ (\u00E2\u20AC)
  text = text
    .replace(/\u00E2\u20AC[\u02DC\u2122\u0161]/g, "'")
    .replace(/\u00E2\u20AC[\u0153\u009D\u009C]/g, '"')
    .replace(/\u00E2\u20AC[\u2013\u2014]/g, '-')
    .replace(/\u00E2\u20AC\u00A6/g, '...')
    .replace(/\u00E2\u20AC/g, '-') // Catch-all for orphan â€ prefixes (e.g. 24â€Hour)
    .replace(/â€˜|â€™|â€š|â€/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, '-');

  // 3. Convert valid Unicode typographics to clean ASCII
  text = text
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function buildCanonicalUrl(event: UnstopOpportunity): string {
  const raw = event.seo_url || event.short_url;
  if (!raw) return `https://unstop.com/o/${event.id}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://unstop.com/${raw.replace(/^\/+/, '')}`;
}

function extractPrize(prizes?: UnstopPrize[]): string {
  if (!prizes || prizes.length === 0) return '';
  const formatted = prizes
    .map((prize) => {
      const rank = cleanText(prize.rank);
      const cash = prize.cash;

      if (cash !== undefined && cash !== null && String(cash) !== '' && String(cash) !== '0') {
        const currency = prize.currencyCode || '₹';
        return rank ? `${rank}: ${currency}${cash}` : `${currency}${cash}`;
      }

      if (prize.others) {
        return rank ? `${rank}: ${cleanText(prize.others)}` : cleanText(prize.others);
      }

      return rank;
    })
    .filter(Boolean);

  return formatted.join(' | ');
}

function getMode(event: UnstopOpportunity): 'Online' | 'Offline' | 'Hybrid' {
  const region = cleanText(event.region).toLowerCase();
  const subRegion = cleanText(event.sub_region).toLowerCase();
  const titleAndDesc = (cleanText(event.title) + ' ' + cleanText(event.details)).toLowerCase();

  if (region === 'online' || subRegion === 'online' || titleAndDesc.includes('online hackathon')) {
    return 'Online';
  }

  if (region.includes('hybrid') || titleAndDesc.includes('hybrid')) {
    return 'Hybrid';
  }

  const addr = event.address_with_country_logo;
  const hasPhysicalLocation =
    Boolean(addr?.city || addr?.state || addr?.address) ||
    (Array.isArray(event.locations) && event.locations.length > 0);

  if (hasPhysicalLocation && region !== 'online') {
    return 'Offline';
  }

  return 'Online';
}

function getLocation(
  event: UnstopOpportunity,
  mode: 'Online' | 'Offline' | 'Hybrid'
): { location: string; city: string; state: string; country: string } {
  const address = event.address_with_country_logo;
  const city = cleanText(address?.city);
  const state = cleanText(address?.state);
  const country = cleanText(address?.country) || 'India';
  const parts = [city, state, country].filter(Boolean);

  if (parts.length > 0 && mode !== 'Online') {
    return { location: parts.join(', '), city, state, country };
  }

  return {
    location: mode === 'Online' ? 'Online' : parts.join(', ') || 'India',
    city: mode === 'Online' ? '' : city,
    state: mode === 'Online' ? '' : state,
    country,
  };
}

/**
 * Filter checks titles, types, and descriptions to ensure only coding / tech hackathons pass.
 */
function isHackathonContent(titleStr: string, typeStr = '', subtypeStr = ''): boolean {
  const title = cleanText(titleStr).toLowerCase();
  const type = cleanText(typeStr).toLowerCase();
  const subType = cleanText(subtypeStr).toLowerCase();

  const blacklist = [
    'auction',
    'moneyball',
    'shark tank',
    'samiksha',
    'invest',
    'b-plan',
    'business plan',
    'valorant',
    'bgmi',
    'esports',
    'tournament',
    'gaming',
    'article writing',
    'essay',
    'writing competition',
    'poetry',
    'debate',
    'case study',
    'case competition',
    'poster presentation',
    'poster exhibition',
    'quiz',
    'quizzes',
    'job',
    'jobs',
    'internship',
    'internships',
    'workshop',
    'webinar',
    'cultural',
    'photography',
    'meme',
    'dance',
    'singing',
    'video making',
    'treasure hunt',
  ];

  if (blacklist.some((term) => title.includes(term) || type.includes(term) || subType.includes(term))) {
    return false;
  }

  if (type === 'hackathons' || type === 'hackathon' || subType === 'hackathons' || subType === 'hackathon') {
    return true;
  }

  const validTechKeywords = [
    'hackathon',
    'hackfest',
    'hack-a-thon',
    'codefest',
    'buildathon',
    'devjam',
    'ideathon',
    'datathon',
    'coding challenge',
    'developer challenge',
    'code challenge',
    'appathon',
    'make-a-thon',
    'makeathon',
    'bug bounty',
    'ctf',
    'capture the flag',
    'code clash',
    'codestorm',
  ];

  return validTechKeywords.some((kw) => title.includes(kw) || subType.includes(kw));
}

function isUpcomingOrActive(event: Hackathon): boolean {
  const today = new Date().toISOString().split('T')[0];

  if (event.registrationDeadline && event.registrationDeadline < today) {
    return false;
  }

  if (event.endDate && event.endDate < today) {
    return false;
  }

  return true;
}

function resolveEventStartDate(event: UnstopOpportunity): string {
  if (event.start_date) {
    const formatted = formatDate(event.start_date);
    if (formatted) return formatted;
  }

  if (Array.isArray(event.rounds) && event.rounds.length > 0) {
    const firstRoundDate = event.rounds[0]?.start_date;
    if (firstRoundDate) {
      const formatted = formatDate(firstRoundDate);
      if (formatted) return formatted;
    }
  }

  return '';
}

function normalizeUnstopOpportunity(event: UnstopOpportunity): Hackathon | null {
  if (!event.id || !event.title) return null;
  if (!isHackathonContent(event.title, event.type, event.subtype)) return null;

  const mode = getMode(event);
  const location = getLocation(event, mode);
  const canonicalUrl = buildCanonicalUrl(event);

  const startDate = resolveEventStartDate(event);
  const endDate = formatDate(event.end_date);
  const registrationDeadline = formatDate(event.regnRequirements?.end_regn_dt);

  const imageUrl = cleanText(event.logoUrl2) || cleanText(event.banner_mobile?.image_url);

  return {
    id: `unstop-${event.id}`,
    title: cleanText(event.title),
    organizer: cleanText(event.organisation?.name) || 'Independent',
    description: cleanText(event.details),
    startDate,
    endDate,
    registrationDeadline,
    location: location.location,
    city: location.city,
    state: location.state,
    country: location.country,
    mode,
    registrationUrl: canonicalUrl,
    prize: extractPrize(event.prizes),
    source: 'Unstop',
    sourceUrl: canonicalUrl,
    imageUrl,
  };
}

async function fetchUnstopPage(
  page: number,
  retries = 3
): Promise<{ data: UnstopOpportunity[]; lastPage: number }> {
  const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=${page}&per_page=20`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://unstop.com/hackathons',
    'Origin': 'https://unstop.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Unstop] Fetching page ${page} (attempt ${attempt})...`);
      const response = await fetch(url, { headers });

      if (response.status === 429) {
        console.warn(`[Unstop] Rate limited on page ${page}. Backing off...`);
        await sleep(3000 * attempt);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const json = (await response.json()) as UnstopResponse;
      const opportunities = json.data?.data ?? [];
      const lastPage = json.data?.last_page ?? page;

      return { data: opportunities, lastPage };
    } catch (err) {
      console.error(`[Unstop] Error fetching page ${page}:`, err);
      if (attempt === retries) throw err;
      await sleep(1500 * attempt);
    }
  }

  return { data: [], lastPage: page };
}

async function scrape() {
  const results: Hackathon[] = [];
  const MAX_PAGES_CAP = 15;
  let currentPage = 1;
  let totalPages = 1;

  const seenIds = new Set<string>();

  while (currentPage <= totalPages && currentPage <= MAX_PAGES_CAP) {
    try {
      const { data: opportunities, lastPage } = await fetchUnstopPage(currentPage);
      totalPages = lastPage;

      if (opportunities.length === 0) {
        console.log(`[Unstop] No records on page ${currentPage}. Exiting fetch loop.`);
        break;
      }

      for (const rawItem of opportunities) {
        const item = normalizeUnstopOpportunity(rawItem);
        if (item && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
          console.log(`✔ [${item.mode}] ${item.title}`);
        }
      }

      currentPage++;
      await sleep(1200);
    } catch (error) {
      console.error(`Scrape aborted at page ${currentPage}:`, error);
      break;
    }
  }

  const outPath = path.resolve('src/data/hackathons.json');
  const archivePath = path.resolve('src/data/hackathons-archive.json');

  let existing: Hackathon[] = [];
  let existingArchive: Hackathon[] = [];

  if (fs.existsSync(outPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Hackathon[];
    } catch {
      console.warn('Could not parse hackathons.json.');
    }
  }

  if (fs.existsSync(archivePath)) {
    try {
      existingArchive = JSON.parse(fs.readFileSync(archivePath, 'utf8')) as Hackathon[];
    } catch {
      console.warn('Could not parse hackathons-archive.json.');
    }
  }

  const masterMap = new Map<string, Hackathon>();

  // Filter and sanitize existing archived records so old bad entries get purged
  for (const item of existingArchive) {
    if (item.id && isHackathonContent(item.title)) {
      item.title = cleanText(item.title);
      item.description = cleanText(item.description);
      masterMap.set(item.id, item);
    }
  }

  // Filter and sanitize existing active records
  for (const item of existing) {
    if (item.id && isHackathonContent(item.title)) {
      item.title = cleanText(item.title);
      item.description = cleanText(item.description);
      masterMap.set(item.id, item);
    }
  }

  // Add freshly scraped items
  for (const item of results) {
    if (item.id) masterMap.set(item.id, item);
  }

  const allRecords = Array.from(masterMap.values());

  // Filter active events and sort by nearest deadline/start date
  const activeHackathons = allRecords
    .filter(isUpcomingOrActive)
    .sort((a, b) => {
      const dateA = a.registrationDeadline || a.endDate || a.startDate || '9999-99-99';
      const dateB = b.registrationDeadline || b.endDate || b.startDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });

  const expiredCount = allRecords.length - activeHackathons.length;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify(activeHackathons, null, 2), 'utf8');
  fs.writeFileSync(archivePath, JSON.stringify(allRecords, null, 2), 'utf8');

  console.log('\n========================================');
  console.log(`Scraped this run : ${results.length}`);
  console.log(`Expired/Hidden   : ${expiredCount}`);
  console.log(`Active (main UI) : ${activeHackathons.length} -> ${outPath}`);
  console.log(`Total in Archive : ${allRecords.length} -> ${archivePath}`);
  console.log('========================================');
}

scrape().catch((error) => {
  console.error('Fatal scraper error:', error);
  process.exit(1);
});