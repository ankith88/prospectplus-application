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
