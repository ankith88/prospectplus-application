import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';

// Default sender
const SENDER_EMAIL = 'customerservice@mailplus.com.au';

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
    html: (customerName: string, ticketId: string, barcode: string, resolutionSummary: string, reopeningDays: number = 7) => {
      const firstName = customerName ? customerName.trim().split(' ')[0] : 'Customer';
      return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; padding: 20px; border-radius: 8px;">
          <p>Hi ${firstName},</p>
          <p>Good news — your enquiry about consignment <strong>${barcode || 'N/A'}</strong> has been resolved.</p>
          
          <div style="background-color: #f4fbf7; border-left: 4px solid #2ecc71; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #27ae60; display: block; margin-bottom: 5px;">Outcome:</strong>
            <p style="margin: 0; font-size: 14px;">${resolutionSummary}</p>
          </div>

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
        } else if (afterData.status === 'Resolved' || afterData.status === 'Closed') {
          // Status -> Resolved / Closed
          functions.logger.info(`Ticket ${ticketId} status changed to Resolved/Closed. Sending notification.`);
          const barcode = afterData.trackingIdentifier || 'N/A';
          const resolutionSummary = afterData.resolutionSummary || afterData.notes || 'Your enquiry has been successfully resolved by our customer service team.';
          await sendAutomatedEmail({
            to: recipient,
            subject: EMAIL_TEMPLATES.resolved.subject(displayTicketId),
            html: EMAIL_TEMPLATES.resolved.html(customerName, displayTicketId, barcode, resolutionSummary, 7),
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
        const userSnap = await db.collection('users').where('displayName', '==', assignedUser).limit(1).get();
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
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
      .where('status', 'not-in', ['Closed', 'Resolved'])
      .get();

    for (const doc of ticketsSnap.docs) {
      const data = doc.data();
      const followUp = data.followUpDate; // Check for YYYY-MM-DD prefix match

      if (followUp && followUp.startsWith(todayStr)) {
        const assignedUser = data.assignedUser;
        if (assignedUser && assignedUser !== 'unassigned') {
          const userSnap = await db.collection('users').where('displayName', '==', assignedUser).limit(1).get();
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
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
      .where('status', 'in', ['Open', 'Damaged', 'Lost in Transit'])
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
