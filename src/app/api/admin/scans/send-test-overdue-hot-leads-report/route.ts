import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

function getSydneyLocal(d: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const partObj: Record<string, string> = {};
  for (const part of parts) {
    partObj[part.type] = part.value;
  }
  return new Date(
    parseInt(partObj.year),
    parseInt(partObj.month) - 1,
    parseInt(partObj.day),
    parseInt(partObj.hour) === 24 ? 0 : parseInt(partObj.hour),
    parseInt(partObj.minute),
    parseInt(partObj.second)
  );
}

function calculateBusinessHoursSydney(start: Date, end: Date): number {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
  
  const startSyd = getSydneyLocal(start);
  const endSyd = getSydneyLocal(end);

  const startDay = new Date(startSyd.getFullYear(), startSyd.getMonth(), startSyd.getDate());
  const endDay = new Date(endSyd.getFullYear(), endSyd.getMonth(), endSyd.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  
  if (startDay.getTime() === endDay.getTime()) {
    const dayOfWeek = startSyd.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

    const businessStart = new Date(startDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(startDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
    const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));

    return Math.max(0, clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60);
  }

  let totalMs = 0;

  // 1. First day business hours
  const startDayOfWeek = startSyd.getDay();
  if (startDayOfWeek !== 0 && startDayOfWeek !== 6) {
    const businessStart = new Date(startDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(startDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedStart = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), startSyd.getTime())));
    totalMs += Math.max(0, businessEnd.getTime() - clampedStart.getTime());
  }

  // 2. Intermediate days
  let currentDay = new Date(startDay.getTime() + msPerDay);
  while (currentDay.getTime() < endDay.getTime()) {
    const dayOfWeek = currentDay.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalMs += 8 * 60 * 60 * 1000;
    }
    currentDay.setTime(currentDay.getTime() + msPerDay);
  }

  // 3. Last day business hours
  const endDayOfWeek = endSyd.getDay();
  if (endDayOfWeek !== 0 && endDayOfWeek !== 6) {
    const businessStart = new Date(endDay);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(endDay);
    businessEnd.setHours(17, 0, 0, 0);

    const clampedEnd = new Date(Math.max(businessStart.getTime(), Math.min(businessEnd.getTime(), endSyd.getTime())));
    totalMs += Math.max(0, clampedEnd.getTime() - businessStart.getTime());
  }

  return totalMs / (1000 * 60 * 60);
}

function parseLeadDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if ('seconds' in dateVal) return new Date(dateVal.seconds * 1000);
  }
  if (typeof dateVal === 'string') {
    if (dateVal.includes('/')) {
      const parts = dateVal.split(' ')[0].split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (d && m && y) return new Date(y, m - 1, d);
      }
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, date } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients list is required' }, { status: 400 });
    }

    const db = getFirestore(adminApp);
    const now = new Date();

    const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    let displayDateString: string;
    if (date) {
      const [y, m, d] = date.split("-");
      displayDateString = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    } else {
      const parts = sydneyFormatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const year = parts.find(p => p.type === 'year')?.value;
      displayDateString = `${day}/${month}/${year}`;
    }

    // Query only Hot Leads directly via indexed queries for lightning speed
    const [q1, q2] = await Promise.all([
      db.collection('leads').where('customerStatus', 'in', ['Hot Lead', 'Priority Lead', 'Priority Field Lead', 'Hot']).get(),
      db.collection('leads').where('status', 'in', ['Hot Lead', 'Priority Lead', 'Priority Field Lead', 'Hot']).get(),
    ]);

    const leadDocsMap = new Map();
    q1.docs.forEach(doc => leadDocsMap.set(doc.id, doc));
    q2.docs.forEach(doc => leadDocsMap.set(doc.id, doc));
    const allHotLeadsDocs = Array.from(leadDocsMap.values());

    interface OverdueLeadItem {
      id: string;
      companyName: string;
      accountManager: string;
      dateEnteredStr: string;
      calendarDaysOverdue: number;
      bizHoursOverdue: number;
    }

    const overdueLeads: OverdueLeadItem[] = [];
    const amCounts: Record<string, number> = {};

    for (const doc of allHotLeadsDocs) {
      const lead = doc.data();

      // 1. Hot Lead check
      const statusStr = (lead.customerStatus || lead.status || '').trim();
      const isHotLead = ['Hot Lead', 'Priority Lead', 'Priority Field Lead', 'Hot'].includes(statusStr);
      if (!isHotLead) continue;

      // 2. Closed / Won / Lost check
      const normStatus = statusStr.toLowerCase();
      const isClosed = 
        normStatus.includes('won') || 
        normStatus.includes('lost') || 
        normStatus.includes('dead') || 
        normStatus.includes('rejected') || 
        normStatus.includes('customer') || 
        normStatus.includes('signed') ||
        normStatus.includes('out of territory') ||
        normStatus.includes('future follow');
      if (isClosed) continue;

      // 3. Bucket / Source check (Inbound or Website)
      const bucket = (lead.bucket || '').toLowerCase();
      const source = (lead.customerSource || lead.source || lead.leadSource || '').toLowerCase();
      const isInbound = bucket === 'inbound' || source.includes('website') || source.includes('inbound');
      if (!isInbound) continue;

      // 4. Resolve dates
      const enteredDate = parseLeadDate(lead.dateLeadEntered) || parseLeadDate(lead.createdAt) || parseLeadDate(lead.dateCreated);
      if (!enteredDate || isNaN(enteredDate.getTime())) continue;

      // 14th July 2026 cutoff filter: only include leads entered on or after 14th July 2026
      const cutoffDate = new Date(2026, 6, 14, 0, 0, 0, 0); // Month 6 = July
      if (enteredDate < cutoffDate) continue;

      // Resolve last activity date if available
      let lastAction = enteredDate;
      if (lead.activities && Array.isArray(lead.activities) && lead.activities.length > 0) {
        const actDates = lead.activities
          .map((a: any) => parseLeadDate(a.date || a.createdAt))
          .filter((d: Date | null): d is Date => d !== null && !isNaN(d.getTime()));
        if (actDates.length > 0) {
          actDates.sort((a, b) => b.getTime() - a.getTime());
          lastAction = actDates[0];
        }
      }

      // 5. Calculate business hours overdue
      const bizHoursElapsed = calculateBusinessHoursSydney(lastAction, now);
      if (bizHoursElapsed <= 8) continue; // SLA is 8 business hours

      const calendarDaysOverdue = Math.max(1, Math.floor((now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24)));
      const bizHoursOverdueVal = Math.round(bizHoursElapsed);
      const amAssigned = lead.accountManagerAssigned || lead.dialerAssigned || lead.assignedTo || lead.accountManager || 'Unassigned';

      const dayStr = String(enteredDate.getDate()).padStart(2, '0');
      const monthStr = String(enteredDate.getMonth() + 1).padStart(2, '0');
      const formattedEntered = `${dayStr}/${monthStr}/${enteredDate.getFullYear()}`;

      overdueLeads.push({
        id: doc.id,
        companyName: lead.companyName || 'Unknown Company',
        accountManager: amAssigned,
        dateEnteredStr: formattedEntered,
        calendarDaysOverdue,
        bizHoursOverdue: bizHoursOverdueVal
      });

      amCounts[amAssigned] = (amCounts[amAssigned] || 0) + 1;
    }

    // Sort overdue leads by days overdue descending
    overdueLeads.sort((a, b) => b.bizHoursOverdue - a.bizHoursOverdue);

    const amReport = Object.entries(amCounts)
      .map(([am, count]) => ({ am, count }))
      .sort((a, b) => b.count - a.count);

    const leadRowsHtml = overdueLeads.length > 0
      ? overdueLeads.map(l => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${l.companyName}</strong></td>
            <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${l.accountManager}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${l.dateEnteredStr}</td>
            <td align="right" style="padding: 10px 12px; font-size: 13px; color: #c53030; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">
              ${l.calendarDaysOverdue} ${l.calendarDaysOverdue === 1 ? 'day' : 'days'} <span style="font-size: 11px; font-weight: normal; color: #718096;">(${l.bizHoursOverdue}h biz)</span>
            </td>
          </tr>`).join("")
      : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Great news! No overdue inbound hot leads found at this time.</td></tr>`;

    const amRowsHtml = amReport.length > 0
      ? amReport.map(r => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.am}</strong></td>
            <td align="right" style="padding: 8px 12px; font-size: 13px; color: #c53030; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
          </tr>`).join("")
      : `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No Account Manager data available.</td></tr>`;

    const emailHtml = `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Daily Overdue Inbound Hot Leads Report</title>
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
                <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Overdue Inbound Hot Leads Report</h2>
                <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  Summary report of active inbound hot leads that have breached the 8 business hours response SLA as of <strong>${displayDateString}</strong>.
                </p>
                
                <div style="margin-bottom: 25px; padding: 15px; background-color: #fff5f5; border-left: 4px solid #e53e3e; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #9b2c2c; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    Total Overdue Inbound Hot Leads: <strong style="color: #c53030; font-size: 16px;">${overdueLeads.length}</strong>
                  </p>
                </div>
  
                <!-- List of Overdue Leads -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Overdue Hot Leads List</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Company Name</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Account Manager</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Entered Date</th>
                      <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${leadRowsHtml}
                  </tbody>
                </table>
 
                <!-- AM Breakdown -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Overdue Leads by Account Manager</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Account Manager</th>
                      <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold; width: 100px;">Overdue Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${amRowsHtml}
                  </tbody>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
                </p>
                <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  Powered by MailPlus Australia
                </p>
                <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                  &copy; 2026 MailPlus. All rights reserved. <br />
                  If you no longer wish to receive marketing communications, you can&nbsp;
                  <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

    const toStr = recipients.join(", ");
    let fromAddress = 'ankith.ravindran@mailplus.com.au';
    try {
      const configDoc = await db.collection('settings').doc('daily_overdue_hot_leads_report').get();
      if (configDoc.exists) {
        fromAddress = configDoc.data()?.fromAddress || fromAddress;
      }
    } catch (dbErr) {
      console.warn('Failed to load daily_overdue_hot_leads_report settings:', dbErr);
    }

    const result = await sendPhysicalEmail({
      to: toStr,
      subject: `Daily Overdue Inbound Hot Leads Report - ${displayDateString}`,
      html: emailHtml,
      customFrom: fromAddress
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to transmit email' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Daily overdue hot leads report successfully sent to ${toStr}. ${result.simulated ? '(Simulated Mode)' : ''}`,
      totalOverdueLeads: overdueLeads.length
    });

  } catch (error: any) {
    console.error('Error generating overdue hot leads test report:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate test report' }, { status: 500 });
  }
}
