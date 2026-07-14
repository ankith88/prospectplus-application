import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { logEmailServer } from '@/services/firebase-server';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, message: 'Missing campaignId parameter.' },
        { status: 400 }
      );
    }

    const urlObj = new URL(request.url);
    let baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    if (baseUrl.includes('0.0.0.0') || baseUrl.includes('127.0.0.1')) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prospectplus.com.au';
    }

    // 1. Fetch Campaign
    const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
    const campaignDoc = await campaignRef.get();

    if (!campaignDoc.exists) {
      return NextResponse.json(
        { success: false, message: `Campaign not found: ${campaignId}` },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();
    if (!campaignData) {
      return NextResponse.json(
        { success: false, message: 'Campaign document is empty.' },
        { status: 400 }
      );
    }

    // Mark as sending
    await campaignRef.update({ status: 'sending' });

    // 2. Fetch Template
    const templateId = campaignData.templateId;
    const templateDoc = await db.collection('marketing_templates').doc(templateId).get();
    
    if (!templateDoc.exists) {
      await campaignRef.update({ status: 'failed' });
      return NextResponse.json(
        { success: false, message: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    const templateData = templateDoc.data();
    const templateBody = templateData?.body || '';

    // 3. Fetch targets based on filters
    const targetAudience = campaignData.targetAudience || 'leads';
    const filters = campaignData.audienceFilters || {};
    let targetQuery: any;
    let collectionName = targetAudience === 'franchisees' ? 'franchisees' : 'leads';

    if (targetAudience === 'franchisees') {
      targetQuery = db.collection('franchisees');
      if (filters.salesRepAssigned) {
        targetQuery = targetQuery.where('salesRepAssigned', '==', filters.salesRepAssigned);
      }
    } else {
      targetQuery = db.collection('leads');
      // Build compound query where applicable
      if (filters.dialerAssigned) {
        targetQuery = targetQuery.where('dialerAssigned', '==', filters.dialerAssigned);
      }
      if (filters.franchisee) {
        targetQuery = targetQuery.where('franchisee', '==', filters.franchisee);
      }
      if (filters.salesRepAssigned) {
        targetQuery = targetQuery.where('salesRepAssigned', '==', filters.salesRepAssigned);
      }
      if (filters.customerCampaign) {
        // customerCampaign is stored as 'campaign' or 'customerCampaign'
        targetQuery = targetQuery.where('campaign', '==', filters.customerCampaign);
      }
    }

    const targetSnapshotRaw = await targetQuery.get();
    
    // In-memory filtering for complex fields (like territoryJson array or large 'in' queries)
    const targetDocs = targetSnapshotRaw.docs.filter((docSnap: any) => {
      const docData = docSnap.data();
      if (targetAudience === 'franchisees') {
        if (filters.selectedFranchisees && filters.selectedFranchisees.length > 0) {
          if (!filters.selectedFranchisees.includes(docData.name)) return false;
        }
        if (filters.state) {
          const territories = docData.territoryJson || [];
          const hasState = territories.some((t: any) => t.state?.toUpperCase() === filters.state.toUpperCase());
          if (!hasState) return false;
        }
      } else {
        if (filters.marketingList) {
          if (!docData.marketingLists || !docData.marketingLists.includes(filters.marketingList)) return false;
        }
        if (filters.leadStatus) {
          const currentStatus = docData.status || docData.customerStatus;
          if (currentStatus !== filters.leadStatus) return false;
        }
      }
      return true;
    });
    
    // Get all global suppressed emails
    const suppressionSnap = await db.collection('marketing_suppression_list').get();
    const suppressedEmails = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

    // Cache for Account Manager phones
    const amPhoneCache = new Map<string, string>();
    const usersSnap = await db.collection('users').get();
    const userMap = new Map<string, any>();
    usersSnap.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
      if (fullName) {
        userMap.set(fullName, data);
      }
    });

    let totalSent = 0;
    let totalDelivered = 0;
    let totalBounced = 0;

    const nowStr = new Date().toISOString();

    // Iterate targets
    for (const docSnap of targetDocs) {
      const docId = docSnap.id;
      const docData = docSnap.data();
      const companyName = targetAudience === 'franchisees' ? (docData.name || 'Unknown Company') : (docData.companyName || 'Unknown Company');
      const salesRepAssigned = docData.salesRepAssigned || 'Sales Representative';
      const franchiseeName = targetAudience === 'franchisees' ? (docData.name || 'MailPlus') : (docData.franchisee || 'MailPlus');

      // Determine sender dynamically
      let leadSenderEmail = campaignData.senderEmail || campaignData.replyToEmail || 'info@mailplus.com.au';
      if (campaignData.senderType === 'sales_rep') {
        const repClean = salesRepAssigned.trim().toLowerCase();
        if (repClean === 'lee russell') {
          leadSenderEmail = 'lee.russell@mailplus.com.au';
        } else if (repClean === 'kerina helliwell') {
          leadSenderEmail = 'kerina.helliwell@mailplus.com.au';
        } else if (repClean === 'luke forbes') {
          leadSenderEmail = 'luke.forbes@mailplus.com.au';
        } else {
          leadSenderEmail = campaignData.replyToEmail || campaignData.senderEmail || 'info@mailplus.com.au';
        }
      }

      // Fetch contacts
      const recipients: { email: string; name: string; contactId?: string; localMilePlusAuthLink?: string }[] = [];

      if (targetAudience === 'franchisees') {
        const email = docData.email;
        if (email) {
          recipients.push({ email, name: docData.mainContact || docData.name || 'Franchisee' });
        }
      } else {
        const contactsSnap = await docSnap.ref.collection('contacts').get();

        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            const name = cData.name || 'Valued Customer';
            
            if (email && cData.sendEmail !== 'no' && !cData.optedOut) {
              recipients.push({ email, name, contactId: contactDoc.id, localMilePlusAuthLink: cData.localMilePlusAuthLink || '' });
            }
          });
        } else {
          // Fallback to Lead customerServiceEmail
          const email = docData.customerServiceEmail;
          if (email) {
            recipients.push({ email, name: docData.companyName || 'Valued Customer' });
          }
        }
      }

      // Send to filtered recipients
      for (const rec of recipients) {
        const emailLower = rec.email.toLowerCase().trim();

        // Check if suppressed
        if (suppressedEmails.has(emailLower)) {
          console.log(`[Campaign Engine] Email suppressed: ${rec.email}`);
          continue;
        }

        const deliveryRef = db.collection('campaign_deliveries').doc();
        const deliveryId = deliveryRef.id;

        // Compile Body
        let compiledBody = templateBody;
        const contactFirstName = rec.name.split(' ')[0];

        // Fetch AM Mobile using Cache
        const amName = docData.accountManagerAssigned || docData.salesRepAssigned || '';
        let amMobile = amPhoneCache.get(amName);
        if (amMobile === undefined) {
          if (amName) {
            const amNameLower = amName.trim().toLowerCase();
            const matchedUser = userMap.get(amNameLower);
            if (matchedUser) {
              amMobile = matchedUser.mobileNumber || '';
            } else {
              amMobile = '';
            }
          } else {
             amMobile = '';
          }
          amPhoneCache.set(amName, amMobile as string);
        }

        compiledBody = compiledBody.replace(/\{\{Contact\.Name\}\}/gi, rec.name);
        compiledBody = compiledBody.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
        compiledBody = compiledBody.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/gi, rec.localMilePlusAuthLink || '');
        compiledBody = compiledBody.replace(/\{\{Company\.Name\}\}/gi, companyName);
        compiledBody = compiledBody.replace(/\{\{SalesRep\.Name\}\}/gi, salesRepAssigned);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.Name\}\}/gi, franchiseeName);
        compiledBody = compiledBody.replace(/\{\{sender\.email\}\}/gi, leadSenderEmail);

        compiledBody = compiledBody.replace(/\{\{AccountManager\.Name\}\}/gi, amName);
        compiledBody = compiledBody.replace(/\{\{AccountManager\.Mobile\}\}/gi, amMobile || '');
        compiledBody = compiledBody.replace(/\{\{AccountManager\.Calendly\}\}/gi, docData.salesRepAssignedCalendlyLink || '');
        compiledBody = compiledBody.replace(/\{\{Lead\.ContactBookingLink\}\}/gi, docData.bookingUrlId ? `https://prospectplus.com.au/book/${docData.bookingUrlId}` : '');
        compiledBody = compiledBody.replace(/\{\{Lead\.GeneralBookingLink\}\}/gi, docData.generalBookingUrlId ? `https://prospectplus.com.au/book/${docData.generalBookingUrlId}` : '');
        compiledBody = compiledBody.replace(/\{\{Lead\.City\}\}/gi, docData.address?.city || '');
        compiledBody = compiledBody.replace(/\{\{Trials\.Remaining\}\}/gi, (docData.localMileTrialsRemaining || 0).toString());
        compiledBody = compiledBody.replace(/\{\{Lead\.SCFLink\}\}/gi, docData.dynamicScfUrl || '');
        compiledBody = compiledBody.replace(/\{\{Prospect\.ProspectPlusID\}\}/gi, docData.prospectPlusId || '');
        compiledBody = compiledBody.replace(/\{\{prospect_plus_id\}\}/gi, docData.prospectPlusId || '');

        // Inject link tracking redirector (wrap general anchor tags)
        const wrappedBody = wrapLinks(compiledBody, deliveryId, baseUrl);

        // Handle custom unsubscribe links or fallback to default footer
        const unsubscribeUrl = `${baseUrl}/api/campaigns/track/unsubscribe?id=${deliveryId}`;
        
        let finalHtml = wrappedBody;
        if (finalHtml.includes('{{unsubscribe_link}}') || finalHtml.includes('{{unsubscribe_url}}')) {
          finalHtml = finalHtml.replace(/\{\{unsubscribe_link\}\}/gi, unsubscribeUrl);
          finalHtml = finalHtml.replace(/\{\{unsubscribe_url\}\}/gi, unsubscribeUrl);
        } else {
          const footerUnsubscribe = `
            <br><br>
            <div style="font-size:12px;color:#777;border-top:1px solid #eee;padding-top:12px;font-family:sans-serif;margin-top:24px;text-align:left;">
              This email was sent by ${campaignData.senderName || 'MailPlus'} via MailPlus Outbound System.
              <br>
              If you no longer wish to receive marketing communications, you can 
              <a href="${unsubscribeUrl}" style="color:#095c7b;text-decoration:underline;">unsubscribe here</a>.
            </div>
          `;
          finalHtml += footerUnsubscribe;
        }

        // Inject open tracking pixel
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
            subject: campaignData.subjectLine,
            html: finalHtml,
            customFrom: leadSenderEmail
          });

          if (!sendResult.success) {
            status = 'bounced';
            isRealBounced = true;
            errorMessage = sendResult.error || 'Transmission failed.';
          } else if (sendResult.simulated) {
            console.log(`[Bulk Campaign] Simulated successful dispatch to: ${rec.email} (sender: ${leadSenderEmail})`);
          } else {
            console.log(`[Bulk Campaign] Real physical email dispatched to: ${rec.email} (sender: ${leadSenderEmail})`);
          }
        }

        const isBounced = status === 'bounced';

        // Write delivery log record
        await deliveryRef.set({
          id: deliveryId,
          campaignId,
          leadId: targetAudience === 'leads' ? docId : null,
          franchiseeId: targetAudience === 'franchisees' ? docId : null,
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

        // Log Activity on the Target
        await docSnap.ref.collection('activity').add({
          type: 'Email',
          date: nowStr,
          notes: `Outbound campaign email sent: '${campaignData.subjectLine}'. Status: ${status === 'bounced' ? `Bounced${isRealBounced ? ` (Error: ${errorMessage})` : ' (Hard)'}` : 'Delivered (Outlook MailPlus network)'}.`,
          author: campaignData.senderName || 'Outbound Campaign Engine'
        });

        await logEmailServer(docId, {
          subject: campaignData.subjectLine,
          bodyHtml: finalHtml,
          sentAt: nowStr,
          sender: campaignData.senderEmail || 'info@mailplus.com.au',
          recipient: rec.email,
          status: status,
          campaignId: campaignId
        }, collectionName as 'leads' | 'companies' | 'franchisees');

        totalSent++;
        if (status === 'delivered') {
          totalDelivered++;
        } else {
          totalBounced++;
        }
      }
    }

    // 4. Update Campaign record
    await campaignRef.update({
      status: 'sent',
      sentAt: nowStr,
      'metrics.sent': totalSent,
      'metrics.delivered': totalDelivered,
      'metrics.bounced': totalBounced
    });

    return NextResponse.json({
      success: true,
      message: `Campaign dispatched successfully. Processed ${totalSent} recipient(s).`,
      metrics: {
        sent: totalSent,
        delivered: totalDelivered,
        bounced: totalBounced
      }
    });

  } catch (error: any) {
    console.error('Error dispatching marketing campaign:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'System failure compiling campaign.' },
      { status: 500 }
    );
  }
}

/**
 * Parses HTML body and wraps hyperlinks in tracking redirects.
 */
function wrapLinks(html: string, deliveryId: string, baseUrl: string): string {
  // Regex to match <a href="LINK"> but avoid unsubscribe link or local anchors
  const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["']/gi;
  
  return html.replace(anchorRegex, (match, url) => {
    // Avoid re-wrapping track urls
    if (url.includes('/api/campaigns/track/')) {
      return match;
    }
    const trackingUrl = `${baseUrl}/api/campaigns/track/click?id=${deliveryId}&url=${encodeURIComponent(url)}`;
    return match.replace(url, trackingUrl);
  });
}
