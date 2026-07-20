import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';

// Value Calculation Logic (MRR) matching frontend
function calculateMonthlyValue(lead: any): number {
  const applicableStatuses = ['Quote Sent', 'Won', 'LocalMile Opportunity', 'LocalMile Pending', 'Trialing LocalMile', 'Free Trial', 'Trialing ShipMate'];
  const currentStatus = lead.customerStatus || lead.status;
  
  if (!applicableStatuses.includes(currentStatus)) {
    return 0;
  }
  
  if (!lead.services || lead.services.length === 0) {
    return 0;
  }
  
  let totalMonthlyValue = 0;
  for (const service of lead.services) {
    if (!service.rate) continue;
    
    if (service.frequency === 'Adhoc') {
      totalMonthlyValue += service.rate * 1;
    } else if (Array.isArray(service.frequency)) {
      const weeklyDays = service.frequency.length;
      if (weeklyDays > 0) {
        totalMonthlyValue += service.rate * weeklyDays * 4.33;
      }
    }
  }
  
  return totalMonthlyValue;
}

// Helper to parse date fields from firestore
function parseDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if ('seconds' in dateVal) return new Date(dateVal.seconds * 1000);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

export async function runSalesSnapshotReport(dateString: string, recipients: string[], fromAddress?: string): Promise<any> {
  const db = admin.firestore();
  functions.logger.info(`Generating sales snapshot report for date: ${dateString}`);

  // parse target date (DD-MM-YYYY)
  const [day, month, year] = dateString.split("-").map(Number);
  const targetStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const targetEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const dateCreatedString = `${dayStr}/${monthStr}/${year}`;

  const usersSnap = await db.collection('users').get();
  const amUserIdentifiers = new Set<string>();
  usersSnap.docs.forEach(doc => {
    const u = doc.data() || {};
    const roles = u.assignedRoles || [];
    const isAM = roles.some((r: string) => ['Account Manager', 'Account Managers', 'account managers'].includes(r));
    if (isAM && !u.disabled) {
      if (u.email) {
        amUserIdentifiers.add(u.email.toLowerCase().trim());
      }
      const firstName = u.firstName || '';
      const lastName = u.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      if (fullName) {
        amUserIdentifiers.add(fullName);
      }
      if (u.displayName) {
        amUserIdentifiers.add(u.displayName.toLowerCase().trim());
      }
    }
  });

  // 1. Query activities logged yesterday
  const activitySnap = await db.collectionGroup('activity').get();
  const rawActivities = activitySnap.docs.map(doc => ({
    id: doc.id,
    leadId: doc.ref.parent.parent!.id,
    ...doc.data()
  })).filter((act: any) => {
    if (!act.date) return false;
    const actDate = new Date(act.date);
    if (actDate < targetStart || actDate > targetEnd) return false;

    const author = (act.author || '').trim().toLowerCase();
    if (!author || author === 'system' || author === 'api' || author === 'prospectplus' || author.includes('automated')) {
      return false;
    }
    return amUserIdentifiers.has(author);
  });

  // 2. Query appointments logged yesterday
  const apptSnap = await db.collectionGroup('appointments').get();
  const rawAppointments = apptSnap.docs.map(doc => ({
    id: doc.id,
    leadId: doc.ref.parent.parent!.id,
    ...doc.data()
  })).filter((appt: any) => {
    if (!appt.duedate) return false;
    const apptDate = new Date(appt.duedate);
    return apptDate >= targetStart && apptDate <= targetEnd;
  });

  // Gather referenced lead/company IDs
  const activeLeadIds = new Set<string>();
  rawActivities.forEach(act => { if (act.leadId) activeLeadIds.add(act.leadId); });
  rawAppointments.forEach(appt => { if (appt.leadId) activeLeadIds.add(appt.leadId); });

  // 3. Fetch all referenced leads and companies, plus any leads created yesterday
  const leadsSnap = await db.collection('leads').get();
  const companiesSnap = await db.collection('companies').get();

  const allLeadsMap = new Map<string, any>();
  
  // Map and filter leads
  leadsSnap.forEach(doc => {
    const data = doc.data();
    const isReferenced = activeLeadIds.has(doc.id);
    
    // Check if created yesterday
    let createdYesterday = false;
    if (data.dateCreated === dateCreatedString) {
      createdYesterday = true;
    } else if (data.createdAt) {
      const createdDate = parseDate(data.createdAt);
      if (createdDate && createdDate >= targetStart && createdDate <= targetEnd) {
        createdYesterday = true;
      }
    } else if (data.dateLeadEntered) {
      const enteredDate = parseDate(data.dateLeadEntered);
      if (enteredDate && enteredDate >= targetStart && enteredDate <= targetEnd) {
        createdYesterday = true;
      }
    }

    if (isReferenced || createdYesterday || data.quoteSentAt || data.scfAcceptedAt || data.trialStartedAt || data.signedUpAt) {
      allLeadsMap.set(doc.id, { id: doc.id, isCompany: false, ...data });
    }
  });

  // Map and filter companies
  companiesSnap.forEach(doc => {
    const data = doc.data();
    const isReferenced = activeLeadIds.has(doc.id);
    
    let createdYesterday = false;
    if (data.createdAt) {
      const createdDate = parseDate(data.createdAt);
      if (createdDate && createdDate >= targetStart && createdDate <= targetEnd) {
        createdYesterday = true;
      }
    }

    if (isReferenced || createdYesterday || data.quoteSentAt || data.scfAcceptedAt || data.trialStartedAt || data.signedUpAt) {
      allLeadsMap.set(doc.id, { id: doc.id, isCompany: true, ...data });
    }
  });

  const allLeads = Array.from(allLeadsMap.values());

  // Metrics Calculations
  let totalNewLeads = 0;
  let quotesCount = 0;
  let scfsCount = 0;
  let trialsCount = 0;
  let wonCount = 0;
  let totalWonMRR = 0;
  let totalPipelineMRR = 0;

  // Track activity counts per user/agent
  const agentActivity: Record<string, { calls: number; visits: number; tasks: number; total: number }> = {};

  const incrementAgent = (user: string, type: 'calls' | 'visits' | 'tasks') => {
    const name = user || 'Unassigned';
    if (!agentActivity[name]) {
      agentActivity[name] = { calls: 0, visits: 0, tasks: 0, total: 0 };
    }
    agentActivity[name][type]++;
    agentActivity[name].total++;
  };

  rawActivities.forEach((act: any) => {
    const author = act.author || act.userName || 'Unassigned';
    if (act.type === 'Call') {
      incrementAgent(author, 'calls');
    } else if (act.type === 'Visit Note' || act.type === 'Visit') {
      incrementAgent(author, 'visits');
    } else {
      incrementAgent(author, 'tasks');
    }
  });

  rawAppointments.forEach((appt: any) => {
    const author = appt.assignedTo || appt.userName || 'Unassigned';
    incrementAgent(author, 'tasks');
  });

  allLeads.forEach(lead => {
    const status = lead.customerStatus || lead.status;

    // Check if created yesterday
    let createdYesterday = false;
    if (lead.dateCreated === dateCreatedString) {
      createdYesterday = true;
    } else if (lead.createdAt) {
      const createdDate = parseDate(lead.createdAt);
      if (createdDate && createdDate >= targetStart && createdDate <= targetEnd) {
        createdYesterday = true;
      }
    }
    if (createdYesterday) totalNewLeads++;

    // Progressions
    let quoteSentYesterday = false;
    if (lead.quoteSentAt) {
      const qDate = parseDate(lead.quoteSentAt);
      if (qDate && qDate >= targetStart && qDate <= targetEnd) {
        quoteSentYesterday = true;
      }
    }
    if (quoteSentYesterday || status === 'Quote Sent') quotesCount++;

    let scfAcceptedYesterday = false;
    if (lead.scfAcceptedAt) {
      const sDate = parseDate(lead.scfAcceptedAt);
      if (sDate && sDate >= targetStart && sDate <= targetEnd) {
        scfAcceptedYesterday = true;
      }
    }
    if (scfAcceptedYesterday) scfsCount++;

    let trialStartedYesterday = false;
    if (lead.trialStartedAt) {
      const tDate = parseDate(lead.trialStartedAt);
      if (tDate && tDate >= targetStart && tDate <= targetEnd) {
        trialStartedYesterday = true;
      }
    }
    if (trialStartedYesterday) trialsCount++;

    let wonYesterday = false;
    if (lead.signedUpAt) {
      const wDate = parseDate(lead.signedUpAt);
      if (wDate && wDate >= targetStart && wDate <= targetEnd) {
        wonYesterday = true;
      }
    }
    if (wonYesterday || status === 'Won' || status === 'Signed') {
      wonCount++;
      if (wonYesterday) {
        totalWonMRR += calculateMonthlyValue(lead);
      }
    }

    // Cumulative Pipeline MRR
    totalPipelineMRR += calculateMonthlyValue(lead);
  });

  // HTML rows for agent activity breakdown
  const agentRowsHtml = Object.entries(agentActivity)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([agent, counts]) => `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${agent}</strong></td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${counts.calls}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${counts.visits}</td>
        <td align="center" style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${counts.tasks}</td>
        <td align="right" style="padding: 10px 12px; font-size: 13px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${counts.total}</td>
      </tr>
    `).join('');

  // Construct Email HTML template adhering to outbound email templates rules
  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily Sales Snapshot Report</title>
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
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Sales Snapshot Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Daily summary of sales pipeline performance, activity volumes, and team breakdowns for yesterday (<strong>${dateString}</strong>).
              </p>
              
              <!-- KPI Grid -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-collapse: collapse;">
                <tr>
                  <td width="33%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">New Leads Created</div>
                    <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${totalNewLeads}</div>
                  </td>
                  <td width="33%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Total Won Yesterday</div>
                    <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${wonCount}</div>
                  </td>
                  <td width="34%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Won MRR</div>
                    <div style="font-size: 20px; font-weight: 700; color: #2dd4bf; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">$${totalWonMRR.toFixed(2)}</div>
                  </td>
                </tr>
                <tr>
                  <td width="33%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-top: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Quotes Sent</div>
                    <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${quotesCount}</div>
                  </td>
                  <td width="33%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; border-top: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">SCFs Accepted</div>
                    <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${scfsCount}</div>
                  </td>
                  <td width="34%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; border-top: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Total Pipeline MRR</div>
                    <div style="font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">$${totalPipelineMRR.toFixed(2)}</div>
                  </td>
                </tr>
              </table>

              <!-- Agent Performance Breakdown Table -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Yesterday's Activity by Agent</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Agent</th>
                    <th align="center" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Calls</th>
                    <th align="center" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Visits</th>
                    <th align="center" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Other Tasks</th>
                    <th align="right" style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${agentRowsHtml || `<tr><td colspan="5" align="center" style="padding: 15px; font-size: 13px; color: #718096;">No activities logged yesterday.</td></tr>`}
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

  for (const recipient of recipients) {
    await sendAutomatedEmail({
      to: recipient,
      subject: `Daily Sales Snapshot Report - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress || 'ankith.ravindran@mailplus.com.au'
    });
  }

  return { success: true, emailHtml };
}

/**
 * Scheduled Cloud Function that runs daily. Check current hour in Sydney to match schedule.
 */
export const sendDailySalesSnapshotReport = functions
  .region("australia-southeast1")
  .pubsub.schedule("0 * * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing scheduled sendDailySalesSnapshotReport function...");

    const db = admin.firestore();
    let recipients = ["ankith.ravindran@mailplus.com.au"];
    let frequency = "08:00"; // Default to 8 AM Sydney Time
    let fromAddress = "ankith.ravindran@mailplus.com.au";

    try {
      const configDoc = await db.collection("settings").doc("daily_sales_snapshot_report").get();
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
      } else {
        // Ensure default settings are initialized in Firestore if not present
        await db.collection("settings").doc("daily_sales_snapshot_report").set({
          recipients,
          frequency,
          fromAddress
        });
      }
    } catch (err) {
      functions.logger.error("Failed to load daily_sales_snapshot_report settings", err);
    }

    if (frequency === "disabled") {
      functions.logger.info("Daily sales snapshot report is disabled. Skipping execution.");
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

    // Generate date for Yesterday in Sydney
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
      await runSalesSnapshotReport(dateString, recipients, fromAddress);
      functions.logger.info(`Successfully sent Daily Sales Snapshot Report for ${dateString}`);
    } catch (error) {
      functions.logger.error("Error executing Daily Sales Snapshot Report:", error);
    }
  });
