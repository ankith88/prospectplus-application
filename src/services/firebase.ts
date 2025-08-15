'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact } from '@/lib/types';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';


async function getLeadsFromFirebase(): Promise<Lead[]> {
  try {
    console.log("Fetching leads from Firebase...");
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);

    if (!snapshot.empty) {
      const leadsArray: Lead[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        
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

        // Transform the data from Firestore to match the Lead type
        const transformedLead: Lead = {
          id: doc.id,
          entityId: data.customerEntityId || doc.id,
          companyName: data.companyName || 'Unknown Company',
          status: (data.customerStatus?.replace('SUSPECT-', '') || 'New') as LeadStatus,
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.companyName || 'UC').charAt(0)}`,
          profile: `A lead for ${data.companyName || 'Unknown Company'}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${data.customerStatus || 'New'}.`,
          activity: data.activity || [],
          contacts: data.contacts || [],
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
      });
      return leadsArray;
    } else {
      console.log("No leads found in Firebase.");
      return [];
    }
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

export { getLeadsFromFirebase, addContactToLead, updateLeadSalesRep };
