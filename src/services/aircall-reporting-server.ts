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
  };
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
  };
  numbersBreakdown: NumberMetric[];
  reasonsBreakdown: { reason: string; label: string; count: number; percentage: number }[];
  hourlyDistribution: { hour: number; label: string; inboundCount: number; missedCount: number; answeredCount: number }[];
  dayOfWeekDistribution: { day: string; inboundCount: number; missedCount: number }[];
  calls: EnrichedInboundCall[];
}

function getAircallAuthHeaders(): { Authorization: string } | null {
  const apiId = process.env.AIRCALL_API_ID || process.env.NEXT_PUBLIC_AIRCALL_API_ID;
  const apiToken = process.env.AIRCALL_API_TOKEN || process.env.NEXT_PUBLIC_AIRCALL_API_TOKEN;

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
  if (reason === 'short') return 'Short Ring / Hangup';
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
 * Fetches inbound calls from Aircall API within the specified time range.
 */
export async function fetchAircallInboundCalls(
  fromSeconds: number,
  toSeconds: number,
  numberId?: number | number[]
): Promise<any[]> {
  const headers = getAircallAuthHeaders();
  if (!headers) {
    throw new Error('Aircall API credentials are not configured.');
  }

  const filterIds = Array.isArray(numberId)
    ? numberId
    : typeof numberId === 'number' && !isNaN(numberId)
    ? [numberId]
    : undefined;

  const allCalls: any[] = [];
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
      // Critical: Aircall API returns both inbound and outbound calls in /v1/calls.
      // We must explicitly filter for direction === 'inbound'.
      if (c.direction !== 'inbound') continue;

      if (!filterIds || (c.number?.id && filterIds.includes(c.number.id))) {
        allCalls.push(c);
      }
    }

    if (!data.meta?.next_page_link || calls.length < perPage) {
      break;
    }
    page++;
  }

  console.log(`[Aircall Reporting] Fetched ${allCalls.length} true inbound calls across ${page} page(s)`);
  return allCalls;
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
 * Generates the complete Inbound & Missed Calls Report across all Aircall numbers with User and Lead Matching.
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

  // 2. Fetch all inbound calls from Aircall
  const rawCalls = await fetchAircallInboundCalls(fromSeconds, toSeconds, filterIds);

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

  // 5. Enrich all inbound calls with Aircall User and Lead Details
  const enrichedCalls: EnrichedInboundCall[] = rawCalls.map((call) => {
    const callerNumber = call.raw_digits || call.contact?.phone_number || 'Unknown';
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
    } else if (assignedUserFromNumber) {
      aircallUser = assignedUserFromNumber;
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
      hasCallback: false,
    };
  });

  // 6. Summary metrics
  const totalInbound = rawCalls.length;
  const missedRate = totalInbound > 0 ? Number(((totalMissedCount / totalInbound) * 100).toFixed(1)) : 0;
  const answeredRate = totalInbound > 0 ? Number(((totalAnsweredCount / totalInbound) * 100).toFixed(1)) : 0;
  
  let inHoursMissed = 0;
  let outOfHoursMissed = 0;
  let matchedLeadsCount = 0;

  enrichedCalls.forEach((c) => {
    if (c.callType === 'missed') {
      if (c.missedReason === 'Out of Opening Hours') outOfHoursMissed++;
      else inHoursMissed++;
    }
    if (c.matchedLead) matchedLeadsCount++;
  });

  const unmatchedCount = totalInbound - matchedLeadsCount;

  // 7. Numbers breakdown
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
      });
    }
  });

  numbersBreakdown.sort((a, b) => b.totalInbound - a.totalInbound);

  // 8. Reasons breakdown
  const reasonsBreakdown = Object.entries(reasonsCount).map(([reason, count]) => ({
    reason,
    label: reason,
    count,
    percentage: totalMissedCount > 0 ? Number(((count / totalMissedCount) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.count - a.count);

  // 9. Hourly distribution
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

  // 10. Day of week distribution
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
      unreturnedCount: totalMissedCount,
      resolvedCount: 0,
    },
    numbersBreakdown,
    reasonsBreakdown,
    hourlyDistribution,
    dayOfWeekDistribution,
    calls: enrichedCalls,
  };
}

export const generateMissedCallsReport = generateInboundCallsReport;
