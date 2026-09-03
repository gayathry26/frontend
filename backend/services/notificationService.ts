export interface NotificationPayload {
  roleTitle: string;
  category: string;
  slug: string;
  addedTechnicalSkills: string[];
  addedSoftSkills: string[];
  addedTools: string[];
  sourceName: string;
  sourceUrl: string;
  confidence: number;
  updatedAtDate: string;
  appBaseUrl?: string;
}

/**
 * Sends a WhatsApp notification to the administrator via Twilio API when meaningful role updates occur.
 */
export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM?.trim() || 'whatsapp:+14155238886';
  const toWhatsApp = process.env.ADMIN_WHATSAPP_TO?.trim();

  const baseUrl = payload.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const roleUrl = `${baseUrl}/roles/${payload.slug}`;

  const messageText = `IT CAREER HUB UPDATE

New information detected.

Role:
${payload.roleTitle}

Category:
${payload.category}

${payload.addedTechnicalSkills.length > 0 ? `New Technical Skills:\n` + payload.addedTechnicalSkills.map(s => `• ${s}`).join('\n') + '\n\n' : ''}${payload.addedTools.length > 0 ? `New Tools:\n` + payload.addedTools.map(t => `• ${t}`).join('\n') + '\n\n' : ''}Source:
${payload.sourceName}

View Source:
${payload.sourceUrl}

Confidence:
${Math.round(payload.confidence * 100)}%

Updated:
${payload.updatedAtDate}

MongoDB:
UPDATED SUCCESSFULLY

View Role:
${roleUrl}`;

  console.log('\n' + '='.repeat(60));
  console.log('  📱 OUTGOING PHONE NOTIFICATION (WHATSAPP)');
  console.log('='.repeat(60));
  console.log(messageText);
  console.log('='.repeat(60) + '\n');

  if (!accountSid || !authToken || !toWhatsApp) {
    console.log('⚠️ Twilio credentials missing in environment. Notification logged locally.');
    return { success: true, error: 'Twilio credentials unconfigured (Logged to console)' };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('From', fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`);
    params.append('To', toWhatsApp.startsWith('whatsapp:') ? toWhatsApp : `whatsapp:${toWhatsApp}`);
    params.append('Body', messageText);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (res.ok) {
      console.log('✅ Twilio WhatsApp notification delivered successfully.');
      return { success: true };
    } else {
      const errText = await res.text();
      console.error('❌ Twilio WhatsApp API Error:', errText);
      return { success: false, error: errText };
    }
  } catch (err: any) {
    console.error('❌ Notification exception:', err.message);
    return { success: false, error: err.message };
  }
}
