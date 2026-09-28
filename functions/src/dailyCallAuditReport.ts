import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import fetch = require('node-fetch');

/**
 * Scheduled Cloud Function that runs hourly and checks if it is time to trigger the Daily Call & Transcript Audit Report.
 */
export const sendDailyCallAuditReport = functions
  .region('australia-southeast1')
  .runWith({ memory: '1GB', timeoutSeconds: 540 })
  .pubsub.schedule('0,30 * * * *')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    functions.logger.info('Executing scheduled sendDailyCallAuditReport check...');

    const db = admin.firestore();
    let recipients = ['ankith.ravindran@mailplus.com.au'];
    let frequency = '17:30'; // Default to 5:30 PM Sydney Time
    let fromAddress = 'ankith.ravindran@mailplus.com.au';

    try {
      const configDoc = await db.collection('settings').doc('daily_call_audit_report').get();
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
      functions.logger.error('Failed to load daily_call_audit_report config', err);
    }

    if (frequency === 'disabled') {
      functions.logger.info('Daily call audit report is disabled. Skipping execution.');
      return;
    }

    // Check current Sydney time (hour and minute)
    const sydneyDate = new Date();
    const sydneyFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const formattedTime = sydneyFormatter.format(sydneyDate);
    const [currHour, currMin] = formattedTime.split(':').map(Number);
    const [targetHour, targetMin] = frequency.split(':').map(Number);

    // Allow a +/- 15 minute window match for hourly / half-hourly schedules
    const currentTotalMin = currHour * 60 + currMin;
    const targetTotalMin = targetHour * 60 + targetMin;
    const diff = Math.abs(currentTotalMin - targetTotalMin);

    if (diff > 16) {
      functions.logger.info(`Current Sydney time is ${formattedTime} (${currentTotalMin}m), target is ${frequency} (${targetTotalMin}m). Skipping.`);
      return;
    }

    functions.logger.info(`Triggering Daily Call Audit for schedule ${frequency} to recipients: ${recipients.join(', ')}`);

    // Determine target date (if running at or after 16:00, run for TODAY; if running morning < 12:00, run for YESTERDAY)
    const dateCalc = new Date();
    if (currHour < 12) {
      dateCalc.setDate(dateCalc.getDate() - 1);
    }

    const dayFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = dayFormatter.formatToParts(dateCalc);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const dateString = `${day}-${month}-${year}`;

    // App hosting internal URL or custom webhook
    const appUrl = process.env.APP_HOSTING_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://mailplus-outbound-leads-crm.web.app';

    try {
      const response = await fetch(`${appUrl}/api/admin/daily-call-audit/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: dateString,
          recipients,
          fromAddress
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        functions.logger.error(`Failed to trigger daily call audit API: ${response.status} - ${errText}`);
      } else {
        const respJson = await response.json();
        functions.logger.info('Daily call audit triggered and finished successfully:', respJson);
      }
    } catch (apiErr: any) {
      functions.logger.error('Error contacting daily call audit runner API:', apiErr.message);
    }
  });
