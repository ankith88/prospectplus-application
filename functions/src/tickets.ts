import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';

// Default sender
const SENDER_EMAIL = 'tracking@mailplus.com.au';

// Customizable email templates (Subject and HTML body)
// These can be modified easily once the user provides their custom text/HTML.
const EMAIL_TEMPLATES = {
  ticketCreated: {
    subject: (ticketId: string) => `We've received your enquiry — ${ticketId}`,
    html: (customerName: string, ticketId: string, enquiryType: string, barcode: string) => {
      const firstName = customerName ? customerName.trim().split(' ')[0] : 'Customer';
      return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
          <p>Hi ${firstName},</p>
          <p>Thanks for getting in touch. We've logged your enquiry about consignment <strong>${barcode || 'N/A'}</strong> and our support team is on it.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8f9fa; border-radius: 6px; overflow: hidden;">
            <tr>
              <td style="padding: 10px 15px; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 140px;">Your reference:</td>
              <td style="padding: 10px 15px; border-bottom: 1px solid #dee2e6;">${ticketId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 15px; font-weight: bold;">Enquiry type:</td>
              <td style="padding: 10px 15px;">${enquiryType || 'General Enquiry'}</td>
            </tr>
          </table>

          <p>A team member will review and be in touch within 48 hours. You don't need to do anything — we'll keep you posted here.</p>
          
          <p style="margin-top: 25px; font-size: 13px; color: #666; border-top: 1px solid #dee2e6; padding-top: 15px;">
            Need us sooner? Call <strong>1300 65 65 95</strong>, Mon–Fri 9am–5pm AEST.<br>
            <strong>— MailPlus Support</strong>
          </p>
        </div>
      `;
    }
  },
  awaitingCustomer: {
    subject: (ticketId: string) => `We need a hand from you — ${ticketId}`,
    html: (customerName: string, ticketId: string, whatWeNeed: string) => {
      const firstName = customerName ? customerName.trim().split(' ')[0] : 'Customer';
      return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
          <p>Hi ${firstName},</p>
          <p>To keep your enquiry moving, we just need a little more from you:</p>
          
          <div style="background-color: #fcf8e3; border-left: 4px solid #f0ad4e; padding: 15px; margin: 20px 0; border-radius: 4px; color: #8a6d3b;">
            <p style="margin: 0; font-size: 14px;">${whatWeNeed}</p>
          </div>

          <p>Reply to this email and your response will attach to your case automatically. While we wait to hear back, your case is on hold.</p>
          
          <p style="margin-top: 25px; font-size: 13px; color: #666; border-top: 1px solid #dee2e6; padding-top: 15px;">
            <strong>— MailPlus Support</strong>
          </p>
        </div>
      `;
    }
  },
  resolved: {
    subject: (ticketId: string) => `Your enquiry is resolved — ${ticketId}`,
    html: (customerName: string, ticketId: string, barcode: string, reopeningDays: number = 7) => {
      const firstName = customerName ? customerName.trim().split(' ')[0] : 'Customer';
      return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
          <p>Hi ${firstName},</p>
          <p>Good news — your enquiry about consignment <strong>${barcode || 'N/A'}</strong> has been resolved.</p>

          <p>If anything's not quite right, just reply to this email within ${reopeningDays} days and we'll reopen your case. Otherwise, thanks for your patience.</p>
          
          <p style="margin-top: 25px; font-size: 13px; color: #666; border-top: 1px solid #dee2e6; padding-top: 15px;">
            <strong>— MailPlus Support · 1300 65 65 95</strong>
          </p>
        </div>
      `;
    }
  },
  missedSweepAlert: {
    subject: (barcode: string, depot: string) => `⚠ MISSED SWEEP — ${barcode} at ${depot}`,
    html: (barcode: string, ticketId: string, scanEvent: string, location: string, time: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
        <p><strong>${barcode || 'Consignment'}</strong> (ticket <strong>${ticketId}</strong>) just recorded a new scan:</p>
        
        <div style="background-color: #fcf8e3; border-left: 4px solid #f0ad4e; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px;"><strong>${scanEvent || 'New scan event'}</strong> at <strong>${location || 'N/A'}</strong>, <strong>${time || 'N/A'}</strong>.</p>
        </div>

        <p style="font-size: 12px; color: #666; font-style: italic;">Sent because movement notifications are switched on for this ticket.</p>
      </div>
    `
  },
  followUpReminder: {
    subject: (ticketId: string) => `Reminder: follow-up due — ${ticketId}`,
    html: (ticketId: string, customer: string, issueSummary: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
        <p>Your follow-up date for ticket <strong>${ticketId}</strong> is today.</p>
        
        <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 15px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Customer:</strong> ${customer}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Issue:</strong> ${issueSummary}</p>
        </div>

        <p>Open the case to action or reschedule.</p>
      </div>
    `
  },
  movementNotification: {
    subject: "Movement notification",
    html: (agentName: string, ticketId: string, scanType: string, location: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>New Tracking Scan Notification</h2>
        <p>Hi ${agentName || 'Agent'},</p>
        <p>A new tracking scan has been registered for your watched ticket <strong>${ticketId}</strong>.</p>
        <p><strong>Scan Type:</strong> ${scanType || 'N/A'}</p>
        <p><strong>Location:</strong> ${location || 'N/A'}</p>
        <p>Please check the ticket in ProspectPlus for complete history.</p>
        <p>Kind regards,<br>ProspectPlus System Alert</p>
      </div>
    `
  },
  slaEscalation: {
    subject: (ticketId: string) => `🔴 SLA breached — ${ticketId}`,
    html: (ticketId: string, priority: string, agent: string, customer: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
        <p>Ticket <strong>${ticketId}</strong> has breached its SLA and is now Red.</p>
        
        <div style="background-color: #fff5f5; border: 1px solid #fed7d7; padding: 15px; margin: 20px 0; border-radius: 6px; color: #c53030;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Priority:</strong> ${priority}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Assigned:</strong> ${agent}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Customer:</strong> ${customer}</p>
        </div>

        <p>Please review and reassign or escalate as needed.</p>
      </div>
    `
  }
};

/**
 * 1. Ticket created (web form or agent) -> Send welcome / receipt email to customer
 */
export const onTicketCreated = functions
  .region('australia-southeast1')
  .firestore.document('tickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticketData = snap.data();
    const ticketId = snap.id;

    // Only send out the automated email on ticket creation when it has been created from the website via the API
    if (ticketData.source !== 'Website' && !ticketData.createdViaWebsiteApi) {
      functions.logger.info(`Ticket ${ticketId} was created with source ${ticketData.source || 'N/A'} (not 'Website'). Skipping automated email.`);
      return;
    }

    const recipient = ticketData.customerEmail;

    if (!recipient) {
      functions.logger.warn(`Ticket ${ticketId} created without customerEmail. Skipping email trigger.`);
      return;
    }

    const customerName = ticketData.customerContactName || ticketData.enquirerName || 'Customer';
    const enquiryType = ticketData.enquiryType || 'General Enquiry';
    const barcode = ticketData.trackingIdentifier || 'N/A';
    const displayTicketId = ticketData.ticketNumber || ticketId;

    const mailOptions = {
      to: recipient,
      subject: EMAIL_TEMPLATES.ticketCreated.subject(displayTicketId),
      html: EMAIL_TEMPLATES.ticketCreated.html(customerName, displayTicketId, enquiryType, barcode),
      customFrom: SENDER_EMAIL
    };

    functions.logger.info(`Sending ticket created confirmation to ${recipient} for ticket ${displayTicketId}`);
    const result = await sendAutomatedEmail(mailOptions);
    if (!result.success) {
      functions.logger.error(`Failed to send ticket created email to ${recipient}: ${result.error}`);
    }
  });

/**
 * 2. Status-based triggers, Missed Sweep, and Movement notifications on update
 */
export const onTicketUpdated = functions
  .region('australia-southeast1')
  .firestore.document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const ticketId = change.after.id;
    const displayTicketId = afterData.ticketNumber || ticketId;
    const db = admin.firestore();

    const beforeScans = beforeData.enrichedScans || [];
    const afterScans = afterData.enrichedScans || [];

    // 2.1 Detect status changes
    if (afterData.status !== beforeData.status) {
      const recipient = afterData.customerEmail;
      const customerName = afterData.customerContactName || afterData.enquirerName || 'Customer';

      if (recipient) {
        if (afterData.status === 'Awaiting Customer') {
          // Status -> Awaiting Customer
          functions.logger.info(`Ticket ${ticketId} status changed to Awaiting Customer. Sending notification.`);
          const whatWeNeed = afterData.pendingDetails || afterData.notes || 'Please provide any additional details regarding your enquiry.';
          await sendAutomatedEmail({
            to: recipient,
            subject: EMAIL_TEMPLATES.awaitingCustomer.subject(displayTicketId),
            html: EMAIL_TEMPLATES.awaitingCustomer.html(customerName, displayTicketId, whatWeNeed),
            customFrom: SENDER_EMAIL
          });
        }
      }

      // 2.2 Detect Missed Sweep alert when ticket gets escalated to Awaiting Operations
      if (afterData.status === 'Awaiting Operations' && beforeData.status !== 'Awaiting Operations') {
        functions.logger.info(`Ticket ${ticketId} escalated to Operations. Sending Missed-sweep alert.`);
        const barcode = afterData.trackingIdentifier || 'N/A';
        const depot = afterData.depot || 'Botany Depot';
        const latestScan = afterScans.length > 0 ? afterScans[afterScans.length - 1] : {};
        const scanEvent = latestScan.scan_type || 'Missed Sweep Alert';
        const location = latestScan.partnerLocationName || latestScan.depot_id || depot;
        const time = latestScan.formattedTime || latestScan.updated_at || new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });

        const opsEmail = 'operations@mailplus.com.au, fiona.harrison@mailplus.com.au'; 
        await sendAutomatedEmail({
          to: opsEmail,
          subject: EMAIL_TEMPLATES.missedSweepAlert.subject(barcode, depot),
          html: EMAIL_TEMPLATES.missedSweepAlert.html(barcode, displayTicketId, scanEvent, location, time),
          customFrom: SENDER_EMAIL
        });
      }
    }

    // 2.3 New tracking scan notification (toggle on)
    // Compare scans length or tracking history length to detect new scans

    if (afterScans.length > beforeScans.length && afterData.movementNotificationEnabled === true) {
      const assignedUser = afterData.assignedUser;
      if (assignedUser && assignedUser !== 'unassigned') {
        // Find assigned agent's email
        const usersSnap = await db.collection('users').get();
        const matchedUser = usersSnap.docs.find(doc => {
          const data = doc.data();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
          return fullName === assignedUser.trim().toLowerCase();
        });
        if (matchedUser) {
          const userData = matchedUser.data();
          const agentEmail = userData.email;
          if (agentEmail) {
            const latestScan = afterScans[afterScans.length - 1];
            functions.logger.info(`New tracking scan added to watched ticket ${ticketId}. Alerting agent ${agentEmail}.`);
            await sendAutomatedEmail({
              to: agentEmail,
              subject: `${EMAIL_TEMPLATES.movementNotification.subject} - [Ref: ${displayTicketId}]`,
              html: EMAIL_TEMPLATES.movementNotification.html(
                userData.firstName || assignedUser,
                displayTicketId,
                latestScan.scan_type || 'Package Movement',
                latestScan.partnerLocationName || latestScan.depot_id || 'Depot'
              ),
              customFrom: SENDER_EMAIL
            });
          }
        }
      }
    }

    // 2.4 Status propagation from child to Master Case
    const parentId = afterData.parentTicketId;
    if (parentId && beforeData.status !== afterData.status) {
      functions.logger.info(`Child ticket ${ticketId} status changed from ${beforeData.status} to ${afterData.status}. Checking parent ${parentId}.`);
      
      const sisterTicketsSnap = await db.collection('tickets')
        .where('parentTicketId', '==', parentId)
        .get();
        
      const childTickets = sisterTicketsSnap.docs.map(doc => doc.data());
      
      // Check if all sister tickets are resolved/closed
      const resolvedStatuses = ['Resolved', 'Closed', 'Lost in Transit', 'Damaged'];
      const allResolved = childTickets.every(t => resolvedStatuses.includes(t.status));
      
      const parentDocRef = db.collection('tickets').doc(parentId);
      const parentDoc = await parentDocRef.get();
      
      if (parentDoc.exists) {
        const parentData = parentDoc.data();
        if (parentData) {
          const currentParentStatus = parentData.status;
          if (allResolved && currentParentStatus !== 'Closed' && currentParentStatus !== 'Resolved') {
            functions.logger.info(`All child tickets under Master Case ${parentId} are resolved. Closing Master Case.`);
            await parentDocRef.update({ 
              status: 'Closed',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else if (!allResolved && (currentParentStatus === 'Closed' || currentParentStatus === 'Resolved')) {
            functions.logger.info(`Some child tickets under Master Case ${parentId} are open. Reopening Master Case.`);
            await parentDocRef.update({ 
              status: 'Open',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
    }
  });

/**
 * 3. Scheduled Check: Follow-up date reached (runs daily at 8:00 AM Sydney time)
 */
export const checkFollowUpReminders = functions
  .region('australia-southeast1')
  .pubsub.schedule('0 8 * * *')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    const db = admin.firestore();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    functions.logger.info(`Running checkFollowUpReminders scheduled job for date: ${todayStr}`);

    // Query open tickets where followUpDate matches today
    const ticketsSnap = await db.collection('tickets')
      .where('status', 'not-in', ['Closed', 'Resolved', 'Lost in Transit', 'Damaged'])
      .get();

    for (const doc of ticketsSnap.docs) {
      const data = doc.data();
      const followUp = data.followUpDate; // Check for YYYY-MM-DD prefix match

      if (followUp && followUp.startsWith(todayStr)) {
        const assignedUser = data.assignedUser;
        if (assignedUser && assignedUser !== 'unassigned') {
          const usersSnap = await db.collection('users').get();
          const matchedUser = usersSnap.docs.find(doc => {
            const data = doc.data();
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
            return fullName === assignedUser.trim().toLowerCase();
          });
          if (matchedUser) {
            const userData = matchedUser.data();
            const agentEmail = userData.email;
            if (agentEmail) {
              const displayTicketId = data.ticketNumber || doc.id;
              functions.logger.info(`Sending follow-up reminder to ${agentEmail} for ticket ${displayTicketId}`);
              const customer = data.customerContactName || data.customerCompany || 'Customer';
              const issueSummary = data.description || data.enquiryType || 'General Enquiry';
              await sendAutomatedEmail({
                to: agentEmail,
                subject: EMAIL_TEMPLATES.followUpReminder.subject(displayTicketId),
                html: EMAIL_TEMPLATES.followUpReminder.html(displayTicketId, customer, issueSummary),
                customFrom: SENDER_EMAIL
              });
            }
          }
        }
      }
    }
  });

/**
 * 4. Scheduled Check: Ticket SLA breaches (runs every 30 minutes)
 */
export const checkSlaEscalations = functions
  .region('australia-southeast1')
  .pubsub.schedule('every 30 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    functions.logger.info('Running SLA breach escalation checks.');

    // SLA threshold: 48 hours
    const SLA_LIMIT_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();

    // Query active tickets (SLA clock running)
    // SLA is paused for: Awaiting Operations, Awaiting IT, Closed, Resolved
    const ticketsSnap = await db.collection('tickets')
      .where('status', '==', 'Open')
      .get();

    for (const doc of ticketsSnap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;

      if (createdAt > 0 && (now - createdAt > SLA_LIMIT_MS) && !data.slaEscalated) {
        const teamLeadEmail = 'alexandra.bathman@mailplus.com.au';
        const displayTicketId = data.ticketNumber || doc.id;
        functions.logger.info(`Ticket ${doc.id} (Ref: ${displayTicketId}) breached 48-hour SLA. Escalating to ${teamLeadEmail}.`);

        const priority = data.priority || 'Standard';
        const agent = data.assignedUser || 'Unassigned';
        const customer = data.customerContactName || data.customerCompany || 'Customer';

        const result = await sendAutomatedEmail({
          to: teamLeadEmail,
          subject: EMAIL_TEMPLATES.slaEscalation.subject(displayTicketId),
          html: EMAIL_TEMPLATES.slaEscalation.html(displayTicketId, priority, agent, customer),
          customFrom: SENDER_EMAIL
        });

        if (result.success) {
          // Mark ticket as escalated to avoid duplicate alerts
          await doc.ref.update({ slaEscalated: true });
        }
      }
    }
  });

/**
 * Core logic to generate daily tickets report grouped by source, build email, and dispatch it.
 */
export async function runTicketsReport(dateString: string, recipients: string[], fromAddress?: string): Promise<any> {
  const db = admin.firestore();
  functions.logger.info(`Generating tickets report for date: ${dateString}`);

  // Parse target date (yesterday)
  // dateString is DD-MM-YYYY
  const [day, month, year] = dateString.split("-").map(Number);
  const targetStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const targetEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  // To be safe, query tickets created in the last 3 days and filter in memory
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const snapshot = await db.collection("tickets")
    .where("createdAt", ">=", threeDaysAgo.toISOString())
    .get();

  const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Check if we have Timestamp tickets as well
  const snapshotTS = await db.collection("tickets")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo))
    .get();

  const ticketsTS = snapshotTS.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Combine and deduplicate
  const allTicketsMap = new Map();
  tickets.forEach(t => allTicketsMap.set(t.id, t));
  ticketsTS.forEach(t => allTicketsMap.set(t.id, t));
  const allTickets = Array.from(allTicketsMap.values());

  // Filter yesterday's tickets
  const filteredTickets = allTickets.filter(t => {
    if (t.createdAt) {
      let createdDate: Date;
      if (typeof t.createdAt.toDate === "function") {
        createdDate = t.createdAt.toDate();
      } else {
        createdDate = new Date(t.createdAt);
      }
      return createdDate >= targetStart && createdDate <= targetEnd;
    }
    return false;
  });

  // Group by source
  const sourceCounts: Record<string, number> = {};
  filteredTickets.forEach(t => {
    let source = t.source || "Unknown";
    // Normalize source capitalization
    source = source.trim();
    if (source) {
      source = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
    } else {
      source = "Unknown";
    }
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const sourceReport = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count
  })).sort((a, b) => b.count - a.count);

  const sourceRowsHtml = sourceReport.length > 0
    ? sourceReport.map(r => `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.source}</strong></td>
          <td align="right" style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No tickets were created yesterday.</td></tr>`;

  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily Tickets by Source Report</title>
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
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Tickets by Source Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Here is the daily summary of support tickets created yesterday (<strong>${dateString}</strong>) grouped by their creation source.
              </p>
              
              <div style="margin-bottom: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #475569; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  Total Tickets Created: <strong style="color: #095c7b; font-size: 15px;">${filteredTickets.length}</strong>
                </p>
              </div>

              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Ticket Source</th>
                    <th align="right" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Ticket Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${sourceRowsHtml}
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
  const result = await sendAutomatedEmail({
    to: toStr,
    subject: `Daily Tickets by Source Report - ${dateString}`,
    html: emailHtml,
    customFrom: fromAddress || 'ankith.ravindran@mailplus.com.au'
  });

  return {
    success: result.success,
    simulated: result.simulated,
    totalTickets: filteredTickets.length,
    emailHtml
  };
}

/**
 * Scheduled Cloud Function that runs daily at 6:30 AM Sydney time.
 */
export const sendDailyTicketsReport = functions
  .region("australia-southeast1")
  .pubsub.schedule("0 * * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing scheduled sendDailyTicketsReport function...");

    const db = admin.firestore();
    let recipients = ["ankith.ravindran@mailplus.com.au", "alexandra.bathman@mailplus.com.au"];
    let frequency = "06:00"; // Default to 6 AM Sydney Time
    let fromAddress = "ankith.ravindran@mailplus.com.au";

    try {
      const configDoc = await db.collection("settings").doc("daily_tickets_report").get();
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
      functions.logger.info("Daily tickets report is disabled. Skipping execution.");
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
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;

    const dateString = `${day}-${month}-${year}`;

    try {
      await runTicketsReport(dateString, recipients, fromAddress);
    } catch (err) {
      functions.logger.error("Error executing daily tickets report:", err);
    }
  });
