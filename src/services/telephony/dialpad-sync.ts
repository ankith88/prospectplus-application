import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { findAllLeadsByPhoneNumberServer, logTranscriptActivityServer } from '@/services/firebase-server';
import { fetchDialpadTranscript, fetchRecentDialpadCalls, fetchDialpadCall } from './dialpad-provider';

const db = getFirestore(adminApp);

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export interface DialpadSyncResult {
  success: boolean;
  message: string;
  callId?: string;
  matchedLeadId?: string;
  collectionType?: 'leads' | 'companies';
  updatedInitiatedDocId?: string | null;
  error?: string;
}

/**
 * Normalizes and synchronizes a Dialpad call record into Firestore.
 * Handles correlation with initiated client-side calls, updating existing records,
 * and updating parent lead/company metadata.
 */
export async function syncDialpadCallRecord(callData: any, rawEventType?: string): Promise<DialpadSyncResult> {
  try {
    const callId = String(callData.call_id || callData.id || '');
    if (!callId) {
      return { success: false, message: 'Missing Call ID in Dialpad data' };
    }

    const eventType = (rawEventType || callData.state || '').toLowerCase();
    const isHungup = eventType.includes('hungup') || eventType.includes('completed') || callData.state === 'hungup';
    const isMissed = eventType.includes('missed') || callData.state === 'missed';
    const isTranscriptReady = eventType.includes('transcript');

    const direction = (callData.direction || 'outbound').toLowerCase() as 'inbound' | 'outbound';

    let phoneNumber =
      direction === 'inbound'
        ? (callData.from_number || callData.external_number || callData.caller_id || '')
        : (callData.to_number || callData.external_number || callData.peer_number || '');

    // Normalize duration
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

    const durationLabel = formatDuration(durationSeconds);

    // 1. Identify candidate lead/company matches
    let matches: { id: string; type: 'leads' | 'companies' }[] = [];
    if (phoneNumber) {
      const rawMatches = await findAllLeadsByPhoneNumberServer(phoneNumber);
      matches = (await Promise.all(rawMatches.map(async (m) => {
        const docSnap = await db.collection(m.type).doc(m.id).get();
        return docSnap.exists ? m : null;
      }))).filter((m): m is { id: string; type: 'leads' | 'companies' } => m !== null);
    }

    // 2. Correlation: Search for matching initiated activity across candidates or recently initiated calls
    const maxTimeDiffMs = 45 * 60 * 1000; // 45 minutes
    let selectedMatch: { id: string; type: 'leads' | 'companies' } | null = null;
    let matchedInitiatedDocId: string | null = null;

    // Check all direct phone matches first
    for (const match of matches) {
      const activityRef = db.collection(match.type).doc(match.id).collection('activity');
      const actSnap = await activityRef
        .where('type', '==', 'Call')
        .get();

      for (const doc of actSnap.docs) {
        const act = doc.data();
        // Check if this doc is an initiated call waiting for sync
        const isInitiated =
          !act.callId &&
          (act.telephonyStatus === 'initiated' ||
           act.aircallStatus === 'initiated' ||
           act.notes?.toLowerCase().includes('initiated call'));

        if (isInitiated) {
          const actTimeMs = act.date ? new Date(act.date).getTime() : 0;
          const timeDiff = Math.abs(actTimeMs - timestampMs);

          const authorMatch =
            !author || !act.author || act.author === 'Unknown' ||
            author.toLowerCase().includes(act.author.toLowerCase()) ||
            act.author.toLowerCase().includes(author.toLowerCase());

          if (timeDiff <= maxTimeDiffMs && authorMatch) {
            selectedMatch = match;
            matchedInitiatedDocId = doc.id;
            break;
          }
        }
      }
      if (matchedInitiatedDocId) break;
    }

    // Fallback: If no initiated doc matched, but we have exactly 1 direct phone match, use it
    if (!selectedMatch && matches.length === 1) {
      selectedMatch = matches[0];
    } else if (!selectedMatch && matches.length > 1) {
      selectedMatch = matches[0];
    }

    // Fallback 2: If phone didn't match any lead directly, search collectionGroup for initiated call
    if (!selectedMatch && phoneNumber) {
      try {
        const cleanDigits = phoneNumber.replace(/[^\d]/g, '').slice(-9);
        const initiatedSnap = await db.collectionGroup('activity')
          .where('type', '==', 'Call')
          .limit(25)
          .get();

        for (const doc of initiatedSnap.docs) {
          const act = doc.data();
          if (!act.callId && (act.telephonyStatus === 'initiated' || act.aircallStatus === 'initiated' || act.notes?.toLowerCase().includes('initiated call'))) {
            const actNotes = act.notes || '';
            const actPhone = (act.phoneNumber || '').replace(/[^\d]/g, '');
            if (actPhone.endsWith(cleanDigits) || actNotes.includes(cleanDigits) || (phoneNumber && actNotes.includes(phoneNumber))) {
              const parentLeadRef = doc.ref.parent.parent;
              if (parentLeadRef) {
                const parentCol = parentLeadRef.parent.id as 'leads' | 'companies';
                selectedMatch = { id: parentLeadRef.id, type: parentCol };
                matchedInitiatedDocId = doc.id;
                break;
              }
            }
          }
        }
      } catch (cgErr) {
        console.warn('[Dialpad Sync] collectionGroup lookup fallback warning:', cgErr);
      }
    }

    // 3. Build comprehensive Activity document payload
    const notes = status === 'missed'
      ? `Missed ${direction} call with ${phoneNumber} via Dialpad.`
      : `Completed ${direction} call (${durationLabel}) with ${phoneNumber} via Dialpad.${disposition ? ` Disposition: ${disposition}` : ''}`;

    const activityDocData: Record<string, any> = {
      type: 'Call',
      callId,
      telephonyProvider: 'dialpad',
      telephonyStatus: status,
      aircallStatus: status, // for seamless compatibility across existing reporting and client views
      direction,
      author,
      date: dateStr,
      duration: durationLabel,
      durationSeconds,
      durationLabel,
      phoneNumber,
      notes,
      recording: recording || null,
      recordingUrl: recording || null,
      recordingAssetUrl: recording || null,
      disposition: disposition || null,
      event: eventType || 'call_hungup',
      syncedWithNetSuite: false,
    };

    // Try fetching transcript if available
    let utterances: any[] = [];
    if (isTranscriptReady || status === 'answered') {
      const transcriptData = await fetchDialpadTranscript(callId);
      if (transcriptData?.utterances) {
        utterances = transcriptData.utterances;
      }
    }

    if (utterances.length > 0) {
      activityDocData.utterances = utterances;
    }

    // 4. Save to unassigned_calls if no match found
    if (!selectedMatch) {
      console.log(`[Dialpad Sync] No lead found for phone ${phoneNumber}. Storing in unassigned calls.`);
      await db.collection('unassigned_calls').doc(callId).set({
        ...activityDocData,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      return {
        success: true,
        message: 'Stored in unassigned calls',
        callId,
      };
    }

    // 5. Update lead/company activity
    const activityRef = db.collection(selectedMatch.type).doc(selectedMatch.id).collection('activity');

    if (matchedInitiatedDocId) {
      await activityRef.doc(matchedInitiatedDocId).set(activityDocData, { merge: true });
      console.log(`[Dialpad Sync] Correlated and updated initiated activity ${matchedInitiatedDocId} for ${selectedMatch.type}/${selectedMatch.id}`);
    } else {
      const existingSnap = await activityRef.where('callId', '==', callId).limit(1).get();
      if (!existingSnap.empty) {
        await existingSnap.docs[0].ref.set(activityDocData, { merge: true });
        console.log(`[Dialpad Sync] Updated existing call activity for callId: ${callId}`);
      } else {
        const newDoc = await activityRef.add(activityDocData);
        console.log(`[Dialpad Sync] Logged new call activity ${newDoc.id} on ${selectedMatch.type}/${selectedMatch.id}`);
      }
    }

    // 6. Update parent document for searchability and recent calls
    try {
      const parentRef = db.collection(selectedMatch.type).doc(selectedMatch.id);
      const parentDoc = await parentRef.get();
      if (parentDoc.exists) {
        const parentData = parentDoc.data() || {};
        const currentKeywords: string[] = Array.isArray(parentData.searchKeywords) ? parentData.searchKeywords : [];
        const callIdStr = String(callId);
        const newKeywords = Array.from(new Set([...currentKeywords, callIdStr, `call-${callIdStr}`, `dialpad-${callIdStr}`]));
        await parentRef.set({
          lastCallId: callIdStr,
          lastActivityDate: dateStr,
          lastContactedDate: dateStr,
          searchKeywords: newKeywords,
          recentCallIds: FieldValue.arrayUnion(callIdStr),
        }, { merge: true });
      }
    } catch (parentErr) {
      console.warn('[Dialpad Sync] Failed to update parent lastCallId:', parentErr);
    }

    // 7. Store transcript if available
    if (utterances.length > 0) {
      try {
        await logTranscriptActivityServer(selectedMatch.id, selectedMatch.type, {
          content: JSON.stringify(utterances),
          author,
          callId,
        });
      } catch (tErr) {
        console.warn('[Dialpad Sync] Failed to store transcript:', tErr);
      }
    }

    return {
      success: true,
      message: `Call synced successfully to ${selectedMatch.type}/${selectedMatch.id}`,
      callId,
      matchedLeadId: selectedMatch.id,
      collectionType: selectedMatch.type,
      updatedInitiatedDocId: matchedInitiatedDocId,
    };
  } catch (error: any) {
    console.error('[Dialpad Sync] Error syncing call:', error);
    return { success: false, message: error.message || 'Sync failed', error: error.message };
  }
}

/**
 * Searches Dialpad API for recent calls and synchronizes any call matching the given lead or phone.
 */
export async function syncRecentDialpadCallForLead(
  leadId: string,
  phoneNumber?: string,
  collectionType: 'leads' | 'companies' = 'leads'
): Promise<DialpadSyncResult> {
  const recentCalls = await fetchRecentDialpadCalls({ limit: 20 });
  if (!recentCalls || recentCalls.length === 0) {
    return { success: false, message: 'No recent calls found in Dialpad account' };
  }

  const cleanPhone = (phoneNumber || '').replace(/[^\d]/g, '').slice(-9);

  // Find most recent matching call
  const matchingCall = recentCalls.find((c: any) => {
    const toNum = (c.to_number || c.external_number || c.peer_number || '').replace(/[^\d]/g, '');
    const fromNum = (c.from_number || c.external_number || c.caller_id || '').replace(/[^\d]/g, '');
    if (cleanPhone && (toNum.endsWith(cleanPhone) || fromNum.endsWith(cleanPhone))) {
      return true;
    }
    return false;
  });

  if (!matchingCall) {
    return { success: false, message: 'No matching concluded call found in Dialpad for this phone number' };
  }

  return await syncDialpadCallRecord(matchingCall);
}
