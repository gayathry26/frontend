import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Node runtime required for Playwright (no edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // allow up to 60s for scraping

const MapsScrapeSchema = z.object({
  what_to_scrape: z.string().min(1, 'what_to_scrape is required'),
  location: z.string().min(1, 'location is required'),
  result_limit: z.coerce.number().int().min(1).max(100).default(50),
});

async function tryPythonFallback(body: { what_to_scrape: string; location: string; result_limit: number }) {
  const pyUrl = process.env.PYTHON_SCRAPER_URL || process.env.NEXT_PUBLIC_PYTHON_SCRAPER_URL;
  if (!pyUrl) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 45000);
    const res = await fetch(`${pyUrl.replace(/\/$/, '')}/api/maps-scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    // normalize Python response { reply, data: { task, query, location, count, results...}}
    if (data?.data) return data.data;
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    // support both snake_case (python) and camelCase
    const normalized = {
      what_to_scrape: raw.what_to_scrape || raw.query || raw.whatToScrape,
      location: raw.location || raw.city,
      result_limit: raw.result_limit ?? raw.resultLimit ?? raw.limit ?? 50,
    };
    const parsed = MapsScrapeSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten(), hint: 'Body: { what_to_scrape, location, result_limit? }' },
        { status: 400 }
      );
    }
    const { what_to_scrape, location, result_limit } = parsed.data;

    // 1) Try Python microservice if configured (keeps Infinite-lead-gen-main as sidecar)
    const pyResult = await tryPythonFallback({ what_to_scrape, location, result_limit });
    if (pyResult && Array.isArray(pyResult.results) && pyResult.results.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'python-playwright',
        reply: `Collected ${pyResult.count ?? pyResult.results.length} places for '${what_to_scrape}' in '${location}'.`,
        data: pyResult,
      });
    }

    // 2) Node Playwright fallback (merged native)
    try {
      const { runGoogleMapsSearch } = await import('@/backend/services/mapsScrapeService');
      const result = await runGoogleMapsSearch({
        query: what_to_scrape,
        location,
        max_results: result_limit,
      });

      return NextResponse.json({
        success: true,
        source: 'node-playwright',
        reply: `Collected ${result.count} places for '${what_to_scrape}' in '${location}'.`,
        data: result,
      });
    } catch (playwrightErr: any) {
      // No browser available -> explain and fallback to python url hint
      const msg = playwrightErr?.message || String(playwrightErr);
      // If it's a missing browser/install error, give actionable hint but don't 500 blindly
      if (msg.includes('All browser backends failed') || msg.includes("Executable doesn't exist")) {
        return NextResponse.json(
          {
            success: false,
            error: msg,
            hint: 'Playwright browser not installed. Run: npx playwright install chromium  OR set PYTHON_SCRAPER_URL=http://127.0.0.1:8000 to proxy to Infinite-lead-gen-main FastAPI.',
            data: {
              task: 'maps_search',
              query: what_to_scrape,
              location,
              count: 0,
              results: [],
              error: msg,
            },
          },
          { status: 503 }
        );
      }
      throw playwrightErr;
    }
  } catch (error: any) {
    console.error('Error in POST /api/maps-scrape:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to scrape maps',
        data: { task: 'maps_search', query: '', location: '', count: 0, results: [], error: error.message },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const what_to_scrape = searchParams.get('what_to_scrape') || searchParams.get('query') || '';
  const location = searchParams.get('location') || searchParams.get('city') || '';
  const result_limit = searchParams.get('result_limit') || searchParams.get('limit') || '50';
  if (!what_to_scrape || !location) {
    return NextResponse.json(
      { success: false, error: 'Missing query. Use ?what_to_scrape=Bakery&location=Coimbatore&result_limit=10' },
      { status: 400 }
    );
  }
  // reuse POST logic
  return POST(
    new NextRequest(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ what_to_scrape, location, result_limit: Number(result_limit) }),
    } as any)
  );
}
