import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';

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

export async function runLocalMileJobsReport(dateString: string, recipients: string[], fromAddress?: string): Promise<any> {
  const db = admin.firestore();
  functions.logger.info(`Generating LocalMile jobs report for date: ${dateString}`);

  // parse target date (DD-MM-YYYY)
  const [day, month, year] = dateString.split("-").map(Number);
  const targetStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const targetEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Query all LocalMile jobs across all leads
  const jobsSnap = await db.collectionGroup('localMileJobs').get();

  const leadCache = new Map<string, any>();

  interface LocalMileJobReportItem {
    jobId: string;
    status: string;
    createdAtStr: string;
    leadId: string;
    customerName: string;
    customerStatus: string;
    franchisee: string;
    trialsRemaining: number;
    isCompleted: boolean;
  }

  const matchingJobs: LocalMileJobReportItem[] = [];

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

  for (const recipient of recipients) {
    await sendAutomatedEmail({
      to: recipient,
      subject: `Daily LocalMile Jobs Report - ${dateString}`,
      html: emailHtml,
      customFrom: fromAddress
    });
  }
}

export const dailyLocalMileJobsReport = functions
  .region('australia-southeast1')
  .pubsub.schedule('every 60 minutes')
  .timeZone('Australia/Sydney')
  .onRun(async () => {
    functions.logger.info('Executing dailyLocalMileJobsReport scheduled task');
    const db = admin.firestore();

    let recipients: string[] = ['ankith.ravindran@mailplus.com.au'];
    let frequency = '06:00';
    let fromAddress = 'ankith.ravindran@mailplus.com.au';

    try {
      const doc = await db.collection('settings').doc('daily_localmile_jobs_report').get();
      if (doc.exists) {
        const data = doc.data();
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
        await db.collection('settings').doc('daily_localmile_jobs_report').set({
          recipients,
          frequency,
          fromAddress
        });
      }
    } catch (err) {
      functions.logger.error('Failed to load daily_localmile_jobs_report settings', err);
    }

    if (frequency === 'disabled') {
      functions.logger.info('Daily LocalMile jobs report is disabled. Skipping execution.');
      return;
    }

    const sydneyHourStr = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: 'numeric',
      hour12: false
    }).format(new Date());

    const currentHour = parseInt(sydneyHourStr, 10);
    const targetHour = parseInt(frequency.split(':')[0], 10);

    if (currentHour !== targetHour) {
      functions.logger.info(`Current Sydney hour is ${currentHour}, target hour is ${targetHour}. Skipping execution.`);
      return;
    }

    const sydneyFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const now = new Date();
    now.setDate(now.getDate() - 1);
    const parts = sydneyFormatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const dateString = `${day}-${month}-${year}`;

    try {
      await runLocalMileJobsReport(dateString, recipients, fromAddress);
      functions.logger.info(`Successfully sent Daily LocalMile Jobs Report for ${dateString}`);
    } catch (error) {
      functions.logger.error('Error executing Daily LocalMile Jobs Report:', error);
    }
  });
