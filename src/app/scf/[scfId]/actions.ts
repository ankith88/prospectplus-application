'use server';

import { adminDb, duplicateLeadToCompaniesServer } from '@/services/firebase-server';
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
        console.log(`[SCF Accept] Calling NetSuite Script 1900 for Lead ${leadId} with commRegId: ${commRegId}...`);
        console.log(`[SCF Accept] Request URL: ${nsUrl1}`);
        const response1 = await fetch(nsUrl1, { method: "GET" });
        const text1 = await response1.text();
        console.log(`[SCF Accept] NetSuite Script 1900 Response Status: ${response1.status}`);
        console.log(`[SCF Accept] NetSuite Script 1900 Response Body: ${text1}`);
        
        const isScript1900Success = response1.ok && (
          text1.includes('Commencement Register signed successfully.') || 
          text1.includes('comRegId') || 
          text1.includes('scriptlet.nl')
        );

        if (isScript1900Success) {
          console.log(`[SCF Accept] Commencement Register signed! Calling NetSuite Script 2514 (Sign Up Outcome)...`);
          
          const salesRep = leadData?.accountManagerAssigned || '';
          const leadInternalId = leadData?.internalid || leadId;
          const nsUrl2 = `https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=2514&deploy=1&compid=1048144&ns-at=AAEJ7tMQJhlGIUNNmxKFwd5sprCqoBuWrh_H7J14_qzpLd1ajvg&salesRep=${encodeURIComponent(salesRep)}&outcome=${encodeURIComponent('Sign Up')}&leadId=${encodeURIComponent(leadInternalId)}`;
          
          console.log(`[SCF Accept] Calling NetSuite Script 2514 (Sign Up Outcome)...`);
          console.log(`[SCF Accept] Request URL: ${nsUrl2}`);
          const response2 = await fetch(nsUrl2, { method: "GET" });
          const text2 = await response2.text();
          console.log(`[SCF Accept] NetSuite Script 2514 Response Status: ${response2.status}`);
          console.log(`[SCF Accept] NetSuite Script 2514 Response Body: ${text2}`);

          // Status update AND company creation AFTER NetSuite APIs complete
          console.log(`[SCF Accept] NetSuite API calls completed. Updating Lead status to Quote Accepted and creating Company record...`);
          await leadRef.update({ 
            status: 'Quote Accepted', 
            customerStatus: 'Quote Accepted',
            scfAcceptedAt: nowStr
          });
          
          try {
            await duplicateLeadToCompaniesServer(leadId);
          } catch (companyErr) {
            console.error("[SCF Accept] Error duplicating lead to companies:", companyErr);
          }
        } else {
          console.warn(`[SCF Accept] NetSuite Script 1900 response did not contain success message. Body: ${text1}`);
          await leadRef.update({ 
            status: 'Quote Accepted',
            customerStatus: 'Quote Accepted',
            scfAcceptedAt: nowStr
          });
          try {
            await duplicateLeadToCompaniesServer(leadId);
          } catch (companyErr) {
            console.error("[SCF Accept] Error duplicating lead to companies:", companyErr);
          }
        }
      } catch (err) {
        console.error("[SCF Accept] NetSuite API calls failed with error:", err);
        // Fallback status update
        await leadRef.update({ 
          status: 'Quote Accepted',
          customerStatus: 'Quote Accepted',
          scfAcceptedAt: nowStr
        });
        try {
          await duplicateLeadToCompaniesServer(leadId);
        } catch (companyErr) {
          console.error("[SCF Accept] Error duplicating lead to companies:", companyErr);
        }
      }
    }

    // Send email to Franchisee & Account Manager
    try {
      const amName = leadData?.accountManagerAssigned || leadData?.salesRepAssigned || '';
      let amEmail = '';
      if (amName) {
        const usersSnap = await adminDb.collection('users').get();
        const matchedUser = usersSnap.docs.find(doc => {
          const data = doc.data();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
          return fullName === amName.trim().toLowerCase();
        });
        if (matchedUser) {
          amEmail = matchedUser.data().email || '';
        }
      }
      
      if (!amEmail && amName) {
        amEmail = `${amName.toLowerCase().trim().replace(/\s+/g, '.')}@mailplus.com.au`;
      }
      
      const senderAmEmail = amEmail || 'info@mailplus.com.au';

      // Look up Franchisee linked with the lead
      const franchiseeKey = leadData?.franchisee || leadData?.franchisee_id || '';
      let franchiseeEmail = '';
      let franchiseeContactName = '';
      let franchiseeTerritoryName = leadData?.franchisee || '';

      if (franchiseeKey) {
        const franchiseeSnap = await adminDb.collection('franchisees').get();
        const matchedFranchisee = franchiseeSnap.docs.find(doc => {
          const d = doc.data();
          return (
            doc.id === String(franchiseeKey) ||
            d.internalId === String(franchiseeKey) ||
            (d.name && d.name.toLowerCase() === String(franchiseeKey).toLowerCase())
          );
        });

        if (matchedFranchisee) {
          const fData = matchedFranchisee.data();
          franchiseeEmail = fData.email || '';
          franchiseeContactName = fData.mainContact || fData.name || '';
          franchiseeTerritoryName = fData.name || franchiseeTerritoryName;
        }
      }

      const recipientEmails = Array.from(
        new Set([franchiseeEmail, senderAmEmail].filter(Boolean))
      ).join(', ');

      const ccEmail = 'mailplusit@mailplus.com.au';

      // Extract Contact Details
      let contactName = 'Customer';
      let contactEmail = leadData?.customerEmail || leadData?.customerServiceEmail || '';
      let contactPhone = leadData?.customerPhone || '';
      const contactsSnap = await leadRef.collection('contacts').get();
      if (!contactsSnap.empty) {
        const contactData = contactsSnap.docs[0].data();
        contactName = contactData.name || contactName;
        contactEmail = contactData.email || contactEmail;
        contactPhone = contactData.phone || contactPhone;
      }

      // Address Details
      const street = leadData?.address?.street || leadData?.street || 'N/A';
      const city = leadData?.address?.city || leadData?.city || 'N/A';
      const state = leadData?.address?.state || leadData?.state || 'N/A';
      const zip = leadData?.address?.zip || leadData?.zip || 'N/A';
      const formattedAddress = `${street}, ${city} ${state} ${zip}`;

      // Services & Scheduled Start Date
      const scfSnap = await adminDb.collection('leads').doc(leadId).collection('scfs').doc(scfId).get();
      const scfDataObj = scfSnap.exists ? scfSnap.data() : null;
      const servicesList: Array<{ name: string; frequency?: string[]; rate?: number }> = scfDataObj?.services || leadData?.services || [];
      
      let rawStartDate = scfDataObj?.startDate || leadData?.startDate || '';
      if (typeof rawStartDate === 'object' && rawStartDate && '_seconds' in rawStartDate) {
        rawStartDate = new Date(rawStartDate._seconds * 1000).toISOString();
      }
      const formattedStartDate = rawStartDate ? new Date(rawStartDate).toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : 'To be confirmed';

      const prospectPlusId = leadData?.prospectPlusId || leadId;
      const companyName = leadData?.companyName || 'Lead';
      const subject = `SCF Accepted - ${companyName} (${franchiseeTerritoryName})`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
      const leadLink = `${baseUrl}/leads/${leadId}`;

      const servicesRowsHtml = servicesList.length > 0
        ? servicesList.map(s => {
            const freqStr = Array.isArray(s.frequency) ? s.frequency.join(', ') : (s.frequency || 'N/A');
            const rateStr = s.rate ? `A$${s.rate.toFixed(2)}` : 'N/A';
            return `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600; color: #2d3748;">${s.name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #4a5568;">${freqStr}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #2d3748; font-weight: 600; text-align: right;">${rateStr}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #718096; font-size: 13px;">No specific services listed</td></tr>`;

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
          <td style="padding: 30px 30px 20px 30px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #2d3748; font-size: 15px; line-height: 1.6;">
            <!-- Top Right Corner ID -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="right" style="font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding-bottom: 15px;">
                  Prospect+ ID: ${prospectPlusId}
                </td>
              </tr>
            </table>
            
            <h2 style="margin-top: 0; margin-bottom: 15px; font-size: 20px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Service Commencement Form Accepted!</h2>
            <p style="margin: 0 0 15px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Hi ${franchiseeContactName || franchiseeTerritoryName || 'Franchisee'},</p>
            <p style="margin: 0 0 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Great news! The customer <strong>${companyName}</strong> in your territory (<strong>${franchiseeTerritoryName}</strong>) has accepted their Service Commencement Form (SCF).</p>
            
            <!-- Company & Contact Details -->
            <h3 style="margin: 20px 0 10px 0; font-size: 15px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Company & Site Details</h3>
            <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #edf2f7; border-radius: 8px; margin-bottom: 20px; font-size: 13px; border-collapse: separate; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; width: 140px; border-bottom: 1px solid #edf2f7; color: #4a5568;">Company Name:</td>
                <td style="border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748;">${companyName}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; color: #4a5568;">ABN:</td>
                <td style="border-bottom: 1px solid #edf2f7; color: #2d3748;">${leadData?.abn || 'N/A'}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; color: #4a5568;">Contact Person:</td>
                <td style="border-bottom: 1px solid #edf2f7; color: #2d3748;">${contactName}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; color: #4a5568;">Email:</td>
                <td style="border-bottom: 1px solid #edf2f7; color: #095c7b;">${contactEmail || 'N/A'}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; border-bottom: 1px solid #edf2f7; color: #4a5568;">Phone:</td>
                <td style="border-bottom: 1px solid #edf2f7; color: #2d3748;">${contactPhone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="background-color: #f7fafc; font-weight: 700; color: #4a5568;">Site Address:</td>
                <td style="color: #2d3748;">${formattedAddress}</td>
              </tr>
            </table>

            <!-- Scheduled Start Date -->
            <div style="background-color: #e6f4f8; border-left: 4px solid #095c7b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 14px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <strong>Scheduled Service Start Date:</strong> <span style="color: #095c7b; font-weight: 700;">${formattedStartDate}</span>
            </div>

            <!-- Service Details -->
            <h3 style="margin: 20px 0 10px 0; font-size: 15px; color: #095c7b; font-weight: 700; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Accepted Services</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #edf2f7; border-radius: 8px; margin-bottom: 25px; border-collapse: separate; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <thead>
                <tr style="background-color: #f7fafc; text-align: left;">
                  <th style="padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase;">Service</th>
                  <th style="padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase;">Frequency</th>
                  <th style="padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase; text-align: right;">Rate</th>
                </tr>
              </thead>
              <tbody>
                ${servicesRowsHtml}
              </tbody>
            </table>

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
              &copy; 2026 MailPlus. All rights reserved. <br />
              If you no longer wish to receive marketing communications, you can&nbsp;
              <a href="${baseUrl}/unsubscribe" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
      `;
      
      await sendPhysicalEmail({
        to: recipientEmails || 'info@mailplus.com.au',
        customFrom: senderAmEmail,
        cc: ccEmail,
        subject,
        html: emailHtml,
        leadId
      });
    } catch (emailErr) {
      console.error('Error sending SCF acceptance email to Franchisee/AM:', emailErr);
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
