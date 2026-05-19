import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadIds, templateId, targetEmail } = body;

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

      // Fetch contacts
      const contactsSnap = await leadDoc.ref.collection('contacts').get();
      const recipients: { email: string; name: string; contactId?: string }[] = [];

      if (targetEmail) {
        let found = false;
        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            if (email && email.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
              recipients.push({ email: cData.email, name: cData.name || 'Valued Customer', contactId: contactDoc.id });
              found = true;
            }
          });
        }
        if (!found) {
          if (leadData.customerServiceEmail && leadData.customerServiceEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
            recipients.push({ email: leadData.customerServiceEmail, name: companyName });
          } else {
            recipients.push({ email: targetEmail, name: companyName });
          }
        }
      } else {
        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            const name = cData.name || 'Valued Customer';
            
            if (email && cData.sendEmail !== 'no' && !cData.optedOut) {
              recipients.push({ email, name, contactId: contactDoc.id });
            }
          });
        } else {
          const email = leadData.customerServiceEmail;
          if (email) {
            recipients.push({ email, name: companyName });
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
        compiledBody = compiledBody.replace(/\{\{Contact\.Name\}\}/g, rec.name);
        compiledBody = compiledBody.replace(/\{\{Company\.Name\}\}/g, companyName);
        compiledBody = compiledBody.replace(/\{\{SalesRep\.Name\}\}/g, salesRepAssigned);

        const wrappedBody = wrapLinks(compiledBody, deliveryId, baseUrl);

        // Footer with unsubscribe
        const footerUnsubscribe = `
          <br><br>
          <div style="font-size:12px;color:#777;border-top:1px solid #eee;padding-top:12px;font-family:sans-serif;margin-top:24px;">
            This email was sent by ${activeConfig?.senderName || 'MailPlus'} via MailPlus Outbound System.
            <br>
            If you no longer wish to receive marketing communications, you can 
            <a href="${baseUrl}/api/campaigns/track/unsubscribe?id=${deliveryId}" style="color:#095c7b;text-decoration:underline;">unsubscribe here</a>.
          </div>
        `;

        let finalHtml = wrappedBody + footerUnsubscribe;

        // Inject tracking pixel
        const trackingPixel = `<img src="${baseUrl}/api/campaigns/track/open?id=${deliveryId}" width="1" height="1" alt="" style="display:none;" />`;
        finalHtml += trackingPixel;

        // Bounce simulation
        const isBounced = emailLower.endsWith('@bounce.com') || emailLower.includes('invalid') || emailLower.includes('hardbounce');
        const status = isBounced ? 'bounced' : 'delivered';

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
          notes: `Quick email sent: '${subjectLine}' using template '${templateData?.name || 'Quick Layout'}'. Status: ${status === 'bounced' ? 'Bounced (Hard)' : 'Delivered (Outlook MailPlus network)'}.`,
          author: salesRepAssigned
        });

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
