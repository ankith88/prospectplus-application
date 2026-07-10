import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { findLeadByPhoneNumberServer, findAllLeadsByPhoneNumberServer } from '@/services/firebase-server';
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

    // Handle call.ended, call.comm_assets_generated or call.hungup events
    if (event.event === 'call.ended' || event.event === 'call.comm_assets_generated' || event.event === 'call.hungup') {
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

      // Find all leads/companies associated with the phone number
      const matches = await findAllLeadsByPhoneNumberServer(phoneNumber);

      let selectedMatch = matches.length === 1 ? matches[0] : null;
      let matchedInitiatedDocId: string | null = null;

      if (matches.length > 1) {
        console.log(`[Aircall Webhook] Multiple leads match phone: ${phoneNumber}. Running temporal & agent correlation...`);
        const callTimeMs = timestampSeconds * 1000;
        const maxTimeDiffMs = 15 * 60 * 1000; // 15 minutes

        for (const match of matches) {
          const activityRef = db.collection(match.type).doc(match.id).collection('activity');
          // Query for recent initiated calls
          const initiatedSnap = await activityRef
            .where('type', '==', 'Call')
            .where('aircallStatus', '==', 'initiated')
            .get();

          for (const doc of initiatedSnap.docs) {
            const actData = doc.data();
            const actTimeMs = actData.date ? new Date(actData.date).getTime() : 0;
            const timeDiff = Math.abs(actTimeMs - callTimeMs);

            // Match author (case-insensitive check)
            const authorMatch = 
              !author || !actData.author || actData.author === 'Unknown' ||
              author.toLowerCase().includes(actData.author.toLowerCase()) || 
              actData.author.toLowerCase().includes(author.toLowerCase());

            if (timeDiff <= maxTimeDiffMs && authorMatch) {
              console.log(`[Aircall Webhook] Found correlated lead match: ${match.type}/${match.id} (Activity ID: ${doc.id})`);
              selectedMatch = match;
              matchedInitiatedDocId = doc.id;
              break;
            }
          }
          if (matchedInitiatedDocId) break;
        }
      }

      let notes = `${direction === 'inbound' ? 'Inbound' : 'Outbound'} call.`;
      if (callData.note) {
        notes += ` Note: ${callData.note}`;
      }

      const activityData = {
        type: 'Call',
        date,
        duration: formatDuration(duration),
        notes,
        callId,
        author,
        aircallStatus: status,
        recordingUrl: recording,
        recordingAssetUrl: `https://assets.aircall.io/calls/${callId}/recording/info`,
        event: event.event || 'call.ended',
      };

      if (!selectedMatch) {
        console.log(`[Aircall Webhook] Call is unmatched/ambiguous. Storing in unassigned_calls: ${callId}`);
        const matchesWithNames = await Promise.all(matches.map(async (m) => {
          const docSnap = await db.collection(m.type).doc(m.id).get();
          const data = docSnap.exists ? docSnap.data() : null;
          return {
            id: m.id,
            type: m.type,
            name: data?.companyName || 'Unknown Lead',
            status: data?.customerStatus || 'New'
          };
        }));

        const unassignedData = {
          ...activityData,
          email: callData.user?.email || null,
          direction,
          matches: matchesWithNames
        };

        await db.collection('unassigned_calls').doc(callId).set(unassignedData, { merge: true });
        console.log(`[Aircall Webhook] Saved/updated unassigned call ${callId} for agent email: ${unassignedData.email}`);
        return NextResponse.json({ success: true, message: 'Saved as unassigned call' });
      }

      const collectionType = selectedMatch.type;
      const leadId = selectedMatch.id;

      // Check if an activity for this callId already exists under this lead/company
      const activityRef = db.collection(collectionType).doc(leadId).collection('activity');
      const existingActivitySnap = await activityRef.where('callId', '==', callId).limit(1).get();

      if (!existingActivitySnap.empty) {
        const existingDocId = existingActivitySnap.docs[0].id;
        await activityRef.doc(existingDocId).update(activityData);
        console.log(`[Aircall Webhook] Updated existing call activity ${existingDocId} for ${collectionType} ID: ${leadId}`);
      } else if (matchedInitiatedDocId) {
        await activityRef.doc(matchedInitiatedDocId).update(activityData);
        console.log(`[Aircall Webhook] Correlated and updated initiated activity ${matchedInitiatedDocId} for ${collectionType} ID: ${leadId}`);
      } else {
        const docRef = await activityRef.add(activityData);
        console.log(`[Aircall Webhook] Logged call activity ${docRef.id} for ${collectionType} ID: ${leadId}`);
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
