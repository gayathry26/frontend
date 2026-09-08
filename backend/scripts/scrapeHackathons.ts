// backend/scripts/scrapeHackathons.ts
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // fallback to global fetch if using Node 18+
import * as cheerio from 'cheerio';

/** Helper to clean text */
function cleanText(text: string | undefined): string {
  return (text ?? '').trim().replace(/\s+/g, ' ');
}

/** Resolve href to absolute URL based on base */
function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

// Keywords that likely indicate a registration link
const REGISTRATION_LINK_TEXTS = [
  'register now',
  'register',
  'apply now',
  'apply',
  'participate',
  'official website',
  'visit website',
  'hackathon website',
  'event website',
  'registration',
];

// Known external hackathon platforms – highest priority
const REGISTRATION_PLATFORMS = [
  'devfolio.co',
  'unstop.com',
  'dare2compete.com',
  'hackerearth.com',
  'devpost.com',
  'hack2skill.com',
];

/** Score‑based extraction of the real registration URL */
function extractRegistrationUrl(eventUrl: string, $: cheerio.CheerioAPI): string | null {
  const candidates: { url: string; score: number }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const resolved = absoluteUrl(href, eventUrl);
    if (!resolved) return;
    // Skip internal Knowafest links and non‑http links
    if (resolved.includes('knowafest.com')) return;
    if (/^(mailto|tel|javascript):/i.test(resolved)) return;

    const linkText = cleanText($(el).text().toLowerCase());
    const lower = resolved.toLowerCase();
    let score = 0;
    if (REGISTRATION_PLATFORMS.some(p => lower.includes(p))) score += 100;
    if (REGISTRATION_LINK_TEXTS.some(kw => linkText.includes(kw))) score += 50;
    if (lower.includes('register') || lower.includes('apply') || lower.includes('signup') || lower.includes('participate'))
      score += 25;
    if (score > 0) candidates.push({ url: resolved, score });
  });
  if (candidates.length === 0) {
    // Fallback: search raw HTML for known platform URLs that may not be in <a> tags
    const rawHtml = $.html();
    const platformRegex = new RegExp(`https?://(?:[^"'\s]*\\.)?(?:${REGISTRATION_PLATFORMS.map(p => p.replace('.','\\.')).join('|')})[^"'\s]*`, 'gi');
    const matches = rawHtml.match(platformRegex);
    if (matches && matches.length > 0) {
      // Return the first match as registration URL
      return matches[0];
    }
    return null;
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

/** Try to pull a city/state location from the page */
function extractLocation($: cheerio.CheerioAPI): string {
  const possible = ['city', 'location', 'venue'];
  for (const key of possible) {
    const val = cleanText($(`[itemprop='${key}']`).text());
    if (val) return val;
  }
  // Fallback: look for "City, State" pattern in the whole body
  const body = cleanText($('body').text());
  const match = body.match(/([A-Za-z]+)\s*,\s*([A-Za-z ]+)(?:,|\s+India)?/);
  if (match) return `${match[1]}, ${match[2]}`;
  return '';
}

/** Extract start and end dates from page content */
function extractEventDates($: cheerio.CheerioAPI): { start: Date | null; end: Date | null } {
  const text = $('body').text();
  const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:-\d{1,2})?,? \d{4}/gi;
  const matches = text.match(dateRegex);
  if (!matches) return { start: null, end: null };

  const dates = matches.map(m => new Date(m.replace(/-.*/, '')));
  const endDates = matches.map(m => {
    const parts = m.split(/-| /);
    if (m.includes('-')) {
        const endDay = m.match(/-(\d{1,2})/)?.[1];
        if (endDay) return new Date(m.replace(/\d{1,2}-.*/, endDay));
    }
    return new Date(m);
  });
  
  return { start: dates[0], end: endDates[0] };
}

/** Main scraper */
async function scrape() {
  const base = 'https://www.knowafest.com/explore/category/Hackathon_';
  const results: any[] = [];
  const seen = new Set<string>();
  const cutoffDate = new Date('2026-09-06');
  let emptyPages = 0;
  for (let page = 1; emptyPages < 3; page++) {
    const url = `${base}?page=${page}`;
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const abs = absoluteUrl(href, url);
      if (abs && abs.includes('/events/')) links.push(abs);
    });
    const uniq = [...new Set(links)];
    if (uniq.length === 0) {
      emptyPages++;
      continue;
    }
    emptyPages = 0;
    for (const link of uniq) {
      if (seen.has(link)) continue;
      seen.add(link);
      try {
        const evRes = await fetch(link);
        const evHtml = await evRes.text();
        const $ev = cheerio.load(evHtml);
        const { start, end } = extractEventDates($ev);
        if (end && (end.getFullYear() < 2026 || (end.getFullYear() === 2026 && end < cutoffDate))) continue;
        
        const title = cleanText($ev('h1').first().text()) || 'Untitled Hackathon';
        const location = extractLocation($ev);
        const regUrl = extractRegistrationUrl(link, $ev) || '';
        const id = Buffer.from(link).toString('base64').replace(/[\\/=+]/g, '');
        const startDate = start ? start.toISOString().split('T')[0] : undefined;
            const endDate = end ? end.toISOString().split('T')[0] : undefined;
            results.push({ id, title, location, registrationUrl: regUrl, sourceUrl: link });
        console.log('✔', title);
      } catch (e) {
        console.error('Failed', link, e);
      }
    }
  }

  // Merge with existing data to avoid duplicates (sourceUrl is the unique key)
  const outPath = path.resolve('src/data/hackathons.json');
  let existing: any[] = [];
  if (fs.existsSync(outPath)) {
    try { existing = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch {}
  }
  const map = new Map<string, any>();
  for (const h of existing) if (h.sourceUrl) map.set(h.sourceUrl, h);
  for (const h of results) map.set(h.sourceUrl, h);
  // Reduce each entry to required fields only
  const final = Array.from(map.values()).map(h => ({
    id: h.id,
    title: h.title,
    location: h.location,
    registrationUrl: h.registrationUrl,
    sourceUrl: h.sourceUrl
  }));
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2), 'utf8');
  console.log('Saved', final.length, 'hackathons to', outPath);
}

scrape().catch(err => {
  console.error('Scraper error:', err);
  process.exit(1);
});
