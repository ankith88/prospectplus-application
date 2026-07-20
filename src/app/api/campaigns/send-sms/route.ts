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

    // 2. Fetch targets based on filters
    const targetAudience = campaignData.targetAudience || 'leads';
    const filters = campaignData.audienceFilters || {};
    let targetQuery: any;

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
    
    // In-memory filtering for complex fields
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
    
    // Get all global suppressed emails (might not apply to SMS directly unless phone numbers are added to suppression, but we check email for now if needed, typically you'd have SMS opt outs, but we will skip for now or use the same list if email matches)
    const suppressionSnap = await db.collection('marketing_suppression_list').get();
    const suppressedEmails = new Set(suppressionSnap.docs.map(doc => doc.id.toLowerCase().trim()));

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

      // Fetch contacts
      const recipients: { email: string; name: string; phone: string; contactId?: string; localMilePlusAuthLink?: string }[] = [];

      if (targetAudience === 'franchisees') {
        const phone = docData.mobile || docData.phone;
        const email = docData.email;
        if (phone) {
          recipients.push({ email: email || '', name: docData.mainContact || docData.name || 'Franchisee', phone, localMilePlusAuthLink: '' });
        }
      } else {
        const contactsSnap = await docSnap.ref.collection('contacts').get();

        if (!contactsSnap.empty) {
          contactsSnap.forEach((contactDoc: any) => {
            const cData = contactDoc.data();
            const email = cData.email;
            const phone = cData.phone || cData.mobile;
            const name = cData.name || 'Valued Customer';
            
            if (phone && cData.sendEmail !== 'no' && !cData.optedOut) {
              recipients.push({ email: email || '', name, phone, contactId: contactDoc.id, localMilePlusAuthLink: cData.localMilePlusAuthLink || '' });
            }
          });
        } else {
          // Fallback to Lead customerPhone
          const phone = docData.customerPhone || docData.mobile;
          const email = docData.customerServiceEmail;
          if (phone) {
            recipients.push({ email: email || '', name: docData.companyName || 'Valued Customer', phone, localMilePlusAuthLink: '' });
          }
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

        // Fetch Franchisee contact details
        let franchiseeMainContact = '';
        let franchiseeEmail = '';
        let franchiseeMobile = '';
        try {
          let franchiseeData: any = null;
          if (docData.franchisee_id) {
            const franDoc = await db.collection('franchisees').doc(docData.franchisee_id).get();
            if (franDoc.exists) {
              franchiseeData = franDoc.data();
            }
          }
          if (!franchiseeData && docData.franchisee) {
            const franSnap = await db.collection('franchisees').where('name', '==', docData.franchisee).limit(1).get();
            if (!franSnap.empty) {
              franchiseeData = franSnap.docs[0].data();
            }
          }
          if (franchiseeData) {
            franchiseeMainContact = franchiseeData.mainContact || '';
            franchiseeEmail = franchiseeData.email || '';
            franchiseeMobile = franchiseeData.mobile || '';
          }
        } catch (err) {
          console.error('[Send SMS Campaign] Failed to fetch franchisee details:', err);
        }

        // Resolve Schedule Service Date
        let scheduledServiceDate = docData.scheduledServiceDate || '';
        if (!scheduledServiceDate && docData.services && docData.services.length > 0) {
          scheduledServiceDate = docData.services[0].startDate || docData.services[0].trialStartDate || '';
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

        // Compile Body
        let compiledBody = smsMessageTemplate;
        compiledBody = compiledBody.replace(/\{\{Contact\.Name\}\}/g, rec.name);
        compiledBody = compiledBody.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/g, rec.localMilePlusAuthLink || '');
        compiledBody = compiledBody.replace(/\{\{Company\.Name\}\}/g, companyName);
        compiledBody = compiledBody.replace(/\{\{SalesRep\.Name\}\}/g, salesRepAssigned);
        compiledBody = compiledBody.replace(/\{\{Prospect\.ProspectPlusID\}\}/g, docData.prospectPlusId || '');

        compiledBody = compiledBody.replace(/\{\{Schedule\.ServiceDate\}\}/g, scheduledServiceDate);
        compiledBody = compiledBody.replace(/\{\{Schedule\.ScheduledServiceDate\}\}/g, scheduledServiceDate);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.MainContact\}\}/g, franchiseeMainContact);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.ContactName\}\}/g, franchiseeMainContact);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.Email\}\}/g, franchiseeEmail);
        compiledBody = compiledBody.replace(/\{\{Franchisee\.Mobile\}\}/g, franchiseeMobile);

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
          leadId: targetAudience === 'leads' ? docId : null,
          franchiseeId: targetAudience === 'franchisees' ? docId : null,
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

        // Log Activity on the Target
        await docSnap.ref.collection('activity').add({
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
