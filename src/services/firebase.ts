

'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity } from '@/lib/types';
import { collection, getDocs as getFirestoreDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs as getSubCollectionDocs } from 'firebase/firestore';

async function logActivity(leadId: string, activity: Omit<Activity, 'id' | 'date' | 'duration'> & { duration?: string }): Promise<string> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        const activityLog = {
            ...activity,
            date: new Date().toISOString(),
            duration: activity.duration || 'N/A'
        };
        const docRef = await addDoc(activityRef, activityLog);
        console.log(`Activity logged with ID: ${docRef.id} for lead ${leadId}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log activity for lead ${leadId}:`, error);
        throw new Error('Failed to log activity in Firebase');
    }
}

async function getLeadFromFirebase(leadId: string, includeSubCollections = true): Promise<Lead | null> {
    try {
        console.log(`Fetching lead ${leadId} from Firebase...`);
        const leadRef = doc(firestore, 'leads', leadId);
        const docSnapshot = await getDoc(leadRef);

        if (!docSnapshot.exists()) {
            console.log(`No lead found with ID: ${leadId}`);
            return null;
        }

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

        const transformedLead: Lead = {
          id: docSnapshot.id,
          entityId: data.customerEntityId || docSnapshot.id,
          companyName: data.companyName || 'Unknown Company',
          status: (data.customerStatus?.replace('SUSPECT-', '') || 'New') as LeadStatus,
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.companyName || 'UC').charAt(0)}`,
          profile: `A lead for ${data.companyName || 'Unknown Company'}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${data.customerStatus || 'New'}.`,
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
        };

        if (includeSubCollections) {
          const contactsRef = collection(firestore, 'leads', docSnapshot.id, 'contacts');
          const contactsSnapshot = await getSubCollectionDocs(contactsRef);
          transformedLead.contacts = contactsSnapshot.docs.map(contactDoc => ({
            id: contactDoc.id,
            ...contactDoc.data()
          } as Contact));

          const activityRef = collection(firestore, 'leads', docSnapshot.id, 'activity');
          const activitySnapshot = await getSubCollectionDocs(activityRef);
          transformedLead.activity = activitySnapshot.docs.map(activityDoc => ({
            id: activityDoc.id,
            ...activityDoc.data()
          } as Activity)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          transformedLead.contactCount = transformedLead.contacts.length;
        }

        return transformedLead;

    } catch (error) {
        console.error(`Firebase fetch failed for lead ${leadId}:`, error);
        return null;
    }
}

async function getLeadsFromFirebase(options?: { leadId?: string, summary?: boolean }): Promise<Lead[]> {
  const { leadId, summary = false } = options || {};
  
  if (leadId) {
      const lead = await getLeadFromFirebase(leadId);
      return lead ? [lead] : [];
  }
  try {
    console.log(`Fetching leads from Firebase (summary: ${summary})...`);
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getFirestoreDocs(leadsRef);

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

        const transformedLead: Lead = {
          id: docSnapshot.id,
          entityId: data.customerEntityId || docSnapshot.id,
          companyName: data.companyName || 'Unknown Company',
          status: (data.customerStatus?.replace('SUSPECT-', '') || 'New') as LeadStatus,
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${(data.companyName || 'UC').charAt(0)}`,
          profile: `A lead for ${data.companyName || 'Unknown Company'}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${data.customerStatus || 'New'}.`,
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          contactCount: data.contactCount || 0,
        };
        
        if (!summary) {
            try {
                const contactsRef = collection(firestore, 'leads', docSnapshot.id, 'contacts');
                const contactsSnapshot = await getSubCollectionDocs(contactsRef);
                transformedLead.contacts = contactsSnapshot.docs.map(contactDoc => ({
                  id: contactDoc.id,
                  ...contactDoc.data()
                } as Contact));
                transformedLead.contactCount = transformedLead.contacts.length;

                const activityRef = collection(firestore, 'leads', docSnapshot.id, 'activity');
                const activitySnapshot = await getSubCollectionDocs(activityRef);
                transformedLead.activity = activitySnapshot.docs.map(activityDoc => ({
                  id: activityDoc.id,
                  ...activityDoc.data()
                } as Activity)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            } catch (e) {
                console.log(e);
            }
        }

        return transformedLead;
      }));
      return leadsArray;

  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

async function getLeadSubCollection<T extends Contact | Activity>(leadId: string, collectionName: 'contacts' | 'activity'): Promise<T[]> {
  try {
    const ref = collection(firestore, 'leads', leadId, collectionName);
    const snapshot = await getSubCollectionDocs(ref);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));

    if (collectionName === 'activity') {
      (items as Activity[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return items;
  } catch (error) {
    console.error(`Failed to fetch ${collectionName} for lead ${leadId}:`, error);
    return [];
  }
}

async function addContactToLead(leadId: string, contact: Omit<Contact, 'id'>): Promise<string> {
  try {
    const contactsRef = collection(firestore, 'leads', leadId, 'contacts');
    const docRef = await addDoc(contactsRef, contact);
    await logActivity(leadId, { type: 'Update', notes: `New contact added: ${contact.name}` });
    
    // Update contact count
    const leadRef = doc(firestore, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    const currentCount = leadDoc.data()?.contactCount || 0;
    await updateDoc(leadRef, { contactCount: currentCount + 1 });
    
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
    const notes = salesRep ? `Lead assigned to ${salesRep}` : `Lead unassigned`;
    await logActivity(leadId, { type: 'Update', notes });
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
            customerStatus: `SUSPECT-${status}`,
        });
        await logActivity(leadId, { type: 'Update', notes: `Status changed to ${status}` });
        console.log(`Lead ${leadId} status updated to ${status}`);
    } catch (error) {
        console.error(`Failed to update lead status for ${leadId}:`, error);
        throw new Error('Failed to update lead status in Firebase');
    }
}

async function logCallActivity(leadId: string, callData: { notes: string; outcome: string; reason?: string }): Promise<string> {
    const notes = `Outcome: ${callData.outcome}${callData.reason ? ` (${callData.reason})` : ''}. Notes: ${callData.notes}`;
    return await logActivity(leadId, { type: 'Call', notes });
}

async function updateContactInLead(leadId: string, contactId: string, contactData: Partial<Omit<Contact, 'id'>>): Promise<void> {
  try {
    const contactRef = doc(firestore, 'leads', leadId, 'contacts', contactId);
    await updateDoc(contactRef, contactData);
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactData.name} updated.` });
    console.log(`Contact ${contactId} updated for lead ${leadId}`);
  } catch (error) {
    console.error(`Failed to update contact ${contactId} for lead ${leadId}:`, error);
    throw new Error('Failed to update contact in Firebase');
  }
}

async function deleteContactFromLead(leadId: string, contactId: string, contactName: string): Promise<void> {
  try {
    const contactRef = doc(firestore, 'leads', leadId, 'contacts', contactId);
    await deleteDoc(contactRef);
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactName} deleted.` });

    // Update contact count
    const leadRef = doc(firestore, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    const currentCount = leadDoc.data()?.contactCount || 0;
    await updateDoc(leadRef, { contactCount: Math.max(0, currentCount - 1) });
    
    console.log(`Contact ${contactId} deleted from lead ${leadId}`);
  } catch (error) {
    console.error(`Failed to delete contact ${contactId} from lead ${leadId}:`, error);
    throw new Error('Failed to delete contact from Firebase');
  }
}

async function updateLeadDetails(leadId: string, oldLead: Lead, newLeadData: Partial<Pick<Lead, 'companyName' | 'customerServiceEmail' | 'customerPhone'>>): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, newLeadData);

        const changes: string[] = [];
        if (newLeadData.companyName && newLeadData.companyName !== oldLead.companyName) {
            changes.push(`Company name changed from "${oldLead.companyName}" to "${newLeadData.companyName}".`);
        }
        if (newLeadData.customerServiceEmail && newLeadData.customerServiceEmail !== oldLead.customerServiceEmail) {
            changes.push(`Email changed from "${oldLead.customerServiceEmail || 'N/A'}" to "${newLeadData.customerServiceEmail}".`);
        }
        if (newLeadData.customerPhone && newLeadData.customerPhone !== oldLead.customerPhone) {
            changes.push(`Phone changed from "${oldLead.customerPhone || 'N/A'}" to "${newLeadData.customerPhone}".`);
        }

        if (changes.length > 0) {
            await logActivity(leadId, { type: 'Update', notes: changes.join(' ') });
        }
        
        console.log(`Lead ${leadId} details updated.`);
    } catch (error) {
        console.error(`Failed to update lead details for ${leadId}:`, error);
        throw new Error('Failed to update lead details in Firebase');
    }
}


export { getLeadsFromFirebase, addContactToLead, updateLeadSalesRep, updateLeadStatus, logCallActivity, updateContactInLead, deleteContactFromLead, updateLeadDetails, logActivity, getLeadFromFirebase, getLeadSubCollection };
