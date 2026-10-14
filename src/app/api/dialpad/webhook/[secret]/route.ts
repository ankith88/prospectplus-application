import { NextRequest, NextResponse } from 'next/server';
import { syncDialpadCallRecord } from '@/services/telephony/dialpad-sync';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const resolvedParams = await params;
  const secret = resolvedParams.secret;

  // Validate webhook secret
  const configuredSecret = process.env.WEBHOOK_SECRET || 'a5882b1fcfcd41a085b624fae1cd2948';
  if (!configuredSecret || secret !== configuredSecret) {
    console.warn(`[Dialpad Webhook] Unauthorized request with secret: ${secret}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const rawBody = await req.text();
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.warn('[Dialpad Webhook] Non-JSON payload received, checking format');
      return NextResponse.json({ success: true, message: 'Received non-JSON payload' });
    }

    console.log(`[Dialpad Webhook] Received event: ${event.event || event.type || 'unknown'}`);

    // Support both direct event object and event wrapped inside data / call
    const callData = event.data || event.call || event;
    const eventType = (event.event || event.type || callData.state || '').toLowerCase();

    // Check if event is relevant
    const isHungup = eventType.includes('hungup') || eventType.includes('hangup') || eventType.includes('completed') || callData.state === 'hungup' || callData.state === 'hangup';
    const isMissed = eventType.includes('missed') || callData.state === 'missed';
    const isTranscriptReady = eventType.includes('transcript');

    if (!isHungup && !isMissed && !isTranscriptReady) {
      return NextResponse.json({ success: true, message: `Ignored event: ${eventType}` });
    }

    const result = await syncDialpadCallRecord(callData, eventType);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      callId: result.callId,
      matchedLeadId: result.matchedLeadId,
      collectionType: result.collectionType,
      updatedInitiatedDocId: result.updatedInitiatedDocId,
    }, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[Dialpad Webhook] Error processing event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
