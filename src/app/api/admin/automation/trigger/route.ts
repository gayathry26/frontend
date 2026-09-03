import { NextRequest, NextResponse } from 'next/server';
import { runAutomationPipeline } from '@/backend/services/automationPipelineService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/automation/trigger
 * Triggers the automated technology role update pipeline (manual button or Cloudflare cron).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const forceRun = Boolean(body.forceRun);
    const autoUpdateOn = body.autoUpdateOn !== undefined ? Boolean(body.autoUpdateOn) : true;

    console.log(`⚡ Automation pipeline trigger requested (forceRun: ${forceRun}, autoUpdate: ${autoUpdateOn})`);

    const summary = await runAutomationPipeline({ forceRun, autoUpdateOn });

    return NextResponse.json({
      success: true,
      message: 'Automated Technology Role Update pipeline executed successfully.',
      summary
    });
  } catch (error: any) {
    console.error('API Error triggering automation pipeline:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Pipeline execution failed' },
      { status: 500 }
    );
  }
}
