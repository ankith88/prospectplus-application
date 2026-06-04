'use server';

import { adminDb } from '@/services/firebase-server';

export async function acceptScfAction(leadId: string, scfId: string) {
  try {
    await adminDb.collection('leads').doc(leadId).collection('scfs').doc(scfId).update({
      status: 'Accepted',
      acceptedAt: new Date().toISOString()
    });
    
    // Update Lead Status to 'Signed Customer' or 'Won' if it's currently 'Quote Sent'
    // This is optional but typical for a CRM
    const leadRef = adminDb.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();
    if (leadSnap.exists) {
       const leadData = leadSnap.data();
       if (leadData?.status === 'Quote Sent') {
           await leadRef.update({ status: 'Won' });
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
