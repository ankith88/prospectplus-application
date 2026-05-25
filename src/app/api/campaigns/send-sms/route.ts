import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendSms } from '@/services/sms-service';

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

    if (campaignData.campaignType !== 'sms') {
      return NextResponse.json(
        { success: false, message: 'Campaign is not an SMS campaign.' },
        { status: 400 }
      );
    }

    // Mark as sending
    await campaignRef.update({ status: 'sending' });

    const smsMessageTemplate = campaignData.smsMessage || '';

    // 2. Fetch target leads based on filters
    const filters = campaignData.audienceFilters || {};
    let leadsQuery: any = db.collection('leads');

    // Build compound query where applicable
    if (filters.dialerAssigned) {
      leadsQuery = leadsQuery.where('dialerAssigned', '==', filters.dialerAssigned);
    }
    if (filters.franchisee) {
      leadsQuery = leadsQuery.where('franchisee', '==', filters.franchisee);
    }
    if (filters.salesRepAssigned) {
      leadsQuery = leadsQuery.where('salesRepAssigned', '==', filters.salesRepAssigned);
    }
    if (filters.customerCampaign) {
      // customerCampaign is stored as 'campaign' or 'customerCampaign'
      leadsQuery = leadsQuery.where('campaign', '==', filters.customerCampaign);
    }

    const leadsSnapshot = await leadsQuery.get();
    
    // Get all global suppressed emails (might not apply to SMS directly unless phone numbers are added to suppression, but we check email for now if needed, typically you'd have SMS opt outs, but we will skip for now or use the same list if email matches)
    const suppressionSnap = await db.collection('marketing_suppression_list').get();
    const suppressedEmails = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

    let totalSent = 0;
    let totalDelivered = 0;
    let totalBounced = 0;

    const nowStr = new Date().toISOString();

    // Iterate leads
    for (const leadDoc of leadsSnapshot.docs) {
      const leadId = leadDoc.id;
      const leadData = leadDoc.data();
      const companyName = leadData.companyName || 'Unknown Company';
      const salesRepAssigned = leadData.salesRepAssigned || 'Sales Representative';

      // Fetch contacts under lead
      const contactsSnap = await leadDoc.ref.collection('contacts').get();
      const recipients: { email: string; name: string; phone: string; contactId?: string }[] = [];

      if (!contactsSnap.empty) {
        contactsSnap.forEach((contactDoc: any) => {
          const cData = contactDoc.data();
          const email = cData.email;
          const phone = cData.phone || cData.mobile;
          const name = cData.name || 'Valued Customer';
          
          if (phone && cData.sendEmail !== 'no' && !cData.optedOut) {
            recipients.push({ email: email || '', name, phone, contactId: contactDoc.id });
          }
        });
      } else {
        // Fallback to Lead customerPhone
        const phone = leadData.customerPhone || leadData.mobile;
        const email = leadData.customerServiceEmail;
        if (phone) {
          recipients.push({ email: email || '', name: leadData.companyName || 'Valued Customer', phone });
        }
      }

      // Send to filtered recipients
      for (const rec of recipients) {
        const emailLower = rec.email.toLowerCase().trim();

        // Check if suppressed via email (as a proxy for contact suppression)
        if (emailLower && suppressedEmails.has(emailLower)) {
          console.log(`[SMS Engine] Contact suppressed via email match: ${rec.email}`);
          continue;
        }

        const deliveryRef = db.collection('campaign_deliveries').doc();
        const deliveryId = deliveryRef.id;

        // Compile Body
        let compiledBody = smsMessageTemplate;
        compiledBody = compiledBody.replace(/\{\{Contact\.Name\}\}/g, rec.name);
        compiledBody = compiledBody.replace(/\{\{Company\.Name\}\}/g, companyName);
        compiledBody = compiledBody.replace(/\{\{SalesRep\.Name\}\}/g, salesRepAssigned);

        // Attempt SMS Dispatch
        const sendResult = await sendSms(rec.phone, compiledBody);
        
        let status = 'delivered';
        let isRealBounced = false;
        let errorMessage = '';

        if (!sendResult.success) {
          status = 'bounced';
          isRealBounced = true;
          errorMessage = sendResult.message || 'SMS Transmission failed.';
          console.log(`[Bulk SMS Campaign] SMS failed to: ${rec.phone} Error: ${errorMessage}`);
        } else {
          console.log(`[Bulk SMS Campaign] SMS dispatched to: ${rec.phone}`);
        }

        const isBounced = status === 'bounced';

        // Write delivery log record
        await deliveryRef.set({
          id: deliveryId,
          campaignId,
          leadId,
          contactId: rec.contactId || null,
          leadEmail: rec.email,
          leadPhone: rec.phone,
          leadName: rec.name,
          companyName,
          salesRepName: salesRepAssigned,
          sentAt: nowStr,
          status,
          bounceType: isBounced ? 'hard' : null,
          type: 'sms'
        });

        // Log Activity on the Lead
        await leadDoc.ref.collection('activity').add({
          type: 'SMS',
          date: nowStr,
          notes: `Outbound campaign SMS sent: '${campaignData.name}'. Status: ${status === 'bounced' ? 'Failed (' + errorMessage + ')' : 'Delivered'}.`,
          author: 'Outbound Campaign Engine'
        });

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
      message: `SMS Campaign dispatched successfully. Processed ${totalSent} recipient(s).`,
      metrics: {
        sent: totalSent,
        delivered: totalDelivered,
        bounced: totalBounced
      }
    });

  } catch (error: any) {
    console.error('Error dispatching SMS campaign:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'System failure compiling SMS campaign.' },
      { status: 500 }
    );
  }
}
