'use server';

import { adminDb } from '@/services/firebase-server';
import { sendLeadUpdateToNetSuite } from '@/services/netsuite';
import { validateABN } from '@/lib/utils';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function acceptScfAction(leadId: string, scfId: string) {
  try {
    const leadRef = adminDb.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();
    
    if (!leadSnap.exists) {
      return { success: false, message: 'Lead not found.' };
    }
    
    const leadData = leadSnap.data();
    const abn = leadData?.abn || '';
    const cleanedAbn = abn.replace(/\s+/g, '').replace(/-/g, '');
    
    if (!validateABN(cleanedAbn)) {
      return { success: false, message: 'A valid 11-digit Australian Business Number (ABN) is required in the Details section before accepting.' };
    }
    
    const nowStr = new Date().toISOString();
    await adminDb.collection('leads').doc(leadId).collection('scfs').doc(scfId).update({
      status: 'Accepted',
      acceptedAt: nowStr
    });
    
    if (leadSnap.exists) {
      const leadData = leadSnap.data();
      
      const commRegId = leadData?.commRegId || "";
      const payload1 = {
        operation: "signCustomerSCF",
        requestParams: { comRegId: commRegId }
      };
      const nsUrl1 = `https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1900&deploy=2&compid=1048144&ns-at=AAEJ7tMQubKtieJuj6WwyGZO8oUmYeVsGjJVKqWKrTXbBqMNWuc&requestData=${encodeURIComponent(JSON.stringify(payload1))}`;
      
      try {
        const response1 = await fetch(nsUrl1, { method: "GET" });
        const text1 = await response1.text();
        
        if (text1.includes('Commencement Register signed successfully.')) {
          await leadRef.update({ 
            status: 'Won', 
            customerStatus: 'Won',
            scfAcceptedAt: nowStr,
            signedUpAt: nowStr
          });
          
          const salesRep = leadData?.accountManagerAssigned || '';
          const leadInternalId = leadData?.internalid || leadId;
          const nsUrl2 = `https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2514&deploy=1&compid=1048144&ns-at=AAEJ7tMQJhlGIUNNmxKFwd5sprCqoBuWrh_H7J14_qzpLd1ajvg&salesRep=${encodeURIComponent(salesRep)}&outcome=${encodeURIComponent('Sign Up')}&leadId=${encodeURIComponent(leadInternalId)}`;
          
          await fetch(nsUrl2, { method: "GET" });
        } else {
          await leadRef.update({ 
            status: 'Won',
            customerStatus: 'Won',
            scfAcceptedAt: nowStr,
            signedUpAt: nowStr
          });
        }
      } catch (err) {
        console.error("NetSuite API calls failed", err);
        // Fallback status update
        await leadRef.update({ 
          status: 'Won',
          customerStatus: 'Won',
          scfAcceptedAt: nowStr,
          signedUpAt: nowStr
        });
      }
    }

    // Send email to Account Manager
    try {
      const amName = leadData?.accountManagerAssigned || leadData?.salesRepAssigned || '';
      let amEmail = '';
      if (amName) {
        const userQuery = await adminDb.collection('users').where('displayName', '==', amName).limit(1).get();
        if (!userQuery.empty) {
          amEmail = userQuery.docs[0].data().email || '';
        }
      }
      
      if (!amEmail && amName) {
        amEmail = `${amName.toLowerCase().trim().replace(/\s+/g, '.')}@mailplus.com.au`;
      }
      
      const recipientEmail = amEmail || 'info@mailplus.com.au';
      
      let contactName = 'Customer';
      let contactEmail = '';
      const contactsSnap = await leadRef.collection('contacts').get();
      if (!contactsSnap.empty) {
        const contactData = contactsSnap.docs[0].data();
        contactName = contactData.name || 'Customer';
        contactEmail = contactData.email || '';
      }
      
      const prospectPlusId = leadData?.prospectPlusId || leadId;
      const formattedDate = new Date(nowStr).toLocaleString('en-AU', {
        timeZone: 'Australia/Sydney',
        hour12: true,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const companyName = leadData?.companyName || 'Lead';
      const subject = `SCF Accepted - ${companyName} x MailPlus`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
      const leadLink = `${baseUrl}/leads/${leadId}`;
      
      const emailHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <tr>
    <td align="center">
      <table align="center" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; border-collapse: separate; overflow: hidden;">
        <!-- Banner -->
        <tr>
          <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
          </td>
        </tr>
        <!-- Content Area -->
        <tr>
          <td style="padding: 30px 30px 20px 30px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #2d3748; font-size: 16px; line-height: 1.6;">
            <!-- Top Right Corner ID -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="right" style="font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding-bottom: 15px;">
                  Prospect+ ID: ${prospectPlusId}
                </td>
              </tr>
            </table>
            
            <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 20px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">SCF Accepted!</h2>
            <p style="margin: 0 0 15px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Hi ${amName || 'Account Manager'},</p>
            <p style="margin: 0 0 15px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Great news! The lead <strong>${companyName}</strong> has accepted the digital Service Commencement Form (SCF).</p>
            
            <!-- Lead details table -->
            <table width="100%" cellpadding="10" cellspacing="0" style="border: 1px solid #edf2f7; border-radius: 8px; margin-bottom: 20px; font-size: 14px; border-collapse: separate; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; width: 140px; border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Company Name:</td>
                <td style="border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${companyName}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Contact Name:</td>
                <td style="border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${contactName}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Contact Email:</td>
                <td style="border-bottom: 1px solid #edf2f7; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${contactEmail}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Accepted At:</td>
                <td style="font-family: 'Inter', system-ui, -apple-system, sans-serif;">${formattedDate}</td>
              </tr>
            </table>

            <p style="margin: 0 0 15px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">The lead's status has been automatically updated to <strong>Won</strong>, and the signing has been synced with NetSuite.</p>
            <p style="margin: 0 0 25px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">You can view the lead details in Prospect+ using the button below:</p>

            <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <tr>
                <td align="center" bgcolor="#095c7b" style="border-radius: 6px;">
                  <a href="${leadLink}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; font-family: 'Inter', system-ui, -apple-system, sans-serif;">View Lead in Prospect+</a>
                </td>
              </tr>
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
              &copy; 2026 MailPlus. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
      `;
      
      await sendPhysicalEmail({
        to: recipientEmail,
        subject,
        html: emailHtml,
        leadId
      });
    } catch (emailErr) {
      console.error('Error sending SCF acceptance email to Account Manager:', emailErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error accepting SCF:', error);
    return { success: false, message: error.message };
  }
}

export async function updateScfDetailsAction(
  leadId: string, 
  contactId: string | null | undefined, 
  data: {
    abn?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    customerServiceEmail?: string;
    customerPhone?: string;
  }
) {
  try {
    const leadUpdate: any = {};
    if (data.abn !== undefined) leadUpdate.abn = data.abn;
    if (data.customerServiceEmail !== undefined) leadUpdate.customerServiceEmail = data.customerServiceEmail;
    if (data.customerPhone !== undefined) leadUpdate.customerPhone = data.customerPhone;
    
    if (Object.keys(leadUpdate).length > 0) {
      await adminDb.collection('leads').doc(leadId).update(leadUpdate);

      // Sync updated fields with NetSuite
      try {
        const leadSnap = await adminDb.collection('leads').doc(leadId).get();
        if (leadSnap.exists) {
          const fullLead = leadSnap.data();
          await sendLeadUpdateToNetSuite({
            leadId: leadId,
            companyName: fullLead?.companyName || '',
            email: fullLead?.customerServiceEmail || '',
            phone: fullLead?.customerPhone || '',
            website: fullLead?.websiteUrl || '',
            industry: fullLead?.industryCategory || '',
            abn: fullLead?.abn || '',
          });
        }
      } catch (nsErr) {
        console.error('Error syncing SCF details update to NetSuite:', nsErr);
      }
    }

    if (contactId) {
      const contactUpdate: any = {};
      if (data.contactName !== undefined) contactUpdate.name = data.contactName;
      if (data.contactEmail !== undefined) contactUpdate.email = data.contactEmail;
      if (data.contactPhone !== undefined) contactUpdate.phone = data.contactPhone;

      if (Object.keys(contactUpdate).length > 0) {
        await adminDb.collection('leads').doc(leadId).collection('contacts').doc(contactId).update(contactUpdate);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating SCF details:', error);
    return { success: false, message: error.message };
  }
}
