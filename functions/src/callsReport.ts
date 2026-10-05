import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';
import fetch from 'node-fetch';

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const minutesMatch = durationStr.match(/(\d+)m/);
  const secondsMatch = durationStr.match(/(\d+)s/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
  return minutes * 60 + seconds;
}

function formatDurationSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

function formatMissedReason(reason: string | null | undefined, isOutOfHours?: boolean): string {
  if (reason === 'out_of_opening_hours' || isOutOfHours) return 'Out of Opening Hours';
  if (reason === 'no_available_agent') return 'No Agent Available';
  if (reason === 'agents_did_not_answer') return 'Agents Did Not Answer';
  if (reason === 'abandoned_in_ivr') return 'Abandoned in IVR';
  if (reason === 'short' || reason === 'short_abandoned') return 'Short Ring / Hangup';
  if (!reason) return 'Unanswered';
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function getSydneyDayRange(dateString: string): { startEpoch: number; endEpoch: number; targetStart: Date; targetEnd: Date } {
  const [dayStr, monthStr, yearStr] = dateString.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isoDay = `${y}-${pad(m)}-${pad(d)}`;
  
  const testDate = new Date(`${isoDay}T12:00:00Z`);
  const sydneyHour = parseInt(
    new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', hour12: false }).format(testDate),
    10
  );
  const offsetHours = (sydneyHour - 12 + 24) % 24;
  const offsetStr = `+${pad(offsetHours)}:00`;

  const targetStart = new Date(`${isoDay}T00:00:00.000${offsetStr}`);
  const targetEnd = new Date(`${isoDay}T23:59:59.999${offsetStr}`);

  return {
    startEpoch: Math.floor(targetStart.getTime() / 1000),
    endEpoch: Math.floor(targetEnd.getTime() / 1000),
    targetStart,
    targetEnd,
  };
}

async function fetchAircallInboundData(fromSeconds: number, toSeconds: number) {
  const headers = getAircallAuthHeaders();
  if (!headers) {
    functions.logger.warn('Aircall API credentials not configured.');
    return null;
  }

  try {
    // 1. Fetch Numbers
    const numbersRes = await fetch('https://api.aircall.io/v1/numbers?per_page=50', { headers });
    let numbersList: any[] = [];
    if (numbersRes.ok) {
      const numbersData: any = await numbersRes.json();
      numbersList = numbersData.numbers || [];
    }

    const numberUsersMap = new Map<number, any[]>();
    for (const n of numbersList) {
      try {
        const detailRes = await fetch(`https://api.aircall.io/v1/numbers/${n.id}`, { headers });
        if (detailRes.ok) {
          const detailData: any = await detailRes.json();
          numberUsersMap.set(n.id, (detailData.number?.users || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email
          })));
        }
      } catch (err) {
        // ignore individual number fetch error
      }
    }

    // 2. Fetch calls in range
    const allInboundCalls: any[] = [];
    let page = 1;
    const perPage = 50;
    const maxPages = 50;

    while (page <= maxPages) {
      const url = `https://api.aircall.io/v1/calls?from=${fromSeconds}&to=${toSeconds}&order=desc&order_by=created_at&page=${page}&per_page=${perPage}`;
      const res = await fetch(url, { headers });
      if (!res.ok) break;
      const data: any = await res.json();
      const calls = data.calls || [];
      if (calls.length === 0) break;

      for (const c of calls) {
        if (c.direction === 'inbound') {
          allInboundCalls.push(c);
        }
      }

      if (!data.meta?.next_page_link || calls.length < perPage) break;
      page++;
    }

    // Aggregate
    let totalAnswered = 0;
    let totalMissed = 0;
    let inHoursMissed = 0;
    let outOfHoursMissed = 0;

    const numbersBreakdownMap = new Map<number, any>();
    numbersList.forEach(n => {
      const assignedUsers = numberUsersMap.get(n.id) || [];
      const rep = resolveRepFromNumber(n.name, assignedUsers);
      numbersBreakdownMap.set(n.id, {
        numberId: n.id,
        name: n.name,
        digits: n.digits,
        assignedUser: rep,
        totalInbound: 0,
        totalAnswered: 0,
        totalMissed: 0,
      });
    });

    const enrichedCalls: any[] = [];

    for (const call of allInboundCalls) {
      const isMissed = call.status === 'missed' || !call.answered_at || !!call.missed_call_reason;
      const isAnswered = !isMissed;
      const startedAtTimestamp = call.started_at || call.created_at || fromSeconds;
      const outOfHours = call.missed_call_reason === 'out_of_opening_hours' || isOutOfBusinessHours(startedAtTimestamp);

      if (isAnswered) {
        totalAnswered++;
      } else {
        totalMissed++;
        if (outOfHours) outOfHoursMissed++;
        else inHoursMissed++;
      }

      const numId = call.number?.id;
      if (numId && numbersBreakdownMap.has(numId)) {
        const item = numbersBreakdownMap.get(numId);
        item.totalInbound++;
        if (isAnswered) item.totalAnswered++;
        else item.totalMissed++;
      }

      const assignedUsers = numId ? numberUsersMap.get(numId) || [] : [];
      let primaryUser: { id?: number; name: string; email?: string } | null = null;
      if (call.user?.name) {
        primaryUser = { id: call.user.id, name: call.user.name, email: call.user.email };
      } else if (assignedUsers.length > 0 && assignedUsers[0].name !== 'Mail Plus') {
        primaryUser = assignedUsers[0];
      } else {
        const repName = resolveRepFromNumber(call.number?.name || '', assignedUsers);
        if (repName && repName !== 'Team Line') {
          primaryUser = { name: repName };
        }
      }

      enrichedCalls.push({
        id: call.id,
        callType: isAnswered ? 'answered' : 'missed',
        startedAt: new Date(startedAtTimestamp * 1000).toISOString(),
        duration: call.duration || 0,
        callerNumber: call.raw_digits || call.number?.digits || 'Unknown',
        aircallNumberName: call.number?.name || 'Main Line',
        aircallUser: primaryUser,
        missedReason: isAnswered ? 'Answered' : formatMissedReason(call.missed_call_reason, outOfHours),
      });
    }

    const totalInbound = allInboundCalls.length;
    const answeredRate = totalInbound > 0 ? Math.round((totalAnswered / totalInbound) * 100) : 0;
    const missedRate = totalInbound > 0 ? Math.round((totalMissed / totalInbound) * 100) : 0;

    return {
      summary: {
        totalInbound,
        totalAnswered,
        answeredRate,
        totalMissed,
        missedRate,
        inHoursMissed,
        outOfHoursMissed,
      },
      numbersBreakdown: Array.from(numbersBreakdownMap.values()),
      calls: enrichedCalls,
    };
  } catch (err) {
    functions.logger.error('Error fetching Aircall inbound data:', err);
    return null;
  }
}

export async function runCallsReport(dateString: string, recipients: string[], fromAddress?: string): Promise<any> {
  const db = admin.firestore();
  functions.logger.info(`Generating calls report for date: ${dateString}`);

  // parse target date using Sydney timezone
  const { startEpoch, endEpoch, targetStart, targetEnd } = getSydneyDayRange(dateString);

  // 1. Fetch Inbound Calls from Aircall
  let inboundReport: any = null;
  try {
    inboundReport = await fetchAircallInboundData(startEpoch, endEpoch);
  } catch (err) {
    functions.logger.warn('Failed to fetch Aircall inbound data:', err);
  }

  // 2. Query all calls from activity
  const snapshot = await db.collectionGroup('activity').where('type', '==', 'Call').get();

  const rawCalls = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      leadId: doc.ref.parent.parent!.id
    };
  }).filter((c: any) => {
    if (!c.date) return false;
    const callDate = new Date(c.date);
    return callDate >= targetStart && callDate <= targetEnd;
  });

  const totalInboundCallsCount = inboundReport?.summary?.totalInbound || 0;

  if (rawCalls.length === 0 && totalInboundCallsCount === 0) {
    functions.logger.info('No call activities found for date: ' + dateString);
    // Send email indicating no calls
    const noCallsHtml = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <tr>
          <td align="center">
            <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
              <tr>
                <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 25px; background-color: #ffffff; text-align: center; color: #4a5568;">
                  <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-weight: 700;">Daily Call Performance Report</h2>
                  <p style="font-size: 14px; line-height: 1.5;">No call activities were logged yesterday (<strong>${dateString}</strong>).</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; line-height: 1.5;">
                  <p style="margin: 0 0 6px; font-size: 12px;"><strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.</p>
                  <p style="margin: 0;">&copy; 2026 MailPlus. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    if (recipients.length > 0) {
      await sendAutomatedEmail({
        to: recipients.join(', '),
        subject: `Daily Call Performance Report - ${dateString}`,
        html: noCallsHtml,
        customFrom: fromAddress || 'ankith.ravindran@mailplus.com.au'
      });
    }
    return;
  }

  // Load lead statuses (customerStatus)
  const leadIds = [...new Set(rawCalls.map(c => c.leadId))];
  const leadsData: Record<string, any> = {};

  for (let i = 0; i < leadIds.length; i += 30) {
    const chunk = leadIds.slice(i, i + 30);
    const leadsSnap = await db.collection('leads').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
    leadsSnap.forEach(doc => {
      leadsData[doc.id] = doc.data();
    });
  }

  const missingIds = leadIds.filter(id => !leadsData[id]);
  if (missingIds.length > 0) {
    for (let i = 0; i < missingIds.length; i += 30) {
      const chunk = missingIds.slice(i, i + 30);
      const companiesSnap = await db.collection('companies').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
      companiesSnap.forEach(doc => {
        leadsData[doc.id] = doc.data();
      });
    }
  }

  // Populate lead details
  const populatedCalls = rawCalls.map(c => {
    const lead = leadsData[c.leadId];
    return {
      ...c,
      leadName: lead?.companyName || 'Unknown Lead',
      customerStatus: lead?.customerStatus || lead?.status || 'Unknown',
      bucket: lead?.bucket || (lead?.fieldSales ? 'field_sales' : 'outbound') || 'outbound'
    };
  });

  // Outcomes vs attempts deduplication
  const finalCalls: any[] = [];
  const callsByLead: Record<string, any[]> = {};
  populatedCalls.forEach(c => {
    if (!callsByLead[c.leadId]) callsByLead[c.leadId] = [];
    callsByLead[c.leadId].push(c);
  });

  Object.values(callsByLead).forEach(leadCalls => {
    const outcomes = leadCalls.filter(c => (c.notes && c.notes.includes('Outcome: ')) || c.callId);
    const attempts = leadCalls.filter(c => c.notes && c.notes.includes('Initiated call to'));
    finalCalls.push(...outcomes);
    attempts.forEach(attempt => {
      const attemptTime = new Date(attempt.date).getTime();
      const matched = outcomes.some(outcome => Math.abs(new Date(outcome.date).getTime() - attemptTime) < 5 * 60 * 1000);
      if (!matched) finalCalls.push(attempt);
    });
  });

  // 1. Outbound Calls with unique Call IDs
  const uniqueCallIdCalls = finalCalls.filter(c => !!c.callId);
  const seenCallIds = new Set();
  const uniqueCallIdCallsDeduplicated = uniqueCallIdCalls.filter(c => {
    if (seenCallIds.has(c.callId)) return false;
    seenCallIds.add(c.callId);
    return true;
  });

  // 2. Unique Leads/Companies
  const uniqueLeads = new Set(finalCalls.map(c => c.leadId));
  const uniqueLeadsCount = uniqueLeads.size;

  // 3. Unique Call IDs per User and Bucket
  const uniqueCallIdsPerUser: Record<string, number> = {};
  const callsByUser: Record<string, any[]> = {};
  const durationByUser: Record<string, number[]> = {};

  const callsByBucket: Record<string, any[]> = {};
  const uniqueCallIdsPerBucket: Record<string, number> = {};
  const durationByBucket: Record<string, number[]> = {};

  const callsByUserBucket: Record<string, any[]> = {};
  const uniqueCallIdsPerUserBucket: Record<string, number> = {};
  const durationByUserBucket: Record<string, number[]> = {};

  uniqueCallIdCallsDeduplicated.forEach(c => {
    const user = c.author || 'Unassigned';
    const bucket = c.bucket || 'outbound';
    const userBucketKey = `${user}__${bucket}`;

    uniqueCallIdsPerUser[user] = (uniqueCallIdsPerUser[user] || 0) + 1;
    uniqueCallIdsPerBucket[bucket] = (uniqueCallIdsPerBucket[bucket] || 0) + 1;
    uniqueCallIdsPerUserBucket[userBucketKey] = (uniqueCallIdsPerUserBucket[userBucketKey] || 0) + 1;
  });

  finalCalls.forEach(c => {
    const user = c.author || 'Unassigned';
    const bucket = c.bucket || 'outbound';
    const userBucketKey = `${user}__${bucket}`;

    if (!callsByUser[user]) callsByUser[user] = [];
    callsByUser[user].push(c);

    if (!callsByBucket[bucket]) callsByBucket[bucket] = [];
    callsByBucket[bucket].push(c);

    if (!callsByUserBucket[userBucketKey]) callsByUserBucket[userBucketKey] = [];
    callsByUserBucket[userBucketKey].push(c);
    
    const seconds = parseDuration(c.duration);
    if (seconds > 0) {
      if (!durationByUser[user]) durationByUser[user] = [];
      durationByUser[user].push(seconds);

      if (!durationByBucket[bucket]) durationByBucket[bucket] = [];
      durationByBucket[bucket].push(seconds);

      if (!durationByUserBucket[userBucketKey]) durationByUserBucket[userBucketKey] = [];
      durationByUserBucket[userBucketKey].push(seconds);
    }
  });

  // 4. Avg duration per user, bucket, user+bucket
  const avgDurationPerUser: Record<string, string> = {};
  Object.entries(durationByUser).forEach(([user, list]) => {
    const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    avgDurationPerUser[user] = formatDurationSeconds(avg);
  });

  const avgDurationPerBucket: Record<string, string> = {};
  Object.entries(durationByBucket).forEach(([bucket, list]) => {
    const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    avgDurationPerBucket[bucket] = formatDurationSeconds(avg);
  });

  const avgDurationPerUserBucket: Record<string, string> = {};
  Object.entries(durationByUserBucket).forEach(([key, list]) => {
    const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    avgDurationPerUserBucket[key] = formatDurationSeconds(avg);
  });

  const bucketNamesMap: Record<string, string> = {
    outbound: 'Outbound',
    field_sales: 'Field Sales',
    inbound: 'Inbound',
    account_manager: 'Account Manager',
    customer_success: 'Customer Success',
    nurture: 'Nurture',
    marketing: 'Marketing',
    lpo_plus: 'LPO.Plus',
  };

  const formatBucketLabel = (bucketKey: string): string => {
    if (!bucketKey) return 'Unassigned';
    const key = bucketKey.toLowerCase();
    if (bucketNamesMap[key]) return bucketNamesMap[key];
    return bucketKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // ==========================================
  // INBOUND CALLS DATA AGGREGATION
  // ==========================================
  const inboundSummary = inboundReport?.summary || {
    totalInbound: 0,
    totalAnswered: 0,
    answeredRate: 0,
    totalMissed: 0,
    missedRate: 0,
    inHoursMissed: 0,
    outOfHoursMissed: 0,
  };

  // Group Inbound Calls by Agent / Recipient ("To Who")
  const inboundByUser: Record<string, {
    user: string;
    total: number;
    answered: number;
    missed: number;
    durations: number[];
    lines: Set<string>;
  }> = {};

  (inboundReport?.calls || []).forEach((call: any) => {
    const user = call.aircallUser?.name || 'Team Line / Unassigned';
    if (!inboundByUser[user]) {
      inboundByUser[user] = {
        user,
        total: 0,
        answered: 0,
        missed: 0,
        durations: [],
        lines: new Set()
      };
    }
    inboundByUser[user].total++;
    if (call.callType === 'answered') {
      inboundByUser[user].answered++;
      if (call.duration > 0) inboundByUser[user].durations.push(call.duration);
    } else {
      inboundByUser[user].missed++;
    }
    if (call.aircallNumberName) {
      inboundByUser[user].lines.add(call.aircallNumberName);
    }
  });

  const inboundUserBreakdownRowsHtml = Object.keys(inboundByUser)
    .sort((a, b) => inboundByUser[b].total - inboundByUser[a].total)
    .map(user => {
      const item = inboundByUser[user];
      const answeredRate = item.total > 0 ? Math.round((item.answered / item.total) * 100) : 0;
      const avgDur = item.durations.length > 0 
        ? formatDurationSeconds(item.durations.reduce((a, b) => a + b, 0) / item.durations.length)
        : '—';
      const linesStr = Array.from(item.lines).join(', ') || '—';

      return `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <strong>${user}</strong>
          <div style="font-size: 11px; color: #718096; margin-top: 2px;">${linesStr}</div>
        </td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${item.total}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #16a34a; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${item.answered}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: ${item.missed > 0 ? '#dc2626' : '#718096'}; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${item.missed}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: ${answeredRate >= 80 ? '#16a34a' : answeredRate >= 50 ? '#d97706' : '#dc2626'}; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${answeredRate}%</td>
        <td align="right" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${avgDur}</td>
      </tr>`;
    }).join('');

  // Inbound Calls by Phone Line Breakdown
  const inboundLineBreakdownRowsHtml = (inboundReport?.numbersBreakdown || [])
    .filter((n: any) => n.totalInbound > 0)
    .map((n: any) => {
      const answeredRate = n.totalInbound > 0 ? Math.round((n.totalAnswered / n.totalInbound) * 100) : 0;
      return `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <strong>${n.name}</strong>
          ${n.digits ? `<div style="font-size: 11px; color: #718096; margin-top: 2px;">${n.digits}</div>` : ''}
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${n.assignedUser || 'Team Line'}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${n.totalInbound}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #16a34a; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${n.totalAnswered}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: ${n.totalMissed > 0 ? '#dc2626' : '#718096'}; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${n.totalMissed}</td>
        <td align="right" style="padding: 10px 12px; font-size: 13px; color: ${answeredRate >= 80 ? '#16a34a' : answeredRate >= 50 ? '#d97706' : '#dc2626'}; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${answeredRate}%</td>
      </tr>`;
    }).join('');

  // Missed Inbound Calls Log Rows
  const missedInboundCalls = (inboundReport?.calls || []).filter((c: any) => c.callType === 'missed');
  const missedCallsRowsHtml = missedInboundCalls.slice(0, 15).map((c: any) => {
    const callTimeStr = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(c.startedAt));

    const contactDisplay = `<strong>${c.callerNumber}</strong>`;
    const recipientDisplay = c.aircallUser?.name 
      ? `${c.aircallUser.name} <span style="color: #718096; font-size: 11px;">(${c.aircallNumberName})</span>`
      : c.aircallNumberName;

    return `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 8px 10px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; white-space: nowrap;">${callTimeStr}</td>
      <td style="padding: 8px 10px; font-size: 12px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${contactDisplay}</td>
      <td style="padding: 8px 10px; font-size: 12px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${recipientDisplay}</td>
      <td style="padding: 8px 10px; font-size: 12px; color: #dc2626; font-weight: 600; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${c.missedReason}</td>
    </tr>`;
  }).join('');

  // Outbound Agent Breakdown Rows
  const userBreakdownRowsHtml = Object.keys(callsByUser).map(user => {
    const callsCount = callsByUser[user].length;
    const uniqueCallIds = uniqueCallIdsPerUser[user] || 0;
    const avgDur = avgDurationPerUser[user] || 'N/A';
    return `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${user}</strong></td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${callsCount}</td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${uniqueCallIds}</td>
      <td align="right" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${avgDur}</td>
    </tr>`;
  }).join('');

  const bucketBreakdownRowsHtml = Object.keys(callsByBucket)
    .sort((a, b) => callsByBucket[b].length - callsByBucket[a].length)
    .map(bucket => {
      const callsCount = callsByBucket[bucket].length;
      const uniqueCallIds = uniqueCallIdsPerBucket[bucket] || 0;
      const avgDur = avgDurationPerBucket[bucket] || 'N/A';
      return `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${formatBucketLabel(bucket)}</strong></td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${callsCount}</td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${uniqueCallIds}</td>
      <td align="right" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${avgDur}</td>
    </tr>`;
    }).join('');

  const userBucketBreakdownRowsHtml = Object.keys(callsByUserBucket)
    .sort((a, b) => {
      const [userA] = a.split('__');
      const [userB] = b.split('__');
      if (userA !== userB) return userA.localeCompare(userB);
      return callsByUserBucket[b].length - callsByUserBucket[a].length;
    })
    .map(key => {
      const [user, bucket] = key.split('__');
      const callsCount = callsByUserBucket[key].length;
      const uniqueCallIds = uniqueCallIdsPerUserBucket[key] || 0;
      const avgDur = avgDurationPerUserBucket[key] || 'N/A';
      return `
    <tr style="border-bottom: 1px solid #edf2f7;">
      <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${user}</strong></td>
      <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${formatBucketLabel(bucket)}</td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${callsCount}</td>
      <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${uniqueCallIds}</td>
      <td align="right" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${avgDur}</td>
    </tr>`;
    }).join('');

  // Construct Email HTML template adhering to outbound email templates rules
  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily Call Performance Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
          <!-- Banner Logo -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 25px; background-color: #ffffff;">
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Call Performance Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Daily summary of outbound sales calls and inbound calls for yesterday (<strong>${dateString}</strong>).
              </p>
              
              <!-- Summary Metrics 2x2 Grid (Outbound + Inbound) -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-collapse: collapse;">
                <tr>
                  <td width="25%" style="padding: 10px 8px; background-color: #f8fafc; border-radius: 6px 0 0 0; border: 1px solid #edf2f7;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Outbound Calls</div>
                    <div style="font-size: 18px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${finalCalls.length}</div>
                    <div style="font-size: 10px; color: #718096; margin-top: 2px;">${uniqueLeadsCount} accounts</div>
                  </td>
                  <td width="25%" style="padding: 10px 8px; background-color: #f8fafc; border: 1px solid #edf2f7; border-left: 0;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Total Inbound</div>
                    <div style="font-size: 18px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${inboundSummary.totalInbound}</div>
                    <div style="font-size: 10px; color: #718096; margin-top: 2px;">received</div>
                  </td>
                  <td width="25%" style="padding: 10px 8px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 0;">
                    <div style="font-size: 10px; color: #15803d; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Inbound Answered</div>
                    <div style="font-size: 18px; font-weight: 700; color: #16a34a; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${inboundSummary.totalAnswered}</div>
                    <div style="font-size: 10px; color: #15803d; margin-top: 2px;">${inboundSummary.answeredRate}% answered</div>
                  </td>
                  <td width="25%" style="padding: 10px 8px; background-color: ${inboundSummary.totalMissed > 0 ? '#fef2f2' : '#f8fafc'}; border-radius: 0 6px 0 0; border: 1px solid ${inboundSummary.totalMissed > 0 ? '#fecaca' : '#edf2f7'}; border-left: 0;">
                    <div style="font-size: 10px; color: ${inboundSummary.totalMissed > 0 ? '#b91c1c' : '#718096'}; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Inbound Missed</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${inboundSummary.totalMissed > 0 ? '#dc2626' : '#718096'}; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${inboundSummary.totalMissed}</div>
                    <div style="font-size: 10px; color: ${inboundSummary.totalMissed > 0 ? '#b91c1c' : '#718096'}; margin-top: 2px;">${inboundSummary.inHoursMissed} in-hrs</div>
                  </td>
                </tr>
              </table>

              <!-- SECTION 1: INBOUND CALLS PERFORMANCE & AGENT BREAKDOWN -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 25px; margin-bottom: 6px;">
                <tr>
                  <td>
                    <h3 style="margin: 0; font-size: 16px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">
                      Inbound Calls — To Who & Response Breakdown
                    </h3>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Breakdown of incoming calls directed to team members and phone lines, including answered vs missed counts.
              </p>

              ${Object.keys(inboundByUser).length > 0 ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Recipient / User</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Inbound</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #15803d; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Answered</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #b91c1c; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Missed</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Ans Rate</th>
                    <th align="right" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${inboundUserBreakdownRowsHtml}
                </tbody>
              </table>
              ` : `
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; color: #64748b; font-size: 12px; margin-bottom: 25px;">
                No inbound call activity recorded for ${dateString}.
              </div>
              `}

              ${(inboundReport?.numbersBreakdown || []).filter((n: any) => n.totalInbound > 0).length > 0 ? `
              <!-- Inbound Calls by Phone Line Table -->
              <h4 style="margin: 20px 0 10px; font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Inbound Calls by Line / Number</h4>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Line Name</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Assigned Rep</th>
                    <th align="center" style="padding: 8px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Inbound</th>
                    <th align="center" style="padding: 8px 12px; font-size: 11px; color: #15803d; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Answered</th>
                    <th align="center" style="padding: 8px 12px; font-size: 11px; color: #b91c1c; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Missed</th>
                    <th align="right" style="padding: 8px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Ans Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${inboundLineBreakdownRowsHtml}
                </tbody>
              </table>
              ` : ''}

              ${missedInboundCalls.length > 0 ? `
              <!-- Missed Inbound Calls Log -->
              <h4 style="margin: 20px 0 10px; font-size: 14px; color: #b91c1c; border-bottom: 1px solid #fee2e2; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">
                Missed Inbound Calls (${missedInboundCalls.length})
              </h4>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #fef2f2; border-bottom: 2px solid #fecaca;">
                    <th align="left" style="padding: 8px 10px; font-size: 11px; color: #991b1b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Time</th>
                    <th align="left" style="padding: 8px 10px; font-size: 11px; color: #991b1b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Caller</th>
                    <th align="left" style="padding: 8px 10px; font-size: 11px; color: #991b1b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">To Who / Line</th>
                    <th align="left" style="padding: 8px 10px; font-size: 11px; color: #991b1b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${missedCallsRowsHtml}
                </tbody>
              </table>
              ` : ''}

              <!-- SECTION 2: OUTBOUND & ACTIVITY PERFORMANCE -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 6px; border-top: 2px solid #edf2f7; padding-top: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0; font-size: 16px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">
                      Outbound & Activity Calls Performance
                    </h3>
                  </td>
                </tr>
              </table>

              <!-- User Breakdown Table -->
              <h4 style="margin: 15px 0 10px; font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Agent Outbound Breakdown</h4>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">User</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Total Calls</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Unique Call IDs</th>
                    <th align="right" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${userBreakdownRowsHtml.length > 0 ? userBreakdownRowsHtml : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-size: 12px;">No outbound calls logged.</td></tr>'}
                </tbody>
              </table>

              <!-- Calls per Bucket Table -->
              <h4 style="margin: 20px 0 10px; font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Calls per Bucket</h4>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Bucket</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Total Calls</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Unique Call IDs</th>
                    <th align="right" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${bucketBreakdownRowsHtml.length > 0 ? bucketBreakdownRowsHtml : '<tr><td colspan="4" style="padding: 12px; text-align: center; color: #718096; font-size: 12px;">No bucket calls logged.</td></tr>'}
                </tbody>
              </table>

              <!-- User Calls per Bucket Table -->
              <h4 style="margin: 20px 0 10px; font-size: 14px; color: #1a202c; border-bottom: 1px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">User Calls per Bucket</h4>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">User</th>
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Bucket</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Total Calls</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Unique Call IDs</th>
                    <th align="right" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${userBucketBreakdownRowsHtml.length > 0 ? userBucketBreakdownRowsHtml : '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #718096; font-size: 12px;">No user bucket calls logged.</td></tr>'}
                </tbody>
              </table>
            </td>
          </tr>
          <!-- Legal Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (recipients.length > 0) {
    await sendAutomatedEmail({
      to: recipients.join(', '),
      subject: `Daily Call Performance Report - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress || 'ankith.ravindran@mailplus.com.au'
    });
  }
}

/**
 * Scheduled Cloud Function that runs daily at the selected time.
 */
export const sendDailyCallsReport = functions
  .region("australia-southeast1")
  .pubsub.schedule("0 * * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing scheduled sendDailyCallsReport function...");

    const db = admin.firestore();
    let recipients = ["ankith.ravindran@mailplus.com.au"];
    let frequency = "08:00"; // Default to 8:00 AM Sydney Time
    let fromAddress = "ankith.ravindran@mailplus.com.au";

    try {
      const configDoc = await db.collection("settings").doc("daily_calls_report").get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data) {
          if (Array.isArray(data.recipients) && data.recipients.length > 0) {
            recipients = data.recipients;
          }
          if (data.frequency) {
            frequency = data.frequency;
          }
          if (data.fromAddress) {
            fromAddress = data.fromAddress;
          }
        }
      }
    } catch (err) {
      functions.logger.error("Failed to load recipients list", err);
    }

    if (frequency === "disabled") {
      functions.logger.info("Daily calls report is disabled. Skipping execution.");
      return;
    }

    // Check current hour in Sydney
    const sydneyHourStr = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hour12: false
    }).format(new Date());

    const currentHour = parseInt(sydneyHourStr, 10);
    const targetHour = parseInt(frequency.split(":")[0], 10);

    if (currentHour !== targetHour) {
      functions.logger.info(`Current Sydney hour is ${currentHour}, target hour is ${targetHour}. Skipping execution.`);
      return;
    }

    const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const now = new Date();
    now.setDate(now.getDate() - 1); // Yesterday

    const parts = sydneyFormatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';

    const dateString = `${day}-${month}-${year}`;

    try {
      await runCallsReport(dateString, recipients, fromAddress);
    } catch (err) {
      functions.logger.error("Error executing daily calls report:", err);
    }
  });
