import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { logEmailServer } from '@/services/firebase-server';

import { encryptLeadId } from '@/lib/localmile-security';
import { replaceTemplatePlaceholders, extractUserMobile } from '@/lib/template-replacer';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadIds, templateId, targetEmail, cc, bcc, customSenderEmail, overrideContactName, customHtml, attachments, customSubject, notifyOnOpen, notifyUserId, notifyUserEmail, trackingCategory } = body;

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
    let baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    if (baseUrl.includes('0.0.0.0') || baseUrl.includes('127.0.0.1')) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
    }

    // Fetch brand profile details
    const brandSnap = await db.collection('brandProfiles').doc('default_company').get();
    const brandData = brandSnap.exists ? brandSnap.data() : null;
    const primaryColor = brandData?.designTokens?.primaryColor || '#095C7B';
    const fontFamily = brandData?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

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
    const subjectLine = customSubject !== undefined ? customSubject : (templateData?.subject || 'Outbound Update');

    // 3. Fetch suppression list
    const suppressionSnap = await db.collection('marketing_suppression_list').get();
    const suppressedEmails = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

    // Cache for Account Manager phones
    const amPhoneCache = new Map<string, string>();
    const usersSnap = await db.collection('users').get();
    const userMap = new Map<string, any>();
    usersSnap.forEach(doc => {
      const data = doc.data() || {};
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
      const displayName = (data.displayName || '').trim().toLowerCase();
      const name = (data.name || '').trim().toLowerCase();
      const email = (data.email || '').trim().toLowerCase();
      if (fullName) userMap.set(fullName, data);
      if (displayName) userMap.set(displayName, data);
      if (name) userMap.set(name, data);
      if (email) userMap.set(email, data);
      userMap.set(doc.id.toLowerCase(), data);
    });

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
      let franchiseeName = leadData.franchisee || 'MailPlus';

      // Fetch contacts
      const contactsSnap = await leadDoc.ref.collection('contacts').get();
      const recipients: { email: string; name: string; contactId?: string; localMilePlusAuthLink?: string; securityCode?: string }[] = [];

      if (targetEmail) {
        const emails = targetEmail.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
        let primaryContactName = overrideContactName !== undefined ? overrideContactName : companyName;
        let primaryContactLink = '';
        let primaryContactSecurityCode = '';
        let contactId = null;

        // Try to match the first email in the contacts list to extract contact name and auth link
        if (emails.length > 0 && !contactsSnap.empty) {
          const firstEmail = emails[0];
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            if (email && email.toLowerCase().trim() === firstEmail) {
              primaryContactName = cData.name || primaryContactName;
              primaryContactLink = cData.localMilePlusAuthLink || '';
              primaryContactSecurityCode = cData.securityCode || '';
              contactId = contactDoc.id;
            }
          });
        }

        // If no match was found for the first email, look for a primary contact to populate name/link
        if (primaryContactName === companyName && !contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            if (cData.isPrimary) {
              primaryContactName = cData.name || primaryContactName;
              primaryContactLink = cData.localMilePlusAuthLink || '';
              primaryContactSecurityCode = cData.securityCode || '';
              contactId = contactDoc.id;
            }
          });
        }

        recipients.push({
          email: targetEmail,
          name: primaryContactName,
          contactId: contactId || undefined,
          localMilePlusAuthLink: primaryContactLink,
          securityCode: primaryContactSecurityCode
        });
      } else {
        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            const name = overrideContactName !== undefined ? overrideContactName : (cData.name || 'Valued Customer');
            
            if (email && cData.sendEmail !== 'no' && !cData.optedOut) {
              recipients.push({ email, name, contactId: contactDoc.id, localMilePlusAuthLink: cData.localMilePlusAuthLink || '', securityCode: cData.securityCode || '' });
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
        let compiledBody = customHtml !== undefined ? customHtml : templateBody;
        const contactFirstName = rec.name.split(' ')[0];

        // Fetch AM Mobile using Cache
        const amName = leadData.accountManagerAssigned || leadData.salesRepAssigned || '';
        let amMobile = amPhoneCache.get(amName);
        if (amMobile === undefined) {
          if (amName) {
            const amNameLower = amName.trim().toLowerCase();
            const matchedUser = userMap.get(amNameLower);
            if (matchedUser) {
              amMobile = matchedUser.mobileNumber || matchedUser.mobile || matchedUser.phoneNumber || matchedUser.phone || matchedUser.aircallPhoneNumber || '';
            } else {
              amMobile = '';
            }
          } else {
             amMobile = '';
          }
          amPhoneCache.set(amName, amMobile as string);
        }

        // Fetch Franchisee contact details
        let franchiseeMainContact = '';
        let franchiseeEmail = '';
        let franchiseeMobile = '';
        try {
          let franchiseeData: any = null;
          if (leadData.franchisee_id) {
            const fIdStr = String(leadData.franchisee_id);
            const franDoc = await db.collection('franchisees').doc(fIdStr).get();
            if (franDoc.exists) {
              franchiseeData = franDoc.data();
            } else {
              const franSnap1 = await db.collection('franchisees').where('internalId', '==', fIdStr).limit(1).get();
              if (!franSnap1.empty) {
                franchiseeData = franSnap1.docs[0].data();
              } else {
                const franSnap2 = await db.collection('franchisees').where('internalId', '==', Number(leadData.franchisee_id)).limit(1).get();
                if (!franSnap2.empty) {
                  franchiseeData = franSnap2.docs[0].data();
                }
              }
            }
          }
          if (!franchiseeData && leadData.franchisee) {
            const franSnap = await db.collection('franchisees').where('name', '==', leadData.franchisee).limit(1).get();
            if (!franSnap.empty) {
              franchiseeData = franSnap.docs[0].data();
            }
          }
          if (franchiseeData) {
            franchiseeName = franchiseeData.name || franchiseeData.mainContact || leadData.franchisee || 'MailPlus';
            franchiseeMainContact = franchiseeData.mainContact || franchiseeData.name || '';
            franchiseeEmail = franchiseeData.email || '';
            franchiseeMobile = franchiseeData.mobile || franchiseeData.phone || '';
          }
        } catch (err) {
          console.error('[Send Direct] Failed to fetch franchisee details:', err);
        }

        // Resolve Schedule Service Date
        let scheduledServiceDate = leadData.scheduledServiceDate || '';
        if (!scheduledServiceDate && leadData.services && leadData.services.length > 0) {
          scheduledServiceDate = leadData.services[0].startDate || leadData.services[0].trialStartDate || '';
        }
        if (scheduledServiceDate) {
          try {
            const dateObj = new Date(scheduledServiceDate);
            if (!isNaN(dateObj.getTime())) {
              const dd = String(dateObj.getDate()).padStart(2, '0');
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const yyyy = dateObj.getFullYear();
              scheduledServiceDate = `${dd}/${mm}/${yyyy}`;
            }
          } catch (e) {
            // Keep original string if formatting fails
          }
        }

        const localMileLink = leadData.localMileRegistrationLink || (leadId ? `https://prospectplus.com.au/localmile-registration/${encryptLeadId(leadId)}` : '');
        const localMileActivationLink = rec.localMilePlusAuthLink || leadData.localMileActivationLink || localMileLink;
        const localMileSecurityCode = rec.securityCode || leadData.securityCode || leadData.localMileSecurityCode || '';
        const sofPublicLink = leadData.sofLink || (leadData as any).standingOrderFormLink || (leadId ? `https://prospectplus.com.au/sof/${encryptLeadId(leadId)}` : '');

        const placeholderCtx = {
          lead: { ...leadData, id: leadId },
          contact: { name: rec.name, firstName: contactFirstName, localMilePlusAuthLink: rec.localMilePlusAuthLink, securityCode: rec.securityCode },
          accountManager: {
            name: amName,
            mobile: amMobile,
            calendly: leadData.salesRepAssignedCalendlyLink || ''
          },
          salesRep: salesRepAssigned,
          franchisee: {
            name: franchiseeName,
            mainContact: franchiseeMainContact,
            email: franchiseeEmail,
            mobile: franchiseeMobile
          },
          senderEmail: customSenderEmail || senderEmail,
          scheduledServiceDate,
          customLinks: {
            localMileLink,
            localMileActivationLink,
            localMileSecurityCode,
            sofLink: sofPublicLink
          }
        };

        compiledBody = replaceTemplatePlaceholders(compiledBody, placeholderCtx);
        let compiledSubject = replaceTemplatePlaceholders(subjectLine, placeholderCtx);
        compiledSubject = compiledSubject.replace(/\{\{Franchisee\.Email\}\}/gi, franchiseeEmail);
        compiledSubject = compiledSubject.replace(/\{\{franchisee_email\}\}/gi, franchiseeEmail);
        compiledSubject = compiledSubject.replace(/\{\{Franchisee\.Mobile\}\}/gi, franchiseeMobile);
        compiledSubject = compiledSubject.replace(/\{\{franchisee_mobile\}\}/gi, franchiseeMobile);
        compiledSubject = compiledSubject.replace(/\{\{Franchisee\.Email\}\}/gi, franchiseeEmail);
        compiledSubject = compiledSubject.replace(/\{\{Franchisee\.Mobile\}\}/gi, franchiseeMobile);

        // Resolve ticket placeholders in case they are used in subject or body
        const ticketNumber = leadData.ticketNumber || "";
        const trackingId = leadData.trackingIdentifier || "";
        const receiverName = leadData.receiverDetails?.name || "";
        const receiverAddress = leadData.receiverDetails?.address || "";

        compiledBody = compiledBody.replace(/\{\{Receiver\.Name\}\}/gi, receiverName);
        compiledBody = compiledBody.replace(/\{\{Receiver\.FullAddress\}\}/gi, receiverAddress);
        compiledBody = compiledBody.replace(/\{\{Ticket\.Number\}\}/gi, ticketNumber);
        compiledBody = compiledBody.replace(/\{\{Tracking\.ID\}\}/gi, trackingId);
        compiledBody = compiledBody.replace(/\{\{Ticket\.Id\}\}/gi, leadData.ticketId || leadId || '');

        compiledSubject = compiledSubject.replace(/\{\{Receiver\.Name\}\}/gi, receiverName);
        compiledSubject = compiledSubject.replace(/\{\{Receiver\.FullAddress\}\}/gi, receiverAddress);
        compiledSubject = compiledSubject.replace(/\{\{Ticket\.Number\}\}/gi, ticketNumber);
        compiledSubject = compiledSubject.replace(/\{\{Tracking\.ID\}\}/gi, trackingId);
        compiledSubject = compiledSubject.replace(/\{\{Ticket\.Id\}\}/gi, leadData.ticketId || leadId || '');

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

        // Wrap direct email templates in standard clean styling format (as seen in templates & library manager)
        const finalHtmlFormatted = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: ${fontFamily}; 
        color: #2e2e2e; 
        line-height: 1.6; 
        padding: 20px; 
        margin: 0;
        background-color: #f8fafc;
      }
      h1, h2, h3 { color: ${primaryColor}; font-weight: normal; margin-top: 0; }
      p { margin-bottom: 16px; }
      a { color: ${primaryColor}; text-decoration: underline; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      table td, table th {
        border: 1px solid #ced4da;
        padding: 8px;
        text-align: left;
      }
      table th {
        font-weight: bold;
        background-color: #f1f3f5;
      }
      .email-content {
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .brand-logo {
        max-height: 48px;
        max-width: 150px;
        display: block;
        margin-bottom: 24px;
      }
      .preview-footer {
        margin-top: 24px;
        padding-top: 12px;
        border-top: 1px solid #eaeaea;
        font-size: 11px;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="email-content">
      ${finalHtml}
    </div>
  </body>
</html>
        `;

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
            subject: compiledSubject,
            html: finalHtmlFormatted,
            customFrom: customSenderEmail,
            cc: cc || undefined,
            bcc: bcc || undefined,
            attachments,
            leadId: leadId,
            notifyOnOpen: notifyOnOpen !== false,
            notifyUserId,
            notifyUserEmail: notifyUserEmail || customSenderEmail,
            trackingCategory: trackingCategory || 'marketing'
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
        let activityNotes = `Quick email sent: '${subjectLine}' using template '${templateData?.name || 'Quick Layout'}'. Sender: ${customSenderEmail || senderEmail}. Status: ${status === 'bounced' ? `Bounced${isRealBounced ? ` (Error: ${errorMessage})` : ' (Hard)'}` : 'Delivered (Outlook MailPlus network)'}.`;
        if (cc || bcc) {
          const parts = [];
          if (cc) parts.push(`CC: ${cc}`);
          if (bcc) parts.push(`BCC: ${bcc}`);
          activityNotes += ` (${parts.join(', ')})`;
        }
        await leadDoc.ref.collection('activity').add({
          type: 'Email',
          date: nowStr,
          notes: activityNotes,
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
