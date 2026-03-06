'use client';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity, Note, Transcript, TranscriptAnalysis, UserProfile, Task, DiscoveryData, Appointment, Review, ReviewCategory, Invoice, SavedRoute, StorableRoute, ServiceSelection, CheckinQuestion, VisitNote, Upsell } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit, collectionGroup, orderBy, writeBatch, startAfter, documentId, Query } from 'firebase/firestore';
import { sendNewLeadToNetSuite, sendLeadUpdateToNetSuite } from './netsuite';
import { calculateCheckinScore } from '@/lib/checkin-scoring';
import { sendFieldSalesOutcomeToNetSuite } from './netsuite-field-sales-proxy';

/**
 * Sanitizes data retrieved from Firestore to ensure it can be passed from 
 * Server Components/Actions to Client Components. Converts Timestamps and Dates to ISO strings.
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  // Handle Firestore Timestamp (check for structure as prototypes are often lost in server-client boundary)
  if (typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
    try {
      const date = new Date(data.seconds * 1000 + data.nanoseconds / 1000000);
      return date.toISOString();
    } catch (e) {
      return data;
    }
  }

  // Handle JS Date
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Removes undefined values from an object recursively to prevent Firestore errors.
 * Firestore does not accept undefined, so we either omit the key or convert to null.
 */
function prepareForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(prepareForFirestore);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      const cleanedValue = prepareForFirestore(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
  }
  return cleaned;
}

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

        const docRef = await addDoc(activityRef, prepareForFirestore(activityLog));
        console.log(`Activity logged with ID: ${docRef.id} for lead ${leadId}`);
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log activity for lead ${leadId}:`, error);
        throw new Error(`Failed to log activity in Firebase`);
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
            data: sanitizeData(doc.data()) as Activity
        };

    } catch (error) {
        console.error(`Error finding activity by callId ${callId} for lead ${leadId}:`, error);
        return null;
    }
}

async function updateActivity(leadId: string, activityId: string, activityUpdate: Partial<Activity>): Promise<void> {
    try {
        const activityDocRef = doc(firestore, 'leads', leadId, 'activity', activityId);
        await updateDoc(activityDocRef, prepareForFirestore(activityUpdate));
        console.log(`Activity ${activityId} updated for lead ${leadId}`);
    } catch (error) {
        console.error(`Failed to update activity ${activityId} for lead ${leadId}:`, error);
        throw new Error('Failed to update activity in Firebase');
    }
}

function safeGetStatus(status: any): LeadStatus {
    const validStatuses: LeadStatus[] = ['New', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off'];
    if (typeof status === 'string') {
        if (status === 'SUSPECT-Unqualified') {
            return 'New';
        }
        
        let cleanStatus = status.replace('SUSPECT-', '');

        if (cleanStatus === 'Signed') {
            return 'Won';
        }
        
        const found = validStatuses.find(s => s.toLowerCase() === cleanStatus.toLowerCase());
        if (found) return found;
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

        const data = sanitizeData(docSnapshot.data() || {});
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
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.internalid || data.salesRecordInternalId,
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
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          invoices: [],
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          customerSource: data.customerSource || data.source,
          checkinQuestions: data.checkinQuestions || [],
          checkinScore: data.checkinScore,
          checkinScoringReason: data.checkinScoringReason,
          checkinRoutingTag: data.checkinRoutingTag,
          visitNoteID: data.visitNoteID,
          cancellationTheme: data.cancellationTheme,
          cancellationCategory: data.cancellationCategory,
          cancellationReason: data.cancellationReason,
          cancellationdate: data.cancellationdate,
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
                getSubCollection<Invoice>('leads', leadId, 'invoices', 'invoiceDate', 'desc')
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

        const data = sanitizeData(docSnapshot.data() || {});
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
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.internalid || data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          statusReason: data.statusReason,
          profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
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
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          customerSource: data.customerSource || data.source,
          visitNoteID: data.visitNoteID,
          cancellationTheme: data.cancellationTheme,
          cancellationCategory: data.cancellationCategory,
          cancellationReason: data.cancellationReason,
          cancellationdate: data.cancellationdate,
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
                getSubCollection<Invoice>('companies', companyId, 'invoices', 'invoiceDate', 'desc')
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


async function getLeadsFromFirebase(options?: { leadId?: string, summary?: boolean, dialerAssigned?: string, franchisee?: string }): Promise<Lead[]> {
  const { leadId, summary = false, dialerAssigned, franchisee } = options || {};
  
  if (leadId) {
      const lead = await getLeadFromFirebase(leadId, !summary);
      return lead ? [lead] : [];
  }
  try {
    
    let leadsQuery = query(collection(firestore, 'leads'));
    if (dialerAssigned) {
        leadsQuery = query(leadsQuery, where('dialerAssigned', '==', dialerAssigned));
    }
    if (franchisee) {
        leadsQuery = query(leadsQuery, where('franchisee', '==', franchisee));
    }

    const snapshot = await getDocs(leadsQuery);

    if (snapshot.empty) {
      console.log("No leads found in Firebase for the given query.");
      return [];
    }

    const leadsArray: Lead[] = snapshot.docs.map((doc) => {
        const data = sanitizeData(doc.data() || {});
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
          id: doc.id,
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.internalid || data.salesRecordInternalId,
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
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          contactCount: data.contactCount || 0,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          customerSource: data.customerSource || data.source,
          visitNoteID: data.visitNoteID,
        };

        return transformedLead;
      });
      return leadsArray;

  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

async function getCompaniesFromFirebase(options?: { franchisee?: string, skipCoordinateCheck?: boolean }): Promise<Lead[]> {
    const { franchisee, skipCoordinateCheck = false } = options || {};
    console.log(`[getCompaniesFromFirebase] Starting to fetch companies from Firebase...`);
    try {
        let companiesQuery = query(collection(firestore, 'companies'));
        if (franchisee) {
            companiesQuery = query(companiesQuery, where('franchisee', '==', franchisee));
        }
        const snapshot = await getDocs(companiesQuery);

        if (snapshot.empty) {
            console.log("[getCompaniesFromFirebase] No companies found in Firebase.");
            return [];
        }

        const companiesArray = snapshot.docs
            .map((doc): Lead | null => {
                const data = sanitizeData(doc.data() || {});

                const lat = typeof data.latitude === 'string' && data.latitude.trim() !== '' ? parseFloat(data.latitude) : typeof data.latitude === 'number' ? data.latitude : NaN;
                const lng = typeof data.longitude === 'string' && data.longitude.trim() !== '' ? parseFloat(data.longitude) : typeof data.longitude === 'number' ? data.longitude : NaN;

                if (!skipCoordinateCheck && (isNaN(lat) || isNaN(lng))) {
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

                const transformedCompany: Lead = {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['entityId'] || '',
                    salesRecordInternalId: data.internalid || data.salesRecordInternalId,
                    companyName: data.companyName || 'Unknown Company',
                    status: safeGetStatus(data.customerStatus),
                    profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
                    address: address,
                    latitude: isNaN(lat) ? undefined : lat,
                    longitude: isNaN(lng) ? undefined : lng,
                    franchisee: data.franchisee,
                    websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
                    industryCategory: data.industryCategory,
                    customerServiceEmail: data.customerServiceEmail,
                    customerPhone: data.customerPhone,
                    fieldSales: data.fieldSales,
                    services: data.services || [],
                    lastProspected: data.lastProspected,
                    dateLeadEntered: data.dateLeadEntered,
                    customerSource: data.customerSource || data.source,
                    visitNoteID: data.visitNoteID,
                };

                return transformedCompany;
            })
            .filter((company): company is Lead => company !== null);

        console.log(`[getCompaniesFromFirebase] Successfully fetched and processed ${companiesArray.length} companies.`);
        return companiesArray;

    } catch (error) {
        console.error("[getCompaniesFromFirebase] Firebase fetch for companies failed:", error);
        return [];
    }
}


async function getArchivedLeads(franchisee?: string): Promise<Lead[]> {
    try {
        console.log(`Fetching archived leads from Firebase...`);
        const archivedStatusesForQuery: (LeadStatus | 'Signed')[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Signed', 'LocalMile Pending', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'Lost Customer'];
        
        let q = query(collection(firestore, 'leads'), where('customerStatus', 'in', archivedStatusesForQuery));
        if (franchisee) {
            q = query(q, where('franchisee', '==', franchisee));
        }
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("No archived leads found in Firebase.");
            return [];
        }

        const leadsWithLastActivity = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = sanitizeData(doc.data() || {});
                const companyName = data.companyName || 'Unknown Company';
                
                const transformedLead: Lead = {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['entityId'] || '',
                    salesRecordInternalId: data.internalid || data.salesRecordInternalId,
                    companyName: companyName,
                    status: safeGetStatus(data.customerStatus),
                    statusReason: data.statusReason,
                    profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}. Sub-industry: ${data.industrySubCategory || 'N/A'}. Status: ${safeGetStatus(data.customerStatus)}.`,
                    franchisee: data.franchisee,
                    dialerAssigned: data.dialerAssigned,
                    industryCategory: data.industryCategory,
                    discoveryData: data.discoveryData,
                    fieldSales: data.fieldSales,
                    services: data.services || [],
                    lastProspected: data.lastProspected,
                    dateLeadEntered: data.dateLeadEntered,
                    customerSource: data.customerSource || data.source,
                    visitNoteID: data.visitNoteID,
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


async function getAllLeadsForReport(franchisee?: string): Promise<Lead[]> {
    try {
        console.log('[getAllLeadsForReport] Fetching lead set for reporting...');
        let leadsQuery = query(collection(firestore, 'leads'));
        
        if (franchisee) {
            leadsQuery = query(leadsQuery, where('franchisee', '==', franchisee));
        }
        const leadsSnapshot = await getDocs(leadsQuery);
        if (leadsSnapshot.empty) {
            console.log("[getAllLeadsForReport] No leads found.");
            return [];
        }

        const leads = leadsSnapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            
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

            return {
                id: doc.id,
                entityId: data.entityId || data.customerEntityId || '',
                salesRecordInternalId: data.internalid || data.salesRecordInternalId,
                companyName: data.companyName || 'Unknown Company',
                dialerAssigned: data.dialerAssigned,
                salesRepAssigned: data.salesRepAssigned,
                status: safeGetStatus(data.customerStatus),
                campaign: data.campaign || data.customerCampaign,
                leadType: data.leadType,
                demoCompleted: data.demoCompleted,
                franchisee: data.franchisee,
                fieldSales: data.fieldSales === true,
                activity: [],
                lastProspected: data.lastProspected,
                dateLeadEntered: data.dateLeadEntered,
                customerSource: data.customerSource || data.source,
                visitNoteID: data.visitNoteID,
                address: address,
                latitude: data.latitude,
                longitude: data.longitude,
            } as Lead;
        });

        console.log(`[getAllLeadsForReport] Successfully fetched ${leads.length} leads.`);
        return leads;

    } catch (error) {
        console.error("[getAllLeadsForReport] Failed to fetch leads:", error);
        throw new Error('[getAllLeadsForReport] The database request timed out. Try applying tighter filters.');
    }
}

async function getSubCollection<T>(parentCollection: string, docId: string, subCollectionName: string, orderByField: string, orderDirection: 'asc' | 'desc' = 'desc'): Promise<T[]> {
    try {
        const ref = collection(firestore, parentCollection, docId, subCollectionName);
        const q = query(ref, orderBy(orderByField, orderDirection));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            // Special handling for invoiceType
            if (subCollectionName === 'invoices' && (!data.invoiceType || data.invoiceType === '- None -')) {
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
        const ref = collection(firestore, 'leads', leadId, 'collectionName');
        let q = query(ref, orderBy(orderByField, 'desc'), limit(limitNum));

        if (lastDocId) {
            const lastDocSnapshot = await getDoc(doc(ref, lastDocId));
            if (lastDocSnapshot.exists()) {
                q = query(q, startAfter(lastDocSnapshot));
            }
        }
        
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as T);
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

async function getAllCallActivities(startDate?: string, endDate?: string): Promise<CallActivity[]> {
    try {
        console.log(`[getAllCallActivities] Fetching all activities from collection group...`);
        // Removed limit to allow fetching all activities for processing
        const activityQuery = collectionGroup(firestore, 'activity');
        
        const activitySnapshot = await getDocs(activityQuery);
        const allActivityDocs = activitySnapshot.docs;

        if (allActivityDocs.length === 0) {
            return [];
        }

        // Filter for calls and date range in memory
        const callActivityDocs = allActivityDocs.filter(doc => {
            const data = doc.data() as Activity;
            if (data.type !== 'Call') return false;
            if (startDate && data.date < startDate) return false;
            if (endDate && data.date > endDate) return false;
            return true;
        });

        if (callActivityDocs.length === 0) {
            return [];
        }

        const leadIds = [...new Set(callActivityDocs.map(doc => doc.ref.parent.parent!.id))];
        const leadsData: { [key: string]: Lead } = {};
        
        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }

        const hydrationBatchSize = 5; 
        for (let i = 0; i < leadChunks.length; i += hydrationBatchSize) {
            const batch = leadChunks.slice(i, i + hydrationBatchSize);
            await Promise.all(batch.map(async (chunk) => {
                try {
                    const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
                    const leadsSnapshot = await getDocs(leadsQuery);
                    leadsSnapshot.forEach(doc => {
                        leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
                    });
                } catch (e) {
                    console.error(`[getAllCallActivities] Failed to hydrate lead chunk:`, e);
                }
            }));
        }
        
        const rawCalls = callActivityDocs.map(activityDoc => {
            const activityData = sanitizeData(activityDoc.data()) as Activity;
            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            
            const leadData = leadsData[leadId];
            if (!leadData) return null;

            return {
                ...activityData,
                id: activityDoc.id,
                leadId: leadId,
                leadName: leadData.companyName || 'Unknown Lead',
                leadStatus: safeGetStatus(leadData.customerStatus),
                dialerAssigned: leadData.dialerAssigned || 'Unassigned',
            };
        }).filter((call): call is CallActivity => call !== null);

        const finalCalls: CallActivity[] = [];
        const callsByLead: Record<string, CallActivity[]> = {};
        
        rawCalls.forEach(c => {
            if (!callsByLead[c.leadId]) callsByLead[c.leadId] = [];
            callsByLead[c.leadId].push(c);
        });

        Object.values(callsByLead).forEach(leadCalls => {
            const outcomes = leadCalls.filter(c => c.notes.includes('Outcome: ') || c.callId);
            const attempts = leadCalls.filter(c => c.notes.includes('Initiated call to'));

            finalCalls.push(...outcomes);

            attempts.forEach(attempt => {
                const attemptTime = new Date(attempt.date).getTime();
                const matched = outcomes.some(outcome => {
                    const outcomeTime = new Date(outcome.date).getTime();
                    return Math.abs(outcomeTime - attemptTime) < 5 * 60 * 1000;
                });
                if (!matched) {
                    finalCalls.push(attempt);
                }
            });
        });

        return finalCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error('An unexpected error occurred in getAllCallActivities:', error);
        throw new Error('[getAllCallActivities] The database request timed out or failed.');
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
            const noteData = sanitizeData(doc.data()) as Note;
            const leadId = doc.ref.parent.parent!.id;
            return {
                ...noteData,
                id: doc.id,
                leadId: leadId,
            };
        });
        allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allNotes;
    } catch (error) {
        console.error('Failed to fetch all notes:', error);
        return [];
    }
}

async function getAllActivities(checkInOnly = false): Promise<Array<Activity & { leadId: string }>> {
    try {
        let activitiesQuery = collectionGroup(firestore, 'activity');
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        let allActivities = activitiesSnapshot.docs.map(doc => {
            const activityData = sanitizeData(doc.data()) as Activity;
            const leadId = doc.ref.parent.parent!.id;
            return {
                ...activityData,
                id: doc.id,
                leadId: leadId,
            };
        });

        if (checkInOnly) {
            allActivities = allActivities.filter(activity => activity.notes === 'Checked in at location via map.');
        }
        
        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allActivities;
    } catch (error) {
        console.error('Failed to fetch all activities:', error);
        return [];
    }
}

async function getUserActivitiesForPeriod(displayName: string, startDate: string): Promise<Activity[]> {
    try {
        const q = query(
            collectionGroup(firestore, 'activity'),
            where('author', '==', displayName)
        );
        const activitiesSnapshot = await getDocs(q);
        const userActivities = activitiesSnapshot.docs
            .map(doc => {
                const activityData = sanitizeData(doc.data()) as Activity;
                const leadId = doc.ref.parent.parent!.id;
                return {
                    ...activityData,
                    id: doc.id,
                    leadId: leadId,
                };
            })
            .filter(a => a.date >= startDate);
        return userActivities;
    } catch (error) {
        console.error(`Failed to fetch activities for user ${displayName}:`, error);
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
        
        const chunkPromises = leadChunks.map(async (chunk) => {
            if (chunk.length === 0) return;
            const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
            });
        });

        await Promise.all(chunkPromises);

        const allTranscripts = transcriptsSnapshot.docs.map(doc => {
            const transcriptData = sanitizeData(doc.data());
            const leadId = doc.ref.parent.parent?.id;
            if (!leadId) return null;
            const leadData = leadsData[leadId];
            
            return {
                id: doc.id,
                ...transcriptData,
                phoneNumber: transcriptData.phoneNumber || leadData?.customerPhone || 'Unknown',
            } as Transcript;
        }).filter((t): t is Transcript => !!t);
        
        allTranscripts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return allTranscripts;

    } catch (error) {
        console.error('Failed to fetch all transcripts:', error);
        return [];
    }
}

async function getAllAppointments(startDate?: string, endDate?: string): Promise<Array<Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData, entityId?: string }>> {
    try {
        console.log(`[getAllAppointments] Fetching all appointments from collection group...`);
        // Removed limit to ensure the full dataset is available for dashboard calculation
        const appointmentsQuery = collectionGroup(firestore, 'appointments');
        
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        const filteredDocs = appointmentsSnapshot.docs.filter(doc => {
            const data = doc.data() as Appointment;
            if (startDate && data.starttime < startDate) return false;
            if (endDate && data.starttime > endDate) return false;
            return true;
        });

        const leadIds = [...new Set(filteredDocs.map(doc => doc.ref.parent.parent!.id))];
        if (leadIds.length === 0) return [];

        const leadsData: { [key: string]: Lead } = {};
        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }
        
        const hydrationBatchSize = 5;
        for (let i = 0; i < leadChunks.length; i += hydrationBatchSize) {
            const batch = leadChunks.slice(i, i + hydrationBatchSize);
            await Promise.all(batch.map(async (chunk) => {
                try {
                    const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
                    const leadsSnapshot = await getDocs(leadsQuery);
                    leadsSnapshot.forEach(doc => {
                        leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
                    });
                } catch (e) {
                    console.error(`[getAllAppointments] Failed to hydrate lead chunk:`, e);
                }
            }));
        }

        const allAppointments = filteredDocs.map(appointmentDoc => {
            const appointmentData = sanitizeData(appointmentDoc.data()) as Appointment;
            const leadId = appointmentDoc.ref.parent.parent?.id;
            if (!leadId) return null;
            const leadData = leadsData[leadId];
            
            if (!leadData) return null;

            return {
                ...appointmentData,
                id: appointmentDoc.id,
                leadId: leadId,
                leadName: leadData.companyName || 'Unknown Lead',
                dialerAssigned: leadData.dialerAssigned,
                leadStatus: safeGetStatus(leadData.customerStatus),
                discoveryData: leadData.discoveryData,
                entityId: leadData.entityId || (leadData as any).customerEntityId || (leadData as any).internalid,
            };
        }).filter((appt): appt is Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData, entityId?: string } => appt !== null);

        allAppointments.sort((a, b) => new Date(a.duedate).getTime() - new Date(a.duedate).getTime());
        return allAppointments;
    } catch (error) {
        console.error('Failed to fetch all appointments:', error);
        throw new Error('The database request timed out or failed.');
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
    const docRef = await addDoc(contactsRef, prepareForFirestore(newContactData));
    await logActivity(leadId, { type: 'Update', notes: `New contact added: ${contact.name}` });
    
    const leadRef = doc(firestore, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    const currentCount = leadDoc.data()?.contactCount || 0;
    await updateDoc(leadRef, { contactCount: currentCount + 1 });
    
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
            updateData.statusReason = ''; 
        }

        await updateDoc(leadRef, updateData);

        const note = reason ? `Status changed to ${status} (Reason: ${reason})` : `Status changed to ${status}`;
        await logActivity(leadId, { type: 'Update', notes: note });
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
        "Send Quote/Free Trial": { status: "Prospect Opportunity" },
        "Sign Up": { status: "Customer Opportunity" },
        "Email Brush Off": { status: "Email Brush Off" },
        "Upsell": { status: "Won" },
        "Qualified - Set Appointment": { status: "Qualified" },
        "Qualified - Call Back/Send Info": { status: "Pre Qualified" },
        "Empty / Closed": { status: "Lost", reason: "Closed Business" },
    };

    if (callData.outcome === "Send Quote/Free Trial" || callData.outcome === "Sign Up") {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        const leadData = leadSnap.data();
        let linkedSalesRep = '';

        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('displayName', '==', callData.author), limit(1));
        const userQuerySnapshot = await getDocs(q);

        if (!userQuerySnapshot.empty) {
            const userProfileData = userQuerySnapshot.docs[0].data() as UserProfile;
            if (userProfileData.role === 'Field Sales' && userProfileData.linkedSalesRep) {
                linkedSalesRep = userProfileData.linkedSalesRep;
            }
        }

        if (!linkedSalesRep && leadData?.visitNoteID) {
            const noteRef = doc(firestore, 'visitnotes', leadData.visitNoteID);
            const noteSnap = await getDoc(noteRef);
            if (noteSnap.exists()) {
                const visitNote = noteSnap.data() as VisitNote;
                if (visitNote.capturedByUid) {
                    const userRef = doc(firestore, 'users', visitNote.capturedByUid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const fieldSalesRepProfile = userSnap.data() as UserProfile;
                        if (fieldSalesRepProfile.linkedSalesRep) {
                            linkedSalesRep = fieldSalesRepProfile.linkedSalesRep;
                        }
                    }
                }
            }
        }
        
        if (linkedSalesRep) {
            await sendFieldSalesOutcomeToNetSuite({
                leadId,
                outcome: callData.outcome as "Send Quote/Free Trial" | "Sign Up",
                linkedSalesRep,
            });
        }
    } else if (callData.outcome === 'Upsell') {
        const { sendUpsellToNetSuite } = await import('./netsuite-upsell-proxy');
        await sendUpsellToNetSuite({ leadId });
        await logActivity(leadId, { type: 'Update', notes: `Outcome: Upsell. Notes: ${callData.notes || 'N/A'}`, author: callData.author });
        return 'Won';
    } else if (callData.outcome === 'No Access/Contact' || callData.outcome === 'Unqualified Opportunity' || callData.outcome === 'Prospect - No Access/No Contact' || callData.outcome === 'Move to Outbound') {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        const leadData = leadSnap.data();

        let assignee = '';
        if (leadData?.visitNoteID) {
            const noteRef = doc(firestore, 'visitnotes', leadData.visitNoteID);
            const noteSnap = await getDoc(noteRef);
            if (noteSnap.exists()) {
                const visitNote = noteSnap.data() as VisitNote;
                if (visitNote.capturedByUid) {
                    const userRef = doc(firestore, 'users', visitNote.capturedByUid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const fieldSalesRepProfile = userSnap.data() as UserProfile;
                        if (fieldSalesRepProfile.linkedBDR) {
                            assignee = fieldSalesRepProfile.linkedBDR;
                        }
                    }
                }
            }
        }
        
        if (!assignee) {
            const assignees = ['Lachlan Ball', 'Grant Leddy'];
            assignee = assignees[Math.floor(Math.random() * assignees.length)];
        }
        
        const updateData: { dialerAssigned: string, fieldSales: boolean, customerStatus?: LeadStatus } = {
            dialerAssigned: assignee,
            fieldSales: false
        };

        let notesToLog = '';
        let returnStatus: LeadStatus | undefined = undefined;

        if (callData.outcome === 'No Access/Contact' || callData.outcome === 'Prospect - No Access/No Contact') {
             notesToLog = `Outcome: Prospect - No Access/No Contact. Lead moved to Outbound and assigned to ${assignee}. Notes: ${callData.notes || 'N/A'}`;
             updateData.customerStatus = 'New';
             returnStatus = 'New';
        } else { 
            updateData.customerStatus = 'Priority Field Lead';
            const outcomeName = callData.outcome === 'Unqualified Opportunity' ? 'Unqualified Opportunity' : 'Moved to Outbound';
            notesToLog = `Outcome: ${outcomeName}. Lead moved to Outbound and assigned to ${assignee}. Notes: ${callData.notes || 'N/A'}`;
            returnStatus = 'Priority Field Lead';
        }

        await updateDoc(leadRef, updateData);
        await logActivity(leadId, { type: 'Update', notes: notesToLog, author: callData.author });

        return returnStatus;
    }
    
    const { status, reason: outcomeReason } = outcomeStatusMap[callData.outcome] || {};
    const notesToLog = `Outcome: ${callData.outcome}${outcomeReason ? ` (${outcomeReason})` : ''}. Notes: ${callData.notes || 'N/A'}`;

    const activityPromise = logActivity(leadId, { type: 'Call', notes: notesToLog, author: callData.author });
    const statusPromise = status ? updateLeadStatus(leadId, status, outcomeReason) : Promise.resolve();
    
    await Promise.all([activityPromise, statusPromise]);
    
    return status;
}

async function logNoteActivity(
    leadId: string, 
    noteData: { content: string; author: string, date: string }
): Promise<void> {
    const notesRef = collection(firestore, 'leads', leadId, 'notes');
    const newNoteData = { ...noteData, syncedWithNetSuite: false };

    await addDoc(notesRef, prepareForFirestore(newNoteData));
    
    await logActivity(leadId, {
        type: 'Update',
        notes: `Note added: ${noteData.content.substring(0, 100)}${noteData.content.length > 100 ? '...' : ''}`,
        date: noteData.date
    });
}

async function logTranscriptActivity(leadId: string, transcriptData: { content: string; author?: string, callId: string, phoneNumber?: string }): Promise<Transcript> {
    try {
        const transcriptsRef = collection(firestore, 'leads', leadId, 'transcripts');
        
        const q = query(transcriptsRef, where('callId', '==', transcriptData.callId), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            return sanitizeData({ id: existingDoc.id, ...existingDoc.data() }) as Transcript;
        }

        const newTranscript = {
            ...transcriptData,
            date: new Date().toISOString()
        };
        const docRef = await addDoc(transcriptsRef, prepareForFirestore(newTranscript));
        
        await logActivity(leadId, { 
            type: 'Update', 
            notes: `Transcript added for call ID ${transcriptData.callId}`,
        });

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
      syncedWithNetSuite: false, 
    };
    await updateDoc(contactRef, prepareForFirestore(updatePayload));
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactData.name || 'details'} updated.` });
  } catch (error) {
    console.error(`Failed to update contact ${contactId} for lead ${leadId}:`, error);
    throw new Error('Failed to update contact in Firebase');
  }
}

async function updateContactSendEmail(leadId: string, contactId: string): Promise<void> {
  try {
    const contactRef = doc(firestore, 'leads', leadId, 'contacts', contactId);
    await updateDoc(contactRef, { sendEmail: 'yes' });
  } catch (error) {
    console.error(`Failed to update contact ${contactId} for email on lead ${leadId}:`, error);
    throw new Error('Failed to update contact for email in Firebase');
  }
}

async function deleteContactFromLead(leadId: string, contactId: string, contactName: string): Promise<void> {
  try {
    const contactRef = doc(firestore, 'leads', leadId, 'contacts', contactId);
    await deleteDoc(contactRef);
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactName} deleted.` });

    const leadRef = doc(firestore, 'leads', leadId);
    const leadDoc = await getDoc(leadRef);
    const currentCount = leadDoc.data()?.contactCount || 0;
    await updateDoc(leadRef, { contactCount: Math.max(0, currentCount - 1) });
  } catch (error) {
    console.error(`Failed to delete contact ${contactId} from lead ${leadId}:`, error);
    throw new Error('Failed to delete contact from Firebase');
  }
}

async function updateLeadDetails(
  leadId: string,
  oldLead: Lead,
  newLeadData: Partial<Pick<Lead, 'companyName' | 'customerServiceEmail' | 'customerPhone' | 'websiteUrl' | 'industryCategory' | 'address' | 'lastProspected' | 'checkinScore' | 'checkinScoringReason' | 'checkinRoutingTag' | 'companyDescription'>>
): Promise<void> {
    try {
        const collectionsToUpdate: ('leads' | 'companies')[] = oldLead.status === 'Won' ? ['companies'] : ['leads'];

        const batch = writeBatch(firestore);

        const changes: string[] = [];
        if (newLeadData.companyName !== undefined && newLeadData.companyName !== oldLead.companyName) {
            changes.push(`Company name changed to "${newLeadData.companyName}".`);
        }
        if (newLeadData.customerServiceEmail !== undefined && newLeadData.customerServiceEmail !== oldLead.customerServiceEmail) {
            changes.push(`Email changed to "${newLeadData.customerServiceEmail}".`);
        }
        if (newLeadData.customerPhone !== undefined && newLeadData.customerPhone !== oldLead.customerPhone) {
            changes.push(`Phone changed to "${newLeadData.customerPhone}".`);
        }
        if (newLeadData.websiteUrl !== undefined && newLeadData.websiteUrl !== oldLead.websiteUrl) {
            changes.push(`Website changed to "${newLeadData.websiteUrl}".`);
        }
        if (newLeadData.industryCategory !== undefined && newLeadData.industryCategory !== oldLead.industryCategory) {
            changes.push(`Industry changed to "${newLeadData.industryCategory}".`);
        }
        if (newLeadData.address) {
            changes.push('Address updated.');
        }

        for (const collectionName of collectionsToUpdate) {
            const leadRef = doc(firestore, collectionName, leadId);
            const leadDoc = await getDoc(leadRef);
            if(leadDoc.exists()) {
                const updatePayload: { [key: string]: any } = {};
                if (newLeadData.companyName !== undefined) updatePayload.companyName = newLeadData.companyName;
                if (newLeadData.customerServiceEmail !== undefined) updatePayload.customerServiceEmail = newLeadData.customerServiceEmail;
                if (newLeadData.customerPhone !== undefined) updatePayload.customerPhone = newLeadData.customerPhone;
                if (newLeadData.websiteUrl !== undefined) updatePayload.websiteUrl = newLeadData.websiteUrl;
                if (newLeadData.industryCategory !== undefined) updatePayload.industryCategory = newLeadData.industryCategory;
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
                
                if (newLeadData.lastProspected) updatePayload.lastProspected = newLeadData.lastProspected;
                if (newLeadData.checkinScore !== undefined) updatePayload.checkinScore = newLeadData.checkinScore;
                if (newLeadData.checkinScoringReason !== undefined) updatePayload.checkinScoringReason = newLeadData.checkinScoringReason;
                if (newLeadData.checkinRoutingTag !== undefined) updatePayload.checkinRoutingTag = newLeadData.checkinRoutingTag;
                if (newLeadData.companyDescription !== undefined) updatePayload.companyDescription = newLeadData.companyDescription;

                if (Object.keys(updatePayload).length > 0) {
                    batch.update(leadRef, prepareForFirestore(updatePayload));
                }
            }
        }
        
        if (changes.length > 0) {
            await logActivity(leadId, { type: 'Update', notes: changes.join(' ') });
        }

        await batch.commit();
    } catch (error) {
        console.error(`Failed to update lead details for ${leadId}:`, error);
        throw new Error('Failed to update lead details in Firebase');
    }
}

async function updateTranscriptAnalysis(leadId: string, transcriptId: string, analysis: TranscriptAnalysis): Promise<void> {
  try {
    const transcriptRef = doc(firestore, 'leads', leadId, 'transcripts', transcriptId);
    await updateDoc(transcriptRef, { analysis });
  } catch (error) {
    console.error(`Failed to update transcript analysis for lead ${leadId}:`, error);
    throw new Error('Failed to update transcript analysis in Firebase');
  }
}

async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
  if (!phoneNumber) return null;

  const leadsRef = collection(firestore, 'leads');
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

async function getLeadTasks(leadId: string, collectionName: string, orderByField: string, limitNum: number, lastDocId: string | null): Promise<{ items: Task[], lastDocId: string | null }> {
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
        const items = snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as Task);
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
        
        const userTasks = tasksSnapshot.docs.map(doc => sanitizeData({ 
            id: doc.id, 
            ...doc.data(), 
            leadId: doc.ref.parent.parent!.id 
        })) as Array<Task & { leadId: string }>;

        if (userTasks.length === 0) return [];

        const leadIds = [...new Set(userTasks.map(task => task.leadId))];
        const leadsData: Record<string, Lead> = {};

        const leadChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadChunks.push(leadIds.slice(i, i + 30));
        }

        const chunkPromises = leadChunks.map(async (chunk) => {
            if (chunk.length === 0) return;
            const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
            });
        });

        await Promise.all(chunkPromises);
        return userTasks.map(task => ({
            ...task,
            leadName: leadsData[task.leadId]?.companyName || "Unknown Lead",
        }));

    } catch (error) {
        console.error(`Failed to fetch all tasks for user ${displayName}:`, error);
        throw new Error(`Failed to get user tasks`);
    }
}

async function getAllTasks(): Promise<Array<Task & { leadId: string }>> {
    try {
        const tasksSnapshot = await getDocs(collectionGroup(firestore, 'tasks'));
        const allTasks = tasksSnapshot.docs.map(doc => {
            const taskData = sanitizeData(doc.data()) as Task;
            const leadId = doc.ref.parent.parent!.id;
            return { ...taskData, id: doc.id, leadId };
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
        const docRef = await addDoc(tasksRef, prepareForFirestore(newTask));
        await logActivity(leadId, { type: 'Update', notes: `Task added: "${taskData.title}"` });
        return { ...newTask, id: docRef.id } as Task;
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
        await updateDoc(taskRef, prepareForFirestore(updateData));
        const taskDoc = await getDoc(taskRef);
        const taskTitle = taskDoc.data()?.title || 'a task';
        await logActivity(leadId, { type: 'Update', notes: `Task "${taskTitle}" marked as ${isCompleted ? 'complete' : 'incomplete'}.` });
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
    } catch (error) {
        console.error(`Failed to delete task ${taskId} from lead ${leadId}:`, error);
        throw new Error('Failed to delete task from Firebase');
    }
}

async function updateLeadDiscoveryData(leadId: string, data: DiscoveryData): Promise<void> {
  const { sendDiscoveryDataToNetSuite } = await import('@/services/netsuite');
  
  try {
    const leadRef = doc(firestore, 'leads', leadId);
    await updateDoc(leadRef, prepareForFirestore({ discoveryData: data }));
    
    await sendDiscoveryDataToNetSuite({ leadId, discoveryData: data });
  } catch (error) {
    console.error(`Failed to update discovery data for lead ${leadId}:`, error);
    throw new Error(`Failed to update discovery data`);
  }
}

async function updateLeadCheckinQuestions(leadId: string, questions: CheckinQuestion[]): Promise<{updatedQuestions: CheckinQuestion[], scoreData: {checkinScore: number, checkinScoringReason: string, checkinRoutingTag: string}}> {
    const leadRef = doc(firestore, 'leads', leadId);
    
    const leadSnap = await getDoc(leadRef);
    if (!leadSnap.exists()) throw new Error(`Lead with ID ${leadId} not found.`);
    
    const existingData = leadSnap.data();
    const existingQuestions: CheckinQuestion[] = existingData?.checkinQuestions || [];

    const questionMap = new Map<string, string | string[]>();
    existingQuestions.forEach(q => questionMap.set(q.question, q.answer));
    questions.forEach(q => questionMap.set(q.question, q.answer));

    const mergedQuestions: CheckinQuestion[] = Array.from(questionMap, ([question, answer]) => ({ question, answer }));
    const { score, routingTag, scoringReason } = calculateCheckinScore(mergedQuestions);

    const scoreData = {
        checkinScore: score,
        checkinScoringReason: scoringReason,
        checkinRoutingTag: routingTag,
    };

    await updateDoc(leadRef, prepareForFirestore({ 
        checkinQuestions: mergedQuestions,
        ...scoreData
    }));

    await logActivity(leadId, { type: 'Update', notes: 'Check-in questions were updated.' });
    return { updatedQuestions: mergedQuestions, scoreData };
}


async function addScorecard(leadId: string, data: any): Promise<any> {
    try {
        const scorecardsRef = collection(firestore, 'leads', leadId, 'scorecards');
        const docRef = await addDoc(scorecardsRef, prepareForFirestore({
            ...data,
            createdAt: new Date().toISOString(),
        }));
        const savedData = await getDoc(docRef);
        return sanitizeData({ id: docRef.id, ...savedData.data() });
    } catch (error) {
        console.error(`Failed to add scorecard to lead ${leadId}:`, error);
        throw new Error('Failed to add scorecard in Firebase');
    }
}

async function updateScorecardAnalysis(leadId: string, scorecardId: string, analysis: TranscriptAnalysis): Promise<void> {
    try {
        const scorecardRef = doc(firestore, 'leads', leadId, 'scorecards', scorecardId);
        await updateDoc(scorecardRef, { analysis });
    } catch (error) {
        console.error(`Failed to update scorecard analysis for lead ${leadId}:`, error);
        throw new Error('Failed to update scorecard analysis in Firebase');
    }
}

async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const usersRef = collection(firestore, 'users');
        const snapshot = await getDocs(usersRef);
        if (snapshot.empty) return [];
        
        return snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            const displayName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            return {
                uid: doc.id,
                ...data,
                displayName: displayName || data.email, 
            } as UserProfile;
        });
    } catch (error) {
        console.error('Failed to fetch all users:', error);
        return [];
    }
}

async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
        const userRef = doc(firestore, 'users', uid);
        await updateDoc(userRef, prepareForFirestore(data));
    } catch (error) {
        console.error(`Failed to update user ${uid}:`, error);
        throw new Error('Failed to update user in Firebase');
    }
}


async function bulkUpdateLeadDialerRep(leadIds: string[], newDialerReps: (string | null)[]): Promise<void> {
    if (newDialerReps.length === 0) throw new Error("No users selected for reassignment.");
    
    try {
        const batch = writeBatch(firestore);
        leadIds.forEach((leadId, index) => {
            const leadRef = doc(firestore, 'leads', leadId);
            const userToAssign = newDialerReps[index % newDialerReps.length];
            batch.update(leadRef, { dialerAssigned: userToAssign });

            const activityRef = collection(leadRef, 'activity');
            const newActivityRef = doc(activityRef);
            const notes = userToAssign ? `Lead reassigned to ${userToAssign}.` : 'Lead unassigned.';
            batch.set(newActivityRef, {
                type: 'Update',
                date: new Date().toISOString(),
                notes: notes,
            });
        });
        await batch.commit();
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
        if (snapshot.empty) return null;
        
        return sanitizeData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() }) as Note;
    } catch (error) {
        console.error(`Failed to fetch last note for lead ${leadId}:`, error);
        return null;
    }
}

async function getLastActivity(leadId: string): Promise<Activity | null> {
    try {
        const ref = collection(firestore, 'leads', leadId, 'activity');
        const q = query(ref, orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        
        return sanitizeData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() }) as Activity;
    } catch (error) {
        console.error(`Failed to fetch last activity for lead ${leadId}:`, error);
        return null;
    }
}

interface NewLeadData {
  companyName: string;
  websiteUrl?: string;
  customerPhone?: string;
  customerServiceEmail?: string;
  abn?: string;
  industryCategory?: string;
  campaign?: string;
  address: Address;
  contact: {
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  initialNotes?: string;
  dialerAssigned?: string;
  salesRepAssigned?: string;
  discoveryData?: Partial<DiscoveryData>;
  visitNoteID?: string;
  franchisee?: string;
}

async function createNewLead(data: NewLeadData): Promise<{ success: boolean; leadId?: string; message: string; }> {
  const nsResult = await sendNewLeadToNetSuite(data);
  return {
    ...nsResult,
    leadId: nsResult.leadId ? String(nsResult.leadId) : undefined,
  };
}

async function prospectWebsiteTool(input: { leadId: string; websiteUrl: string; }): Promise<{ searchKeywords?: string[], contacts?: Contact[], companyDescription?: string, logoUrl?: string }> {
    return await aiProspectWebsiteTool(input);
}

async function checkForDuplicateLead(
    companyName: string, 
    website?: string,
    email?: string,
    address?: Address
): Promise<string | null> {
    const collectionsToSearch = ['leads', 'companies'];
    
    for (const collectionName of collectionsToSearch) {
        const collectionRef = collection(firestore, collectionName);

        if (companyName) {
            const nameQuery = query(collectionRef, where('companyName', '==', companyName), limit(1));
            const nameSnapshot = await getDocs(nameQuery);
            if (!nameSnapshot.empty) return nameSnapshot.docs[0].id;
        }
        
        if (address && address.street && address.city && address.state && address.zip) {
             const addressQuery = query(collectionRef, 
                where('address.street', '==', address.street),
                where('address.city', '==', address.city),
                where('address.state', '==', address.state),
                where('address.zip', '==', address.zip),
                limit(1));
            const addressSnapshot = await getDocs(addressQuery);
            if (!addressSnapshot.empty) return addressSnapshot.docs[0].id;
        }
    }
    return null;
}

async function deleteLead(leadIds: string | string[]): Promise<void> {
    return deleteCollectionItem('leads', leadIds);
}

async function deleteCompany(companyIds: string | string[]): Promise<void> {
    return deleteCollectionItem('companies', companyIds);
}

async function deleteLeadsByCampaign(campaign: string): Promise<void> {
    try {
        const q = query(collection(firestore, 'leads'), where('customerCampaign', '==', campaign));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const leadIds = snapshot.docs.map(doc => doc.id);
        await deleteCollectionItem('leads', leadIds);
    } catch (error) {
        console.error(`Failed to delete leads by campaign "${campaign}":`, error);
        throw new Error(`Failed to delete leads by campaign in Firebase`);
    }
}

async function deleteCollectionItem(collectionName: 'leads' | 'companies', itemIds: string | string[]): Promise<void> {
    const idsToDelete = Array.isArray(itemIds) ? itemIds : [itemIds];
    if (idsToDelete.length === 0) return;

    try {
        const batch = writeBatch(firestore);
        const subcollections = ['contacts', 'activity', 'notes', 'transcripts', 'tasks', 'appointments', 'scorecards', 'invoices'];

        for (const itemId of idsToDelete) {
            const itemRef = doc(firestore, collectionName, itemId);

            await Promise.all(subcollections.map(async (subcollection) => {
                const snapshot = await getDocs(collection(itemRef, subcollection));
                snapshot.docs.forEach(subDoc => batch.delete(subDoc.ref));
            }));
            batch.delete(itemRef);
        }
        await batch.commit();
    } catch (error) {
        console.error(`Failed to delete items from ${collectionName}:`, error);
        throw new Error(`Failed to delete item(s) from Firebase`);
    }
}

async function bulkDeleteSubCollectionItems(leadId: string, subCollectionName: 'contacts' | 'notes' | 'activity' | 'appointments', itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    try {
        const batch = writeBatch(firestore);
        itemIds.forEach(itemId => {
            const itemRef = doc(firestore, 'leads', leadId, subCollectionName, itemId);
            batch.delete(itemRef);
        });
        await batch.commit();
    } catch (error) {
        console.error(`Failed to bulk delete items from lead ${leadId}:`, error);
        throw new Error(`Failed to bulk delete items`);
    }
}


async function saveUserRoute(userId: string, routeData: Omit<StorableRoute, 'id'>): Promise<string> {
    try {
        const routesRef = collection(firestore, 'users', userId, 'routes');
        const docRef = await addDoc(routesRef, prepareForFirestore(routeData));
        return docRef.id;
    } catch (error) {
        console.error(`Failed to save route for user ${userId}:`, error);
        throw new Error('Failed to save route to Firebase');
    }
}

async function updateUserRoute(userId: string, routeId: string, routeUpdate: Partial<StorableRoute>): Promise<void> {
    try {
        const routeRef = doc(firestore, 'users', userId, 'routes', routeId);
        await updateDoc(routeRef, prepareForFirestore(routeUpdate));
    } catch (error) {
        console.error(`Failed to update route ${routeId} for user ${userId}:`, error);
        throw new Error('Failed to update route in Firebase');
    }
}

async function getUserRoutes(userId: string): Promise<SavedRoute[]> {
    try {
        const routesRef = collection(firestore, 'users', userId, 'routes');
        const q = query(routesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data()) as StorableRoute;
            return {
                ...data,
                id: doc.id,
                directions: data.directions ? JSON.parse(data.directions) : null,
            } as SavedRoute;
        });
    } catch (error) {
        console.error(`Failed to get routes for user ${userId}:`, error);
        return [];
    }
}

async function getAllUserRoutes(): Promise<Array<SavedRoute & { userName: string; userId: string }>> {
    try {
        const routesQuery = collectionGroup(firestore, 'routes');
        const snapshot = await getDocs(routesQuery);

        if (snapshot.empty) return [];

        const allRoutes = snapshot.docs.map(docSnapshot => {
            const data = sanitizeData(docSnapshot.data()) as StorableRoute;
            return {
                ...data,
                id: docSnapshot.id,
                userId: docSnapshot.ref.parent.parent!.id,
                userName: data.userName || 'Unknown User',
                directions: data.directions ? JSON.parse(data.directions) : null,
            } as SavedRoute & { userId: string };
        });
        
        allRoutes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return allRoutes;
    } catch (error) {
        console.error('Failed to fetch all routes:', error);
        return [];
    }
}

async function deleteUserRoute(userId: string, routeId: string): Promise<void> {
    try {
        const routeRef = doc(firestore, 'users', userId, 'routes', routeId);
        await deleteDoc(routeRef);
    } catch (error) {
        console.error(`Failed to delete route ${routeId}:`, error);
        throw new Error('Failed to delete route');
    }
}

async function moveUserRoute(sourceUserId: string, targetUserId: string, routeId: string): Promise<void> {
    try {
        const sourceRouteRef = doc(firestore, 'users', sourceUserId, 'routes', routeId);
        const routeDoc = await getDoc(sourceRouteRef);

        if (!routeDoc.exists()) throw new Error(`Route not found.`);

        const routeData = routeDoc.data();
        const batch = writeBatch(firestore);
        batch.set(doc(collection(firestore, 'users', targetUserId, 'routes'), routeId), routeData);
        batch.set(doc(collection(firestore, 'users', targetUserId, 'routes'), routeId), routeData);
        batch.delete(sourceRouteRef);
        await batch.commit();
    } catch (error) {
        console.error(`Failed to move route ${routeId}:`, error);
        throw new Error('Failed to move route in Firebase');
    }
}

async function updateLeadServices(leadId: string, services: ServiceSelection[]): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, { services: services });
        await logActivity(leadId, {
            type: 'Update',
            notes: `Services configured: ${services.map(s => s.name).join(', ')}`,
        });
    } catch (error) {
        console.error(`Failed to update services for lead ${leadId}:`, error);
        throw new Error('Failed to update services in Firebase');
    }
}

async function moveLeadToBucket(payload: { leadId: string; fieldSales: boolean; assigneeDisplayName: string }): Promise<void> {
    const { leadId, fieldSales, assigneeDisplayName } = payload;
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        await updateDoc(leadRef, {
            fieldSales: fieldSales,
            dialerAssigned: assigneeDisplayName,
        });

        const bucketName = fieldSales ? 'Field Sales' : 'Outbound';
        await logActivity(leadId, {
            type: 'Update',
            notes: `Lead moved to ${bucketName} bucket and assigned to ${assigneeDisplayName}.`,
        });
    } catch (error) {
        console.error(`Failed to move lead ${leadId}:`, error);
        throw new Error('Failed to move lead in Firebase');
    }
}

async function bulkMoveLeadsToBucket(payload: { leadIds: string[]; fieldSales: boolean; assigneeDisplayName: string; activityNote?: string; author?: string; }): Promise<void> {
    const { leadIds, fieldSales, assigneeDisplayName, activityNote, author } = payload;
    if (leadIds.length === 0) throw new Error("No leads selected.");
    try {
        const batch = writeBatch(firestore);
        const bucketName = fieldSales ? 'Field Sales' : 'Outbound';

        leadIds.forEach(leadId => {
            const leadRef = doc(firestore, 'leads', leadId);
            batch.update(leadRef, {
                fieldSales: fieldSales,
                dialerAssigned: assigneeDisplayName
            });

            const newActivityRef = doc(collection(leadRef, 'activity'));
            const note = activityNote || `Lead moved to ${bucketName} bucket and assigned to ${assigneeDisplayName}.`;
            batch.set(newActivityRef, {
                type: 'Update',
                date: new Date().toISOString(),
                notes: note,
                author: author || 'System'
            });
        });

        await batch.commit();
    } catch (error) {
        console.error(`Failed to bulk move leads:`, error);
        throw new Error('Failed to bulk move leads in Firebase');
    }
}


async function addVisitNote(note: Omit<VisitNote, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
        const cleanedData = prepareForFirestore(note);
        const docRef = await addDoc(collection(firestore, 'visitnotes'), {
            ...cleanedData,
            createdAt: new Date().toISOString(),
            status: 'New',
        });
        return docRef.id;
    } catch (error) {
        console.error('Failed to add visit note:', error);
        throw new Error('Failed to save visit note to Firebase');
    }
}

async function getVisitNotes(userId?: string): Promise<VisitNote[]> {
    try {
        let q: Query = collection(firestore, 'visitnotes');
        if (userId) {
            q = query(q, where('capturedByUid', '==', userId));
        }
        
        const snapshot = await getDocs(q);
        const notes = snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as VisitNote);
        notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return notes;
    } catch (error) {
        console.error('Failed to fetch visit notes:', error);
        return [];
    }
}


async function updateVisitNote(noteId: string, data: Partial<VisitNote>): Promise<void> {
    try {
        const noteRef = doc(firestore, 'visitnotes', noteId);
        await updateDoc(noteRef, prepareForFirestore(data));
    } catch (error) {
        console.error(`Failed to update visit note ${noteId}:`, error);
        throw new Error('Failed to update visit note in Firebase');
    }
}

async function deleteVisitNote(noteId: string): Promise<void> {
    try {
        const noteRef = doc(firestore, 'visitnotes', noteId);
        await deleteDoc(noteRef);
    } catch (error) {
        console.error(`Failed to delete visit note ${noteId}:`, error);
        throw new Error('Failed to delete visit note from Firebase');
    }
}

async function logUpsell(upsellData: Omit<Upsell, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(firestore, 'upsells'), prepareForFirestore(upsellData));
        await logActivity(upsellData.companyId, { 
            type: 'Update', 
            notes: `Customer upsold. Recorded by ${upsellData.repName}. Notes: ${upsellData.notes || 'N/A'}` 
        });
        return docRef.id;
    } catch (error) {
        console.error('Failed to log upsell:', error);
        throw new Error('Failed to log upsell in Firebase');
    }
}

async function getUpsells(repUid?: string): Promise<Upsell[]> {
    try {
        let q: Query = collection(firestore, 'upsells');
        if (repUid) {
            q = query(q, where('repUid', '==', repUid));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as Upsell);
    } catch (error) {
        console.error('Failed to fetch upsells:', error);
        return [];
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
    updateLeadDiscoveryData as updateLeadDiscoveryDataNS,
    updateLeadDiscoveryData as sendDiscoveryDataToNetSuite,
    updateLeadDiscoveryData as updateLeadDiscoveryDataWithSync,
    updateLeadCheckinQuestions,
    addScorecard,
    updateScorecardAnalysis,
    getAllUsers,
    updateUser,
    bulkUpdateLeadDialerRep,
    addCallReview,
    getLastNote,
    getLastActivity,
    createNewLead,
    prospectWebsiteTool,
    checkForDuplicateLead,
    deleteLead,
    deleteCompany,
    bulkDeleteSubCollectionItems,
    getSubCollection,
    saveUserRoute,
    getUserRoutes,
    deleteUserRoute,
    getAllUserRoutes,
    moveUserRoute,
    updateLeadServices,
    updateUserRoute,
    moveLeadToBucket,
    bulkMoveLeadsToBucket,
    deleteLeadsByCampaign,
    updateContactSendEmail,
    getUserActivitiesForPeriod,
    addVisitNote,
    getVisitNotes,
    updateVisitNote,
    deleteVisitNote,
    logUpsell,
    getUpsells,
};
