const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

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

async function sendAutomatedEmail(options) {
  const configSnap = await db.collection('outlook_integrations').doc('active_config').get();
  if (!configSnap.exists) {
    console.log("No config, simulated mail options:", options);
    return { success: true, simulated: true };
  }

  const config = configSnap.data();
  const { type, senderEmail } = config;
  const finalSender = options.fromAddress || senderEmail || 'ankith.ravindran@mailplus.com.au';

  if (type === 'smtp') {
    const { host, port, username, password } = config;
    if (!host || host.includes('example.com') || !password || password === 'invalid' || password === 'test' || password === '') {
      console.log('Simulated SMTP, mail options:', options);
      return { success: true, simulated: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '587', 10),
      secure: config.secure === 'ssl',
      auth: { user: username || senderEmail, pass: password },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${config.senderName || 'MailPlus Outbound'}" <${finalSender}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    return { success: true, simulated: false };

  } else if (type === 'graph') {
    const { clientId, tenantId, clientSecret } = config;
    if (!clientId || !tenantId || !clientSecret || clientSecret === 'invalid' || clientSecret === 'test' || clientSecret === '') {
      console.log('Simulated Graph, mail options:', options);
      return { success: true, simulated: true };
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${finalSender}/sendMail`;
    const mailPayload = {
      message: {
        subject: options.subject,
        body: { contentType: 'HTML', content: options.html },
        toRecipients: options.to.split(',').map(e => ({ emailAddress: { address: e.trim() } }))
      },
      saveToSentItems: 'true'
    };

    const graphRes = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailPayload)
    });

    if (graphRes.ok) {
      return { success: true, simulated: false };
    } else {
      const errText = await graphRes.text();
      console.warn(`Primary sender ${finalSender} failed: ${errText}. Trying fallback sender ${senderEmail}`);
      const fallbackUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mailPayload)
      });
      if (fallbackRes.ok) {
        return { success: true, simulated: false };
      }
      throw new Error(`Graph API send failure: ${await fallbackRes.text()}`);
    }
  }

  return { success: true, simulated: true };
}

async function main() {
  function getSydneyDateRange(dateStr) {
    const [day, month, year] = dateStr.split("-").map(Number);
    const d10 = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000+10:00`);
    const sydneyDayStr = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit' }).format(d10);
    const offsetStr = (parseInt(sydneyDayStr, 10) === day) ? '+10:00' : '+11:00';

    const targetStart = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000${offsetStr}`);
    const targetEnd = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999${offsetStr}`);
    return { targetStart, targetEnd };
  }

  function getYesterdaySydneyDateString() {
    const sydneyNowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const [y, m, d] = sydneyNowStr.split('-').map(Number);
    const sydneyTodayDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const sydneyYesterdayDate = new Date(sydneyTodayDate.getTime() - 24 * 60 * 60 * 1000);

    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(sydneyYesterdayDate);

    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';

    return `${day}-${month}-${year}`;
  }

  const dateString = getYesterdaySydneyDateString();
  const { targetStart, targetEnd } = getSydneyDateRange(dateString);

  console.log(`\n--- Fetching LocalMile jobs for date ${dateString} ---`);

  const jobsSnap = await db.collectionGroup('localMileJobs').get();
  console.log(`Total localMileJobs documents found across all leads: ${jobsSnap.docs.length}`);

  const leadCache = new Map();
  const matchingJobs = [];

  for (const doc of jobsSnap.docs) {
    const data = doc.data();
    const createdAtDate = parseDate(data.createdAt) || parseDate(data.updatedAt);

    if (!createdAtDate) continue;
    if (createdAtDate < targetStart || createdAtDate > targetEnd) continue;

    const parentLeadRef = doc.ref.parent.parent;
    const leadId = parentLeadRef ? parentLeadRef.id : 'Unknown';

    let leadData = leadCache.get(leadId);
    if (!leadData && parentLeadRef) {
      const leadSnap = await parentLeadRef.get();
      if (leadSnap.exists) {
        leadData = leadSnap.data();
        leadCache.set(leadId, leadData);
      }
    }

    const customerName = leadData?.companyName || leadData?.tradingName || leadData?.displayName || leadData?.name || (leadData?.firstName ? `${leadData.firstName} ${leadData.lastName || ''}`.trim() : '') || leadId;
    const customerStatus = leadData?.customerStatus || leadData?.status || 'N/A';
    const franchisee = leadData?.franchisee || leadData?.franchiseeName || leadData?.franchise || leadData?.assignedFranchisee || leadData?.franchiseeCode || 'Unassigned';

    const trialsRemaining = leadData?.localMileTrialsRemaining !== undefined && leadData?.localMileTrialsRemaining !== null
      ? Number(leadData.localMileTrialsRemaining)
      : (leadData?.jobCount !== undefined ? Math.max(0, 5 - Number(leadData.jobCount || 0)) : 5);

    const statusRaw = (data.status || 'created').toString();
    const statusLower = statusRaw.toLowerCase().trim();
    const isCompleted = ['completed', 'complete', 'delivered', 'done', 'finished'].includes(statusLower);

    matchingJobs.push({
      jobId: data.jobId || doc.id,
      status: statusRaw,
      createdAtStr: createdAtDate.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' }),
      leadId,
      customerName,
      customerStatus,
      franchisee,
      trialsRemaining,
      isCompleted
    });
  }

  const totalJobsCreated = matchingJobs.length;
  const completedJobsCount = matchingJobs.filter(j => j.isCompleted).length;
  const pendingJobsCount = totalJobsCreated - completedJobsCount;
  const uniqueCustomersCount = new Set(matchingJobs.map(j => j.leadId)).size;

  console.log(`Summary: Total created: ${totalJobsCreated}, Completed: ${completedJobsCount}, Pending: ${pendingJobsCount}, Unique Customers: ${uniqueCustomersCount}`);

  const jobRowsHtml = matchingJobs.map((job) => {
    const isCompleted = job.isCompleted;
    const statusBadgeColor = isCompleted ? '#166534' : job.status.toLowerCase() === 'recredited' ? '#92400e' : '#0369a1';
    const statusBadgeBg = isCompleted ? '#f0fdf4' : job.status.toLowerCase() === 'recredited' ? '#fef3c7' : '#f0f9ff';
    const statusBadgeBorder = isCompleted ? '#bbf7d0' : job.status.toLowerCase() === 'recredited' ? '#fde68a' : '#bae6fd';

    return `
      <tr style="border-bottom: 1px solid #edf2f7;">
        <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          <strong style="color: #095c7b;">${job.customerName}</strong>
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${job.customerStatus}
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${job.franchisee}
        </td>
        <td align="center" style="padding: 10px 12px; font-size: 12px; color: #095c7b; font-weight: 600; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
          ${job.trialsRemaining} / 5
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-family: monospace;">
          #${job.jobId}
        </td>
        <td align="center" style="padding: 10px 12px;">
          <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; color: ${statusBadgeColor}; background-color: ${statusBadgeBg}; border: 1px solid ${statusBadgeBorder}; border-radius: 12px; text-transform: capitalize;">
            ${job.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily LocalMile Jobs Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
          <!-- Brand Banner Header -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 25px; background-color: #ffffff;">
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily LocalMile Jobs Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Summary of LocalMile jobs created yesterday (<strong>${dateString}</strong>), including completion status breakdown, customer status, franchisee assignments, and remaining trial credits.
              </p>
              
              <!-- KPI Summary Grid -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border-collapse: collapse;">
                <tr>
                  <td width="25%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Total Jobs Created</div>
                    <div style="font-size: 22px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${totalJobsCreated}</div>
                  </td>
                  <td width="25%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Completed Jobs</div>
                    <div style="font-size: 22px; font-weight: 700; color: #166534; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${completedJobsCount}</div>
                  </td>
                  <td width="25%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Not Completed</div>
                    <div style="font-size: 22px; font-weight: 700; color: #b45309; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${pendingJobsCount}</div>
                  </td>
                  <td width="25%" style="padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #edf2f7; border-left: 0; text-align: center;">
                    <div style="font-size: 10px; color: #718096; text-transform: uppercase; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Unique Customers</div>
                    <div style="font-size: 22px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; margin-top: 4px;">${uniqueCustomersCount}</div>
                  </td>
                </tr>
              </table>

              <!-- Jobs Breakdown Table -->
              <h3 style="margin: 25px 0 10px; font-size: 15px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Customer & Job Breakdown</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Customer Name</th>
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Status</th>
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Franchisee</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Trials Left</th>
                    <th align="left" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Job Ref</th>
                    <th align="center" style="padding: 10px 12px; font-size: 11px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; text-transform: uppercase;">Job Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${jobRowsHtml || `<tr><td colspan="6" align="center" style="padding: 20px; font-size: 13px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No LocalMile jobs were created yesterday (${dateString}).</td></tr>`}
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

  const targetRecipient = 'ankith.ravindran@mailplus.com.au';
  console.log(`Sending updated test email with Trials Left column to ${targetRecipient}...`);
  const res = await sendAutomatedEmail({
    to: targetRecipient,
    subject: `Daily LocalMile Jobs Report - ${dateString}`,
    html: emailHtml,
    fromAddress: 'ankith.ravindran@mailplus.com.au'
  });

  console.log('Result:', res);
}

main().catch(console.error);
