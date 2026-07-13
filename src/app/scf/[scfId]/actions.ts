'use server';

import { adminDb } from '@/services/firebase-server';
import { sendLeadUpdateToNetSuite } from '@/services/netsuite';
import { validateABN } from '@/lib/utils';

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
