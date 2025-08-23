
'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity, Note } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit } from 'firebase/firestore';

async function logActivity(leadId: string, activity: Omit<Activity, 'id' | 'date'> & { date?: string }): Promise<string> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        const activityLog: Partial<Activity> = {
            ...activity,
            date: activity.date || new Date().toISOString(),
            duration: activity.duration || 'N/A'
        };

        // Ensure callId is explicitly included if it exists
        if (activity.callId) {
            activityLog.callId = activity.callId;
        }

        const docRef = await addDoc(activityRef, activityLog);
        console.log(`Activity logged with ID: ${docRef.id} for lead ${leadId}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log activity for lead ${leadId}:`, error);
        throw new Error('Failed to log activity in Firebase');
    }
}

async function logUnmatchedActivity(activity: Omit<Activity, 'id'>): Promise<string> {
    try {
        const unmatchedActivitiesRef = collection(firestore, 'unmatched_activities');
        const docRef = await addDoc(unmatchedActivitiesRef, activity);
        console.log(`Unmatched activity logged with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log unmatched activity:`, error);
        throw new Error('Failed to log unmatched activity in Firebase');
    }
}


function safeGetStatus(status: any): LeadStatus {
    const validStatuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Won', 'LPO Review'];
    if (typeof status === 'string') {
        let cleanStatus = status.replace('SUSPECT-', '');
        if (cleanStatus === 'Unqualified') { // Specific mapping for your status
            cleanStatus = 'Unqualified';
        }
        if (validStatuses.includes(cleanStatus as LeadStatus)) {
            return cleanStatus as LeadStatus;
        }
    }
    return 'New';
}

async function getUserAircallId(displayName: string): Promise<string | null> {
    try {
        const [firstName, lastName] = displayName.split(' ');
        if (!firstName || !lastName) {
            console.log(`Invalid display name format: ${displayName}`);
            return null;
        }

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('firstName', '==', firstName), where('lastName', '==', lastName), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No user found with display name: ${displayName}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const aircallUserId = userDoc.data().aircallUserId;

        if (!aircallUserId) {
            console.log(`AirCall User ID not found for user: ${displayName}`);
        }

        return aircallUserId;
    } catch (error) {
        console.error(`Failed to get AirCall User ID for user ${displayName}:`, error);
        return null;
    }
}

async function getUserPhoneNumber(displayName: string): Promise<string | null> {
    try {
        const [firstName, lastName] = displayName.split(' ');
        if (!firstName || !lastName) {
            console.log(`Invalid display name format: ${displayName}`);
            return null;
        }

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('firstName', '==', firstName), where('lastName', '==', lastName), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No user found with display name: ${displayName}`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const phoneNumber = userDoc.data().phoneNumber;

        return phoneNumber || null;
    } catch (error) {
        console.error(`Failed to get phone number for user ${displayName}:`, error);
        return null;
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

        const data = docSnapshot.data() || {};
        const companyName = data.companyName || 'Unknown Company';
        
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
          entityId: data['customer-entity-id'] || docSnapshot.id,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          dialerAssigned: data.dialerAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
        };

        if (includeSubCollections) {
          transformedLead.contacts = await getLeadSubCollection<Contact>(docSnapshot.id, 'contacts');
          transformedLead.activity = await getLeadSubCollection<Activity>(docSnapshot.id, 'activity');
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
      const lead = await getLeadFromFirebase(leadId, !summary);
      return lead ? [lead] : [];
  }
  try {
    console.log(`Fetching all leads from Firebase (summary: ${summary})...`);
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);

    if (snapshot.empty) {
      console.log("No leads found in Firebase.");
      return [];
    }
    
    const leadsArray: Lead[] = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() || {};
        const companyName = data.companyName || 'Unknown Company';
        
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
          entityId: data['customer-entity-id'] || docSnapshot.id,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
          address: address,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          dialerAssigned: data.dialerAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          contactCount: data.contactCount || 0,
        };
        
        if (!summary) {
            try {
                transformedLead.contacts = await getLeadSubCollection<Contact>(docSnapshot.id, 'contacts');
                transformedLead.contactCount = transformedLead.contacts.length;
                transformedLead.activity = await getLeadSubCollection<Activity>(docSnapshot.id, 'activity');
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
    const snapshot = await getDocs(ref);
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

async function getLeadNotes(leadId: string): Promise<Note[]> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'notes');
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Note));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return items;
    } catch (error) {
        console.error(`Failed to fetch notes for lead ${leadId}:`, error);
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
    const notes = salesRep ? `Lead assigned to sales rep ${salesRep}` : `Lead unassigned from sales rep`;
    await logActivity(leadId, { type: 'Update', notes });
    console.log(`Lead ${leadId} assigned to ${salesRep}`);
  } catch (error) {
    console.error(`Failed to assign lead ${leadId}:`, error);
    throw new Error('Failed to update lead in Firebase');
  }
}

async function updateLeadDialerRep(leadId: string, dialerRep: string | null): Promise<void> {
  try {
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, {
      dialerAssigned: dialerRep,
    });
    const notes = dialerRep ? `Lead assigned to dialer ${dialerRep}` : `Lead unassigned from dialer`;
    await logActivity(leadId, { type: 'Update', notes });
    console.log(`Lead ${leadId} assigned to dialer ${dialerRep}`);
  } catch (error) {
    console.error(`Failed to assign lead dialer ${leadId}:`, error);
    throw new Error('Failed to update lead dialer in Firebase');
  }
}


async function updateLeadAvatar(leadId: string, avatarUrl: string): Promise<void> {
  try {
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, {
      avatarUrl: avatarUrl,
    });
    await logActivity(leadId, { type: 'Update', notes: `Lead avatar updated.` });
    console.log(`Lead ${leadId} avatar updated.`);
  } catch (error) {
    console.error(`Failed to update avatar for lead ${leadId}:`, error);
    throw new Error('Failed to update lead avatar in Firebase');
  }
}

async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, {
            customerStatus: status,
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

async function logNoteActivity(leadId: string, noteData: { content: string; author: string }): Promise<Note> {
    try {
        const notesRef = collection(firestore, 'leads', leadId, 'notes');
        const newNote = {
            ...noteData,
            date: new Date().toISOString()
        };
        const docRef = await addDoc(notesRef, newNote);
        
        await logActivity(leadId, { 
            type: 'Update', 
            notes: `Note added: ${noteData.content.substring(0, 100)}${noteData.content.length > 100 ? '...' : ''}` 
        });

        console.log(`Note logged with ID: ${docRef.id} for lead ${leadId}`);
        return { ...newNote, id: docRef.id };
    } catch (error) {
        console.error(`Failed to log note for lead ${leadId}:`, error);
        throw new Error('Failed to log note in Firebase');
    }
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


export { getLeadsFromFirebase, addContactToLead, updateLeadSalesRep, updateLeadDialerRep, updateLeadStatus, logCallActivity, logNoteActivity, logUnmatchedActivity, updateContactInLead, deleteContactFromLead, updateLeadDetails, logActivity, getLeadFromFirebase, getLeadSubCollection, getLeadNotes, updateLeadAvatar, getUserPhoneNumber, getUserAircallId };
