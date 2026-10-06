import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { findAllLeadsByPhoneNumberServer } from './firebase-server';

const db = getFirestore(adminApp);

export interface AircallUserSummary {
  id?: number;
  name: string;
  email?: string;
}

export interface AircallNumber {
  id: number;
  name: string;
  digits: string;
  country: string;
  time_zone: string;
  open: boolean;
  is_ivr?: boolean;
  assignedUsers?: AircallUserSummary[];
}

export interface MatchedLeadInfo {
  id: string;
  type: 'leads' | 'companies';
  companyName: string;
  status: string;
  assignedRep?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  leadUrl: string;
}

export type FollowupStatus =
  | 'unreturned'
  | 'callback_connected'
  | 'callback_attempted'
  | 'lead_activity'
  | 'resolved_manually'
  | 'not_applicable';

export interface ActivityFollowupInfo {
  status: FollowupStatus;
  label: string;
  actionType: 'call' | 'note' | 'email' | 'meeting' | 'manual' | 'none';
  performedAt?: string; // ISO string
  performedAtTimestamp?: number; // Unix seconds
  author?: string;
  notes?: string;
  duration?: number;
  responseTimeMinutes?: number; // Minutes from missed call to first action
  resolutionType?: string;
}

export interface EnrichedInboundCall {
  id: number;
  callType: 'missed' | 'answered';
  startedAt: string; // ISO string
  startedAtTimestamp: number; // Unix seconds
  endedAt?: string;
  duration: number;
  callerNumber: string;
  aircallNumberId?: number;
  aircallNumberName: string;
  aircallNumberDigits: string;
  aircallUser: AircallUserSummary | null;
  missedReason: string;
  status: string;
  matchedLead: MatchedLeadInfo | null;
  hasCallback: boolean;
  callbackDetails?: {
    date: string;
    author: string;
    notes?: string;
    duration?: number;
  };
  followup: ActivityFollowupInfo;
}

export interface NumberMetric {
  numberId: number;
  name: string;
  digits: string;
  assignedUser: string;
  totalInbound: number;
  totalAnswered: number;
  totalMissed: number;
  missedRate: number; // percentage (0-100)
  inHoursMissed: number;
  outOfHoursMissed: number;
  topReason: string;
  totalFollowedUp: number;
  unaddressedMissed: number;
  followupRate: number; // percentage (0-100)
}

export interface InboundCallsReportResponse {
  summary: {
    totalInbound: number;
    totalAnswered: number;
    answeredRate: number;
    totalMissed: number;
    missedRate: number;
    inHoursMissed: number;
    outOfHoursMissed: number;
    matchedLeadsCount: number;
    unmatchedCount: number;
    unreturnedCount: number;
    resolvedCount: number;
    followupRate: number; // % of missed calls followed up / resolved
    unaddressedMissedCount: number;
    callbackCount: number;
    leadActivityCount: number;
    manualResolvedCount: number;
    avgResponseTimeMinutes: number;
  };
  numbersBreakdown: NumberMetric[];
  reasonsBreakdown: { reason: string; label: string; count: number; percentage: number }[];
  hourlyDistribution: { hour: number; label: string; inboundCount: number; missedCount: number; answeredCount: number }[];
  dayOfWeekDistribution: { day: string; inboundCount: number; missedCount: number }[];
  calls: EnrichedInboundCall[];
}

export function resolveRepFromNumber(numName: string, assignedUsers?: Array<{ name: string }>): string {
  if (assignedUsers && assignedUsers.length > 0) {
    const valid = assignedUsers.find(u => u.name && u.name !== 'Mail Plus' && u.name !== 'Admin');
    if (valid) return valid.name;
  }
  const lower = (numName || '').toLowerCase();
  if (lower.includes('alex')) return 'Alex Mabuda';
  if (lower.includes('melody')) return 'Melody Muriritirwa';
  if (lower.includes('nick')) return 'Nick Williams';
  if (lower.includes('lee')) return 'Lee Russell';
  if (lower.includes('warren')) return 'Warren Mkonto';
  if (lower.includes('sarah')) return 'Sarah Hart';
  if (lower.includes('michael')) return "Michael O'Halloran";
  if (lower.includes('ankith')) return 'Ankith Ravindran';
  if (lower.includes('luke')) return 'Luke Forbes';
  if (lower.includes('aleyna')) return 'Aleyna Harnett';
  if (lower.includes('belinda')) return 'Belinda Urbani';
  if (lower.includes('kerina')) return 'Kerina Helliwell';
  if (assignedUsers && assignedUsers.length > 0 && assignedUsers[0].name !== 'Mail Plus') return assignedUsers[0].name;
  return numName || 'Team Line';
}

function getAircallAuthHeaders(): { Authorization: string } | null {
  const apiId = (process.env.AIRCALL_API_ID || process.env.NEXT_PUBLIC_AIRCALL_API_ID || '494cbe8bcfe6e809016f74019fdff1bb').trim().replace(/^["']|["']$/g, '');
  const apiToken = (process.env.AIRCALL_API_TOKEN || process.env.NEXT_PUBLIC_AIRCALL_API_TOKEN || 'f1fa3d2057264085560ae9af350009ad').trim().replace(/^["']|["']$/g, '');

  if (!apiId || !apiToken) {
    return null;
  }
  const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
  return { Authorization: `Basic ${credentials}` };
}

/**
 * Formats Aircall missed reasons into user-friendly labels.
 */
export function formatMissedReason(reason: string | null | undefined, isOutOfHours?: boolean): string {
  if (reason === 'out_of_opening_hours' || isOutOfHours) return 'Out of Opening Hours';
  if (reason === 'no_available_agent') return 'No Agent Available';
  if (reason === 'agents_did_not_answer') return 'Agents Did Not Answer';
  if (reason === 'abandoned_in_ivr') return 'Abandoned in IVR';
  if (reason === 'short' || reason === 'short_abandoned') return 'Short Ring / Hangup';
  if (!reason) return 'Unanswered';
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Checks if a timestamp (in epoch seconds) falls outside standard Australian business hours (8:30am - 5:30pm AEST/AEDT, Mon-Fri).
 */
function isOutOfBusinessHours(epochSeconds: number): boolean {
  try {
    const d = new Date(epochSeconds * 1000);
    const sydneyStr = d.toLocaleString('en-US', { timeZone: 'Australia/Sydney', hour12: false });
    const sydneyDate = new Date(sydneyStr);
    const day = sydneyDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) return true;
    const hours = sydneyDate.getHours();
    const minutes = sydneyDate.getMinutes();
    const decimalHour = hours + minutes / 60;
    return decimalHour < 8.5 || decimalHour >= 17.5;
  } catch {
    return false;
  }
}

/**
 * Normalizes phone numbers to standard digit strings for reliable matching.
 */
export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('61') && digits.length === 11) {
    return '0' + digits.substring(2);
  }
  return digits;
}

// In-memory cache for Aircall numbers and assigned users
let cachedNumbers: AircallNumber[] | null = null;
let lastNumbersFetchTime = 0;

/**
 * Fetches all configured Aircall phone numbers with their assigned users.
 */
export async function getAircallNumbers(): Promise<AircallNumber[]> {
  const now = Date.now();
  if (cachedNumbers && now - lastNumbersFetchTime < 5 * 60 * 1000) {
    return cachedNumbers;
  }

  const headers = getAircallAuthHeaders();
  if (!headers) {
    throw new Error('Aircall API credentials are not configured.');
  }

  try {
    const response = await fetch('https://api.aircall.io/v1/numbers?per_page=50', {
      headers,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch Aircall numbers: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const rawNumbers = data.numbers || [];

    // Fetch individual numbers to retrieve assigned users
    const numbersWithUsers: AircallNumber[] = await Promise.all(
      rawNumbers.map(async (n: any) => {
        let assignedUsers: AircallUserSummary[] = [];
        try {
          const detailRes = await fetch(`https://api.aircall.io/v1/numbers/${n.id}`, { headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            assignedUsers = (detailData.number?.users || []).map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }));
          }
        } catch (err) {
          console.warn(`[Aircall Reporting] Could not fetch detail for number ${n.id}:`, err);
        }

        // Fallback user name extraction from number name (e.g. "Warren - Mobile" -> "Warren")
        if (assignedUsers.length === 0 && n.name) {
          const cleanedName = n.name.replace(/[-_()\[\]]/g, ' ').replace(/\bmobile\b|\blandline\b|\bnumber\b|\bsyd\b/gi, '').trim();
          if (cleanedName) {
            assignedUsers = [{ name: cleanedName }];
          }
        }

        return {
          id: n.id,
          name: n.name || 'Unnamed Line',
          digits: n.digits || '',
          country: n.country || 'AU',
          time_zone: n.time_zone || 'Australia/Sydney',
          open: !!n.open,
          is_ivr: !!n.is_ivr,
          assignedUsers,
        };
      })
    );

    cachedNumbers = numbersWithUsers;
    lastNumbersFetchTime = now;
    return numbersWithUsers;
  } catch (error: any) {
    console.error('[Aircall Reporting] Error fetching numbers:', error);
    throw error;
  }
}

/**
 * Fetches all calls (inbound and outbound) from Aircall API within the specified time range.
 */
export async function fetchAircallCalls(
  fromSeconds: number,
  toSeconds: number,
  numberId?: number | number[]
): Promise<{ inboundCalls: any[]; outboundCalls: any[] }> {
  const headers = getAircallAuthHeaders();
  if (!headers) {
    throw new Error('Aircall API credentials are not configured.');
  }

  const filterIds = Array.isArray(numberId)
    ? numberId
    : typeof numberId === 'number' && !isNaN(numberId)
    ? [numberId]
    : undefined;

  const inboundCalls: any[] = [];
  const outboundCalls: any[] = [];
  let page = 1;
  const perPage = 50;
  const maxPages = 100; // Scan up to 5,000 calls in the timeframe

  while (page <= maxPages) {
    const url = `https://api.aircall.io/v1/calls?from=${fromSeconds}&to=${toSeconds}&order=desc&order_by=created_at&page=${page}&per_page=${perPage}`;
    
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[Aircall Reporting] Page ${page} fetch failed with status ${res.status}`);
      break;
    }

    const data = await res.json();
    const calls = data.calls || [];
    if (calls.length === 0) break;

    for (const c of calls) {
      if (c.direction === 'inbound') {
        if (!filterIds || (c.number?.id && filterIds.includes(c.number.id))) {
          inboundCalls.push(c);
        }
      } else if (c.direction === 'outbound') {
        // Collect outbound calls to detect callbacks to numbers
        outboundCalls.push(c);
      }
    }

    if (!data.meta?.next_page_link || calls.length < perPage) {
      break;
    }
    page++;
  }

  console.log(`[Aircall Reporting] Fetched ${inboundCalls.length} inbound calls and ${outboundCalls.length} outbound calls across ${page} page(s)`);
  return { inboundCalls, outboundCalls };
}

export async function fetchAircallInboundCalls(
  fromSeconds: number,
  toSeconds: number,
  numberId?: number | number[]
): Promise<any[]> {
  const { inboundCalls } = await fetchAircallCalls(fromSeconds, toSeconds, numberId);
  return inboundCalls;
}

/**
 * Batch resolves phone numbers to Lead/Company records in Firestore.
 */
async function batchResolveLeadProfiles(phoneNumbers: string[]): Promise<Map<string, MatchedLeadInfo>> {
  const resultMap = new Map<string, MatchedLeadInfo>();
  const docCache = new Map<string, any>();
  const uniquePhones = Array.from(new Set(phoneNumbers.filter(Boolean)));

  console.log(`[Aircall Reporting] Resolving ${uniquePhones.length} unique caller phone numbers...`);

  const batchSize = 25;
  for (let i = 0; i < uniquePhones.length; i += batchSize) {
    const chunk = uniquePhones.slice(i, i + batchSize);
    await Promise.allSettled(
      chunk.map(async (phone) => {
        try {
          const matches = await findAllLeadsByPhoneNumberServer(phone);
          if (matches.length > 0) {
            const firstMatch = matches[0];
            const cacheKey = `${firstMatch.type}/${firstMatch.id}`;
            let data = docCache.get(cacheKey);

            if (!data) {
              const docSnap = await db.collection(firstMatch.type).doc(firstMatch.id).get();
              if (docSnap.exists) {
                data = docSnap.data() || {};
                docCache.set(cacheKey, data);
              }
            }

            if (data) {
              const companyName = data.companyName || (firstMatch.type === 'leads' ? 'Unnamed Lead' : 'Unnamed Company');
              const status = data.customerStatus || data.status || 'Active';
              const assignedRep = data.accountManagerAssigned || data.dialerAssigned || data.assignedTo || data.salesRep || undefined;
              const contactName = data.contactName || data.primaryContact?.name || undefined;
              const contactEmail = data.contactEmail || data.primaryContact?.email || undefined;
              const leadUrl = firstMatch.type === 'leads' ? `/leads/${firstMatch.id}` : `/companies/${firstMatch.id}`;

              resultMap.set(phone, {
                id: firstMatch.id,
                type: firstMatch.type,
                companyName,
                status,
                assignedRep,
                contactName,
                contactEmail,
                phone: data.customerPhone || phone,
                leadUrl,
              });
            }
          }
        } catch (err) {
          console.warn(`[Aircall Reporting] Error resolving phone ${phone}:`, err);
        }
      })
    );
  }

  console.log(`[Aircall Reporting] Matched ${resultMap.size} leads from ${uniquePhones.length} phone numbers.`);
  return resultMap;
}

/**
 * Batch fetches manual resolutions for a list of call IDs.
 */
async function batchFetchManualResolutions(callIds: (number | string)[]): Promise<Map<string, any>> {
  const resolutionMap = new Map<string, any>();
  if (callIds.length === 0) return resolutionMap;

  try {
    const uniqueIds = Array.from(new Set(callIds.map(String)));
    const batchSize = 30;

    for (let i = 0; i < uniqueIds.length; i += batchSize) {
      const chunk = uniqueIds.slice(i, i + batchSize);
      await Promise.allSettled(
        chunk.map(async (id) => {
          try {
            const snap = await db.collection('missed_call_resolutions').doc(id).get();
            if (snap.exists) {
              resolutionMap.set(id, snap.data());
            }
          } catch (e) {
            // ignore individual doc fetch failure
          }
        })
      );
    }
  } catch (err) {
    console.warn('[Aircall Reporting] Failed to fetch manual resolutions:', err);
  }

  return resolutionMap;
}

/**
 * Batch fetches recent activities from matched leads to detect CRM activity post-call.
 */
async function batchFetchLeadActivities(matchedLeads: MatchedLeadInfo[]): Promise<Map<string, any[]>> {
  const activitiesMap = new Map<string, any[]>();
  if (matchedLeads.length === 0) return activitiesMap;

  const uniqueLeads = new Map<string, { id: string; type: 'leads' | 'companies' }>();
  matchedLeads.forEach((m) => {
    const key = `${m.type}/${m.id}`;
    if (!uniqueLeads.has(key)) {
      uniqueLeads.set(key, { id: m.id, type: m.type });
    }
  });

  const entries = Array.from(uniqueLeads.values());
  const batchSize = 20;

  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    await Promise.allSettled(
      chunk.map(async ({ id, type }) => {
        try {
          const actSnap = await db
            .collection(type)
            .doc(id)
            .collection('activity')
            .orderBy('date', 'desc')
            .limit(15)
            .get();

          if (!actSnap.empty) {
            const list = actSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            activitiesMap.set(`${type}/${id}`, list);
          }
        } catch (err) {
          // ignore index / fetch errors
        }
      })
    );
  }

  return activitiesMap;
}

/**
 * Generates the complete Inbound & Missed Calls Report across all Aircall numbers with User and Lead Matching,
 * Outbound Callback Detection, and CRM Lead Activity Cross-referencing.
 */
export async function generateInboundCallsReport(
  fromSeconds: number,
  toSeconds: number,
  numberIdFilter?: number | number[]
): Promise<InboundCallsReportResponse> {
  const filterIds = Array.isArray(numberIdFilter)
    ? numberIdFilter
    : typeof numberIdFilter === 'number' && !isNaN(numberIdFilter)
    ? [numberIdFilter]
    : undefined;

  // 1. Fetch configured Aircall numbers and assigned users
  const aircallNumbers = await getAircallNumbers();
  const numberMap = new Map<number, AircallNumber>();
  aircallNumbers.forEach((n) => numberMap.set(n.id, n));

  // 2. Fetch all inbound & outbound calls from Aircall in the timeframe
  const { inboundCalls: rawCalls, outboundCalls } = await fetchAircallCalls(fromSeconds, toSeconds, filterIds);

  // Group outbound calls by normalized recipient phone number
  const outboundMap = new Map<string, any[]>();
  outboundCalls.forEach((outCall) => {
    const destPhone = outCall.raw_digits || outCall.contact?.phone_number;
    if (destPhone) {
      const norm = normalizePhoneDigits(destPhone);
      if (norm) {
        if (!outboundMap.has(norm)) outboundMap.set(norm, []);
        outboundMap.get(norm)!.push(outCall);
      }
    }
  });

  // 3. Stats trackers
  const numbersStatMap = new Map<
    number,
    {
      totalInbound: number;
      totalAnswered: number;
      totalMissed: number;
      inHoursMissed: number;
      outOfHoursMissed: number;
      reasons: Record<string, number>;
      totalFollowedUp: number;
      unaddressedMissed: number;
    }
  >();

  aircallNumbers.forEach((n) => {
    numbersStatMap.set(n.id, {
      totalInbound: 0,
      totalAnswered: 0,
      totalMissed: 0,
      inHoursMissed: 0,
      outOfHoursMissed: 0,
      reasons: {},
      totalFollowedUp: 0,
      unaddressedMissed: 0,
    });
  });

  const reasonsCount: Record<string, number> = {};
  const hourlyStats: { inbound: number; missed: number; answered: number }[] = Array.from({ length: 24 }, () => ({
    inbound: 0,
    missed: 0,
    answered: 0,
  }));

  const dayOfWeekStats: Record<string, { inbound: number; missed: number }> = {
    Mon: { inbound: 0, missed: 0 },
    Tue: { inbound: 0, missed: 0 },
    Wed: { inbound: 0, missed: 0 },
    Thu: { inbound: 0, missed: 0 },
    Fri: { inbound: 0, missed: 0 },
    Sat: { inbound: 0, missed: 0 },
    Sun: { inbound: 0, missed: 0 },
  };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let totalAnsweredCount = 0;
  let totalMissedCount = 0;

  for (const call of rawCalls) {
    const numId = call.number?.id;
    if (numId && !numbersStatMap.has(numId)) {
      numbersStatMap.set(numId, {
        totalInbound: 0,
        totalAnswered: 0,
        totalMissed: 0,
        inHoursMissed: 0,
        outOfHoursMissed: 0,
        reasons: {},
        totalFollowedUp: 0,
        unaddressedMissed: 0,
      });
    }

    const numStat = numId ? numbersStatMap.get(numId) : null;
    if (numStat) numStat.totalInbound++;

    const isMissed = call.status === 'missed' || !call.answered_at || !!call.missed_call_reason;
    const isOOH = call.missed_call_reason === 'out_of_opening_hours' || isOutOfBusinessHours(call.started_at);

    if (isMissed) {
      totalMissedCount++;
      if (numStat) {
        numStat.totalMissed++;
        if (isOOH) numStat.outOfHoursMissed++;
        else numStat.inHoursMissed++;

        const rKey = call.missed_call_reason || (isOOH ? 'out_of_opening_hours' : 'unanswered');
        numStat.reasons[rKey] = (numStat.reasons[rKey] || 0) + 1;
      }

      const globalReason = formatMissedReason(call.missed_call_reason, isOOH);
      reasonsCount[globalReason] = (reasonsCount[globalReason] || 0) + 1;
    } else {
      totalAnsweredCount++;
      if (numStat) numStat.totalAnswered++;
    }

    // Hourly and Day stats
    try {
      const d = new Date(call.started_at * 1000);
      const sydneyDate = new Date(d.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
      const h = sydneyDate.getHours();
      if (h >= 0 && h < 24) {
        hourlyStats[h].inbound++;
        if (isMissed) hourlyStats[h].missed++;
        else hourlyStats[h].answered++;
      }
      const dayIdx = sydneyDate.getDay();
      const dName = dayNames[dayIdx];
      if (dName && dayOfWeekStats[dName]) {
        dayOfWeekStats[dName].inbound++;
        if (isMissed) dayOfWeekStats[dName].missed++;
      }
    } catch {
      // ignore
    }
  }

  // 4. Batch resolve caller phone numbers to Prospect+ Leads
  const callerPhones = rawCalls.map((c) => c.raw_digits || c.contact?.phone_number).filter(Boolean);
  const leadMatchMap = await batchResolveLeadProfiles(callerPhones);

  // 5. Batch fetch manual resolutions and lead activities
  const allCallIds = rawCalls.map((c) => c.id);
  const resolutionsMap = await batchFetchManualResolutions(allCallIds);

  const matchedLeadValues = Array.from(leadMatchMap.values());
  const leadActivitiesMap = await batchFetchLeadActivities(matchedLeadValues);

  // 6. Enrich all inbound calls with Follow-up Status and Lead Activity Cross-referencing
  let totalCallbackCount = 0;
  let totalLeadActivityCount = 0;
  let totalManualResolvedCount = 0;
  let totalResponseTimeMinutes = 0;
  let responseTimeCount = 0;

  const enrichedCalls: EnrichedInboundCall[] = rawCalls.map((call) => {
    const callerNumber = call.raw_digits || call.contact?.phone_number || 'Unknown';
    const normCallerPhone = normalizePhoneDigits(callerNumber);
    const matchedLead = leadMatchMap.get(callerNumber) || null;
    const isMissed = call.status === 'missed' || !call.answered_at || !!call.missed_call_reason;
    const isOOH = call.missed_call_reason === 'out_of_opening_hours' || isOutOfBusinessHours(call.started_at);
    const missedReason = isMissed ? formatMissedReason(call.missed_call_reason, isOOH) : 'Answered';

    const numObj = call.number?.id ? numberMap.get(call.number.id) : null;
    const assignedUserFromNumber = numObj?.assignedUsers?.[0] || null;

    // Resolve Aircall user who took the call or owns the line
    let aircallUser: AircallUserSummary | null = null;
    if (call.user?.name) {
      aircallUser = { id: call.user.id, name: call.user.name, email: call.user.email };
    } else if (assignedUserFromNumber && assignedUserFromNumber.name !== 'Mail Plus') {
      aircallUser = assignedUserFromNumber;
    } else {
      const repName = resolveRepFromNumber(call.number?.name || numObj?.name || '', numObj?.assignedUsers);
      if (repName && repName !== 'Team Line') {
        aircallUser = { name: repName };
      }
    }

    // Determine Follow-up Activity for missed calls
    let followup: ActivityFollowupInfo = {
      status: isMissed ? 'unreturned' : 'not_applicable',
      label: isMissed ? 'Action Needed' : 'Call Answered',
      actionType: 'none',
    };

    let hasCallback = false;
    let callbackDetails: { date: string; author: string; notes?: string; duration?: number } | undefined = undefined;

    if (isMissed) {
      const callTimeSeconds = call.started_at;
      const callTimeMs = callTimeSeconds * 1000;

      // 1. Check for manual resolution first
      const manualRes = resolutionsMap.get(String(call.id));
      if (manualRes) {
        const resLabels: Record<string, string> = {
          callback_manual: 'Outbound Callback Made',
          left_voicemail: 'Left Voicemail',
          emailed: 'Contacted via Email',
          spam_wrong_number: 'Marked Spam / Wrong Number',
          handled_external: 'Handled Externally',
          other: 'Resolved',
        };
        const label = resLabels[manualRes.resolutionType] || 'Resolved Manually';
        const resTimeMs = manualRes.resolvedAt ? new Date(manualRes.resolvedAt).getTime() : 0;
        const diffMinutes = resTimeMs > callTimeMs ? Math.round((resTimeMs - callTimeMs) / 60000) : undefined;

        followup = {
          status: 'resolved_manually',
          label,
          actionType: 'manual',
          performedAt: manualRes.resolvedAt,
          performedAtTimestamp: resTimeMs ? Math.floor(resTimeMs / 1000) : undefined,
          author: manualRes.authorName || 'Staff Member',
          notes: manualRes.notes || undefined,
          responseTimeMinutes: diffMinutes,
          resolutionType: manualRes.resolutionType,
        };

        hasCallback = true;
        callbackDetails = {
          date: manualRes.resolvedAt || new Date().toISOString(),
          author: manualRes.authorName || 'Staff Member',
          notes: manualRes.notes || label,
        };

        totalManualResolvedCount++;
        if (diffMinutes !== undefined && diffMinutes >= 0) {
          totalResponseTimeMinutes += diffMinutes;
          responseTimeCount++;
        }
      } else {
        // 2. Check for Aircall Outbound Calls to this caller that occurred strictly AFTER the missed call
        const matchingOutbounds = (normCallerPhone ? outboundMap.get(normCallerPhone) : null) || [];
        const subsequentOutbound = matchingOutbounds
          .filter((out) => out.started_at > callTimeSeconds && String(out.id) !== String(call.id))
          .sort((a, b) => a.started_at - b.started_at)[0];

        if (subsequentOutbound) {
          const outSeconds = subsequentOutbound.started_at;
          const diffSeconds = outSeconds - callTimeSeconds;
          const diffMinutes = Math.max(0, Math.round(diffSeconds / 60));
          const isConnected = (subsequentOutbound.duration || 0) > 0 || !!subsequentOutbound.answered_at;
          const outAuthor = subsequentOutbound.user?.name || 'Aircall User';
          const outDate = new Date(outSeconds * 1000).toISOString();

          followup = {
            status: isConnected ? 'callback_connected' : 'callback_attempted',
            label: isConnected
              ? `Callback Connected (${Math.floor((subsequentOutbound.duration || 0) / 60)}m ${(subsequentOutbound.duration || 0) % 60}s)`
              : 'Callback Attempted (No Answer)',
            actionType: 'call',
            performedAt: outDate,
            performedAtTimestamp: outSeconds,
            author: outAuthor,
            notes: subsequentOutbound.note || (isConnected ? 'Outbound call connected' : 'Outbound callback attempted'),
            duration: subsequentOutbound.duration || 0,
            responseTimeMinutes: diffMinutes,
          };

          hasCallback = true;
          callbackDetails = {
            date: outDate,
            author: outAuthor,
            notes: subsequentOutbound.note,
            duration: subsequentOutbound.duration,
          };

          totalCallbackCount++;
          totalResponseTimeMinutes += diffMinutes;
          responseTimeCount++;
        } else if (matchedLead) {
          // 3. Check for Lead Activities recorded in CRM strictly AFTER the missed call
          const leadActs = leadActivitiesMap.get(`${matchedLead.type}/${matchedLead.id}`) || [];
          const subsequentActivity = leadActs
            .filter((act) => {
              if (!act.date) return false;
              const actMs = new Date(act.date).getTime();
              // Must be strictly after the missed call timestamp
              if (actMs <= callTimeMs) return false;
              // Ignore if this activity was the auto-logged missed call event itself
              if (act.callId && String(act.callId) === String(call.id)) return false;
              if (act.aircallStatus === 'missed') return false;
              return true;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

          if (subsequentActivity) {
            const actMs = new Date(subsequentActivity.date).getTime();
            const diffMinutes = Math.max(0, Math.round((actMs - callTimeMs) / 60000));
            const actAuthor = subsequentActivity.author || subsequentActivity.userName || 'Rep';
            const isCallAct = subsequentActivity.type === 'Call';

            followup = {
              status: isCallAct ? 'callback_connected' : 'lead_activity',
              label: isCallAct
                ? `CRM Call Logged (${subsequentActivity.duration || 'Done'})`
                : `${subsequentActivity.type || 'Activity'}: ${subsequentActivity.notes ? subsequentActivity.notes.slice(0, 35) + '...' : 'Lead Updated'}`,
              actionType: isCallAct
                ? 'call'
                : subsequentActivity.type === 'Email'
                ? 'email'
                : subsequentActivity.type === 'Meeting'
                ? 'meeting'
                : 'note',
              performedAt: subsequentActivity.date,
              performedAtTimestamp: Math.floor(actMs / 1000),
              author: actAuthor,
              notes: subsequentActivity.notes,
              responseTimeMinutes: diffMinutes,
            };

            hasCallback = true;
            callbackDetails = {
              date: subsequentActivity.date,
              author: actAuthor,
              notes: subsequentActivity.notes,
            };

            if (isCallAct) totalCallbackCount++;
            else totalLeadActivityCount++;

            totalResponseTimeMinutes += diffMinutes;
            responseTimeCount++;
          }
        }
      }
    }

    // Update numbers stat followed up count
    const numStat = call.number?.id ? numbersStatMap.get(call.number.id) : null;
    if (numStat && isMissed) {
      if (followup.status !== 'unreturned') {
        numStat.totalFollowedUp++;
      } else {
        numStat.unaddressedMissed++;
      }
    }

    return {
      id: call.id,
      callType: isMissed ? 'missed' : 'answered',
      startedAt: new Date(call.started_at * 1000).toISOString(),
      startedAtTimestamp: call.started_at,
      endedAt: call.ended_at ? new Date(call.ended_at * 1000).toISOString() : undefined,
      duration: call.duration || 0,
      callerNumber,
      aircallNumberId: call.number?.id,
      aircallNumberName: call.number?.name || numObj?.name || 'Aircall Line',
      aircallNumberDigits: call.number?.digits || numObj?.digits || '',
      aircallUser,
      missedReason,
      status: isMissed ? 'missed' : 'answered',
      matchedLead,
      hasCallback,
      callbackDetails,
      followup,
    };
  });

  // 7. Summary metrics
  const totalInbound = rawCalls.length;
  const missedRate = totalInbound > 0 ? Number(((totalMissedCount / totalInbound) * 100).toFixed(1)) : 0;
  const answeredRate = totalInbound > 0 ? Number(((totalAnsweredCount / totalInbound) * 100).toFixed(1)) : 0;
  
  let inHoursMissed = 0;
  let outOfHoursMissed = 0;
  let matchedLeadsCount = 0;
  let totalResolvedMissed = 0;

  enrichedCalls.forEach((c) => {
    if (c.callType === 'missed') {
      if (c.missedReason === 'Out of Opening Hours') outOfHoursMissed++;
      else inHoursMissed++;

      if (c.followup.status !== 'unreturned') {
        totalResolvedMissed++;
      }
    }
    if (c.matchedLead) matchedLeadsCount++;
  });

  const unmatchedCount = totalInbound - matchedLeadsCount;
  const unaddressedMissedCount = totalMissedCount - totalResolvedMissed;
  const followupRate = totalMissedCount > 0 ? Number(((totalResolvedMissed / totalMissedCount) * 100).toFixed(1)) : 100;
  const avgResponseTimeMinutes = responseTimeCount > 0 ? Math.round(totalResponseTimeMinutes / responseTimeCount) : 0;

  // 8. Numbers breakdown
  const numbersBreakdown: NumberMetric[] = [];
  numbersStatMap.forEach((stat, numId) => {
    if (filterIds && !filterIds.includes(numId)) return;
    const numObj = numberMap.get(numId);
    let topReason = 'N/A';
    let maxRCount = 0;
    Object.entries(stat.reasons).forEach(([r, count]) => {
      if (count > maxRCount) {
        maxRCount = count;
        topReason = formatMissedReason(r);
      }
    });

    const rate = stat.totalInbound > 0 ? Number(((stat.totalMissed / stat.totalInbound) * 100).toFixed(1)) : 0;
    const assignedUser = numObj?.assignedUsers?.map((u) => u.name).join(', ') || 'Team Line';
    const lineFollowupRate = stat.totalMissed > 0 ? Number(((stat.totalFollowedUp / stat.totalMissed) * 100).toFixed(1)) : 100;

    if (numObj || stat.totalInbound > 0) {
      numbersBreakdown.push({
        numberId: numId,
        name: numObj?.name || `Line #${numId}`,
        digits: numObj?.digits || '',
        assignedUser,
        totalInbound: stat.totalInbound,
        totalAnswered: stat.totalAnswered,
        totalMissed: stat.totalMissed,
        missedRate: rate,
        inHoursMissed: stat.inHoursMissed,
        outOfHoursMissed: stat.outOfHoursMissed,
        topReason,
        totalFollowedUp: stat.totalFollowedUp,
        unaddressedMissed: stat.unaddressedMissed,
        followupRate: lineFollowupRate,
      });
    }
  });

  numbersBreakdown.sort((a, b) => b.totalInbound - a.totalInbound);

  // 9. Reasons breakdown
  const reasonsBreakdown = Object.entries(reasonsCount).map(([reason, count]) => ({
    reason,
    label: reason,
    count,
    percentage: totalMissedCount > 0 ? Number(((count / totalMissedCount) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.count - a.count);

  // 10. Hourly distribution
  const hourlyDistribution = hourlyStats.map((stat, hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      hour,
      label: `${displayHour} ${ampm}`,
      inboundCount: stat.inbound,
      missedCount: stat.missed,
      answeredCount: stat.answered,
    };
  });

  // 11. Day of week distribution
  const dayOfWeekDistribution = Object.entries(dayOfWeekStats).map(([day, stat]) => ({
    day,
    inboundCount: stat.inbound,
    missedCount: stat.missed,
  }));

  return {
    summary: {
      totalInbound,
      totalAnswered: totalAnsweredCount,
      answeredRate,
      totalMissed: totalMissedCount,
      missedRate,
      inHoursMissed,
      outOfHoursMissed,
      matchedLeadsCount,
      unmatchedCount,
      unreturnedCount: unaddressedMissedCount,
      resolvedCount: totalResolvedMissed,
      followupRate,
      unaddressedMissedCount,
      callbackCount: totalCallbackCount,
      leadActivityCount: totalLeadActivityCount,
      manualResolvedCount: totalManualResolvedCount,
      avgResponseTimeMinutes,
    },
    numbersBreakdown,
    reasonsBreakdown,
    hourlyDistribution,
    dayOfWeekDistribution,
    calls: enrichedCalls,
  };
}

export const generateMissedCallsReport = generateInboundCallsReport;
