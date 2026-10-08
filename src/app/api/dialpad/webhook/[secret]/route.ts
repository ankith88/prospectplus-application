import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { findAllLeadsByPhoneNumberServer } from '@/services/firebase-server';
import { fetchDialpadTranscript } from '@/services/telephony/dialpad-provider';

const db = getFirestore(adminApp);

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
      // In case JWT token is sent, handle base64 decode
      console.warn('[Dialpad Webhook] Non-JSON payload received, checking format');
      return NextResponse.json({ success: true, message: 'Received' });
    }

    console.log(`[Dialpad Webhook] Received event: ${event.event || event.type || 'unknown'}`, JSON.stringify(event));

    // Support both direct event object and event wrapped inside data
    const callData = event.data || event.call || event;
    const eventType = (event.event || event.type || callData.state || '').toLowerCase();

    // We process completed/hungup, missed, or transcription events
    const isHungup = eventType.includes('hungup') || eventType.includes('completed') || callData.state === 'hungup';
    const isMissed = eventType.includes('missed') || callData.state === 'missed';
    const isTranscriptReady = eventType.includes('transcript');

    if (!isHungup && !isMissed && !isTranscriptReady) {
      return NextResponse.json({ success: true, message: `Ignored event: ${eventType}` });
    }

    const callId = String(callData.call_id || callData.id || '');
    if (!callId) {
      return NextResponse.json({ error: 'Missing call ID' }, { status: 400 });
    }

    const direction = (callData.direction || 'outbound').toLowerCase() as 'inbound' | 'outbound';
    
    // Determine phone number of lead/customer
    let phoneNumber =
      direction === 'inbound'
        ? (callData.from_number || callData.external_number || callData.caller_id || '')
        : (callData.to_number || callData.external_number || callData.peer_number || '');

    // Normalize raw duration
    let durationSeconds = 0;
    if (typeof callData.duration === 'number') {
      durationSeconds = callData.duration > 1000 ? Math.round(callData.duration / 1000) : callData.duration;
    } else if (typeof callData.duration_ms === 'number') {
      durationSeconds = Math.round(callData.duration_ms / 1000);
    }

    const status = isMissed ? 'missed' : (durationSeconds > 0 || callData.state === 'connected' ? 'answered' : 'missed');
    const author = callData.target?.name || callData.user?.name || callData.agent_name || 'Dialpad Rep';
    const recording = callData.recording_url || callData.recording || '';
    const disposition = callData.disposition || callData.category || null;

    const timestampMs = callData.date_ended || callData.date_started || Date.now();
    const dateStr = new Date(timestampMs).toISOString();

    if (!phoneNumber) {
      console.warn(`[Dialpad Webhook] No phone number in call event: ${callId}`);
      return NextResponse.json({ success: true, message: 'No phone number to match' });
    }

    // Match leads / companies
    const rawMatches = await findAllLeadsByPhoneNumberServer(phoneNumber);
    const matches = (await Promise.all(rawMatches.map(async (m) => {
      const docSnap = await db.collection(m.type).doc(m.id).get();
      return docSnap.exists ? m : null;
    }))).filter((m): m is typeof rawMatches[0] => m !== null);

    let selectedMatch = matches.length === 1 ? matches[0] : null;
    let matchedInitiatedDocId: string | null = null;

    if (matches.length > 1) {
      console.log(`[Dialpad Webhook] Multiple leads match ${phoneNumber}. Correlating...`);
      const maxTimeDiffMs = 15 * 60 * 1000; // 15 mins

      for (const match of matches) {
        const activityRef = db.collection(match.type).doc(match.id).collection('activity');
        const initiatedSnap = await activityRef
          .where('type', '==', 'Call')
          .where('telephonyStatus', '==', 'initiated')
          .get();

        for (const doc of initiatedSnap.docs) {
          const actData = doc.data();
          const actTimeMs = actData.date ? new Date(actData.date).getTime() : 0;
          const timeDiff = Math.abs(actTimeMs - timestampMs);

          const authorMatch =
            !author || !actData.author || actData.author === 'Unknown' ||
            author.toLowerCase().includes(actData.author.toLowerCase()) ||
            actData.author.toLowerCase().includes(author.toLowerCase());

          if (timeDiff <= maxTimeDiffMs && authorMatch) {
            selectedMatch = match;
            matchedInitiatedDocId = doc.id;
            break;
          }
        }
        if (selectedMatch) break;
      }

      if (!selectedMatch) {
        selectedMatch = matches[0];
      }
    }

    if (!selectedMatch) {
      console.log(`[Dialpad Webhook] No lead found for phone ${phoneNumber}. Storing in unassigned calls.`);
      await db.collection('unassigned_calls').doc(callId).set({
        callId,
        telephonyProvider: 'dialpad',
        phoneNumber,
        direction,
        status,
        duration: durationSeconds,
        author,
        date: dateStr,
        recording,
        disposition,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true, message: 'Stored in unassigned calls' });
    }

    // Try fetching Dialpad transcript if available
    let utterances: any[] = [];
    if (isTranscriptReady || status === 'answered') {
      const transcriptData = await fetchDialpadTranscript(callId);
      if (transcriptData?.utterances) {
        utterances = transcriptData.utterances;
      }
    }

    const activityRef = db.collection(selectedMatch.type).doc(selectedMatch.id).collection('activity');

    // Build Activity Payload
    const durationLabel = formatDuration(durationSeconds);
    const activityDocData: Record<string, any> = {
      type: 'Call',
      telephonyProvider: 'dialpad',
      telephonyStatus: status,
      direction,
      author,
      date: dateStr,
      duration: durationSeconds,
      durationLabel,
      callId,
      phoneNumber,
      recording: recording || null,
      disposition: disposition || null,
      summary: status === 'missed'
        ? `Missed ${direction} call from ${phoneNumber}`
        : `Completed ${direction} call (${durationLabel}) with ${phoneNumber}`,
    };

    if (utterances.length > 0) {
      activityDocData.utterances = utterances;
    }

    if (matchedInitiatedDocId) {
      await activityRef.doc(matchedInitiatedDocId).set(activityDocData, { merge: true });
      console.log(`[Dialpad Webhook] Updated initiated activity ${matchedInitiatedDocId} for ${selectedMatch.type}/${selectedMatch.id}`);
    } else {
      // Check if callId already exists
      const existingSnap = await activityRef.where('callId', '==', callId).limit(1).get();
      if (!existingSnap.empty) {
        await existingSnap.docs[0].ref.set(activityDocData, { merge: true });
      } else {
        await activityRef.add(activityDocData);
      }
      console.log(`[Dialpad Webhook] Logged call activity on ${selectedMatch.type}/${selectedMatch.id}`);
    }

    return NextResponse.json({
      success: true,
      matchedLead: selectedMatch,
      callId,
    });
  } catch (error: any) {
    console.error('[Dialpad Webhook] Error processing event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
