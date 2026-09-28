import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { logTranscriptActivityServer } from '@/services/firebase-server';
import type { DailyAuditCallRecord, Utterance } from './types';

const db = getFirestore(adminApp);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const minutesMatch = durationStr.match(/(\d+)m/);
  const secondsMatch = durationStr.match(/(\d+)s/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
  return minutes * 60 + seconds;
}

/**
 * Fetches transcript directly from Aircall API with fallback to call details.
 */
async function fetchTranscriptFromAircall(callId: string): Promise<Utterance[] | null> {
  const apiId = process.env.AIRCALL_API_ID || process.env.NEXT_PUBLIC_AIRCALL_API_ID;
  const apiToken = process.env.AIRCALL_API_TOKEN || process.env.NEXT_PUBLIC_AIRCALL_API_TOKEN;

  if (!apiId || !apiToken) {
    console.warn('[Daily Audit] Aircall API credentials missing.');
    return null;
  }

  const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
  const headers = { Authorization: `Basic ${credentials}` };
  const url = `https://api.aircall.io/v1/calls/${callId}/transcription`;
  const callUrl = `https://api.aircall.io/v1/calls/${callId}`;

  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const data = await response.json() as any;
      const utterances: Utterance[] = 
        data?.transcription?.content?.utterances || 
        data?.content?.utterances || 
        data?.utterances || 
        [];
      if (utterances.length > 0) return utterances;
    }

    // Fallback to /v1/calls/{id}
    const fallbackResp = await fetch(callUrl, { headers });
    if (fallbackResp.ok) {
      const fallbackData = await fallbackResp.json() as any;
      const fallbackUtterances: Utterance[] = 
        fallbackData?.call?.transcription?.content?.utterances || 
        fallbackData?.call?.transcription?.utterances || 
        fallbackData?.call?.utterances || 
        [];
      if (fallbackUtterances.length > 0) return fallbackUtterances;
    }
  } catch (err) {
    console.error(`[Daily Audit] Error fetching transcript from Aircall for call ${callId}:`, err);
  }

  return null;
}

/**
 * Pre-fetches all transcripts and aggregates all calls for a specific date range.
 */
export async function fetchAndAggregateDayCalls(targetStart: Date, targetEnd: Date): Promise<DailyAuditCallRecord[]> {
  console.log(`[Daily Audit] Aggregating calls between ${targetStart.toISOString()} and ${targetEnd.toISOString()}...`);

  // 1. Fetch Call activities across all leads and companies
  const activitySnap = await db.collectionGroup('activity').where('type', '==', 'Call').get();
  
  const matchedActivities: any[] = [];
  activitySnap.docs.forEach(doc => {
    const data = doc.data();
    if (!data.date) return;
    const callDate = new Date(data.date);
    if (callDate >= targetStart && callDate <= targetEnd) {
      const parentLead = doc.ref.parent.parent;
      matchedActivities.push({
        id: doc.id,
        ...data,
        leadId: parentLead ? parentLead.id : undefined,
        leadType: parentLead ? (parentLead.parent?.id as 'leads' | 'companies') : undefined,
      });
    }
  });

  // 2. Fetch Unassigned Calls within date range
  const unassignedSnap = await db.collection('unassigned_calls').get();
  const matchedUnassigned: any[] = [];
  unassignedSnap.docs.forEach(doc => {
    const data = doc.data();
    if (!data.date) return;
    const callDate = new Date(data.date);
    if (callDate >= targetStart && callDate <= targetEnd) {
      matchedUnassigned.push({
        id: doc.id,
        ...data,
        leadType: 'unassigned' as const,
      });
    }
  });

  // Combine and deduplicate by callId
  const rawCallsMap = new Map<string, any>();
  for (const c of [...matchedActivities, ...matchedUnassigned]) {
    const key = c.callId || c.id;
    if (!rawCallsMap.has(key)) {
      rawCallsMap.set(key, c);
    }
  }

  const rawCalls = Array.from(rawCallsMap.values());
  console.log(`[Daily Audit] Found ${rawCalls.length} total raw calls for the target day.`);

  // 3. Pre-load lead names and Prospect+ IDs for lead activities
  const leadIds = [...new Set(rawCalls.map(c => c.leadId).filter(Boolean))];
  const leadNamesMap = new Map<string, string>();
  const leadProspectPlusIdMap = new Map<string, string>();

  for (let i = 0; i < leadIds.length; i += 30) {
    const chunk = leadIds.slice(i, i + 30);
    const leadsSnap = await db.collection('leads').where('__name__', 'in', chunk).get();
    leadsSnap.forEach(d => {
      const data = d.data();
      leadNamesMap.set(d.id, data.companyName || data.name || 'Lead');
      if (data.prospectPlusId) {
        leadProspectPlusIdMap.set(d.id, String(data.prospectPlusId));
      } else {
        leadProspectPlusIdMap.set(d.id, d.id);
      }
    });

    const companiesSnap = await db.collection('companies').where('__name__', 'in', chunk).get();
    companiesSnap.forEach(d => {
      const data = d.data();
      if (!leadNamesMap.has(d.id)) {
        leadNamesMap.set(d.id, data.companyName || data.name || 'Company');
      }
      if (!leadProspectPlusIdMap.has(d.id)) {
        leadProspectPlusIdMap.set(d.id, String(data.prospectPlusId || d.id));
      }
    });
  }

  // 4. Pre-load existing transcripts stored in Firestore
  const callIds = rawCalls.map(c => c.callId || c.id).filter(Boolean);
  const existingTranscriptsMap = new Map<string, Utterance[]>();

  // Search existing transcripts subcollections
  const transcriptsSnap = await db.collectionGroup('transcripts').get();
  transcriptsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.callId && data.content) {
      try {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        if (Array.isArray(parsed) && parsed.length > 0) {
          existingTranscriptsMap.set(String(data.callId), parsed);
        }
      } catch {
        // Not valid JSON array
      }
    }
  });

  // Also check if unassigned calls have utterances
  for (const c of matchedUnassigned) {
    if (c.callId && c.utterances && Array.isArray(c.utterances) && c.utterances.length > 0) {
      existingTranscriptsMap.set(String(c.callId), c.utterances);
    }
  }

  // 5. Pre-fetch missing transcripts from Aircall API for calls with duration >= 15s
  const processedRecords: DailyAuditCallRecord[] = [];

  for (const call of rawCalls) {
    const callId = String(call.callId || call.id);
    const durationSeconds = typeof call.duration === 'number' ? call.duration : parseDuration(call.duration);
    const durationFormatted = call.duration && typeof call.duration === 'string' ? call.duration : `${durationSeconds}s`;
    let utterances: Utterance[] = existingTranscriptsMap.get(callId) || [];

    // If transcript is missing and call is connected (>= 15s duration), fetch from Aircall
    if (utterances.length === 0 && durationSeconds >= 15) {
      console.log(`[Daily Audit] Pre-fetching missing transcript for call ${callId} (duration: ${durationFormatted})...`);
      const fetched = await fetchTranscriptFromAircall(callId);
      if (fetched && fetched.length > 0) {
        utterances = fetched;
        existingTranscriptsMap.set(callId, fetched);

        // Cache back to Firestore
        if (call.leadId && call.leadType && call.leadType !== 'unassigned') {
          await logTranscriptActivityServer(call.leadId, call.leadType, {
            content: JSON.stringify(fetched),
            author: call.author || 'Aircall AI',
            callId: callId,
            phoneNumber: call.phoneNumber || call.contact?.phone_number || ''
          }).catch(e => console.error(`[Daily Audit] Failed caching transcript for lead ${call.leadId}:`, e));
        } else {
          await db.collection('unassigned_calls').doc(callId).set({
            utterances: fetched
          }, { merge: true }).catch(e => console.error(`[Daily Audit] Failed caching transcript for unassigned call ${callId}:`, e));
        }

        // Small delay to respect rate limits
        await sleep(150);
      }
    }

    const transcriptRawText = utterances.map(u => `${u.speaker}: ${u.text}`).join('\n');
    const leadName = call.leadName || (call.leadId ? leadNamesMap.get(call.leadId) : undefined) || call.name || 'Unknown Contact';
    const prospectPlusId = call.leadId ? leadProspectPlusIdMap.get(call.leadId) : (call.prospectPlusId || call.id);

    processedRecords.push({
      callId,
      date: call.date,
      author: call.author || 'Unknown Rep',
      phoneNumber: call.phoneNumber || call.raw_digits || call.contact?.phone_number,
      durationSeconds,
      durationFormatted,
      notes: call.notes || call.note,
      direction: call.direction || 'outbound',
      aircallStatus: call.aircallStatus || call.status,
      recordingUrl: call.recordingUrl || call.recording,
      leadId: call.leadId,
      leadType: call.leadType || 'leads',
      leadName,
      prospectPlusId,
      utterances,
      transcriptRawText,
    });
  }

  return processedRecords;
}
