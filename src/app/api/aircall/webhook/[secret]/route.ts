import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { findLeadByPhoneNumberServer } from '@/services/firebase-server';
import { getCallTranscriptByCallId } from '@/ai/flows/get-call-transcript-flow';

const db = getFirestore(adminApp);

/**
 * Formats a duration in seconds to a human-readable format like "2m 5s"
 */
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const resolvedParams = await params;
  const secret = resolvedParams.secret;

  // Validate webhook secret
  const configuredSecret = process.env.WEBHOOK_SECRET;
  if (!configuredSecret || secret !== configuredSecret) {
    console.warn(`[Aircall Webhook] Unauthorized request received with secret: ${secret}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const event = await req.json();
    console.log(`[Aircall Webhook] Received event: ${event.event}`, JSON.stringify(event));

    // Handle call.ended event
    if (event.event === 'call.ended') {
      const callData = event.data;
      if (!callData) {
        return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
      }

      const callId = String(callData.id);
      const phoneNumber = callData.contact?.phone_number || callData.raw_digits;
      const duration = callData.duration || 0;
      const direction = callData.direction || 'outbound';
      const status = callData.status || 'answered';
      const author = callData.user?.name || 'Aircall';
      const recording = callData.recording || '';
      
      const timestampSeconds = callData.ended_at || callData.started_at || Math.floor(Date.now() / 1000);
      const date = new Date(timestampSeconds * 1000).toISOString();

      if (!phoneNumber) {
        console.warn(`[Aircall Webhook] No phone number found in call: ${callId}`);
        return NextResponse.json({ success: true, message: 'No phone number to match' });
      }

      // Find the lead associated with the phone number
      const match = await findLeadByPhoneNumberServer(phoneNumber);
      if (!match) {
        console.log(`[Aircall Webhook] No matching lead/company found for phone: ${phoneNumber}`);
        return NextResponse.json({ success: true, message: 'No matching lead found' });
      }

      const collectionType = match.type; // 'leads' or 'companies'
      const leadId = match.id;

      // Check if an activity for this callId already exists under this lead/company
      const activityRef = db.collection(collectionType).doc(leadId).collection('activity');
      const existingActivitySnap = await activityRef.where('callId', '==', callId).limit(1).get();

      let notes = `Aircall call: ${direction === 'inbound' ? 'Inbound' : 'Outbound'} call. Status: ${status}.`;
      if (callData.note) {
        notes += `\nNote: ${callData.note}`;
      }
      if (recording) {
        notes += `\nRecording: ${recording}`;
      }

      const activityData = {
        type: 'Call',
        date,
        duration: formatDuration(duration),
        notes,
        callId,
        author,
      };

      if (existingActivitySnap.empty) {
        const docRef = await activityRef.add(activityData);
        console.log(`[Aircall Webhook] Logged call activity ${docRef.id} for ${collectionType} ID: ${leadId}`);
      } else {
        const existingDocId = existingActivitySnap.docs[0].id;
        await activityRef.doc(existingDocId).update(activityData);
        console.log(`[Aircall Webhook] Updated existing call activity ${existingDocId} for ${collectionType} ID: ${leadId}`);
      }
    }

    // Handle transcription.created event
    if (event.event === 'transcription.created') {
      const transcriptionData = event.data;
      if (!transcriptionData) {
        return NextResponse.json({ error: 'Missing transcription data' }, { status: 400 });
      }

      const callId = String(transcriptionData.call_id || transcriptionData.call?.id);
      if (!callId) {
        console.warn('[Aircall Webhook] No call_id found in transcription event');
        return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
      }

      // Find the activity to identify which lead/company this call belongs to
      // We look in collection group 'activity'
      console.log(`[Aircall Webhook] Processing transcription for callId: ${callId}`);
      const activitySnap = await db.collectionGroup('activity').where('callId', '==', callId).limit(1).get();
      
      if (activitySnap.empty) {
        console.warn(`[Aircall Webhook] No matching activity found for callId: ${callId} to attach transcript.`);
        return NextResponse.json({ success: true, message: 'No matching activity' });
      }

      const activityDoc = activitySnap.docs[0];
      const parentRef = activityDoc.ref.parent.parent;
      if (!parentRef) {
        console.warn(`[Aircall Webhook] Activity doc ${activityDoc.id} has no parent lead/company.`);
        return NextResponse.json({ success: true, message: 'No parent ref' });
      }

      const leadId = parentRef.id;
      const collectionType = parentRef.parent?.id as 'leads' | 'companies';
      
      console.log(`[Aircall Webhook] Fetching transcription for call ${callId} associated with ${collectionType} ${leadId}`);
      
      // Trigger the transcription fetch flow
      const result = await getCallTranscriptByCallId({
        callId,
        leadId,
        leadAuthor: activityDoc.data().author || 'Aircall AI'
      });

      console.log(`[Aircall Webhook] Transcription fetch result for call ${callId}:`, result);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Aircall Webhook Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
