
'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity } from '@/lib/types';
import { collection, getDocs, addDoc, doc, updateDoc, getDocs as getSubCollectionDocs } from 'firebase/firestore';


async function getLeadsFromFirebase(): Promise<Lead[]> {
  try {
    console.log("Fetching leads from Firebase...");
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);

    if (snapshot.empty) {
      console.log("No leads found in Firebase.");
      return [];
    }
    
    const leadsArray: Lead[] = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        let address: Address | undefined;
        if (data.street || data.city || data.state || data.zip || data.country) {
          address = {
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || ''
          };
        }

        const contactsRef = collection(firestore, 'leads', docSnapshot.id, 'contacts');
        const contactsSnapshot = await getSubCollectionDocs(contactsRef);
        const contacts: Contact[] = contactsSnapshot.docs.map(contactDoc => ({
          id: contactDoc.id,
          ...contactDoc.data()
        } as Contact));

        const activityRef = collection(firestore, 'leads', docSnapshot.id, 'activity');
        const activitySnapshot = await getSubCollectionDocs(activityRef);
        const activity: Activity[] = activitySnapshot.docs.map(activityDoc => ({
          id: activityDoc.id,
          ...activityDoc.data()
        } as Activity));

        const transformedLead: Lead = {
          id: docSnapshot.id,
          entityId: data.customerEntityId || docSnapshot.id,
          companyName: data.companyName || 'Unknown Company',
          status: (data.customerStatus?.replace('SUSPECT-', '') || 'New') as LeadStatus,
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.companyName || 'UC').charAt(0)}`,
          profile: `A lead for ${data.companyName || 'Unknown Company'}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${data.customerStatus || 'New'}.`,
          activity: activity || [],
          contacts: contacts,
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          campaign: data.campaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
        };
        return transformedLead;
      }));
      return leadsArray;

  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

async function addContactToLead(leadId: string, contact: Omit<Contact, 'id'>): Promise<string> {
  try {
    const contactsRef = collection(firestore, 'leads', leadId, 'contacts');
    const docRef = await addDoc(contactsRef, contact);
    console.log(`Contact added with ID: ${docRef.id} to lead ${leadId}`);
    return docRef.id;
  } catch (error) {
    console.error(`Failed to add contact to lead ${leadId}:`, error);
    throw new Error('Failed to add contact to Firebase');
  }
}

async function updateLeadSalesRep(leadId: string, salesRep: string | null): Promise<void> {
  try {
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, {
      salesRepAssigned: salesRep,
    });
    console.log(`Lead ${leadId} assigned to ${salesRep}`);
  } catch (error) {
    console.error(`Failed to assign lead ${leadId}:`, error);
    throw new Error('Failed to update lead in Firebase');
  }
}

async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, {
            customerStatus: status,
        });
        console.log(`Lead ${leadId} status updated to ${status}`);
    } catch (error) {
        console.error(`Failed to update lead status for ${leadId}:`, error);
        throw new Error('Failed to update lead status in Firebase');
    }
}

async function logCallActivity(leadId: string, callData: { notes: string; outcome: string; reason?: string }): Promise<string> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        const activity = {
            type: 'Call',
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            notes: `Outcome: ${callData.outcome}${callData.reason ? ` (${callData.reason})` : ''}. Notes: ${callData.notes}`,
            duration: 'N/A'
        };
        const docRef = await addDoc(activityRef, activity);
        console.log(`Call activity logged with ID: ${docRef.id} for lead ${leadId}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log call activity for lead ${leadId}:`, error);
        throw new Error('Failed to log call activity in Firebase');
    }
}

export { getLeadsFromFirebase, addContactToLead, updateLeadSalesRep, updateLeadStatus, logCallActivity };
