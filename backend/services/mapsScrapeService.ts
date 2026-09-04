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

function getBrowserBackends(): string[] {
  const mode = (process.env.WEB_BIE_BROWSER_MODE || 'auto').trim().toLowerCase();
  if (mode === 'lightpanda' || mode === 'cdp') return ['cdp'];
  if (mode === 'local' || mode === 'chromium') return ['local'];
  return ['local'];
}

async function launchBrowserForBackend(playwrightApi: typeof import('playwright'), backend: string): Promise<Browser> {
  if (backend === 'cdp') {
    const cdpUrl = process.env.LIGHTPANDA_CDP_URL || 'ws://127.0.0.1:9223/';
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

      listingResults.forEach((item, idx) => {
        item.rank = idx + 1;
        item.query = query;
        item.location = location;
        const [lat, lng] = extractCoordinatesFromMapsUrl(item.maps_url || '');
        if (lat != null && item.latitude == null) item.latitude = lat;
        if (lng != null && item.longitude == null) item.longitude = lng;
      });

      return {
        task: 'maps_search',
        query,
        location,
        source_url: searchPageUrl,
        generated_at: new Date().toISOString(),
        count: listingResults.length,
        results: listingResults,
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
      if (!seen.has(mUrl)) seen.set(mUrl, place);
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
  const code = `
    (() => {
      var maxItems = ${limit};
      var anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      var seen = new Set();
      var out = [];

      function clean(val) {
        if (!val) return null;
        var t = String(val).replace(/\\s+/g, ' ').trim();
        return t || null;
      }

      function findPhone(val) {
        if (!val) return null;
        var m = String(val).match(/(\\+?\\d[\\d\\s().-]{7,}\\d)/);
        return m ? clean(m[1]) : null;
      }

      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        var href = a.href ? new URL(a.href, location.origin).toString() : '';
        if (!href || seen.has(href)) continue;
        seen.add(href);

        var card = a.closest('div[role="article"], div.Nv2PK') || a;
        var cardText = clean(card.innerText || '');
        var lines = (card.innerText || '').split('\\n').map(clean).filter(Boolean);
        var name = clean(a.getAttribute('aria-label')) || clean(a.textContent) || lines[0] || 'Unknown Company';

        var starNode = card.querySelector('span[role="img"][aria-label*="star"]');
        var aria = starNode ? (starNode.getAttribute('aria-label') || '') : '';
        var rMatch = aria.match(/([0-5](?:\\.[0-9])?)/);
        var rating = rMatch ? rMatch[1] : null;

        var category = null;
        var address = null;
        var phone = findPhone(cardText);

        var dotLine = lines.find(function(l) { return l.indexOf('·') !== -1; });
        if (dotLine) {
          var parts = dotLine.split('·').map(clean).filter(Boolean);
          if (parts.length > 0) category = parts[0];
          if (parts.length > 1) address = parts[1];
        }

        if (!address && lines.length > 1) {
          address = lines[1];
        }

        out.push({
          name: name,
          maps_url: href,
          category: category || 'Information Technology',
          address: address || null,
          phone: phone || null,
          rating: rating || null,
          snippet: cardText || null
        });

        if (out.length >= maxItems) break;
      }

      return out;
    })()
  `;

  const raw: any = await page.evaluate(code);
  return Array.isArray(raw) ? raw : [];
}

function extractCoordinatesFromMapsUrl(url: string): [number | null, number | null] {
  if (!url) return [null, null];
  const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return [null, null];
  try { return [parseFloat(m[1]), parseFloat(m[2])]; } catch { return [null, null]; }
}