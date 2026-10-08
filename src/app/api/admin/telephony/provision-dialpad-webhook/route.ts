import { NextRequest, NextResponse } from 'next/server';
import { createDialpadWebhook, createDialpadSubscription } from '@/services/telephony/dialpad-provider';
import { updateTelephonySettingsServer } from '@/services/telephony-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = process.env.WEBHOOK_SECRET || 'a5882b1fcfcd41a085b624fae1cd2948';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
    const hookUrl = `${baseUrl.replace(/\/$/, '')}/api/dialpad/webhook/${secret}`;

    // Step 1: Create Webhook
    const webhookRes = await createDialpadWebhook(hookUrl, undefined, body.apiKey);
    if (!webhookRes.success || !webhookRes.webhookId) {
      return NextResponse.json({
        success: false,
        message: `Step 1 (Create Webhook) failed: ${webhookRes.error || 'Unknown error'}`,
      }, { status: 400 });
    }

    const webhookId = webhookRes.webhookId;

    // Step 2: Create Subscription for call outcomes, missed, connected, transcripts, and recordings
    const subRes = await createDialpadSubscription(webhookId, [
      'call_hungup',
      'call_missed',
      'call_connected',
      'transcription_ready',
      'recording_ready',
    ], body.apiKey);

    if (!subRes.success) {
      return NextResponse.json({
        success: false,
        message: `Step 2 (Subscribe to Events) failed: ${subRes.error || 'Unknown error'}`,
        webhookId,
      }, { status: 400 });
    }

    // Save webhookId to Firestore
    await updateTelephonySettingsServer({
      dialpad: {
        webhookId: String(webhookId),
      }
    }, body.updatedBy || 'superadmin');

    return NextResponse.json({
      success: true,
      message: `Dialpad Webhook registered successfully! (Webhook ID: ${webhookId})`,
      webhookId,
      subscriptionId: subRes.subscriptionId,
      hookUrl,
    });
  } catch (error: any) {
    console.error('[Provision Dialpad Webhook] Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
