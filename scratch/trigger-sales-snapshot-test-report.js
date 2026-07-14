const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

function calculateMonthlyValue(lead) {
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

function parseDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if ('seconds' in dateVal) return new Date(dateVal.seconds * 1000);
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

async function sendAutomatedEmail({ to, subject, html, customFrom }) {
  // Try to use Firebase config/transport, or generic nodemailer
  console.log(`Sending email to ${to} from ${customFrom}...`);
  
  // Use emailDispatcher or config if we can, or just direct transport
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'ankith.ravindran@mailplus.com.au',
      // We will try to fetch the password from environment, or use a simulated log if not configured
      pass: process.env.GMAIL_PASSWORD || process.env.EMAIL_PASSWORD || ''
    }
  });

  // Let's first log it so the user can verify the HTML/content even if SMTP credentials aren't active in local shell
  console.log("Email HTML Length:", html.length);
  
  try {
    const info = await transporter.sendMail({
      from: `"MailPlus CRM" <${customFrom || 'ankith.ravindran@mailplus.com.au'}>`,
      to,
      subject,
      html
    });
    console.log("Email sent successfully! Message ID:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Nodemailer failed, trying simulated fallback via Firestore mail collection if available...");
    try {
      await db.collection('mail').add({
        to,
        message: {
          subject,
          html,
        },
        delivery: {
          state: 'PENDING'
        }
      });
      console.log("Added email to Firestore 'mail' queue for delivery.");
      return { success: true, simulated: true };
    } catch (dbErr) {
      console.error("Failed to enqueue in Firestore mail collection:", dbErr);
      return { success: false, error };
    }
  }
}

async function trigger() {
  const recipients = ["ankith.ravindran@mailplus.com.au"];
  const fromAddress = "ankith.ravindran@mailplus.com.au";

  // Calculate yesterday's date in Sydney time
  const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const now = new Date();
  now.setDate(now.getDate() - 1); // Yesterday
  const parts = sydneyFormatter.formatToParts(now);
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  const dateString = `${day}-${month}-${year}`;

  const [d, m, y] = dateString.split("-").map(Number);
  const targetStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const targetEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const dayStr = String(d).padStart(2, '0');
  const monthStr = String(m).padStart(2, '0');
  const dateCreatedString = `${dayStr}/${monthStr}/${y}`;

  console.log(`Generating sales snapshot report for: ${dateString}`);

  // 1. Query activities logged yesterday
  const activitySnap = await db.collectionGroup('activity').get();
  const rawActivities = activitySnap.docs.map(doc => ({
    id: doc.id,
    leadId: doc.ref.parent.parent.id,
    ...doc.data()
  })).filter((act) => {
    if (!act.date) return false;
    const actDate = new Date(act.date);
    return actDate >= targetStart && actDate <= targetEnd;
  });

  // 2. Query appointments logged yesterday
  const apptSnap = await db.collectionGroup('appointments').get();
  const rawAppointments = apptSnap.docs.map(doc => ({
    id: doc.id,
    leadId: doc.ref.parent.parent.id,
    ...doc.data()
  })).filter((appt) => {
    if (!appt.duedate) return false;
    const apptDate = new Date(appt.duedate);
    return apptDate >= targetStart && apptDate <= targetEnd;
  });

  // Gather referenced lead/company IDs
  const activeLeadIds = new Set();
  rawActivities.forEach(act => { if (act.leadId) activeLeadIds.add(act.leadId); });
  rawAppointments.forEach(appt => { if (appt.leadId) activeLeadIds.add(appt.leadId); });

  // 3. Fetch all referenced leads and companies, plus any leads created yesterday
  const leadsSnap = await db.collection('leads').get();
  const companiesSnap = await db.collection('companies').get();

  const allLeadsMap = new Map();
  
  // Map and filter leads
  leadsSnap.forEach(doc => {
    const data = doc.data();
    const isReferenced = activeLeadIds.has(doc.id);
    
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

  const agentActivity = {};

  const incrementAgent = (user, type) => {
    const name = user || 'Unassigned';
    if (!agentActivity[name]) {
      agentActivity[name] = { calls: 0, visits: 0, tasks: 0, total: 0 };
    }
    agentActivity[name][type]++;
    agentActivity[name].total++;
  };

  rawActivities.forEach((act) => {
    const author = act.author || act.userName || 'Unassigned';
    if (act.type === 'Call') {
      incrementAgent(author, 'calls');
    } else if (act.type === 'Visit Note' || act.type === 'Visit') {
      incrementAgent(author, 'visits');
    } else {
      incrementAgent(author, 'tasks');
    }
  });

  rawAppointments.forEach((appt) => {
    const author = appt.assignedTo || appt.userName || 'Unassigned';
    incrementAgent(author, 'tasks');
  });

  allLeads.forEach(lead => {
    const status = lead.customerStatus || lead.status;

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

    totalPipelineMRR += calculateMonthlyValue(lead);
  });

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
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Sales Snapshot Report (Test Email)</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                This is a manually triggered test email showing sales snapshot metrics for yesterday (<strong>${dateString}</strong>).
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
    const res = await sendAutomatedEmail({
      to: recipient,
      subject: `Daily Sales Snapshot Report - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress
    });
    console.log("Dispatch result for", recipient, ":", res);
  }
}

trigger().catch(console.error);
