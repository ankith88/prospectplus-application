import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[LocalMile Nudge Engine] Triggered execution run.');

    const now = new Date();
    const nowStr = now.toISOString();
    
    // Get all leads currently trialing LocalMile with trials remaining
    const leadsSnap = await db.collection('leads')
      .where('status', '==', 'Trialing LocalMile')
      .where('localMileTrialsRemaining', '>', 0)
      .get();

    if (leadsSnap.empty) {
      return NextResponse.json({ success: true, message: 'No leads are currently trialing LocalMile with remaining trials.' });
    }

    let processedCount = 0;
    let emailsSent = 0;

    for (const leadDoc of leadsSnap.docs) {
      const leadData = leadDoc.data();
      const leadId = leadDoc.id;
      
      const lastJobAtStr = leadData.lastLocalMileJobCreatedAt;
      if (!lastJobAtStr) continue; // Should not happen for this status, but just in case
      
      const lastJobAt = new Date(lastJobAtStr).getTime();
      const lastNudgeAtStr = leadData.lastLocalMileNudgeSentAt;
      const lastNudgeAt = lastNudgeAtStr ? new Date(lastNudgeAtStr).getTime() : 0;
      
      const timeSinceLastJob = now.getTime() - lastJobAt;
      const timeSinceLastNudge = lastNudgeAt ? (now.getTime() - lastNudgeAt) : Infinity;
      
      const HOURS_48_MS = 48 * 60 * 60 * 1000;

      // If it's been more than 48 hours since the last job AND more than 48 hours since the last nudge
      if (timeSinceLastJob >= HOURS_48_MS && timeSinceLastNudge >= HOURS_48_MS) {
        processedCount++;
        
        const currentNudgeCount = leadData.localMileNudgeCount || 0;
        const targetNudgeNumber = currentNudgeCount + 1;
        
        // Fetch the corresponding template
        const templateName = `LocalMile Trial Nudge ${targetNudgeNumber}`;
        const templatesSnap = await db.collection('marketing_templates')
          .where('name', '==', templateName)
          .limit(1)
          .get();
          
        let bodyHtml = '';
        let subject = `Don't forget your LocalMile Trial - Nudge ${targetNudgeNumber}`;
        
        if (!templatesSnap.empty) {
            const templateData = templatesSnap.docs[0].data();
            bodyHtml = templateData.body || '';
            subject = templateData.subject || subject;
        } else {
            console.warn(`[LocalMile Nudge Engine] Template '${templateName}' not found. Using default placeholder.`);
            bodyHtml = `<p>Hi {{Contact.FirstName}},</p>
            <p>We noticed you haven't booked any LocalMile jobs in the last 48 hours. You still have ${leadData.localMileTrialsRemaining} trials remaining!</p>
            <p>Log in to your account and book your next pickup.</p>
            <p>Thanks,<br/>The MailPlus Team</p>`;
        }
        
        // Personalization
        let contactFirstName = 'Valued Customer';
        let localMilePlusAuthLink = '';
        try {
          const contactsSnap = await leadDoc.ref.collection('contacts').limit(1).get();
          if (!contactsSnap.empty) {
            const firstContact = contactsSnap.docs[0].data();
            if (firstContact.name) {
              contactFirstName = firstContact.name.split(' ')[0];
            }
            if (firstContact.localMilePlusAuthLink) {
              localMilePlusAuthLink = firstContact.localMilePlusAuthLink;
            }
          }
        } catch (e) {
          console.error('Error fetching contact for nudge email:', e);
        }

        bodyHtml = bodyHtml.replace(/\{\{Contact\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
        bodyHtml = bodyHtml.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
        bodyHtml = bodyHtml.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/gi, localMilePlusAuthLink);
        bodyHtml = bodyHtml.replace(/\{\{Company\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
        bodyHtml = bodyHtml.replace(/\{\{SalesRep\.Name\}\}/gi, leadData.salesRepAssigned || 'MailPlus Team');

        const recipientEmail = leadData.customerServiceEmail;
        if (!recipientEmail) {
          console.warn(`[LocalMile Nudge Engine] Lead ${leadId} has no customerServiceEmail. Skipping email.`);
          continue;
        }
        
        const manager = (leadData.accountManagerAssigned || leadData.salesRepAssigned || '').trim().toLowerCase();
        let sender = 'info@mailplus.com.au';
        if (manager === 'lee russell') {
          sender = 'lee.russell@mailplus.com.au';
        } else if (manager === 'kerina helliwell') {
          sender = 'kerina.helliwell@mailplus.com.au';
        } else if (manager === 'luke forbes') {
          sender = 'luke.forbes@mailplus.com.au';
        } else if (manager) {
          sender = `${manager.replace(/\s+/g, '.')}@mailplus.com.au`;
        }

        bodyHtml = bodyHtml.replace(/\{\{sender\.email\}\}/gi, sender);

        // Send Email
        const sendResult = await sendPhysicalEmail({
          to: recipientEmail,
          subject,
          html: bodyHtml,
          customFrom: sender
        });

        // Log delivery record
        await db.collection('campaign_deliveries').add({
          campaignId: `localmile-trial-nudge-${targetNudgeNumber}`,
          leadId,
          leadEmail: recipientEmail,
          companyName: leadData.companyName || 'Unknown',
          sentAt: nowStr,
          status: sendResult.success ? (sendResult.simulated ? 'simulated' : 'delivered') : 'failed',
          subject,
          isNurture: true
        });

        // Log Activity on the Lead
        await leadDoc.ref.collection('activity').add({
          type: 'Email',
          date: nowStr,
          notes: `LocalMile Trial Nudge ${targetNudgeNumber} dispatched. Status: ${sendResult.success ? 'Delivered' : 'Failed'}.`,
          author: 'LocalMile Nudge Engine'
        });
        
        // Update lead tracking fields
        await leadDoc.ref.update({
            localMileNudgeCount: targetNudgeNumber,
            lastLocalMileNudgeSentAt: nowStr
        });
        
        if (sendResult.success) {
            emailsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `LocalMile Nudge run completed. Evaluated ${processedCount} applicable leads. Sent ${emailsSent} nudges.`
    });

  } catch (error: any) {
    console.error('[LocalMile Nudge Engine] Failure:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
