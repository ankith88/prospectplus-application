import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const minutesMatch = durationStr.match(/(\d+)m/);
  const secondsMatch = durationStr.match(/(\d+)s/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;
  return minutes * 60 + seconds;
}

function formatDurationSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, date } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients list is required' }, { status: 400 });
    }

    const db = getFirestore(adminApp);

    const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    let dateString: string;
    let targetStart: Date;
    let targetEnd: Date;

    if (date) {
      const [y, m, d] = date.split("-");
      dateString = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      targetStart = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
      targetEnd = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
    } else {
      const now = new Date();
      now.setDate(now.getDate() - 1); // Yesterday
      const parts = sydneyFormatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      dateString = `${day}-${month}-${year}`;
      targetStart = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
      targetEnd = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
    }

    // Query all activities of type "Call"
    const activityQuery = db.collectionGroup('activity').where('type', '==', 'Call');
    const snapshot = await activityQuery.get();

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

    if (rawCalls.length === 0) {
      return NextResponse.json({ message: 'No call data found for the selected date range.' });
    }

    // Load lead status (customerStatus) from leads and companies collections
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
        customerStatus: lead?.customerStatus || lead?.status || 'Unknown'
      };
    });

    // Outcomes vs attempts deduplication logic matching frontend / Firestore service
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

    // 1. Calls with unique Call IDs
    const uniqueCallIdCalls = finalCalls.filter(c => !!c.callId);
    
    // Deduplicate calls by Call ID
    const seenCallIds = new Set();
    const uniqueCallIdCallsDeduplicated = uniqueCallIdCalls.filter(c => {
      if (seenCallIds.has(c.callId)) return false;
      seenCallIds.add(c.callId);
      return true;
    });
    
    const uniqueCallIdsCount = uniqueCallIdCallsDeduplicated.length;

    // 2. Unique Leads/Companies
    const uniqueLeads = new Set(finalCalls.map(c => c.leadId));
    const uniqueLeadsCount = uniqueLeads.size;

    // 3. Unique Call IDs per User
    const uniqueCallIdsPerUser: Record<string, number> = {};
    const callsByUser: Record<string, any[]> = {};
    const durationByUser: Record<string, number[]> = {};

    uniqueCallIdCallsDeduplicated.forEach(c => {
      const user = c.author || 'Unassigned';
      uniqueCallIdsPerUser[user] = (uniqueCallIdsPerUser[user] || 0) + 1;
    });

    // Initialize all users in breakdown
    finalCalls.forEach(c => {
      const user = c.author || 'Unassigned';
      if (!callsByUser[user]) callsByUser[user] = [];
      callsByUser[user].push(c);
      
      const seconds = parseDuration(c.duration);
      if (seconds > 0) {
        if (!durationByUser[user]) durationByUser[user] = [];
        durationByUser[user].push(seconds);
      }
    });

    // 4. Avg duration of call
    const durations = finalCalls.map(c => parseDuration(c.duration)).filter(d => d > 0);
    const avgDurationOverall = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // 5. Avg duration per user
    const avgDurationPerUser: Record<string, string> = {};
    Object.entries(durationByUser).forEach(([user, list]) => {
      const avg = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
      avgDurationPerUser[user] = formatDurationSeconds(avg);
    });

    // Construct Email HTML template adhering to outbound email templates rules
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

    const emailHtml = `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Daily Call Report</title>
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
                <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Call Performance Report (Test Email)</h2>
                <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  This is a manually triggered test email showing call performance metrics for yesterday (<strong>${dateString}</strong>).
                </p>
                
                <!-- Summary Metrics Grid -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-collapse: collapse;">
                  <tr>
                    <td width="50%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7;">
                      <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Total Calls</div>
                      <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${finalCalls.length}</div>
                    </td>
                    <td width="50%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0;">
                      <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Unique Call IDs</div>
                      <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${uniqueCallIdsCount}</div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-top: 0;">
                      <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Unique Accounts</div>
                      <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${uniqueLeadsCount}</div>
                    </td>
                    <td width="50%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; border-top: 0;">
                      <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Avg Call Duration</div>
                      <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${formatDurationSeconds(avgDurationOverall)}</div>
                    </td>
                  </tr>
                </table>
  
                <!-- User Breakdown Table -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Agent Breakdown</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">User</th>
                      <th align="center" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Total Calls</th>
                      <th align="center" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Unique Call IDs</th>
                      <th align="right" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${userBreakdownRowsHtml}
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

    // Send the email to configured recipients
    let fromAddress = 'ankith.ravindran@mailplus.com.au';
    try {
      const configDoc = await db.collection('settings').doc('daily_calls_report').get();
      if (configDoc.exists) {
        fromAddress = configDoc.data()?.fromAddress || fromAddress;
      }
    } catch (dbErr) {
      console.warn('Failed to load daily_calls_report settings:', dbErr);
    }

    for (const recipient of recipients) {
      await sendPhysicalEmail({
        to: recipient,
        subject: `Daily Call Performance Report - ${dateString}`,
        html: emailHtml,
        customFrom: fromAddress
      });
    }

    return NextResponse.json({ message: `Daily call report manually triggered successfully for ${recipients.join(', ')}` });
  } catch (error: any) {
    console.error('Error sending test calls report:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
