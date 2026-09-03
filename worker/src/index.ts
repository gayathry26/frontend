export interface Env {
  TARGET_WEBHOOK_URL: string;
  CRON_SECRET?: string;
}

export interface CloudflareScheduledEvent {
  scheduledTime: number;
  cron: string;
}

export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

export default {
  /**
   * Cloudflare Worker Scheduled Handler
   * Fires automatically according to the cron schedule: every 6 hours.
   */
  async scheduled(event: CloudflareScheduledEvent, env: Env, ctx: CloudflareExecutionContext): Promise<void> {
    console.log(`⏰ Cloudflare Worker Cron Trigger fired at ${new Date(event.scheduledTime).toISOString()}`);

    const webhookUrl = env.TARGET_WEBHOOK_URL || 'http://localhost:3000/api/admin/automation/trigger';

    ctx.waitUntil(
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': env.CRON_SECRET || 'automated-role-update-secret'
        },
        body: JSON.stringify({
          source: 'CLOUDFLARE_CRON',
          scheduledTime: event.scheduledTime
        })
      })
        .then(res => res.json())
        .then(data => {
          console.log('✅ Automation pipeline trigger response:', JSON.stringify(data));
        })
        .catch((err: any) => {
          console.error('❌ Automation pipeline trigger error:', err.message);
        })
    );
  },

  /**
   * HTTP Handler for testing worker deployment directly
   */
  async fetch(request: Request, env: Env, ctx: CloudflareExecutionContext): Promise<Response> {
    return new Response(JSON.stringify({
      message: 'IT Career Hub Automation Cloudflare Worker is active.',
      cronSchedule: '0 */6 * * *',
      targetWebhook: env.TARGET_WEBHOOK_URL
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
