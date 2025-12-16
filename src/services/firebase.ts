

'use server';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity, Note, Transcript, TranscriptAnalysis, UserProfile, Task, DiscoveryData, Appointment, Review, ReviewCategory, Invoice, SavedRoute, StorableRoute } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit, collectionGroup, orderBy, writeBatch, startAfter, documentId } from 'firebase/firestore';
import { sendNewLeadToNetSuite } from './netsuite';

async function logActivity(
  leadId: string,
  activity: Partial<Omit<Activity, 'id' | 'date'>> & { date?: string }
): Promise<string> {
    try {
        const activityRef = collection(firestore, 'leads', leadId, 'activity');
        
        const activityLog: Partial<Activity> = {
            ...activity,
            date: activity.date || new Date().toISOString(),
            syncedWithNetSuite: false,
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
    const validStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 'Pre Qualified', 'Trialing ShipMate', 'Reschedule'];
    if (typeof status === 'string') {
        if (status === 'SUSPECT-Unqualified') {
            return 'New';
        }
        
        let cleanStatus = status.replace('SUSPECT-', '');

        if (cleanStatus === 'Signed') {
            return 'Won';
        }
        
        if (validStatuses.includes(cleanStatus as LeadStatus)) {
            return cleanStatus as LeadStatus;
        }
    }
    return 'New';
}


async function getUserAircallId(displayName: string): Promise<string | null> {
    try {
        const users = await getAllUsers();
        const user = users.find(u => u.displayName === displayName);
        if (!user) {
            console.log(`No user found with display name: ${displayName}`);
            return null;
        }

        const aircallUserId = user.aircallUserId;

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
        const users = await getAllUsers();
        const user = users.find(u => u.displayName === displayName);

        if (!user) {
            console.log(`No user found with display name: ${displayName}`);
            return null;
        }

        const phoneNumber = user.phoneNumber;

        return phoneNumber || null;
    } catch (error) {
        console.error(`Failed to get phone number for user ${displayName}:`, error);
        return null;
    }
}


async function getLeadFromFirebase(leadId: string, includeSubCollections = true): Promise<Lead | null> {
    if (!leadId) {
        console.error("getLeadFromFirebase called with an undefined or null leadId.");
        return null;
    }
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const docSnapshot = await getDoc(leadRef);

        if (!docSnapshot.exists()) {
            console.log(`No lead found with ID: ${leadId}`);
            return null;
        }

        const data = docSnapshot.data() || {};
        const companyName = data.companyName || 'Unknown Company';
        
        let address: Address | undefined;
        if (data.address && typeof data.address === 'object') {
            address = data.address;
        } else if (data.street || data.city || data.state || data.zip || data.country) {
          address = {
            address1: data.address1 || '',
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || ''
          };
        }

        const transformedLead: Lead = {
          id: docSnapshot.id,
          entityId: data['customerEntityId'] || data['internalid'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
          address: address,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          invoices: [],
        };

        if (includeSubCollections) {
            const [
                contacts,
                activities,
                notes,
                transcripts,
                tasks,
                appointments,
                invoices
            ] = await Promise.all([
                getSubCollection<Contact>('leads', leadId, 'contacts', documentId()),
                getSubCollection<Activity>('leads', leadId, 'activity', 'date'),
                getSubCollection<Note>('leads', leadId, 'notes', 'date'),
                getSubCollection<Transcript>('leads', leadId, 'transcripts', 'date'),
                getSubCollection<Task>('leads', leadId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('leads', leadId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('leads', leadId, 'invoices', documentId())
            ]);

            transformedLead.contacts = contacts;
            transformedLead.activity = activities;
            transformedLead.notes = notes;
            transformedLead.transcripts = transcripts;
            transformedLead.tasks = tasks;
            transformedLead.appointments = appointments;
            transformedLead.invoices = invoices;
            transformedLead.contactCount = contacts.length;
        }

        return transformedLead;

    } catch (error) {
        console.error(`Firebase fetch failed for lead ${leadId}:`, error);
        return null;
    }
}

async function getCompanyFromFirebase(companyId: string, includeSubCollections = true): Promise<Lead | null> {
    if (!companyId) {
        console.error("getCompanyFromFirebase called with an undefined or null companyId.");
        return null;
    }
    try {
        const companyRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(companyRef);

        if (!docSnapshot.exists()) {
            console.log(`No company found with ID: ${companyId}`);
            return null;
        }

        const data = docSnapshot.data() || {};
        const companyName = data.companyName || 'Unknown Company';
        
        let address: Address | undefined;
        if (data.address && typeof data.address === 'object') {
            address = data.address;
        } else if (data.street || data.city || data.state || data.zip || data.country) {
          address = {
            address1: data.address1,
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || ''
          };
        }

        const transformedCompany: Lead = {
          id: docSnapshot.id,
          entityId: data['customerEntityId'] || data['internalid'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
          profile: `A company profile for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
          address: address,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
        };
        
        if (includeSubCollections) {
            const [
                contacts,
                activities,
                notes,
                transcripts,
                tasks,
                appointments,
                invoices
            ] = await Promise.all([
                getSubCollection<Contact>('companies', companyId, 'contacts', documentId()),
                getSubCollection<Activity>('companies', companyId, 'activity', 'date'),
                getSubCollection<Note>('companies', companyId, 'notes', 'date'),
                getSubCollection<Transcript>('companies', companyId, 'transcripts', 'date'),
                getSubCollection<Task>('companies', companyId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('companies', companyId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('companies', companyId, 'invoices', documentId())
            ]);

            transformedCompany.contacts = contacts;
            transformedCompany.activity = activities;
            transformedCompany.notes = notes;
            transformedCompany.transcripts = transcripts;
            transformedCompany.tasks = tasks;
            transformedCompany.appointments = appointments;
            transformedCompany.invoices = invoices;
            transformedCompany.contactCount = contacts.length;
        }


        return transformedCompany;

    } catch (error) {
        console.error(`Firebase fetch failed for company ${companyId}:`, error);
        return null;
    }
}


async function getLeadsFromFirebase(options?: { leadId?: string, summary?: boolean, dialerAssigned?: string }): Promise<Lead[]> {
  const { leadId, summary = false, dialerAssigned } = options || {};
  
  if (leadId) {
      const lead = await getLeadFromFirebase(leadId, !summary);
      return lead ? [lead] : [];
  }
  try {
    console.log(`Fetching leads from Firebase (summary: ${summary}, dialer: ${dialerAssigned || 'all'})...`);
    
    let leadsQuery = query(collection(firestore, 'leads'));
    if (dialerAssigned) {
        leadsQuery = query(leadsQuery, where('dialerAssigned', '==', dialerAssigned));
    }

    const snapshot = await getDocs(leadsQuery);

    if (snapshot.empty) {
      console.log("No leads found in Firebase for the given query.");
      return [];
    }

    const leadsArray: Lead[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const companyName = data.companyName || 'Unknown Company';
        
        let address: Address | undefined;
        if (data.address && typeof data.address === 'object') {
            address = data.address;
        } else if (data.street || data.city || data.state || data.zip || data.country) {
          address = {
            address1: data.address1,
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || ''
          };
        }

        const transformedLead: Lead = {
          id: doc.id,
          entityId: data['customerEntityId'] || data['internalid'],
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
          address: address,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          campaign: data.customerSource,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          contactCount: data.contactCount || 0,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
        };

        return transformedLead;
      });
      return leadsArray;

  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

async function getCompaniesFromFirebase(): Promise<Lead[]> {
    console.log(`[getCompaniesFromFirebase] Starting to fetch companies from Firebase...`);
    try {
        const companiesQuery = query(collection(firestore, 'companies'));
        const snapshot = await getDocs(companiesQuery);

        if (snapshot.empty) {
            console.log("[getCompaniesFromFirebase] No companies found in Firebase.");
            return [];
        }

        const companiesArray = snapshot.docs
            .map((doc): (Lead & { isCompany: boolean, isProspect: boolean }) | null => {
                const data = doc.data();

                const lat = typeof data.latitude === 'string' && data.latitude.trim() !== '' ? parseFloat(data.latitude) : typeof data.latitude === 'number' ? data.latitude : NaN;
                const lng = typeof data.longitude === 'string' && data.longitude.trim() !== '' ? parseFloat(data.longitude) : typeof data.longitude === 'number' ? data.longitude : NaN;

                if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`[getCompaniesFromFirebase] Skipping company ${data.companyName || doc.id} due to invalid coordinates.`);
                    return null;
                }

                let address: Address | undefined;
                if (data.address && typeof data.address === 'object') {
                    address = data.address;
                } else if (data.street || data.city || data.state || data.zip || data.country) {
                    address = {
                        address1: data.address1,
                        street: data.street || '',
                        city: data.city || '',
                        state: data.state || '',
                        zip: data.zip || '',
                        country: data.country || ''
                    };
                }

                const transformedCompany: Lead & { isCompany: boolean, isProspect: boolean } = {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['internalid'],
                    salesRecordInternalId: data.salesRecordInternalId,
                    companyName: data.companyName || 'Unknown Company',
                    status: 'Won', 
                    profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
                    address: address,
                    latitude: lat,
                    longitude: lng,
                    franchisee: data.franchisee,
                    websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
                    industryCategory: data.industryCategory,
                    customerServiceEmail: data.customerServiceEmail,
                    customerPhone: data.customerPhone,
                    isCompany: true,
                    isProspect: false,
                };

                return transformedCompany;
            })
            .filter((company): company is Lead => company !== null);

        console.log(`[getCompaniesFromFirebase] Successfully fetched and processed ${companiesArray.length} companies with valid coordinates.`);
        return companiesArray;

    } catch (error) {
        console.error("[getCompaniesFromFirebase] Firebase fetch for companies failed:", error);
        return [];
    }
}


async function getArchivedLeads(): Promise<Lead[]> {
    try {
        console.log(`Fetching archived leads from Firebase...`);
        const archivedStatusesForQuery: (LeadStatus | 'Signed')[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Signed'];
        
        const q = query(collection(firestore, 'leads'), where('customerStatus', 'in', archivedStatusesForQuery));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No archived leads found in Firebase.");
            return [];
        }

        const leadsWithLastActivity = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const companyName = data.companyName || 'Unknown Company';
                
                const transformedLead: Lead = {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['internalid'],
                    salesRecordInternalId: data.salesRecordInternalId,
                    companyName: companyName,
                    status: safeGetStatus(data.customerStatus),
                    statusReason: data.statusReason,
                    profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
                    franchisee: data.franchisee,
                    dialerAssigned: data.dialerAssigned,
                    industryCategory: data.industryCategory,
                    discoveryData: data.discoveryData,
                };
                
                const lastActivity = await getLastActivity(doc.id);
                transformedLead.activity = lastActivity ? [lastActivity] : [];
                
                return transformedLead;
            })
        );

        leadsWithLastActivity.sort((a, b) => {
            const dateA = a.activity?.[0]?.date ? new Date(a.activity[0].date).getTime() : 0;
            const dateB = b.activity?.[0]?.date ? new Date(b.activity[0].date).getTime() : 0;
            return dateB - dateA;
        });

        return leadsWithLastActivity;
    } catch (error) {
        console.error("Firebase fetch for archived leads failed:", error);
        return [];
    }
}


async function getAllLeadsForReport(): Promise<Lead[]> {
    console.log('[getAllLeadsForReport] Starting to fetch all leads for reporting...');
    try {
        const leadsSnapshot = await getDocs(collection(firestore, 'leads'));
        if (leadsSnapshot.empty) {
            console.log("[getAllLeadsForReport] No leads found.");
            return [];
        }

        const leads = leadsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                dialerAssigned: data.dialerAssigned,
                status: safeGetStatus(data.customerStatus),
                campaign: data.customerSource,
                leadType: data.leadType,
                discoveryData: data.discoveryData,
                demoCompleted: data.demoCompleted,
                franchisee: data.franchisee, // Add this line
                activity: [] // Activity will be populated by other functions if needed
            } as Lead;
        });

        console.log(`[getAllLeadsForReport] Successfully fetched ${leads.length} lead shells.`);
        return leads;

    } catch (error) {
        console.error("[getAllLeadsForReport] Failed to fetch leads:", error);
        return [];
    }
}

async function getSubCollection<T>(parentCollection: string, docId: string, subCollectionName: string, orderByField: string, orderDirection: 'asc' | 'desc' = 'desc'): Promise<T[]> {
    try {
        const ref = collection(firestore, parentCollection, docId, subCollectionName);
        const q = query(ref, orderBy(orderByField, orderDirection));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // Special handling for invoiceType
            if (subCollectionName === 'invoices' && !data.invoiceType) {
                data.invoiceType = 'Service';
            }
            return { id: doc.id, ...data } as T;
        });
    } catch (error) {
        console.error(`Failed to fetch sub-collection ${subCollectionName} for doc ${docId} in ${parentCollection}:`, error);
        return [];
    }
}


async function getPagedLeadSubCollection<T>(
    leadId: string, 
    collectionName: string, 
    orderByField: string, 
    limitNum: number, 
    lastDocId: string | null
): Promise<{ items: T[], lastDocId: string | null }> {
    try {
        const ref = collection(firestore, 'leads', leadId, collectionName);
        let q = query(ref, orderBy(orderByField, 'desc'), limit(limitNum));

        if (lastDocId) {
            const lastDocSnapshot = await getDoc(doc(ref, lastDocId));
            if (lastDocSnapshot.exists()) {
                q = query(q, startAfter(lastDocSnapshot));
            }
        }
        
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        const newLastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;
        
        return { items, lastDocId: newLastDocId };

    } catch (error) {
        console.error(`Failed to fetch paginated ${collectionName} for lead ${leadId}:`, error);
        return { items: [], lastDocId: null };
    }
}


async function getLeadContacts(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Contact[], lastDocId: string | null }> {
    return getPagedLeadSubCollection<Contact>(leadId, 'contacts', documentId(), limitNum, lastDocId);
}

async function getLeadActivity(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Activity[], lastDocId: string | null }> {
    return getPagedLeadSubCollection<Activity>(leadId, 'activity', 'date', limitNum, lastDocId);
}

type CallActivity = Activity & { leadId: string; leadName: string, leadStatus: LeadStatus, dialerAssigned?: string };

async function getAllCallActivities(): Promise<CallActivity[]> {
    console.log('[getAllCallActivities] Starting to fetch call activities...');
    try {
        const activitySnapshot = await getDocs(collectionGroup(firestore, 'activity'));
        const callActivityDocs = activitySnapshot.docs.filter(doc => doc.data().type === 'Call');

        if (callActivityDocs.length === 0) {
            console.log("[getAllCallActivities] No call activities found after filtering.");
            return [];
        }

        const leadIds = [...new Set(callActivityDocs.map(doc => doc.ref.parent.parent!.id))];
        if (leadIds.length === 0) {
             console.log("[getAllCallActivities] No lead IDs found from activities.");
             return [];
        }

        const leadsData: { [key: string]: Lead } = {};
        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }

        for (const chunk of leadChunks) {
            const leadsQuery = query(collection(firestore, 'leads'), where('__name__', 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = doc.data() as Lead;
            });
        }
        
        const allCalls = callActivityDocs.map(activityDoc => {
            const activityData = activityDoc.data() as Activity;
            const leadId = activityDoc.ref.parent.parent!.id;
            const leadData = leadsData[leadId];

            if (!leadData) {
                return null;
            }

            return {
                ...activityData,
                id: activityDoc.id,
                leadId: leadId,
                leadName: leadData.companyName || 'Unknown Lead',
                leadStatus: safeGetStatus(leadData.customerStatus),
                dialerAssigned: leadData.dialerAssigned || 'Unassigned',
            };
        }).filter((call): call is CallActivity => call !== null);

        const uniqueCallsMap = new Map<string, CallActivity>();
        allCalls.forEach(call => {
            if (call.callId) {
                const existing = uniqueCallsMap.get(call.callId);
                if (!existing || new Date(call.date) > new Date(existing.date)) {
                    uniqueCallsMap.set(call.callId, call);
                }
            } else {
                 uniqueCallsMap.set(call.id, call);
            }
        });

        const finalCalls = Array.from(uniqueCallsMap.values());
        console.log(`[getAllCallActivities] Returning ${finalCalls.length} unique call activities.`);
        return finalCalls;

    } catch (error) {
        console.error('[getAllCallActivities] Failed to fetch all call activities:', error);
        return [];
    }
}


async function getLeadNotes(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Note[], lastDocId: string | null }> {
    return getPagedLeadSubCollection<Note>(leadId, 'notes', 'date', limitNum, lastDocId);
}

async function getLeadAppointments(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Appointment[], lastDocId: string | null }> {
    return getPagedLeadSubCollection<Appointment>(leadId, 'appointments', 'duedate', limitNum, lastDocId);
}

async function getAllNotes(): Promise<Array<Note & { leadId: string }>> {
    try {
        const notesSnapshot = await getDocs(collectionGroup(firestore, 'notes'));
        const allNotes = notesSnapshot.docs.map(doc => {
            const noteData = doc.data() as Note;
            const leadId = doc.ref.parent.parent!.id;
            return {
                ...noteData,
                id: doc.id,
                leadId: leadId,
            };
        });
        allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(b.date).getTime());
        return allNotes;
    } catch (error) {
        console.error('Failed to fetch all notes:', error);
        return [];
    }
}

async function getAllActivities(): Promise<Array<Activity & { leadId: string }>> {
    try {
        const activitiesSnapshot = await getDocs(collectionGroup(firestore, 'activity'));
        const allActivities = activitiesSnapshot.docs.map(doc => {
            const activityData = doc.data() as Activity;
            const leadId = doc.ref.parent.parent!.id;
            return {
                ...activityData,
                id: doc.id,
                leadId: leadId,
            };
        });
        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(b.date).getTime());
        return allActivities;
    } catch (error) {
        console.error('Failed to fetch all activities:', error);
        return [];
    }
}

async function getAllTranscripts(): Promise<Transcript[]> {
    try {
        const transcriptsSnapshot = await getDocs(collectionGroup(firestore, 'transcripts'));
        const leadIds = [...new Set(transcriptsSnapshot.docs.map(doc => doc.ref.parent.parent!.id))];
        
        if (leadIds.length === 0) return [];

        const leadsData: { [key: string]: Lead } = {};
        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }
        for (const chunk of leadChunks) {
            const leadsQuery = query(collection(firestore, 'leads'), where('__name__', 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = doc.data() as Lead;
            });
        }

        const allTranscripts = transcriptsSnapshot.docs.map(doc => {
            const transcriptData = doc.data();
            const leadId = doc.ref.parent.parent!.id;
            const leadData = leadsData[leadId];
            
            return {
                id: doc.id,
                ...transcriptData,
                phoneNumber: transcriptData.phoneNumber || leadData?.customerPhone || 'Unknown',
            } as Transcript;
        }).filter((t): t is Transcript => !!t);
        
        allTranscripts.sort((a, b) => new Date(b.date).getTime() - new Date(b.date).getTime());
        return allTranscripts;

    } catch (error) {
        console.error('Failed to fetch all transcripts:', error);
        return [];
    }
}

async function getAllAppointments(): Promise<Array<Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData }>> {
    try {
        const appointmentsSnapshot = await getDocs(collectionGroup(firestore, 'appointments'));
        
        const leadIds = [...new Set(appointmentsSnapshot.docs.map(doc => doc.ref.parent.parent!.id))];
        if (leadIds.length === 0) return [];

        const leadsData: { [key: string]: Lead } = {};
        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }
        for (const chunk of leadChunks) {
            const leadsQuery = query(collection(firestore, 'leads'), where('__name__', 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = doc.data() as Lead;
            });
        }

        const allAppointments = appointmentsSnapshot.docs.map(appointmentDoc => {
            const appointmentData = appointmentDoc.data() as Appointment;
            const leadId = appointmentDoc.ref.parent.parent!.id;
            const leadData = leadsData[leadId];
            
            if (!leadData) {
                return null;
            }

            return {
                ...appointmentData,
                id: appointmentDoc.id,
                leadId: leadId,
                leadName: leadData.companyName || 'Unknown Lead',
                dialerAssigned: leadData.dialerAssigned,
                leadStatus: safeGetStatus(leadData.customerStatus),
                discoveryData: leadData.discoveryData,
            };
        }).filter((appt): appt is Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData } => appt !== null);

        allAppointments.sort((a, b) => new Date(a.duedate).getTime() - new Date(b.duedate).getTime());
        return allAppointments;
    } catch (error) {
        console.error('Failed to fetch all appointments:', error);
        return [];
    }
}

async function getLeadTranscripts(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Transcript[], lastDocId: string | null }> {
    return getPagedLeadSubCollection<Transcript>(leadId, 'transcripts', 'date', limitNum, lastDocId);
}


async function addContactToLead(leadId: string, contact: Omit<Contact, 'id'>): Promise<string> {
  try {
    const contactsRef = collection(firestore, 'leads', leadId, 'contacts');
    const newContactData = {
      ...contact,
      syncedWithNetSuite: false,
    };
    const docRef = await addDoc(contactsRef, newContactData);
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

async function updateLeadSalesRep(leadId: string, salesRep: string | null, calendlyLink: string | null): Promise<void> {
  try {
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, {
      salesRepAssigned: salesRep,
      salesRepAssignedCalendlyLink: calendlyLink,
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

async function logCallActivity(
    leadId: string,
    callData: {
        outcome: string;
        notes: string;
        author: string;
        salesRecordInternalId?: string;
    }
): Promise<LeadStatus | undefined> {
    const outcomeStatusMap: { [key: string]: { status: LeadStatus; reason?: string } } = {
        'Busy': { status: 'In Progress' },
        'Call Back/Follow-up': { status: 'High Touch' },
        'Gatekeeper': { status: 'Connected' },
        'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
        'Appointment Booked': { status: 'Qualified' },
        'Email Interested': { status: 'Pre Qualified' },
        'No Answer': { status: 'In Progress' },
        'Not Interested': { status: 'Lost', reason: 'Not Interested' },
        'Voicemail': { status: 'In Progress' },
        'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
        'Not a Fit': { status: 'Lost', reason: 'Not a Fit' },
        'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
        'Reschedule': { status: 'Reschedule' },
        'LOST - No Contact': { status: 'Lost', reason: 'No Contact' },
    };

    const { status, reason: outcomeReason } = outcomeStatusMap[callData.outcome] || {};
    const notesToLog = `Outcome: ${callData.outcome}${outcomeReason ? ` (${outcomeReason})` : ''}. Notes: ${callData.notes || 'N/A'}`;

    const activityPromise = logActivity(leadId, { type: 'Call', notes: notesToLog, author: callData.author });
    const statusPromise = status ? updateLeadStatus(leadId, status, outcomeReason) : Promise.resolve();
    
    // Await Firebase operations
    await Promise.all([activityPromise, statusPromise]);
    
    return status;
}

async function logNoteActivity(
    leadId: string, 
    noteData: { content: string; author: string, date: string }
): Promise<void> {
    const notesRef = collection(firestore, 'leads', leadId, 'notes');
    const newNoteData = { ...noteData, syncedWithNetSuite: false };

    const docRef = await addDoc(notesRef, newNoteData);
    
    await logActivity(leadId, {
        type: 'Update',
        notes: `Note added: ${noteData.content.substring(0, 100)}${noteData.content.length > 100 ? '...' : ''}`,
        date: noteData.date
    });
}

async function logTranscriptActivity(leadId: string, transcriptData: { content: string; author?: string, callId: string, phoneNumber?: string }): Promise<Transcript> {
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
            notes: `Transcript added for call ID ${transcriptData.callId}`,
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
    const updatePayload = {
      ...contactData,
      syncedWithNetSuite: false, // Always set to false on edit
    };
    await updateDoc(contactRef, updatePayload);
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

async function updateLeadDetails(leadId: string, oldLead: Lead, newLeadData: Partial<Pick<Lead, 'companyName' | 'customerServiceEmail' | 'address'>>): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        
        const updatePayload: { [key: string]: any } = {};
        if (newLeadData.companyName !== undefined) updatePayload.companyName = newLeadData.companyName;
        if (newLeadData.customerServiceEmail !== undefined) updatePayload.customerServiceEmail = newLeadData.customerServiceEmail;
        if (newLeadData.address) {
            updatePayload.address = {
                address1: newLeadData.address.address1 || '',
                street: newLeadData.address.street || '',
                city: newLeadData.address.city || '',
                state: newLeadData.address.state || '',
                zip: newLeadData.address.zip || '',
                country: newLeadData.address.country || '',
            };
        }

        if (Object.keys(updatePayload).length > 0) {
            await updateDoc(leadRef, updatePayload);
        }

        const changes: string[] = [];
        if (newLeadData.companyName && newLeadData.companyName !== oldLead.companyName) {
            changes.push(`Company name changed from "${oldLead.companyName}" to "${newLeadData.companyName}".`);
        }
        if (newLeadData.customerServiceEmail && newLeadData.customerServiceEmail !== oldLead.customerServiceEmail) {
            changes.push(`Email changed from "${oldLead.customerServiceEmail || 'N/A'}" to "${newLeadData.customerServiceEmail}".`);
        }
        if (newLeadData.address) {
            changes.push('Address updated.');
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
  }

  return null;
}

// Task Management Functions
async function getLeadTasks(leadId: string, limitNum: number = 10, lastDocId: string | null = null): Promise<{ items: Task[], lastDocId: string | null }> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'tasks');
        let q = query(ref, orderBy('dueDate', 'asc'), limit(limitNum));

        if (lastDocId) {
            const lastDocSnapshot = await getDoc(doc(ref, lastDocId));
            if (lastDocSnapshot.exists()) {
                q = query(q, startAfter(lastDocSnapshot));
            }
        }

        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Task));
        
        const newLastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;
        
        return { items, lastDocId: newLastDocId };
    } catch (error) {
        console.error(`Failed to fetch tasks for lead ${leadId}:`, error);
        return { items: [], lastDocId: null };
    }
}

async function getAllUserTasks(displayName: string): Promise<Array<Task & { leadId: string; leadName: string }>> {
    try {
        const tasksQuery = query(collectionGroup(firestore, 'tasks'), where('dialerAssigned', '==', displayName));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        const userTasks = tasksSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            leadId: doc.ref.parent.parent!.id 
        })) as Array<Task & { leadId: string }>;

        if (userTasks.length === 0) {
            return [];
        }

        const leadIds = [...new Set(userTasks.map(task => task.leadId))];
        const leadsData: Record<string, Lead> = {};

        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }

        for (const chunk of leadChunks) {
            if (chunk.length === 0) continue;
            const leadsQuery = query(collection(firestore, 'leads'), where('__name__', 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = doc.data() as Lead;
            });
        }
        
        const hydratedTasks = userTasks.map(task => {
            const lead = leadsData[task.leadId];
            return {
                ...task,
                leadName: lead ? lead.companyName : "Unknown Lead",
            };
        });

        return hydratedTasks;

    } catch (error) {
        console.error(`Failed to fetch all tasks for user ${displayName}:`, error);
        throw new Error(`Failed to get user tasks: ${error}`);
    }
}

async function getAllTasks(): Promise<Array<Task & { leadId: string }>> {
    try {
        const tasksSnapshot = await getDocs(collectionGroup(firestore, 'tasks'));
        const allTasks = tasksSnapshot.docs.map(doc => {
            const taskData = doc.data() as Task;
            const leadId = doc.ref.parent.parent!.id;
            return {
                ...taskData,
                id: doc.id,
                leadId: leadId,
            };
        });
        allTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        return allTasks;
    } catch (error) {
        console.error('Failed to fetch all tasks:', error);
        return [];
    }
}


async function addTaskToLead(leadId: string, taskData: { title: string; dueDate: string; author: string }): Promise<Task> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        const leadData = leadSnap.data();

        const tasksRef = collection(firestore, 'leads', leadId, 'tasks');
        const newTask: Omit<Task, 'id'> = {
            ...taskData,
            dialerAssigned: leadData?.dialerAssigned || null,
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
  // This function is now a wrapper. The logic is moved to the server action.
  const { sendDiscoveryDataToNetSuite } = await import('@/services/netsuite');
  
  try {
    // 1. Save to Firebase
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, { discoveryData: data });
    await logActivity(leadId, { type: 'Update', notes: 'Discovery questions form was updated.' });
    console.log(`[Firebase] Discovery data for lead ${leadId} updated.`);
    
    // 2. Send to NetSuite
    console.log(`[NetSuite] Triggering NetSuite sync for lead ${leadId}...`);
    const nsResult = await sendDiscoveryDataToNetSuite({ leadId, discoveryData: data });

    if (nsResult.success) {
      console.log(`[NetSuite] Successfully synced discovery data for lead ${leadId}.`);
    } else {
      console.error(`[NetSuite] Failed to sync discovery data for lead ${leadId}: ${nsResult.message}`);
      // We throw an error here so the client knows the NetSuite part failed.
      throw new Error(`NetSuite sync failed: ${nsResult.message}`);
    }

  } catch (error) {
    console.error(`Failed to update discovery data for lead ${leadId}:`, error);
    throw new Error(`Failed to update discovery data: ${error}`);
  }
}

async function addScorecard(leadId: string, data: any): Promise<any> {
    try {
        const scorecardsRef = collection(firestore, 'leads', leadId, 'scorecards');
        const docRef = await addDoc(scorecardsRef, {
            ...data,
            createdAt: new Date().toISOString(),
        });
        const savedData = await getDoc(docRef);
        console.log(`Scorecard added with ID: ${docRef.id} to lead ${leadId}`);
        return { id: docRef.id, ...savedData.data() };
    } catch (error) {
        console.error(`Failed to add scorecard to lead ${leadId}:`, error);
        throw new Error('Failed to add scorecard in Firebase');
    }
}

async function updateScorecardAnalysis(leadId: string, scorecardId: string, analysis: TranscriptAnalysis): Promise<void> {
    try {
        const scorecardRef = doc(firestore, 'leads', leadId, 'scorecards', scorecardId);
        await updateDoc(scorecardRef, { analysis });
        console.log(`Scorecard ${scorecardId} analysis updated for lead ${leadId}`);
    } catch (error) {
        console.error(`Failed to update scorecard analysis for lead ${leadId}:`, error);
        throw new Error('Failed to update scorecard analysis in Firebase');
    }
}

async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const usersRef = collection(firestore, 'users');
        const snapshot = await getDocs(usersRef);
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data() as Omit<UserProfile, 'uid' | 'displayName'>;
            const displayName = `${data.firstName} ${data.lastName}`.trim();
            return {
                uid: doc.id,
                ...data,
                displayName
            } as UserProfile;
        });
    } catch (error) {
        console.error('Failed to fetch all users:', error);
        return [];
    }
}

async function bulkUpdateLeadDialerRep(leadIds: string[], newDialerReps: string[]): Promise<void> {
    if (newDialerReps.length === 0) {
        throw new Error("No users selected for reassignment.");
    }
    try {
        const batch = writeBatch(firestore);
        
        leadIds.forEach((leadId, index) => {
            const leadRef = doc(firestore, 'leads', leadId);
            const userToAssign = newDialerReps[index % newDialerReps.length];
            batch.update(leadRef, { dialerAssigned: userToAssign });

            const activityRef = collection(leadRef, 'activity');
            const newActivityRef = doc(activityRef);
            batch.set(newActivityRef, {
                type: 'Update',
                date: new Date().toISOString(),
                notes: `Lead reassigned to ${userToAssign}.`
            });
        });
        
        await batch.commit();
        console.log(`Successfully reassigned ${leadIds.length} leads randomly among ${newDialerReps.length} users.`);
    } catch (error) {
        console.error('Failed to bulk update lead dialer reps:', error);
        throw new Error('Failed to bulk update leads in Firebase');
    }
}


async function addCallReview(leadId: string, activityId: string, reviewData: { reviewer: string; notes: string; category: ReviewCategory }): Promise<void> {
    try {
        const activityRef = doc(firestore, 'leads', leadId, 'activity', activityId);
        await updateDoc(activityRef, {
            isReviewed: true,
            review: {
                ...reviewData,
                date: new Date().toISOString(),
            }
        });
        console.log(`Review added to activity ${activityId} for lead ${leadId}`);
    } catch (error) {
        console.error(`Failed to add review for activity ${activityId}:`, error);
        throw new Error('Failed to add review in Firebase');
    }
}

async function getLastNote(leadId: string): Promise<Note | null> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'notes');
        const q = query(ref, orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Note;
    } catch (error) {
        console.error(`Failed to fetch last note for lead ${leadId}:`, error);
        throw new Error('Service Unavailable');
    }
}

async function getLastActivity(leadId: string): Promise<Activity | null> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'activity');
        const q = query(ref, orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Activity;
    } catch (error) {
        console.error(`Failed to fetch last activity for lead ${leadId}:`, error);
        throw new Error('Service Unavailable');
    }
}

interface NewLeadData {
  companyName: string;
  websiteUrl?: string;
  industryCategory?: string;
  address: Address;
  contact: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone?: string;
  };
}

async function createNewLead(data: NewLeadData): Promise<{ success: boolean; leadId?: string; message?: string; }> {
  const nsResult = await sendNewLeadToNetSuite(data);
  return nsResult;
}

async function prospectWebsiteTool(input: { leadId: string; websiteUrl: string; }): Promise<{ searchKeywords?: string[], contacts?: Contact[], companyDescription?: string, logoUrl?: string }> {
    // This is a placeholder that simulates calling the full prospectWebsiteTool 
    // from netsuite.ts and only returning the part we need for this operation.
    console.log(`[Firebase Service] Prospecting website for lead ${input.leadId}`);
    return { searchKeywords: [], contacts: [] };
}

async function checkForDuplicateLead(companyName: string, phoneNumber: string): Promise<string | null> {
    const leadsRef = collection(firestore, 'leads');
    
    // Check for duplicate by company name (case-insensitive)
    const nameQuery = query(leadsRef, where('companyName', '==', companyName), limit(1));
    const nameSnapshot = await getDocs(nameQuery);
    if (!nameSnapshot.empty) {
        return nameSnapshot.docs[0].id;
    }
    
    // Check for duplicate by phone number if provided
    if (phoneNumber) {
        const phoneQuery = query(leadsRef, where('customerPhone', '==', phoneNumber), limit(1));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
            return phoneSnapshot.docs[0].id;
        }
    }
    
    return null;
}

async function deleteLead(leadIds: string | string[]): Promise<void> {
    const idsToDelete = Array.isArray(leadIds) ? leadIds : [leadIds];
    if (idsToDelete.length === 0) {
        return;
    }

    try {
        const batch = writeBatch(firestore);
        const subcollections = ['contacts', 'activity', 'notes', 'transcripts', 'tasks', 'appointments', 'scorecards'];

        for (const leadId of idsToDelete) {
            const leadRef = doc(firestore, 'leads', leadId);

            // Fetch and delete subcollections in parallel for a single lead
            await Promise.all(subcollections.map(async (subcollection) => {
                const subcollectionRef = collection(leadRef, subcollection);
                const snapshot = await getDocs(subcollectionRef);
                snapshot.docs.forEach(subDoc => {
                    batch.delete(subDoc.ref);
                });
            }));
            
            // Queue the main lead document for deletion
            batch.delete(leadRef);
        }

        // Commit all deletions in a single batch
        await batch.commit();
        console.log(`Successfully deleted ${idsToDelete.length} lead(s) and their subcollections.`);

    } catch (error) {
        console.error(`Failed to delete leads:`, error);
        throw new Error('Failed to delete lead(s) from Firebase');
    }
}

// Function to simplify DirectionsResult
const simplifyDirections = (directions: google.maps.DirectionsResult): StorableRoute['directions'] => {
    return {
        routes: directions.routes.map(route => ({
            waypoint_order: route.waypoint_order,
            legs: route.legs.map(leg => ({
                distance: { text: leg.distance!.text, value: leg.distance!.value },
                duration: { text: leg.duration!.text, value: leg.duration!.value },
                end_address: leg.end_address,
                start_address: leg.start_address,
            })),
        })),
    };
};


async function saveUserRoute(userId: string, routeData: SavedRoute): Promise<string> {
    try {
        const routesRef = collection(firestore, 'users', userId, 'routes');
        const storableRoute: StorableRoute = {
            name: routeData.name,
            createdAt: routeData.createdAt,
            travelMode: routeData.travelMode,
            leads: routeData.leads.map(l => ({ 
                id: l.id, 
                latitude: l.latitude!, 
                longitude: l.longitude!,
                companyName: l.companyName,
                address: l.address!
            })),
            directions: routeData.directions ? simplifyDirections(routeData.directions as google.maps.DirectionsResult) : undefined,
        };

        const docRef = await addDoc(routesRef, storableRoute);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to save route for user ${userId}:`, error);
        throw new Error('Failed to save route to Firebase');
    }
}

async function getUserRoutes(userId: string): Promise<SavedRoute[]> {
    try {
        const routesRef = collection(firestore, 'users', userId, 'routes');
        const q = query(routesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data() as StorableRoute;
            return {
                id: doc.id,
                ...data,
                directions: data.directions,
            } as SavedRoute;
        });
    } catch (error) {
        console.error(`Failed to get routes for user ${userId}:`, error);
        return [];
    }
}

async function getAllUserRoutes(): Promise<Array<SavedRoute & { userName: string, userId: string }>> {
    try {
        const users = await getAllUsers();
        const relevantUsers = users.filter(u => u.role === 'Field Sales' || u.role === 'admin');
        
        let allRoutes: Array<SavedRoute & { userName: string, userId: string }> = [];

        for (const user of relevantUsers) {
            const userRoutes = await getUserRoutes(user.uid);
            const routesWithUserName = userRoutes.map(route => ({
                ...route,
                userName: user.displayName!,
                userId: user.uid,
            }));
            allRoutes = allRoutes.concat(routesWithUserName);
        }
        
        allRoutes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return allRoutes;
    } catch (error) {
        console.error('Failed to fetch all user routes:', error);
        return [];
    }
}

async function deleteUserRoute(userId: string, routeId: string): Promise<void> {
    try {
        const routeRef = doc(firestore, 'users', userId, 'routes', routeId);
        await deleteDoc(routeRef);
    } catch (error) {
        console.error(`Failed to delete route ${routeId} for user ${userId}:`, error);
        throw new Error('Failed to delete route from Firebase');
    }
}

async function moveUserRoute(sourceUserId: string, targetUserId: string, routeId: string): Promise<void> {
    try {
        const sourceRouteRef = doc(firestore, 'users', sourceUserId, 'routes', routeId);
        const routeDoc = await getDoc(sourceRouteRef);

        if (!routeDoc.exists()) {
            throw new Error(`Route with ID ${routeId} does not exist for user ${sourceUserId}.`);
        }

        const routeData = routeDoc.data();
        const targetRoutesRef = collection(firestore, 'users', targetUserId, 'routes');

        const batch = writeBatch(firestore);
        
        // Add the route to the new user's collection
        const newRouteRef = doc(targetRoutesRef, routeId); // Use same ID for consistency
        batch.set(newRouteRef, routeData);

        // Delete the route from the old user's collection
        batch.delete(sourceRouteRef);

        await batch.commit();
        console.log(`Successfully moved route ${routeId} from user ${sourceUserId} to ${targetUserId}.`);
    } catch (error) {
        console.error(`Failed to move route ${routeId}:`, error);
        throw new Error('Failed to move route in Firebase');
    }
}


export { 
    getLeadsFromFirebase,
    getCompaniesFromFirebase,
    getCompanyFromFirebase,
    getArchivedLeads,
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
    getLeadContacts,
    getLeadActivity,
    getLeadNotes,
    getLeadAppointments,
    getAllNotes,
    getAllActivities,
    getAllAppointments,
    getAllLeadsForReport,
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
    getAllTasks,
    addTaskToLead,
    updateTaskCompletion,
    deleteTaskFromLead,
    updateLeadDiscoveryData,
    addScorecard,
    updateScorecardAnalysis,
    getAllUsers,
    bulkUpdateLeadDialerRep,
    addCallReview,
    getLastNote,
    getLastActivity,
    createNewLead,
    prospectWebsiteTool,
    checkForDuplicateLead,
    deleteLead,
    getSubCollection,
    saveUserRoute,
    getUserRoutes,
    deleteUserRoute,
    getAllUserRoutes,
    moveUserRoute,
};















    

    



    




    




    

    
