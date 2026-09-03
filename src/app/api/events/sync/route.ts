/**
 * API Route: POST /api/events/sync
 *
 * HTTP endpoint to trigger the multi-source event aggregation sync.
 * Can be called by the Admin AI Chatbot or automated cron jobs.
 *
 * Request body (optional):
 *   { dryRun?: boolean, sources?: string[] }
 *
 * Response:
 *   { success: true, report: SyncReport }
 */

import { NextResponse } from 'next/server';
import { runEventAggregation, SyncReport } from '@/backend/services/events/eventAggregator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — allow time for full pagination

export async function POST(req: Request) {
  try {
    let dryRun = false;
    let sources: string[] | undefined;

    try {
      const body = await req.json();
      dryRun = body.dryRun === true;
      sources = Array.isArray(body.sources) ? body.sources : undefined;
    } catch {
      // Body is optional — defaults are fine
    }

    console.log(`[/api/events/sync] Starting sync. dryRun=${dryRun}, sources=${sources?.join(',') || 'all'}`);

    const report: SyncReport = await runEventAggregation({ dryRun, sources });

    return NextResponse.json({
      success: true,
      message: `Sync completed in ${(report.durationMs / 1000).toFixed(1)}s. ${report.newCount} new, ${report.updatedCount} updated, ${report.expiredCount} expired.`,
      report
    });
  } catch (err: any) {
    console.error('[/api/events/sync] Error:', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger event sync.',
    usage: 'POST /api/events/sync with optional body: { dryRun: boolean, sources: string[] }'
  });
}
