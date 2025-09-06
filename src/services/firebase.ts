

'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity, Note, Transcript, TranscriptAnalysis, UserProfile, Task, DiscoveryData } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit, collectionGroup } from 'firebase/firestore';
import { sendNoteToNetSuite } from './netsuite';

async function logActivity(leadId: string, activity: Partial<Omit<Activity, 'id' | 'date'>> & { date?: string }): Promise<string> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        
        const activityLog: Partial<Activity> = {
            ...activity,
            date: activity.date || new Date().toISOString(),
        };

        if (activity.author) {
            activityLog.author = activity.author;
        }

        const docRef = await addDoc(activityRef, activityLog);
        console.log(`Activity logged with ID: ${docRef.id} for lead ${leadId}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log activity for lead ${leadId}:`, error);
        throw new Error(`Failed to log activity in Firebase: [${error}]`);
    }
}

async function findActivityByCallId(leadId: string, callId: string): Promise<{ id: string; data: Activity } | null> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        const q = query(activityRef, where('callId', '==', callId), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }
        
        const doc = querySnapshot.docs[0];
        return {
            id: doc.id,
            data: doc.data() as Activity
        };

    } catch (error) {
        console.error(`Error finding activity by callId ${callId} for lead ${leadId}:`, error);
        return null;
    }
}

async function updateActivity(leadId: string, activityId: string, activityUpdate: Partial<Activity>): Promise<void> {
    try {
        const activityDocRef = doc(firestore, 'leads', leadId, 'activity', activityId);
        await updateDoc(activityDocRef, activityUpdate);
        console.log(`Activity ${activityId} updated for lead ${leadId}`);
    } catch (error) {
        console.error(`Failed to update activity ${activityId} for lead ${leadId}:`, error);
        throw new Error('Failed to update activity in Firebase');
    }
}

function safeGetStatus(status: any): LeadStatus {
    const validStatuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch'];
    if (typeof status === 'string') {
        let cleanStatus = status.replace('SUSPECT-', '');

        if (cleanStatus === 'Unqualified') {
            return 'New';
        }
        
        // This is a specific business rule requested by the user
        if (status === "SUSPECT-Unqualified") {
            return 'New';
        }

        if (validStatuses.includes(cleanStatus as LeadStatus)) {
            return cleanStatus as LeadStatus;
        }
    }
    return 'New';
}

async function getUserAircallId(displayName: string): Promise<string | null> {
    try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('displayName', '==', displayName), limit(1));
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
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('displayName', '==', displayName), limit(1));
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
          entityId: data['customerEntityId'] || data['internalid'],
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
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
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
        };

        if (includeSubCollections) {
          transformedLead.contacts = await getLeadSubCollection<Contact>(docSnapshot.id, 'contacts');
          transformedLead.activity = await getLeadActivity(docSnapshot.id);
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
    
    const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const leadsArray: Lead[] = await Promise.all(leadsData.map(async (data) => {
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
          id: data.id,
          entityId: data['customerEntityId'] || data['internalid'],
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
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
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
        };
        
        if (!summary) {
            transformedLead.contacts = await getLeadSubCollection<Contact>(data.id, 'contacts');
            transformedLead.contactCount = transformedLead.contacts.length;
            transformedLead.activity = await getLeadActivity(data.id);
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

async function getLeadActivity(leadId: string): Promise<Activity[]> {
    return getLeadSubCollection<Activity>(leadId, 'activity');
}

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };

async function getAllCallActivities(): Promise<CallActivity[]> {
    try {
        const activitiesSnapshot = await getDocs(query(collectionGroup(firestore, 'activity'), where('type', '==', 'Call')));
        const leadIds = new Set(activitiesSnapshot.docs.map(doc => doc.ref.parent.parent!.id));
        
        if (leadIds.size === 0) return [];

        const leadDocs = await Promise.all(Array.from(leadIds).map(id => getDoc(doc(firestore, 'leads', id))));
        const leadsMap = new Map(leadDocs.map(doc => [doc.id, doc.data()]));

        const allCalls = activitiesSnapshot.docs.map(doc => {
            const activityData = doc.data() as Activity;
            const leadId = doc.ref.parent.parent!.id;
            const leadData = leadsMap.get(leadId);

            return {
                ...activityData,
                id: doc.id,
                leadId: leadId,
                leadName: leadData?.companyName || 'Unknown Lead',
                leadStatus: safeGetStatus(leadData?.customerStatus),
                dialerAssigned: leadData?.dialerAssigned || 'Unassigned',
            };
        });

        allCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allCalls;

    } catch (error) {
        console.error('Failed to fetch all call activities:', error);
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

async function getAllTranscripts(): Promise<Transcript[]> {
    try {
        const transcriptsSnapshot = await getDocs(collectionGroup(firestore, 'transcripts'));
        const leadIds = new Set(transcriptsSnapshot.docs.map(doc => doc.ref.parent.parent!.id));
        
        if (leadIds.size === 0) return [];

        const leadDocs = await Promise.all(Array.from(leadIds).map(id => getDoc(doc(firestore, 'leads', id))));
        const leadsMap = new Map(leadDocs.map(doc => [doc.id, doc.data()]));

        const allTranscripts = transcriptsSnapshot.docs.map(doc => {
            const transcriptData = doc.data();
            const leadId = doc.ref.parent.parent!.id;
            const leadData = leadsMap.get(leadId);
            
            return {
                id: doc.id,
                ...transcriptData,
                phoneNumber: transcriptData.phoneNumber || leadData?.customerPhone || 'Unknown',
            } as Transcript;
        });
        
        allTranscripts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allTranscripts;

    } catch (error) {
        console.error('Failed to fetch all transcripts:', error);
        return [];
    }
}

async function getLeadTranscripts(leadId: string): Promise<Transcript[]> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'transcripts');
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Transcript));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return items;
    } catch (error) {
        console.error(`Failed to fetch transcripts for lead ${leadId}:`, error);
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

async function updateLeadStatus(leadId: string, status: LeadStatus, reason?: string): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const updateData: { customerStatus: LeadStatus; statusReason?: string } = {
            customerStatus: status,
        };
        if (reason) {
            updateData.statusReason = reason;
        } else {
            updateData.statusReason = ''; // Explicitly clear reason if not provided
        }

        await updateDoc(leadRef, updateData);

        const note = reason ? `Status changed to ${status} (Reason: ${reason})` : `Status changed to ${status}`;
        await logActivity(leadId, { type: 'Update', notes: note });
        console.log(`Lead ${leadId} status updated to ${status}`);
    } catch (error) {
        console.error(`Failed to update lead status for ${leadId}:`, error);
        throw new Error('Failed to update lead status in Firebase');
    }
}

async function updateLeadAiScore(leadId: string, score: number, reason: string): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, {
            aiScore: score,
            aiReason: reason,
        });
        console.log(`AI score for lead ${leadId} updated to ${score}`);
    } catch (error) {
        console.error(`Failed to update AI score for lead ${leadId}:`, error);
        throw new Error('Failed to update AI score in Firebase');
    }
}


async function logCallActivity(leadId: string, callData: { notes: string; outcome: string; reason?: string }): Promise<string> {
    const notes = `Outcome: ${callData.outcome}${callData.reason ? ` (${callData.reason})` : ''}. Notes: ${callData.notes}`;
    return await logActivity(leadId, { type: 'Call', notes });
}

async function logNoteActivity(leadId: string, noteData: { content: string; author: string }): Promise<{ newNote: Note, netSuiteResult: { success: boolean, message: string } }> {
    try {
        const notesRef = collection(firestore, 'leads', leadId, 'notes');
        const newNoteData = {
            ...noteData,
            date: new Date().toISOString()
        };
        const docRef = await addDoc(notesRef, newNoteData);
        const newNote = { ...newNoteData, id: docRef.id };
        
        await logActivity(leadId, { 
            type: 'Update', 
            notes: `Note added: ${noteData.content.substring(0, 100)}${noteData.content.length > 100 ? '...' : ''}` 
        });

        console.log(`Note logged with ID: ${docRef.id} for lead ${leadId}`);

        // Call NetSuite after successful Firebase write
        const netSuiteResult = await sendNoteToNetSuite({
            leadId,
            noteId: newNote.id,
            author: newNote.author,
            content: newNote.content,
        });

        return { newNote, netSuiteResult };
    } catch (error) {
        console.error(`Failed to log note for lead ${leadId}:`, error);
        throw new Error('Failed to log note in Firebase');
    }
}

async function logTranscriptActivity(leadId: string, transcriptData: { content: string; author: string, callId: string, phoneNumber?: string }): Promise<Transcript> {
    try {
        const transcriptsRef = collection(firestore, 'leads', leadId, 'transcripts');
        
        // Check if a transcript with this callId already exists
        const q = query(transcriptsRef, where('callId', '==', transcriptData.callId), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            console.log(`Transcript for call ID ${transcriptData.callId} already exists. Skipping creation.`);
            return { id: existingDoc.id, ...existingDoc.data() } as Transcript;
        }

        const newTranscript = {
            ...transcriptData,
            date: new Date().toISOString()
        };
        const docRef = await addDoc(transcriptsRef, newTranscript);
        
        await logActivity(leadId, { 
            type: 'Update', 
            notes: `Transcript added for call ID ${transcriptData.callId}` 
        });

        console.log(`Transcript logged with ID: ${docRef.id} for lead ${leadId}`);
        return { ...newTranscript, id: docRef.id };
    } catch (error) {
        console.error(`Failed to log transcript for lead ${leadId}:`, error);
        throw new Error('Failed to log transcript in Firebase');
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

async function updateTranscriptAnalysis(leadId: string, transcriptId: string, analysis: TranscriptAnalysis): Promise<void> {
  try {
    const transcriptRef = doc(firestore, 'leads', leadId, 'transcripts', transcriptId);
    await updateDoc(transcriptRef, { analysis });
    console.log(`Transcript ${transcriptId} analysis updated for lead ${leadId}`);
  } catch (error) {
    console.error(`Failed to update transcript analysis for lead ${leadId}:`, error);
    throw new Error('Failed to update transcript analysis in Firebase');
  }
}

async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
  if (!phoneNumber) return null;

  const leadsRef = collection(firestore, 'leads');
  
  // Normalize phone number for broader matching
  const variations = new Set<string>();
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.startsWith('61')) {
    variations.add(`+${digits}`);
    variations.add(`0${digits.substring(2)}`);
  } else if (digits.startsWith('0')) {
    variations.add(`+61${digits.substring(1)}`);
    variations.add(digits);
  } else {
     variations.add(`+61${digits}`);
     variations.add(`0${digits}`);
  }
   variations.add(phoneNumber);


  for (const num of Array.from(variations)) {
      const q = query(leadsRef, where('customerPhone', '==', num), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id };
      }

      // Fallback search in contacts subcollection
      const allLeadsSnapshot = await getDocs(leadsRef);
      for (const leadDoc of allLeadsSnapshot.docs) {
          const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
          const contactsQuery = query(contactsRef, where('phone', '==', num), limit(1));
          const contactsSnapshot = await getDocs(contactsQuery);
          if (!contactsSnapshot.empty) {
              return { id: leadDoc.id };
          }
      }
  }

  return null;
}

// Task Management Functions
async function getLeadTasks(leadId: string): Promise<Task[]> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'tasks');
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Task));
        // Sort by due date, then completion status
        items.sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
            }
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        return items;
    } catch (error) {
        console.error(`Failed to fetch tasks for lead ${leadId}:`, error);
        return [];
    }
}

async function getAllUserTasks(displayName: string): Promise<Array<Task & { leadId: string; leadName: string }>> {
    try {
        const allTasks: Array<Task & { leadId: string; leadName: string }> = [];
        
        const leadsRef = collection(firestore, 'leads');
        const q = query(leadsRef, where('dialerAssigned', '==', displayName));
        const leadsSnapshot = await getDocs(q);

        for (const leadDoc of leadsSnapshot.docs) {
            const tasks = await getLeadTasks(leadDoc.id);
            const leadName = leadDoc.data().companyName || 'Unknown Lead';
            const tasksWithLeadInfo = tasks.map(task => ({
                ...task,
                leadId: leadDoc.id,
                leadName: leadName
            }));
            allTasks.push(...tasksWithLeadInfo);
        }

        return allTasks;
    } catch (error) {
        console.error(`Failed to fetch all tasks for user ${displayName}:`, error);
        return [];
    }
}

async function addTaskToLead(leadId: string, taskData: { title: string; dueDate: string; author: string }): Promise<Task> {
    try {
        const tasksRef = collection(firestore, 'leads', leadId, 'tasks');
        const newTask: Omit<Task, 'id'> = {
            ...taskData,
            isCompleted: false,
            createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(tasksRef, newTask);
        await logActivity(leadId, { type: 'Update', notes: `Task added: "${taskData.title}"` });
        console.log(`Task added with ID: ${docRef.id} to lead ${leadId}`);
        return { ...newTask, id: docRef.id };
    } catch (error) {
        console.error(`Failed to add task to lead ${leadId}:`, error);
        throw new Error('Failed to add task in Firebase');
    }
}

async function updateTaskCompletion(leadId: string, taskId: string, isCompleted: boolean): Promise<void> {
    try {
        const taskRef = doc(firestore, 'leads', leadId, 'tasks', taskId);
        const updateData: Partial<Task> = { isCompleted };
        if (isCompleted) {
            updateData.completedAt = new Date().toISOString();
        }
        await updateDoc(taskRef, updateData as any);
        const taskDoc = await getDoc(taskRef);
        const taskTitle = taskDoc.data()?.title || 'a task';
        await logActivity(leadId, { type: 'Update', notes: `Task "${taskTitle}" marked as ${isCompleted ? 'complete' : 'incomplete'}.` });
        console.log(`Task ${taskId} for lead ${leadId} completion status updated to ${isCompleted}`);
    } catch (error) {
        console.error(`Failed to update task ${taskId} for lead ${leadId}:`, error);
        throw new Error('Failed to update task in Firebase');
    }
}

async function deleteTaskFromLead(leadId: string, taskId: string): Promise<void> {
    try {
        const taskRef = doc(firestore, 'leads', leadId, 'tasks', taskId);
         const taskDoc = await getDoc(taskRef);
        const taskTitle = taskDoc.data()?.title || 'a task';
        await deleteDoc(taskRef);
        await logActivity(leadId, { type: 'Update', notes: `Task deleted: "${taskTitle}"` });
        console.log(`Task ${taskId} deleted from lead ${leadId}`);
    } catch (error) {
        console.error(`Failed to delete task ${taskId} from lead ${leadId}:`, error);
        throw new Error('Failed to delete task from Firebase');
    }
}

async function updateLeadDiscoveryData(leadId: string, data: DiscoveryData): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, { discoveryData: data });
        await logActivity(leadId, { type: 'Update', notes: 'Discovery questions form was updated.' });
        console.log(`Discovery data for lead ${leadId} updated.`);
    } catch (error) {
        console.error(`Failed to update discovery data for lead ${leadId}:`, error);
        throw new Error('Failed to update discovery data in Firebase');
    }
}

export { 
    getLeadsFromFirebase,
    addContactToLead,
    updateLeadSalesRep,
    updateLeadDialerRep,
    updateLeadStatus,
    logCallActivity,
    logNoteActivity,
    updateContactInLead,
    deleteContactFromLead,
    updateLeadDetails,
    logActivity,
    getLeadFromFirebase,
    getLeadSubCollection,
    getLeadActivity,
    getLeadNotes,
    getLeadTranscripts,
    updateLeadAvatar,
    getUserPhoneNumber,
    getUserAircallId,
    findActivityByCallId,
    updateActivity,
    updateLeadAiScore,
    logTranscriptActivity,
    updateTranscriptAnalysis,
    getAllTranscripts,
    getAllCallActivities,
    findLeadByPhoneNumber,
    getLeadTasks,
    getAllUserTasks,
    addTaskToLead,
    updateTaskCompletion,
    deleteTaskFromLead,
    updateLeadDiscoveryData,
};

    