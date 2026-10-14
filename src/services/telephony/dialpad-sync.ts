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

/**
 * Safely parses any Dialpad date/time value into a valid millisecond number and ISO string.
 * Dialpad REST API frequently returns timestamps as numeric strings (e.g. "1791936913211").
 * Standard new Date("1791936913211") throws RangeError: Invalid time value in V8/Node.
 */
export function parseDialpadTimestamp(val: any): { timestampMs: number; dateStr: string } {
  if (!val) {
    const now = Date.now();
    return { timestampMs: now, dateStr: new Date(now).toISOString() };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!isNaN(num) && num > 0) {
        const ms = num < 1e11 ? Math.round(num * 1000) : (num > 1e14 ? Math.round(num / 1000) : Math.round(num));
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          return { timestampMs: ms, dateStr: d.toISOString() };
        }
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { timestampMs: d.getTime(), dateStr: d.toISOString() };
    }
  } else if (typeof val === 'number' && !isNaN(val) && val > 0) {
    const ms = val < 1e11 ? Math.round(val * 1000) : (val > 1e14 ? Math.round(val / 1000) : Math.round(val));
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return { timestampMs: ms, dateStr: d.toISOString() };
    }
  } else if (val instanceof Date && !isNaN(val.getTime())) {
    return { timestampMs: val.getTime(), dateStr: val.toISOString() };
  }
  const fallback = Date.now();
  return { timestampMs: fallback, dateStr: new Date(fallback).toISOString() };
}

export function parseDateToMs(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number' && !isNaN(dateVal)) {
    return dateVal < 1e11 ? dateVal * 1000 : (dateVal > 1e14 ? Math.round(dateVal / 1000) : dateVal);
  }
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return n < 1e11 ? n * 1000 : (n > 1e14 ? Math.round(n / 1000) : n);
    }
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (dateVal instanceof Date) return dateVal.getTime();
  return 0;
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

export interface DialpadSyncContext {
  leadId?: string;
  collectionType?: 'leads' | 'companies';
  activityId?: string;
}

/**
 * Normalizes and synchronizes a Dialpad call record into Firestore.
 * Handles correlation with initiated client-side calls, updating existing records,
 * and updating parent lead/company metadata.
 */
export async function syncDialpadCallRecord(
  callData: any,
  rawEventType?: string,
  context?: DialpadSyncContext
): Promise<DialpadSyncResult> {
  try {
    const callId = String(callData.call_id || callData.id || '');
    if (!callId) {
      return { success: false, message: 'Missing Call ID in Dialpad data' };
    }

    const eventType = (rawEventType || callData.state || '').toLowerCase();
    const isHungup = eventType.includes('hungup') || eventType.includes('hangup') || eventType.includes('completed') || callData.state === 'hungup' || callData.state === 'hangup';
    const isMissed = eventType.includes('missed') || callData.state === 'missed';
    const isTranscriptReady = eventType.includes('transcript');

    const direction = (callData.direction || 'outbound').toLowerCase() as 'inbound' | 'outbound';

    let phoneNumber =
      direction === 'inbound'
        ? (callData.from_number || callData.external_number || callData.caller_id || callData.contact?.phone || callData.contact?.name || '')
        : (callData.to_number || callData.external_number || callData.peer_number || callData.contact?.phone || callData.contact?.name || '');

    if (!phoneNumber) {
      phoneNumber = callData.external_number || callData.contact?.phone || callData.contact?.name || '';
    }

    // Normalize duration
    let durationSeconds = 0;
    const rawDuration = callData.duration ?? callData.total_duration ?? callData.duration_ms;
    if (typeof rawDuration === 'number') {
      durationSeconds = rawDuration > 1000 ? Math.round(rawDuration / 1000) : Math.round(rawDuration);
    } else if (typeof rawDuration === 'string' && !isNaN(Number(rawDuration))) {
      const num = Number(rawDuration);
      durationSeconds = num > 1000 ? Math.round(num / 1000) : Math.round(num);
    }

    const status = isMissed ? 'missed' : (durationSeconds > 0 || callData.state === 'connected' || isHungup ? 'answered' : 'missed');
    let author = callData.target?.name || callData.user?.name || callData.agent_name || '';
    const recording = callData.recording_url || callData.recording || '';
    const disposition = callData.disposition || callData.category || null;

    const { timestampMs, dateStr } = parseDialpadTimestamp(callData.date_ended || callData.date_started || callData.date_connected);
    const durationLabel = formatDuration(durationSeconds);

    let selectedMatch: { id: string; type: 'leads' | 'companies' } | null = null;
    let matchedInitiatedDocId: string | null = null;

    // 1. Direct Context Shortcut: If leadId / activityId was explicitly provided (e.g. user clicked Sync button on lead profile)
    if (context?.leadId) {
      selectedMatch = {
        id: context.leadId,
        type: context.collectionType || 'leads',
      };
      if (context.activityId) {
        matchedInitiatedDocId = context.activityId;
      }
    }

    // 2. Identify candidate lead/company matches by phone if no direct context provided
    if (!selectedMatch) {
      let matches: { id: string; type: 'leads' | 'companies' }[] = [];
      if (phoneNumber) {
        const rawMatches = await findAllLeadsByPhoneNumberServer(phoneNumber);
        matches = (await Promise.all(rawMatches.map(async (m) => {
          const docSnap = await db.collection(m.type).doc(m.id).get();
          return docSnap.exists ? m : null;
        }))).filter((m): m is { id: string; type: 'leads' | 'companies' } => m !== null);
      }

      // Correlation: Search for matching initiated activity across candidates
      const maxTimeDiffMs = 45 * 60 * 1000; // 45 minutes

      for (const match of matches) {
        const activityRef = db.collection(match.type).doc(match.id).collection('activity');
        const actSnap = await activityRef
          .where('type', '==', 'Call')
          .get();

        for (const doc of actSnap.docs) {
          const act = doc.data();
          const isInitiated =
            !act.callId &&
            (act.telephonyStatus === 'initiated' ||
             act.aircallStatus === 'initiated' ||
             act.notes?.toLowerCase().includes('initiated call'));

          if (isInitiated) {
            const actTimeMs = parseDateToMs(act.date);
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

      // Fallback: Use primary phone match if no initiated call correlated
      if (!selectedMatch && matches.length > 0) {
        selectedMatch = matches[0];
      }

      // Fallback 2: Collection group lookup for initiated call by digits
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
    } else if (!matchedInitiatedDocId) {
      // Direct lead was provided, but no specific activityId: check if lead has an initiated activity to correlate
      try {
        const actSnap = await db.collection(selectedMatch.type).doc(selectedMatch.id).collection('activity')
          .where('type', '==', 'Call')
          .get();

        for (const doc of actSnap.docs) {
          const act = doc.data();
          if (!act.callId && (act.telephonyStatus === 'initiated' || act.aircallStatus === 'initiated' || act.notes?.toLowerCase().includes('initiated call'))) {
            matchedInitiatedDocId = doc.id;
            break;
          }
        }
      } catch (err) {
        console.warn('[Dialpad Sync] Error checking initiated activity for targeted lead:', err);
      }
    }

    // Preserve existing activity's author if Dialpad doesn't provide a specific user name
    if (selectedMatch && matchedInitiatedDocId && !author) {
      try {
        const existingDoc = await db.collection(selectedMatch.type).doc(selectedMatch.id).collection('activity').doc(matchedInitiatedDocId).get();
        if (existingDoc.exists) {
          const d = existingDoc.data();
          if (d?.author && d.author !== 'Unknown') {
            author = d.author;
          }
        }
      } catch {}
    }
    if (!author) {
      author = 'Dialpad Rep';
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
  collectionType: 'leads' | 'companies' = 'leads',
  activityId?: string
): Promise<DialpadSyncResult> {
  const recentCalls = await fetchRecentDialpadCalls({ limit: 25 });
  if (!recentCalls || recentCalls.length === 0) {
    return { success: false, message: 'No recent calls found in Dialpad account' };
  }

  const cleanPhone = (phoneNumber || '').replace(/[^\d]/g, '').slice(-9);

  // 1. Find most recent matching call by phone
  let matchingCall = recentCalls.find((c: any) => {
    const toNum = (c.to_number || c.external_number || c.peer_number || c.contact?.phone || c.contact?.name || '').replace(/[^\d]/g, '');
    const fromNum = (c.from_number || c.external_number || c.caller_id || c.contact?.phone || c.contact?.name || '').replace(/[^\d]/g, '');
    if (cleanPhone && (toNum.endsWith(cleanPhone) || fromNum.endsWith(cleanPhone))) {
      return true;
    }
    return false;
  });

  // 2. Correlation fallback: If phone digits didn't match directly, but activityId was provided, match closest recent call
  if (!matchingCall && activityId) {
    try {
      const actDoc = await db.collection(collectionType).doc(leadId).collection('activity').doc(activityId).get();
      if (actDoc.exists) {
        const actData = actDoc.data();
        const actMs = parseDateToMs(actData?.date);
        if (actMs > 0) {
          let closestCall: any = null;
          let minDiff = 45 * 60 * 1000; // within 45 minutes
          for (const c of recentCalls) {
            const { timestampMs: callMs } = parseDialpadTimestamp(c.date_ended || c.date_started);
            const diff = Math.abs(callMs - actMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestCall = c;
            }
          }
          if (closestCall) {
            matchingCall = closestCall;
          }
        }
      }
    } catch (e) {
      console.warn('[Dialpad Sync] Activity time correlation fallback error:', e);
    }
  }

  // 3. Fallback: If still no match and only 1 call happened in the last 15 minutes, correlate
  if (!matchingCall && recentCalls.length > 0) {
    const latest = recentCalls[0];
    const { timestampMs: latestMs } = parseDialpadTimestamp(latest.date_ended || latest.date_started);
    if (Date.now() - latestMs < 15 * 60 * 1000) {
      matchingCall = latest;
    }
  }

  if (!matchingCall) {
    return { success: false, message: 'No matching concluded call found in Dialpad for this phone number' };
  }

  return await syncDialpadCallRecord(matchingCall, undefined, {
    leadId,
    collectionType,
    activityId,
  });
}
