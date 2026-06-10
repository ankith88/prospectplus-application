import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { logEmailServer } from '@/services/firebase-server';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadIds, templateId, targetEmail, customSenderEmail, overrideContactName } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid leadIds parameter.' },
        { status: 400 }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        { success: false, message: 'Missing templateId parameter.' },
        { status: 400 }
      );
    }

    const urlObj = new URL(request.url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // 1. Fetch Active Outlook Config for credentials mapping if needed
    const configSnap = await db.collection('outlook_integrations').doc('active_config').get();
    const activeConfig = configSnap.exists ? configSnap.data() : { type: 'graph', senderEmail: 'campaigns@mailplus.com.au' };
    const senderEmail = activeConfig?.senderEmail || 'campaigns@mailplus.com.au';

    // 2. Fetch the Email Template
    const templateDoc = await db.collection('marketing_templates').doc(templateId).get();
    if (!templateDoc.exists) {
      return NextResponse.json(
        { success: false, message: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    const templateData = templateDoc.data();
    const templateBody = templateData?.body || '';
    const subjectLine = templateData?.subject || 'Outbound Update';

    // 3. Fetch suppression list
    const suppressionSnap = await db.collection('marketing_suppression_list').get();
    const suppressedEmails = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

    // Cache for Account Manager phones
    const amPhoneCache = new Map<string, string>();

    let totalSent = 0;
    let totalBounced = 0;
    const nowStr = new Date().toISOString();

    // 4. Process each lead
    for (const leadId of leadIds) {
      const leadDoc = await db.collection('leads').doc(leadId).get();
      if (!leadDoc.exists) continue;

      const leadData = leadDoc.data() || {};
      const companyName = leadData.companyName || 'Unknown Company';
      const salesRepAssigned = leadData.salesRepAssigned || 'Sales Representative';
      const franchiseeName = leadData.franchisee || 'MailPlus';

      // Fetch contacts
      const contactsSnap = await leadDoc.ref.collection('contacts').get();
      const recipients: { email: string; name: string; contactId?: string; localMilePlusAuthLink?: string }[] = [];

      if (targetEmail) {
        let found = false;
        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            if (email && email.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
              const nameToUse = overrideContactName !== undefined ? overrideContactName : (cData.name || 'Valued Customer');
              recipients.push({ email: cData.email, name: nameToUse, contactId: contactDoc.id, localMilePlusAuthLink: cData.localMilePlusAuthLink || '' });
              found = true;
            }
          });
        }
        if (!found) {
          if (leadData.customerServiceEmail && leadData.customerServiceEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
            const nameToUse = overrideContactName !== undefined ? overrideContactName : companyName;
            recipients.push({ email: leadData.customerServiceEmail, name: nameToUse });
          } else {
            const nameToUse = overrideContactName !== undefined ? overrideContactName : companyName;
            recipients.push({ email: targetEmail, name: nameToUse });
          }
        }
      } else {
        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            const name = overrideContactName !== undefined ? overrideContactName : (cData.name || 'Valued Customer');
            
            if (email && cData.sendEmail !== 'no' && !cData.optedOut) {
              recipients.push({ email, name, contactId: contactDoc.id, localMilePlusAuthLink: cData.localMilePlusAuthLink || '' });
            }
          });
        } else {
          const email = leadData.customerServiceEmail;
          if (email) {
            const nameToUse = overrideContactName !== undefined ? overrideContactName : companyName;
            recipients.push({ email, name: nameToUse });
          }
        }
      }

      // Send to each valid recipient
      for (const rec of recipients) {
        const emailLower = rec.email.toLowerCase().trim();

        // Skip suppressed
        if (suppressedEmails.has(emailLower)) {
          console.log(`[Direct Mail] Email suppressed: ${rec.email}`);
          continue;
        }

        const deliveryRef = db.collection('campaign_deliveries').doc();
        const deliveryId = deliveryRef.id;

        // Compile placeholders
        let compiledBody = templateBody;
        const contactFirstName = rec.name.split(' ')[0];

        // Fetch AM Mobile using Cache
        const amName = leadData.accountManagerAssigned || leadData.salesRepAssigned || '';
        let amMobile = amPhoneCache.get(amName);
        if (amMobile === undefined) {
          if (amName) {
            const userQuery = await db.collection('users').where('displayName', '==', amName).limit(1).get();
            if (!userQuery.empty) {
              amMobile = userQuery.docs[0].data().phoneNumber || '';
            } else {
              amMobile = '';
            }
          } else {
             amMobile = '';
          }
          amPhoneCache.set(amName, amMobile);
        }

        compiledBody = compiledBody.replace(/\{\{Contact\.Name\}\}/gi, rec.name);
        compiledBody = compiledBody.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
        compiledBody = compiledBody.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/gi, rec.localMilePlusAuthLink || '');
        compiledBody = compiledBody.replace(/\{\{Company\.Name\}\}/gi, companyName);
        compiledBody = compiledBody.replace(/\{\{SalesRep\.Name\}\}/gi, salesRepAssigned);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.Name\}\}/gi, franchiseeName);
        compiledBody = compiledBody.replace(/\{\{sender\.email\}\}/gi, customSenderEmail || senderEmail);
        
        compiledBody = compiledBody.replace(/\{\{AccountManager\.Name\}\}/gi, amName);
        compiledBody = compiledBody.replace(/\{\{AccountManager\.Mobile\}\}/gi, amMobile);
        compiledBody = compiledBody.replace(/\{\{AccountManager\.Calendly\}\}/gi, leadData.salesRepAssignedCalendlyLink || '');
        compiledBody = compiledBody.replace(/\{\{Lead\.City\}\}/gi, leadData.address?.city || '');
        compiledBody = compiledBody.replace(/\{\{Trials\.Remaining\}\}/gi, (leadData.localMileTrialsRemaining || 0).toString());

        const wrappedBody = wrapLinks(compiledBody, deliveryId, baseUrl);

        // Handle custom unsubscribe links or fallback to default footer
        const unsubscribeUrl = `${baseUrl}/api/campaigns/track/unsubscribe?id=${deliveryId}`;
        
        let finalHtml = wrappedBody;
        if (finalHtml.includes('{{unsubscribe_link}}') || finalHtml.includes('{{unsubscribe_url}}')) {
          finalHtml = finalHtml.replace(/\{\{unsubscribe_link\}\}/gi, unsubscribeUrl);
          finalHtml = finalHtml.replace(/\{\{unsubscribe_url\}\}/gi, unsubscribeUrl);
        } else {
          // Fallback regulatory footer
          const footerUnsubscribe = `
            <br><br>
            <div style="font-size:12px;color:#777;border-top:1px solid #eee;padding-top:12px;font-family:sans-serif;margin-top:24px;text-align:left;">
              This email was sent by ${activeConfig?.senderName || 'MailPlus'} via MailPlus Outbound System.
              <br>
              If you no longer wish to receive marketing communications, you can 
              <a href="${unsubscribeUrl}" style="color:#095c7b;text-decoration:underline;">unsubscribe here</a>.
            </div>
          `;
          finalHtml += footerUnsubscribe;
        }

        // Inject tracking pixel
        const trackingPixel = `<img src="${baseUrl}/api/campaigns/track/open?id=${deliveryId}" width="1" height="1" alt="" style="display:none;" />`;
        finalHtml += trackingPixel;

        // Real or Simulated Send
        const isBouncedSimulated = emailLower.endsWith('@bounce.com') || emailLower.includes('invalid') || emailLower.includes('hardbounce');
        
        let status = 'delivered';
        let isRealBounced = false;
        let errorMessage = '';

        if (isBouncedSimulated) {
          status = 'bounced';
        } else {
          // Attempt real sending via physical transmission module
          const sendResult = await sendPhysicalEmail({
            to: rec.email,
            subject: subjectLine,
            html: finalHtml,
            customFrom: customSenderEmail
          });

          if (!sendResult.success) {
            status = 'bounced';
            isRealBounced = true;
            errorMessage = sendResult.error || 'Transmission failed.';
          } else if (sendResult.simulated) {
            console.log(`[Direct Mail] Simulated successful dispatch to: ${rec.email} (sender: ${customSenderEmail || 'default'})`);
          } else {
            console.log(`[Direct Mail] Real physical email dispatched to: ${rec.email} (sender: ${customSenderEmail || 'default'})`);
          }
        }

        const isBounced = status === 'bounced';

        // Write delivery record
        await deliveryRef.set({
          id: deliveryId,
          campaignId: 'direct_send',
          leadId,
          contactId: rec.contactId || null,
          leadEmail: rec.email,
          leadName: rec.name,
          companyName,
          salesRepName: salesRepAssigned,
          sentAt: nowStr,
          status,
          bounceType: isBounced ? 'hard' : null,
          openedAt: [],
          clickedAt: [],
          unsubscribedAt: null
        });

        // Add to lead activity logs
        await leadDoc.ref.collection('activity').add({
          type: 'Email',
          date: nowStr,
          notes: `Quick email sent: '${subjectLine}' using template '${templateData?.name || 'Quick Layout'}'. Sender: ${customSenderEmail || senderEmail}. Status: ${status === 'bounced' ? `Bounced${isRealBounced ? ` (Error: ${errorMessage})` : ' (Hard)'}` : 'Delivered (Outlook MailPlus network)'}.`,
          author: salesRepAssigned
        });

        await logEmailServer(leadId, {
          subject: subjectLine,
          bodyHtml: finalHtml,
          sentAt: nowStr,
          sender: customSenderEmail || senderEmail,
          recipient: rec.email,
          status: status
        }, 'leads');

        totalSent++;
        if (isBounced) {
          totalBounced++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Direct dispatch completed. Sent to ${totalSent} recipient(s).`,
      metrics: {
        sent: totalSent,
        bounced: totalBounced
      }
    });

  } catch (error: any) {
    console.error('Error in send-direct API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error during direct send.' },
      { status: 500 }
    );
  }
}

function wrapLinks(html: string, deliveryId: string, baseUrl: string): string {
  const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["']/gi;
  return html.replace(anchorRegex, (match, url) => {
    if (url.includes('/api/campaigns/track/')) {
      return match;
    }
    const trackingUrl = `${baseUrl}/api/campaigns/track/click?id=${deliveryId}&url=${encodeURIComponent(url)}`;
    return match.replace(url, trackingUrl);
  });
}
