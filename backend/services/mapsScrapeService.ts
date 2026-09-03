// Merged from Infinite-lead-gen-main/app/browser.py
// Node.js Playwright port for Google Maps scraping
// Provides same API as Python's run_google_maps_search + run_browser_task
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class BrowserAutomationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrowserAutomationError';
  }
}

export interface MapsPlace {
  name: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  rating: string | null;
  reviews: string | null;
  maps_url: string | null;
  snippet?: string | null;
  website?: string | null;
  plus_code?: string | null;
  open_status?: string | null;
  raw_text_excerpt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  rank?: number;
  query?: string;
  location?: string;
  [key: string]: any;
}

export interface MapsScrapeResult {
  task: 'maps_search';
  query: string;
  location: string;
  source_url: string;
  generated_at: string;
  count: number;
  results: MapsPlace[];
}

export interface BrowserTaskResult {
  title?: string;
  preview?: string;
  text?: string;
}

function getBrowserBackends(): string[] {
  const mode = (process.env.WEB_BIE_BROWSER_MODE || 'auto').trim().toLowerCase();
  if (mode === 'lightpanda' || mode === 'cdp') return ['cdp'];
  if (mode === 'local' || mode === 'chromium') return ['local'];
  return ['cdp', 'local'];
}

async function launchBrowserForBackend(playwrightApi: typeof import('playwright'), backend: string): Promise<Browser> {
  if (backend === 'cdp') {
    const cdpUrl = process.env.LIGHTPANDA_CDP_URL || 'ws://127.0.0.1:9223/';
    // @ts-ignore playwright chromium connectOverCDP exists
    return await (playwrightApi.chromium as any).connectOverCDP(cdpUrl);
  }
  return await playwrightApi.chromium.launch({ headless: true });
}

async function newContext(browser: Browser, backend: string): Promise<BrowserContext> {
  if (backend === 'cdp' && (browser as any).contexts && (browser as any).contexts().length > 0) {
    return (browser as any).contexts()[0] as BrowserContext;
  }
  return await browser.newContext();
}

async function firstVisibleSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const loc = page.locator(selector).first();
      if ((await loc.count()) > 0 && (await loc.isVisible())) return selector;
    } catch {}
  }
  return null;
}

export async function runBrowserTask(opts: {
  url: string;
  input_text?: string | null;
  input_selector?: string | null;
  output_selector?: string | null;
  timeout_ms?: number;
}): Promise<string> {
  const { url, input_text, input_selector, output_selector, timeout_ms = 20000 } = opts;
  const backends = getBrowserBackends();
  const backendErrors: string[] = [];

  for (const backend of backends) {
    let browser: Browser | null = null;
    let page: Page | null = null;
    try {
      const playwrightApi = await import('playwright');
      browser = await launchBrowserForBackend(playwrightApi, backend);
      const context = await newContext(browser, backend);
      page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeout_ms });

      let usedInputSelector = input_selector || null;
      if (input_text) {
        if (!usedInputSelector) {
          usedInputSelector = await firstVisibleSelector(page, [
            'textarea',
            "input[type='text']",
            "input[type='search']",
            "input[type='email']",
            "input[type='url']",
            'input:not([type])',
            "[contenteditable='true']",
          ]);
        }
        if (!usedInputSelector) throw new BrowserAutomationError('Could not find a text input on the page. Provide an explicit selector.');
        const target = page.locator(usedInputSelector).first();
        await target.fill(input_text, { timeout: timeout_ms });
        await target.press('Enter');
        await page.waitForTimeout(1200);
      }

      if (output_selector) {
        const outputLocator = page.locator(output_selector).first();
        await outputLocator.waitFor({ timeout: timeout_ms });
        const resultText = (await outputLocator.innerText()).trim();
        if (!resultText) throw new BrowserAutomationError(`Selector '${output_selector}' was found but had no text content.`);
        return resultText;
      }

      const title = await page.title();
      const bodyText = await page.locator('body').innerText({ timeout: timeout_ms } as any);
      const preview = bodyText.split(/\s+/).join(' ').slice(0, 1200);
      return `Title: ${title}\nPreview: ${preview}`;
    } catch (err: any) {
      if (err instanceof BrowserAutomationError) backendErrors.push(`${backend}: ${err.message}`);
      else backendErrors.push(`${backend}: ${err.message || String(err)}`);
    } finally {
      if (page) try { await page.close(); } catch {}
      if (browser) try { await browser.close(); } catch {}
    }
  }
  throw new BrowserAutomationError('All browser backends failed. ' + backendErrors.join(' | '));
}

export async function runGoogleMapsSearch(opts: {
  query: string;
  location: string;
  max_results?: number;
  timeout_ms?: number;
}): Promise<MapsScrapeResult> {
  const { query, location, max_results = 30, timeout_ms = 35000 } = opts;
  const fullQuery = `${query} ${location}`.trim();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
  const limit = Math.max(1, Math.min(max_results, 100));
  const backends = getBrowserBackends();
  const backendErrors: string[] = [];

  for (const backend of backends) {
    let browser: Browser | null = null;
    let page: Page | null = null;
    try {
      const playwrightApi = await import('playwright');
      browser = await launchBrowserForBackend(playwrightApi, backend);
      const context = await newContext(browser, backend);
      page = await context.newPage();
      await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: timeout_ms });
      await acceptGoogleMapsDialogs(page);
      await waitForMapsResults(page);
      const searchPageUrl = page.url();

      const listingResults = await collectMapsResults(page, limit);
      if (!listingResults || listingResults.length === 0) {
        throw new BrowserAutomationError('No map results were found. Try a broader query or a nearby city name.');
      }

      const enrichedResults = await enrichMapsResults(page, listingResults, timeout_ms);
      enrichedResults.forEach((item, idx) => {
        item.rank = idx + 1;
        item.query = query;
        item.location = location;
      });

      return {
        task: 'maps_search',
        query,
        location,
        source_url: searchPageUrl,
        generated_at: new Date().toISOString(),
        count: enrichedResults.length,
        results: enrichedResults,
      };
    } catch (err: any) {
      if (err instanceof BrowserAutomationError) backendErrors.push(`${backend}: ${err.message}`);
      else backendErrors.push(`${backend}: ${err.message || String(err)}`);
    } finally {
      if (page) try { await page.close(); } catch {}
      if (browser) try { await browser.close(); } catch {}
    }
  }
  throw new BrowserAutomationError('All browser backends failed. ' + backendErrors.join(' | '));
}

async function acceptGoogleMapsDialogs(page: Page): Promise<void> {
  const selectors = ["button:has-text('Accept all')", "button:has-text('I agree')", "button:has-text('Accept')"];
  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(800);
        return;
      }
    } catch {}
  }
}

async function waitForMapsResults(page: Page): Promise<void> {
  const candidates = ["div[role='feed']", "a[href*='/maps/place/']", 'div.Nv2PK'];
  for (const sel of candidates) {
    try {
      await page.locator(sel).first().waitFor({ timeout: 6000 });
      return;
    } catch {}
  }
  await page.waitForTimeout(2000);
}

async function collectMapsResults(page: Page, limit: number): Promise<MapsPlace[]> {
  const seen = new Map<string, MapsPlace>();
  let stagnantRounds = 0;
  const maxRounds = Math.max(10, Math.min(80, limit * 4));
  for (let i = 0; i < maxRounds; i++) {
    const batch = await extractMapsResults(page, Math.max(50, limit * 3));
    const before = seen.size;
    for (const place of batch) {
      const mUrl = (place.maps_url || '').trim();
      if (!mUrl) continue;
      if (seen.has(mUrl)) seen.set(mUrl, mergePlaceData(seen.get(mUrl)!, place));
      else seen.set(mUrl, place);
    }
    if (seen.size >= limit) break;
    if (seen.size === before) stagnantRounds++;
    else stagnantRounds = 0;
    if (stagnantRounds >= 7) break;
    await scrollMapsResults(page, 1);
  }
  return Array.from(seen.values()).slice(0, limit);
}

async function scrollMapsResults(page: Page, rounds = 1): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    try {
      const feed = page.locator("div[role='feed']").first();
      if ((await feed.count()) > 0) {
        await feed.evaluate((el: any) => el.scrollBy(0, el.scrollHeight));
      } else {
        await page.mouse.wheel(0, 2500);
      }
    } catch {}
    await page.waitForTimeout(1100);
  }
}

async function extractMapsResults(page: Page, limit: number): Promise<MapsPlace[]> {
  const raw: any = await page.evaluate((maxItems: number) => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
    const seen = new Set<string>();
    const out: any[] = [];
    const normalize = (value: any) => {
      if (value == null) return null;
      const text = String(value).replace(/\s+/g, ' ').trim();
      return text || null;
    };
    const firstMatch = (value: any, regex: RegExp) => {
      if (!value) return null;
      const m = String(value).match(regex);
      return m ? normalize(m[1]) : null;
    };
    const parsePhone = (value: any) => firstMatch(value, /(\+?\d[\d\s().-]{7,}\d)/);
    const parseAddressFromTokens = (tokens: any[]) => {
      for (const token of tokens) {
        if (!token) continue;
        if (parsePhone(token) || /\b(?:website|directions|open|closes)\b/i.test(token) && !/\b(?:road|rd\.?|street|st\.?|ave\.?|nagar|colony|floor|building|complex|tower)\b/i.test(token)) continue;
        if (/(^\d+[\w\s,.-]+)|(\broad\b|\brd\.?\b|\bstreet\b|\bst\.?\b|\bave\b|\bavenue\b|\blane\b|\bnear\b|\bnagar\b|\bcolony\b|\bfloor\b|\bcomplex\b|\btower\b|\bcity\b|\bpin\b)/i.test(token)) return normalize(token);
      }
      return null;
    };
    for (const anchor of anchors as HTMLAnchorElement[]) {
      const href = anchor.href ? new URL(anchor.href, location.origin).toString() : '';
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const card = (anchor.closest('div[role="article"], div.Nv2PK') as HTMLElement) || null;
      const cardRawText = String((card as any)?.innerText || (anchor as any).innerText || '');
      const cardText = normalize(cardRawText);
      const lines = cardRawText.split('\n').map((l: string) => normalize(l)).filter(Boolean) as string[];
      const name = normalize(anchor.getAttribute('aria-label')) || normalize((anchor as any).textContent) || normalize(lines[0]);
      let category: any = null;
      let address: any = null;
      let phone: any = parsePhone(cardText);
      let rating: any = null;
      let reviews: any = null;
      const starNode = card?.querySelector('span[role="img"][aria-label*="star"]');
      if (starNode) {
        const aria = starNode.getAttribute('aria-label') || '';
        rating = firstMatch(aria, /([0-5](?:\.[0-9])?)/);
        reviews = firstMatch(aria, /([\d,]+)\s+review/i);
      }
      if (!rating || !reviews) {
        for (const line of lines) {
          if (!rating) {
            const mr = firstMatch(line, /([0-5](?:\.[0-9])?)/);
            if (mr && Number(mr) <= 5) rating = mr;
          }
          if (!reviews) reviews = firstMatch(line, /\(([\d,]+)\)/) || firstMatch(line, /([\d,]+)\s+review/i);
        }
      }
      const dotLine = lines.find((line: string) => line.includes('·'));
      if (dotLine) {
        const parts = dotLine.split('·').map((i: string) => normalize(i)).filter(Boolean) as string[];
        if (parts.length) category = parts[0];
        if (!address) address = parseAddressFromTokens(parts.slice(1));
        if (!phone) {
          for (const part of parts) {
            const mp = parsePhone(part);
            if (mp) { phone = mp; break; }
          }
        }
      }
      if (!category) {
        const categoryMatch = cardText?.match(/\b(?:software company|computer service|website designer|IT consultant|computer consultant|e-commerce service|information services|internet marketing service|business to business service|corporate office|consultant)\b/i);
        if (categoryMatch) category = categoryMatch[0];
      }
      if (!address) address = parseAddressFromTokens(lines.slice(1));
      out.push({ name: name || null, maps_url: href, category: category || null, address: address || null, phone: phone || null, rating: rating || null, reviews: reviews || null, snippet: cardText || null });
      if (out.length >= maxItems) break;
    }
    return out;
  }, limit);
  if (Array.isArray(raw)) {
    try { return JSON.parse(JSON.stringify(raw)); } catch { return []; }
  }
  return [];
}

async function enrichMapsResults(page: Page, results: MapsPlace[], timeout_ms: number): Promise<MapsPlace[]> {
  const enriched: MapsPlace[] = [];
  // Maps listing cards already include the company name, category, Maps URL, and
  // usually address/rating/phone. Opening every detail page serially makes a
  // 50-result query exceed the API's 60-second execution window, so reserve
  // deeper extraction for the first results while returning the full listing set.
  const detailLimit = Math.min(results.length, 12);
  for (let idx = 0; idx < results.length; idx++) {
    const place = results[idx];
    const mapsUrl = place.maps_url;
    const base: MapsPlace = { ...place };
    if (!mapsUrl) { base.rank = idx + 1; enriched.push(base); continue; }
    if (idx >= detailLimit) {
      base.rank = idx + 1;
      base.place_id = base.place_id || extractPlaceIdFromMapsUrl(mapsUrl);
      const [lat, lng] = extractCoordinatesFromMapsUrl(mapsUrl);
      if (lat != null) base.latitude = lat;
      if (lng != null) base.longitude = lng;
      enriched.push(base);
      continue;
    }
    try {
      await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: timeout_ms });
      await page.waitForTimeout(1400);
      const details: any = await extractPlaceDetails(page);
      const merged = mergePlaceData(base, details);
      const currentUrl = page.url() || mapsUrl;
      const [lat, lng] = extractCoordinatesFromMapsUrl(currentUrl);
      if (lat != null && merged.latitude == null) merged.latitude = lat;
      if (lng != null && merged.longitude == null) merged.longitude = lng;
      merged.maps_url = currentUrl;
      merged.place_id = merged.place_id || extractPlaceIdFromMapsUrl(currentUrl);
      merged.rank = idx + 1;
      enriched.push(merged);
    } catch {
      const cur: any = base;
      cur.rank = idx + 1;
      cur.place_id = cur.place_id || extractPlaceIdFromMapsUrl(mapsUrl);
      const [lat, lng] = extractCoordinatesFromMapsUrl(mapsUrl);
      if (lat != null && cur.latitude == null) cur.latitude = lat;
      if (lng != null && cur.longitude == null) cur.longitude = lng;
      enriched.push(cur);
    }
  }
  return enriched;
}

async function extractPlaceDetails(page: Page): Promise<any> {
  const raw: any = await page.evaluate(() => {
    const normalize = (value: any) => {
      if (value == null) return null;
      const text = String(value).replace(/\s+/g, ' ').trim();
      return text || null;
    };
    const textFromNode = (node: any) => normalize(node?.innerText || node?.textContent || null);
    const findBySelectors = (selectors: string[]) => {
      for (const sel of selectors) {
        const node: any = document.querySelector(sel);
        const v = textFromNode(node);
        if (v) return v;
      }
      return null;
    };
    const parseAfterPrefix = (value: any, prefix: string) => {
      if (!value) return null;
      const t = String(value).trim();
      if (!t.startsWith(prefix)) return null;
      return normalize(t.slice(prefix.length).trim());
    };
    const firstMatch = (value: any, regex: RegExp) => {
      if (!value) return null;
      const m = String(value).match(regex);
      return m ? normalize(m[1]) : null;
    };
    const phoneFromAria = (() => {
      const btn: any = document.querySelector("button[aria-label^='Phone:']");
      return parseAfterPrefix(btn?.getAttribute('aria-label'), 'Phone:');
    })();
    const addressFromAria = (() => {
      const btn: any = document.querySelector("button[aria-label^='Address:']");
      return parseAfterPrefix(btn?.getAttribute('aria-label'), 'Address:');
    })();
    const plusCodeFromAria = (() => {
      const btn: any = document.querySelector("button[aria-label^='Plus code:']");
      return parseAfterPrefix(btn?.getAttribute('aria-label'), 'Plus code:');
    })();
    const websiteNode: any = document.querySelector("a[data-item-id='authority']") || document.querySelector("a[aria-label*='Website']");
    const ratingAria = (document.querySelector("div.F7nice span[role='img']") as any)?.getAttribute('aria-label') || (document.querySelector("span[role='img'][aria-label*='star']") as any)?.getAttribute('aria-label') || '';
    return {
      name: findBySelectors(['h1.DUwDvf', "h1[class*='fontHeadlineLarge']", 'h1']),
      category: findBySelectors(["button[jsaction*='pane.rating.category']", 'span.DkEaL', "div[role='main'] button[jsaction*='category']"]),
      address: findBySelectors(["button[data-item-id='address'] .Io6YTe", "button[data-item-id='address']", "div[data-item-id='address'] .Io6YTe"]) || addressFromAria,
      phone: findBySelectors(["button[data-item-id^='phone:tel:'] .Io6YTe", "button[data-item-id^='phone:tel:']", "button[data-tooltip='Copy phone number'] .Io6YTe", "button[data-item-id*='phone'] .Io6YTe"]) || phoneFromAria,
      website: normalize((websiteNode as any)?.href || null),
      plus_code: findBySelectors(["button[data-item-id='oloc'] .Io6YTe", "button[data-item-id='oloc']"]) || plusCodeFromAria,
      rating: firstMatch(ratingAria, /([0-5](?:\.[0-9])?)/),
      reviews: firstMatch(ratingAria, /([\d,]+)\s+review/i) || findBySelectors(["button[jsaction*='pane.rating.moreReviews'] span"]),
      open_status: findBySelectors(["span[class*='ZDu9vd']", 'div.rogA2c', "div[aria-label*='Open']"]),
      raw_text_excerpt: normalize((document.body as any)?.innerText || '')?.slice(0, 1500) || null,
    };
  });
  if (raw && typeof raw === 'object') {
    try { return JSON.parse(JSON.stringify(raw)); } catch { return {}; }
  }
  return {};
}

function mergePlaceData(base: any, incoming: any): any {
  const merged = { ...base };
  for (const [k, v] of Object.entries(incoming)) {
    if (!(k in merged) || merged[k] == null || merged[k] === '' || (Array.isArray(merged[k]) && merged[k].length === 0) || (typeof merged[k] === 'object' && merged[k] !== null && Object.keys(merged[k]).length === 0)) {
      merged[k] = v;
    }
  }
  return merged;
}

function extractCoordinatesFromMapsUrl(url: string): [number | null, number | null] {
  if (!url) return [null, null];
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return [null, null];
  try { return [parseFloat(m[1]), parseFloat(m[2])]; } catch { return [null, null]; }
}

function extractPlaceIdFromMapsUrl(url: string): string | null {
  if (!url) return null;
  let m = url.match(/!1s([A-Za-z0-9:_-]+)!/);
  if (m) return m[1];
  m = url.match(/[?&]cid=(\d+)/);
  if (m) return m[1];
  return null;
}
