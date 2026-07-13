import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

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
    if (date) {
      const [y, m, d] = date.split("-");
      dateString = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    } else {
      const now = new Date();
      now.setDate(now.getDate() - 1); // Yesterday
      const parts = sydneyFormatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const year = parts.find(p => p.type === 'year')?.value;
      dateString = `${day}-${month}-${year}`;
    }

    // Parse range
    const [d, m, y] = dateString.split("-").map(Number);
    const targetStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const targetEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');
    const dateCreatedString = `${dayStr}/${monthStr}/${y}`;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. Query by dateCreated (DD/MM/YYYY exact match)
    const q1 = await db.collection("leads").where("dateCreated", "==", dateCreatedString).get();

    // 2. Query by createdAt (ISO string range)
    const q2 = await db.collection("leads").where("createdAt", ">=", threeDaysAgo.toISOString()).get();

    // 3. Query by createdAt (Timestamp range)
    const q3 = await db.collection("leads").where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo)).get();

    // Combine and deduplicate
    const allLeadsMap = new Map();
    q1.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
    q2.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
    q3.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
    const allLeads = Array.from(allLeadsMap.values());

    const filteredLeads = allLeads.filter(lead => {
      // 1. Check Source (Website)
      const source = (lead.source || lead.leadSource || lead.customerSource || "").toLowerCase();
      if (!source.includes("website")) return false;

      // 2. Check Date Match
      if (lead.dateCreated === dateCreatedString) return true;

      if (lead.createdAt) {
        let createdDate: Date;
        if (typeof lead.createdAt.toDate === "function") {
          createdDate = lead.createdAt.toDate();
        } else {
          createdDate = new Date(lead.createdAt);
        }
        if (createdDate >= targetStart && createdDate <= targetEnd) {
          return true;
        }
      }

      if (lead.dateLeadEntered) {
        if (lead.dateLeadEntered.includes("/")) {
          const [ld, lm, ly] = lead.dateLeadEntered.split("/");
          if (ld && lm && ly) {
            const enteredDate = new Date(Number(ly), Number(lm) - 1, Number(ld));
            if (enteredDate.getDate() === d && (enteredDate.getMonth() + 1) === m && enteredDate.getFullYear() === y) {
              return true;
            }
          }
        } else {
          const enteredDate = new Date(lead.dateLeadEntered);
          if (!isNaN(enteredDate.getTime()) && enteredDate >= targetStart && enteredDate <= targetEnd) {
            return true;
          }
        }
      }

      return false;
    });

    // Aggregate counts by accountManagerAssigned and franchisee
    const amCounts: Record<string, number> = {};
    const franchiseeCounts: Record<string, number> = {};

    filteredLeads.forEach(l => {
      const am = l.accountManagerAssigned || "Unassigned AM";
      amCounts[am] = (amCounts[am] || 0) + 1;

      const fran = l.franchisee || "Unassigned Franchisee";
      franchiseeCounts[fran] = (franchiseeCounts[fran] || 0) + 1;
    });

    const amReport = Object.entries(amCounts)
      .map(([am, count]) => ({ am, count }))
      .sort((a, b) => b.count - a.count);

    const franReport = Object.entries(franchiseeCounts)
      .map(([fran, count]) => ({ fran, count }))
      .sort((a, b) => b.count - a.count);

    const leadRowsHtml = filteredLeads.length > 0
      ? filteredLeads.map(l => {
          const addressParts = [
            (l.street || "").trim(),
            (l.city || "").trim(),
            (l.state || "").trim(),
            (l.zip || "").trim()
          ].filter(Boolean);
          const address = addressParts.join(", ") || "N/A";

          return `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${l.companyName || 'Unknown Company'}</strong></td>
            <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${address}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${l.franchisee || 'Unassigned'}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No website leads were created yesterday.</td></tr>`;

    const amRowsHtml = amReport.length > 0
      ? amReport.map(r => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.am}</strong></td>
            <td align="right" style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
          </tr>`).join("")
      : `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No AM data.</td></tr>`;

    const franRowsHtml = franReport.length > 0
      ? franReport.map(r => `
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.fran}</strong></td>
            <td align="right" style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
          </tr>`).join("")
      : `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No Franchisee data.</td></tr>`;

    const emailHtml = `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Daily Website Leads Report</title>
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
                <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Website Leads Report (Test Email)</h2>
                <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  This is a manually triggered test email showing website leads created yesterday (<strong>${dateString}</strong>).
                </p>
                
                <div style="margin-bottom: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #475569; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    Total Website Leads Created: <strong style="color: #095c7b; font-size: 15px;">${filteredLeads.length}</strong>
                  </p>
                </div>
  
                <!-- List of leads -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads List</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Company</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Address</th>
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${leadRowsHtml}
                  </tbody>
                </table>

                <!-- AM Breakdown -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads by Assigned Account Manager</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Account Manager</th>
                      <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold; width: 80px;">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${amRowsHtml}
                  </tbody>
                </table>

                <!-- Franchisee Breakdown -->
                <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads by Assigned Franchisee</h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                      <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                      <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold; width: 80px;">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${franRowsHtml}
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
      const configDoc = await db.collection('settings').doc('daily_website_leads_report').get();
      if (configDoc.exists) {
        fromAddress = configDoc.data()?.fromAddress || fromAddress;
      }
    } catch (dbErr) {
      console.warn('Failed to load daily_website_leads_report settings:', dbErr);
    }

    const result = await sendPhysicalEmail({
      to: toStr,
      subject: `Daily Website Leads Report (Test) - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to transmit email' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Website leads report successfully generated and sent to ${toStr}. ${result.simulated ? '(Simulated Mode)' : ''}`,
      totalLeads: filteredLeads.length
    });

  } catch (error: any) {
    console.error('Error generating website leads test report:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate test report' }, { status: 500 });
  }
}
