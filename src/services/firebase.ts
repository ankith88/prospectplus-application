'use client';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { firestore } from '@/lib/firebase';
import type { Lead, LeadStatus, Address, Contact, Activity, EmailRecord, Note, Transcript, TranscriptAnalysis, UserProfile, Task, DiscoveryData, Appointment, Review, ReviewCategory, Invoice, SavedRoute, StorableRoute, ServiceSelection, CheckinQuestion, VisitNote, Upsell, DailyDeployment, FieldSalesSchedule, MapLead, CompanyInsight } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit, collectionGroup, orderBy, writeBatch, startAfter, documentId, Query, FieldPath, increment, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { sendNewLeadToNetSuite, sendLeadUpdateToNetSuite } from './netsuite';
import { calculateCheckinScore } from '@/lib/checkin-scoring';

/**
 * Sanitizes data retrieved from Firestore to ensure it can be passed from 
 * Server Components/Actions to Client Components. Converts Timestamps and Dates to ISO strings.
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
    try {
      const date = new Date(data.seconds * 1000 + data.nanoseconds / 1000000);
      return date.toISOString();
    } catch (e) {
      return data;
    }
  }

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
    } catch (error) {
        console.error(`Failed to update activity ${activityId} for lead ${leadId}:`, error);
        throw new Error('Failed to update activity in Firebase');
    }
}

function safeGetStatus(status: any): LeadStatus {
    const validStatuses: LeadStatus[] = ['New', 'Hot Lead', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Lost Customer', 'Won', 'LPO Review', 'In Progress', 'Connected', 'High Touch', 'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'LocalMile Opportunity', 'Trialing LocalMile', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent'];
    if (typeof status === 'string') {
        if (status === 'SUSPECT-Unqualified') return 'New';
        let cleanStatus = status.replace('SUSPECT-', '');
        if (cleanStatus === 'Signed') return 'Won';
        const found = validStatuses.find(s => s.toLowerCase() === cleanStatus.toLowerCase());
        if (found) return found;
    }
    return 'New';
}

async function getUserAircallId(displayName: string): Promise<string | null> {
    try {
        const users = await getAllUsers();
        const user = users.find(u => u.displayName === displayName);
        return user?.aircallUserId || null;
    } catch (error) {
        console.error(`Failed to get AirCall User ID for user ${displayName}:`, error);
        return null;
    }
}

async function getUserPhoneNumber(displayName: string): Promise<string | null> {
    try {
        const users = await getAllUsers();
        const user = users.find(u => u.displayName === displayName);
        return user?.phoneNumber || null;
    } catch (error) {
        console.error(`Failed to get phone number for user ${displayName}:`, error);
        return null;
    }
}

async function getLeadFromFirebase(leadId: string, includeSubCollections = true): Promise<Lead | null> {
    if (!leadId) return null;
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const docSnapshot = await getDoc(leadRef);

        if (!docSnapshot.exists()) return null;

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
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}.`,
          address: address,
          postalAddress: data.postalAddress,
          sofDetails: data.sofDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
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
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          isDuplicate: data.isDuplicate,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          marketingLists: data.marketingLists,
          hasCreatedJob: data.hasCreatedJob,
          jobCount: data.jobCount,
          lastLocalMileJobCreatedAt: data.lastLocalMileJobCreatedAt,
          localMileTrialsRemaining: data.localMileTrialsRemaining,
          localMileTermsAccepted: data.localMileTermsAccepted,
          localMileTermsAcceptedAt: data.localMileTermsAcceptedAt,
          localMileTnCAcceptedAt: data.localMileTnCAcceptedAt,
          activeJourneys: data.activeJourneys || [],
          bookingUrlId: data.bookingUrlId,
          bookingContactId: data.bookingContactId,
        };

        if (includeSubCollections) {
            const [contacts, activities, emails, notes, transcripts, tasks, appointments, invoices, bucketHistory, companyInsights] = await Promise.all([
                getSubCollection<Contact>('leads', leadId, 'contacts', documentId()),
                getSubCollection<Activity>('leads', leadId, 'activity', 'date'),
                getSubCollection<EmailRecord>('leads', leadId, 'emails', 'sentAt', 'desc'),
                getSubCollection<Note>('leads', leadId, 'notes', 'date'),
                getSubCollection<Transcript>('leads', leadId, 'transcripts', 'date'),
                getSubCollection<Task>('leads', leadId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('leads', leadId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('leads', leadId, 'invoices', 'invoiceDate', 'desc'),
                getSubCollection<any>('leads', leadId, 'bucket_history', 'date', 'desc'),
                getSubCollection<CompanyInsight>('leads', leadId, 'company_insights', 'scannedAt', 'desc')
            ]);

            transformedLead.contacts = contacts;
            transformedLead.activity = activities;
            transformedLead.emails = emails;
            transformedLead.notes = notes;
            transformedLead.transcripts = transcripts;
            transformedLead.tasks = tasks;
            transformedLead.appointments = appointments;
            transformedLead.invoices = invoices;
            transformedLead.contactCount = contacts.length;
            transformedLead.bucketHistory = bucketHistory;
            transformedLead.companyInsights = companyInsights;
        }

        return transformedLead;
    } catch (error) {
        console.error(`Firebase fetch failed for lead ${leadId}:`, error);
        return null;
    }
}

async function getCompanyFromFirebase(companyId: string, includeSubCollections = true): Promise<Lead | null> {
    if (!companyId) return null;
    try {
        const companyRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(companyRef);

        if (!docSnapshot.exists()) return null;

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
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
          address: address,
          postalAddress: data.postalAddress,
          sofDetails: data.sofDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
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
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          isDuplicate: data.isDuplicate,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          marketingLists: data.marketingLists,
          hasCreatedJob: data.hasCreatedJob,
          jobCount: data.jobCount,
          lastLocalMileJobCreatedAt: data.lastLocalMileJobCreatedAt,
          localMileTrialsRemaining: data.localMileTrialsRemaining,
          localMileTermsAccepted: data.localMileTermsAccepted,
          localMileTermsAcceptedAt: data.localMileTermsAcceptedAt,
          localMileTnCAcceptedAt: data.localMileTnCAcceptedAt,
          activeJourneys: data.activeJourneys || [],
        };
        
        if (includeSubCollections) {
            const [contacts, activities, emails, notes, transcripts, tasks, appointments, invoices] = await Promise.all([
                getSubCollection<Contact>('companies', companyId, 'contacts', documentId()),
                getSubCollection<Activity>('companies', companyId, 'activity', 'date'),
                getSubCollection<EmailRecord>('companies', companyId, 'emails', 'sentAt', 'desc'),
                getSubCollection<Note>('companies', companyId, 'notes', 'date'),
                getSubCollection<Transcript>('companies', companyId, 'transcripts', 'date'),
                getSubCollection<Task>('companies', companyId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('companies', companyId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('companies', companyId, 'invoices', 'invoiceDate', 'desc')
            ]);

            transformedCompany.contacts = contacts;
            transformedCompany.activity = activities;
            transformedCompany.emails = emails;
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

async function getLeadsFromFirebase(options?: { leadId?: string, leadIds?: string[], summary?: boolean, dialerAssigned?: string, franchisee?: string }): Promise<Lead[]> {
  const { leadId, leadIds, summary = false, dialerAssigned, franchisee } = options || {};
  
  if (leadId) {
      const lead = await getLeadFromFirebase(leadId, !summary);
      return lead ? [lead] : [];
  }

  if (leadIds && leadIds.length > 0) {
      const leads = await Promise.all(leadIds.map(id => getLeadFromFirebase(id, !summary)));
      return leads.filter((l): l is Lead => l !== null);
  }

  try {
    let leadsQuery = query(collection(firestore, 'leads'));
    if (dialerAssigned) leadsQuery = query(leadsQuery, where('dialerAssigned', '==', dialerAssigned));
    if (franchisee) leadsQuery = query(leadsQuery, where('franchisee', '==', franchisee));

    const snapshot = await getDocs(leadsQuery);
    const leads = snapshot.docs
        .filter((doc) => !doc.data().isDuplicate)
        .map((doc) => {
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
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: data.companyName || 'Unknown Company',
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A lead for ${data.companyName}.`,
          address: address,
          postalAddress: data.postalAddress,
          sofDetails: data.sofDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          franchisee: data.franchisee,
          websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
          industryCategory: data.industryCategory,
          industrySubCategory: data.industrySubCategory,
          salesRepAssigned: data.salesRepAssigned,
          salesRepAssignedCalendlyLink: data.salesRepAssignedCalendlyLink,
          dialerAssigned: data.dialerAssigned,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
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
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          isDuplicate: data.isDuplicate,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          marketingLists: data.marketingLists,
          hasCreatedJob: data.hasCreatedJob,
          jobCount: data.jobCount,
          lastLocalMileJobCreatedAt: data.lastLocalMileJobCreatedAt,
          localMileTrialsRemaining: data.localMileTrialsRemaining,
          localMileTermsAccepted: data.localMileTermsAccepted,
          localMileTermsAcceptedAt: data.localMileTermsAcceptedAt,
          localMileTnCAcceptedAt: data.localMileTnCAcceptedAt,
          activeJourneys: data.activeJourneys || [],
          bookingUrlId: data.bookingUrlId,
          bookingContactId: data.bookingContactId,
        } as Lead;
      });

      if (!summary) {
          return Promise.all(leads.map(async (lead) => {
              const contacts = await getSubCollection<Contact>('leads', lead.id, 'contacts', documentId());
              return { ...lead, contacts, contactCount: contacts.length };
          }));
      }

      return leads;
  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

async function getCompaniesFromFirebase(options?: { franchisee?: string, skipCoordinateCheck?: boolean }): Promise<Lead[]> {
    const { franchisee, skipCoordinateCheck = false } = options || {};
    try {
        let companiesQuery = query(collection(firestore, 'companies'));
        if (franchisee) companiesQuery = query(companiesQuery, where('franchisee', '==', franchisee));
        const snapshot = await getDocs(companiesQuery);

        return snapshot.docs.map((doc): Lead | null => {
                const data = sanitizeData(doc.data() || {});
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);

                if (!skipCoordinateCheck && (isNaN(lat) || isNaN(lng))) return null;

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

                return {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['entityId'] || '',
                    salesRecordInternalId: data.salesRecordInternalId,
                    companyName: data.companyName || 'Unknown Company',
                    status: safeGetStatus(data.customerStatus),
                    customerStatus: data.customerStatus,
                    profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
                    address: address,
                    postalAddress: data.postalAddress,
                    sofDetails: data.sofDetails,
                    latitude: isNaN(lat) ? undefined : lat,
                    longitude: isNaN(lng) ? undefined : lng,
                    franchisee: data.franchisee,
                    websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
                    industryCategory: data.industryCategory,
                    customerServiceEmail: data.customerServiceEmail,
                    customerPhone: data.customerPhone,
                    salesRepAssigned: data.salesRepAssigned,
                    dialerAssigned: data.dialerAssigned,
                    accountManagerAssigned: data.accountManagerAssigned,
                    customerSuccessAssigned: data.customerSuccessAssigned,
                    fieldRepAssigned: data.fieldRepAssigned,
                    fieldSales: data.fieldSales,
                    services: data.services || [],
                    lastProspected: data.lastProspected,
                    dateLeadEntered: data.dateLeadEntered,
                    customerSource: data.customerSource || data.source,
                    visitNoteID: data.visitNoteID,
                    netsuiteLeadStatus: data.netsuiteLeadStatus,
                    bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                    inboundDetails: data.inboundDetails,
                    isDuplicate: data.isDuplicate,
                    similarLeads: data.similarLeads,
                    hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                    marketingLists: data.marketingLists,
                    activeJourneys: data.activeJourneys || [],
                } as Lead;
            })
            .filter((company): company is Lead => company !== null);
    } catch (error) {
        console.error("Firebase fetch for companies failed:", error);
        return [];
    }
}

async function getArchivedLeads(franchisee?: string): Promise<Lead[]> {
    try {
        const archivedStatusesForQuery: (LeadStatus | 'Signed')[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Signed', 'LocalMile Pending', 'LocalMile Opportunity', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'Lost Customer', 'In Qualification', 'Quote Sent'];
        
        let q = query(collection(firestore, 'leads'), where('customerStatus', 'in', archivedStatusesForQuery));
        if (franchisee) q = query(q, where('franchisee', '==', franchisee));
        
        const snapshot = await getDocs(q);
        const leads = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const data = sanitizeData(doc.data() || {});
                const transformedLead: Lead = {
                    id: doc.id,
                    entityId: data['customerEntityId'] || data['entityId'] || '',
                    salesRecordInternalId: data.salesRecordInternalId,
                    companyName: data.companyName || 'Unknown Company',
                    status: safeGetStatus(data.customerStatus),
                    customerStatus: data.customerStatus,
                    statusReason: data.statusReason,
                    profile: `A lead for ${data.companyName}.`,
                    address: data.address,
                    postalAddress: data.postalAddress,
                    sofDetails: data.sofDetails,
                    franchisee: data.franchisee,
                    dialerAssigned: data.dialerAssigned,
                    salesRepAssigned: data.salesRepAssigned,
                    accountManagerAssigned: data.accountManagerAssigned,
                    customerSuccessAssigned: data.customerSuccessAssigned,
                    fieldRepAssigned: data.fieldRepAssigned,
                    industryCategory: data.industryCategory,
                    discoveryData: data.discoveryData,
                    fieldSales: data.fieldSales,
                    services: data.services || [],
                    lastProspected: data.lastProspected,
                    dateLeadEntered: data.dateLeadEntered,
                    customerSource: data.customerSource || data.source,
                    visitNoteID: data.visitNoteID,
                    bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                    inboundDetails: data.inboundDetails,
                    isDuplicate: data.isDuplicate,
                    similarLeads: data.similarLeads,
                    hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                    marketingLists: data.marketingLists,
                    activeJourneys: data.activeJourneys || [],
                };
                const lastActivity = await getLastActivity(doc.id);
                transformedLead.activity = lastActivity ? [lastActivity] : [];
                return transformedLead;
            })
        );
        return leads.sort((a, b) => {
            const dateA = a.activity?.[0]?.date ? new Date(a.activity[0].date).getTime() : 0;
            const dateB = b.activity?.[0]?.date ? new Date(b.activity[0].date).getTime() : 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Firebase fetch for archived leads failed:", error);
        return [];
    }
}

async function getAllLeadsForReport(franchisee?: string): Promise<Lead[]> {
    try {
        let leadsQuery = query(collection(firestore, 'leads'));
        if (franchisee) leadsQuery = query(leadsQuery, where('franchisee', '==', franchisee));
        const snapshot = await getDocs(leadsQuery);
        return snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            return {
                id: doc.id,
                entityId: data.entityId || data.customerEntityId || '',
                salesRecordInternalId: data.salesRecordInternalId,
                companyName: data.companyName || 'Unknown Company',
                dialerAssigned: data.dialerAssigned,
                salesRepAssigned: data.salesRepAssigned,
                accountManagerAssigned: data.accountManagerAssigned,
                customerSuccessAssigned: data.customerSuccessAssigned,
                fieldRepAssigned: data.fieldRepAssigned,
                status: safeGetStatus(data.customerStatus),
                customerStatus: data.customerStatus,
                statusReason: data.statusReason,
                profile: data.profile || `A lead for ${data.companyName || 'Unknown Company'}.`,
                address: data.address,
                postalAddress: data.postalAddress,
                sofDetails: data.sofDetails,
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
                netsuiteLeadStatus: data.netsuiteLeadStatus,
                bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                inboundDetails: data.inboundDetails,
                isDuplicate: data.isDuplicate,
                similarLeads: data.similarLeads,
                hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                marketingLists: data.marketingLists,
                activeJourneys: data.activeJourneys || [],
            } as Lead;
        });
    } catch (error) {
        console.error("Failed to fetch leads for report:", error);
        return [];
    }
}

async function getSubCollection<T>(parentCollection: string, docId: string, subCollectionName: string, orderByField: string | FieldPath, orderDirection: 'asc' | 'desc' = 'desc'): Promise<T[]> {
    try {
        const ref = collection(firestore, parentCollection, docId, subCollectionName);
        const q = query(ref, orderBy(orderByField, orderDirection));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            if (subCollectionName === 'invoices' && (!data.invoiceType || data.invoiceType === '- None -')) {
                data.invoiceType = 'Service';
            }
            return { id: doc.id, ...data } as T;
        });
    } catch (error) {
        return [];
    }
}

async function getAllCallActivities(startDate?: string, endDate?: string): Promise<any[]> {
    try {
        const activityQuery = collectionGroup(firestore, 'activity');
        const activitySnapshot = await getDocs(activityQuery);
        const callActivityDocs = activitySnapshot.docs.filter(doc => {
            const data = doc.data() as Activity;
            if (data.type !== 'Call') return false;
            if (startDate && data.date < startDate) return false;
            if (endDate && data.date > endDate) return false;
            return true;
        });

        if (callActivityDocs.length === 0) return [];

        const leadIds = [...new Set(callActivityDocs.map(doc => doc.ref.parent.parent!.id))];
        const leadsData: Record<string, Lead> = {};
        
        for (let i = 0; i < leadIds.length; i += 30) {
            const chunk = leadIds.slice(i, i + 30);
            const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
            });
        }
        
        const rawCalls = callActivityDocs.map(activityDoc => {
            const activityData = sanitizeData(activityDoc.data()) as Activity;
            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId || !leadsData[leadId]) return null;
            return {
                ...activityData,
                id: activityDoc.id,
                leadId: leadId,
                leadName: leadsData[leadId].companyName || 'Unknown Lead',
                leadStatus: leadsData[leadId].status,
                dialerAssigned: leadsData[leadId].dialerAssigned || 'Unassigned',
            };
        }).filter((call): call is any => call !== null);

        const finalCalls: any[] = [];
        const callsByLead: Record<string, any[]> = {};
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
                const matched = outcomes.some(outcome => Math.abs(new Date(outcome.date).getTime() - attemptTime) < 5 * 60 * 1000);
                if (!matched) finalCalls.push(attempt);
            });
        });

        return finalCalls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        throw new Error('Failed to fetch call activities.');
    }
}

async function getAllActivities(checkInOnly = false): Promise<Array<Activity & { leadId: string }>> {
    try {
        const activitiesSnapshot = await getDocs(collectionGroup(firestore, 'activity'));
        let allActivities = activitiesSnapshot.docs.map(doc => {
            const activityData = sanitizeData(doc.data()) as Activity;
            return { ...activityData, id: doc.id, leadId: doc.ref.parent.parent!.id };
        });
        if (checkInOnly) allActivities = allActivities.filter(a => a.notes === 'Checked in at location via map.');
        return allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        return [];
    }
}

async function getUserActivitiesForPeriod(displayName: string, startDate: string): Promise<Activity[]> {
    try {
        const q = query(collectionGroup(firestore, 'activity'), where('author', '==', displayName));
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ ...sanitizeData(doc.data()), id: doc.id, leadId: doc.ref.parent.parent!.id } as Activity))
            .filter(a => a.date >= startDate);
    } catch (error) {
        return [];
    }
}

async function getAllTranscripts(): Promise<Transcript[]> {
    try {
        const snapshot = await getDocs(collectionGroup(firestore, 'transcripts'));
        return snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Transcript))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        return [];
    }
}

async function getAllAppointments(startDate?: string, endDate?: string): Promise<Array<Appointment & { leadId: string; leadName: string; dialerAssigned?: string; leadStatus: LeadStatus; discoveryData?: DiscoveryData }>> {
    try {
        const appointmentsSnapshot = await getDocs(collectionGroup(firestore, 'appointments'));
        const filteredDocs = appointmentsSnapshot.docs.filter(doc => {
            const data = doc.data() as Appointment;
            if (startDate && data.starttime < startDate) return false;
            if (endDate && data.starttime > endDate) return false;
            return true;
        });

        const leadIds = [...new Set(filteredDocs.map(doc => doc.ref.parent.parent!.id))];
        if (leadIds.length === 0) return [];

        const leadsData: Record<string, Lead> = {};
        for (let i = 0; i < leadIds.length; i += 30) {
            const chunk = leadIds.slice(i, i + 30);
            const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => { leadsData[doc.id] = sanitizeData(doc.data()) as Lead; });
        }

        return filteredDocs.map(doc => {
            const data = sanitizeData(doc.data()) as Appointment;
            const leadId = doc.ref.parent.parent!.id;
            const lead = leadsData[leadId];
            return {
                ...data,
                id: doc.id,
                leadId,
                leadName: lead?.companyName || 'Unknown Lead',
                dialerAssigned: lead?.dialerAssigned,
                leadStatus: lead?.status,
                discoveryData: lead?.discoveryData,
            };
        }).filter(a => !!a.leadId).sort((a, b) => new Date(a.duedate).getTime() - new Date(b.duedate).getTime());
    } catch (error) {
        return [];
    }
}

async function addContactToLead(leadId: string, contact: Omit<Contact, 'id'>, collectionName: 'leads' | 'companies' = 'leads'): Promise<string> {
  try {
    const contactsRef = collection(firestore, collectionName, leadId, 'contacts');
    const docRef = await addDoc(contactsRef, prepareForFirestore({ ...contact, syncedWithNetSuite: false }));
    
    // Only log activity and update count for leads (assuming companies don't have these specific fields/collections in the same way)
    if (collectionName === 'leads') {
      await logActivity(leadId, { type: 'Update', notes: `New contact added: ${contact.name}` });
      const leadRef = doc(firestore, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      await updateDoc(leadRef, { contactCount: (leadDoc.data()?.contactCount || 0) + 1 });
    }
    
    return docRef.id;
  } catch (error) {
    console.error(`Failed to add contact to ${collectionName}/${leadId}:`, error);
    throw new Error('Failed to add contact');
  }
}

async function updateLeadSalesRep(leadId: string, salesRep: string | null, calendlyLink: string | null): Promise<void> {
  try {
    await updateDoc(doc(firestore, 'leads', leadId), { salesRepAssigned: salesRep, salesRepAssignedCalendlyLink: calendlyLink });
    await logActivity(leadId, { type: 'Update', notes: salesRep ? `Lead assigned to sales rep ${salesRep}` : `Lead unassigned` });
  } catch (error) {
    throw new Error('Failed to update sales rep');
  }
}

async function updateLeadDialerRep(leadId: string, dialerRep: string | null, isInbound: boolean = false): Promise<void> {
  try {
    const updateField = isInbound ? 'salesRepAssigned' : 'dialerAssigned';
    await updateDoc(doc(firestore, 'leads', leadId), { [updateField]: dialerRep === null ? deleteField() : dialerRep });
    await logActivity(leadId, { type: 'Update', notes: dialerRep ? `Lead assigned to ${isInbound ? 'sales rep' : 'dialer'} ${dialerRep}` : `Lead unassigned` });
  } catch (error) {
    throw new Error(`Failed to update ${isInbound ? 'sales rep' : 'dialer'}`);
  }
}

async function updateLeadAvatar(leadId: string, avatarUrl: string): Promise<void> {
  try {
    await updateDoc(doc(firestore, 'leads', leadId), { avatarUrl });
    await logActivity(leadId, { type: 'Update', notes: `Lead avatar updated.` });
  } catch (error) {
    throw new Error('Failed to update avatar');
  }
}

async function updateLeadStatus(leadId: string, status: LeadStatus, reason?: string): Promise<void> {
    try {
        await updateDoc(doc(firestore, 'leads', leadId), { customerStatus: status, statusReason: reason || '' });
        await logActivity(leadId, { type: 'Update', notes: reason ? `Status changed to ${status} (Reason: ${reason})` : `Status changed to ${status}` });
    } catch (error) {
        throw new Error('Failed to update status');
    }
}

async function updateLeadAiScore(leadId: string, score: number, reason: string): Promise<void> {
    try {
        await updateDoc(doc(firestore, 'leads', leadId), { aiScore: score, aiReason: reason });
    } catch (error) {
        throw new Error('Failed to update AI score');
    }
}

async function updateLeadNextBestAction(leadId: string, action: string): Promise<void> {
    try {
        await updateDoc(doc(firestore, 'leads', leadId), { nextBestAction: action });
    } catch (error) {
        throw new Error('Failed to update Next Best Action');
    }
}

async function updateLeadFieldSales(leadId: string, isFieldSales: boolean): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        const oldBucket = leadSnap.exists() ? (leadSnap.data()?.bucket || (leadSnap.data()?.fieldSales ? 'field_sales' : 'outbound')) : 'unknown';
        const newBucket = isFieldSales ? 'field_sales' : 'outbound';

        await updateDoc(leadRef, { 
            fieldSales: isFieldSales,
            bucket: newBucket
        });
        await logActivity(leadId, { 
            type: 'Update', 
            notes: `Lead moved to ${isFieldSales ? 'Field Sales' : 'Outbound'} bucket.` 
        });
        await logBucketChange(leadId, oldBucket, newBucket, 'System');
    } catch (error) {
        console.error(`Failed to update fieldSales for lead ${leadId}:`, error);
        throw new Error('Failed to update bucket allocation');
    }
}

async function logCallActivity(leadId: string, callData: { outcome: string; notes: string; author: string; salesRecordInternalId?: string; }): Promise<LeadStatus | undefined> {
    const outcomeStatusMap: Record<string, { status: LeadStatus; reason?: string }> = {
        'Appointment Booked': { status: 'Qualified' },
        'Busy': { status: 'In Progress' },
        'Call Back/Follow-up': { status: 'High Touch' },
        'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
        'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
        'Email Interested': { status: 'Pre Qualified' },
        'Empty / Closed': { status: 'Lost', reason: 'Closed Business' },
        'Gatekeeper': { status: 'Connected' },
        'LOST - No Contact': { status: 'Lost', reason: 'No Contact' },
        'LOST - No Response': { status: 'Lost', reason: 'No Response' },
        'No Answer': { status: 'In Progress' },
        'Not a Fit': { status: 'Lost', reason: 'Not a Fit' },
        'Not Interested': { status: 'Lost', reason: 'Not Interested' },
        'Prospect - No Access/No Contact': { status: 'New' },
        'Qualified - Call Back/Send Info': { status: 'In Qualification' },
        'Reschedule': { status: 'Reschedule' },
        'Unqualified Opportunity': { status: 'Priority Field Lead' },
        'Upsell': { status: 'Won' },
        'Voicemail': { status: 'In Progress' },
        'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
    };

    const { status, reason: outcomeReason } = outcomeStatusMap[callData.outcome] || {};
    const notesToLog = `Outcome: ${callData.outcome}${outcomeReason ? ` (${outcomeReason})` : ''}. Notes: ${callData.notes || 'N/A'}`;

    // Special logic for "Prospect - No Access/No Contact" processing
    if (callData.outcome === 'Prospect - No Access/No Contact') {
        try {
            const leadRef = doc(firestore, 'leads', leadId);
            const leadSnap = await getDoc(leadRef);
            const leadData = leadSnap.data();
            
            if (leadData?.visitNoteID) {
                const noteRef = doc(firestore, 'visitnotes', leadData.visitNoteID);
                const noteSnap = await getDoc(noteRef);
                const noteData = noteSnap.data();
                
                if (noteData?.capturedByUid) {
                    const userRef = doc(firestore, 'users', noteData.capturedByUid);
                    const userSnap = await getDoc(userRef);
                    const capturer = userSnap.data();
                    
                    const updateData: any = {
                        customerStatus: 'New',
                        fieldSales: false,
                        dialerAssigned: capturer?.linkedBDR || ''
                    };
                    
                    await updateDoc(leadRef, updateData);
                    
                    const assignMsg = capturer?.linkedBDR 
                        ? `assigned to ${capturer.linkedBDR} (Linked BDR for ${noteData.capturedBy})`
                        : `Unassigned`;

                    await Promise.all([
                        logActivity(leadId, { type: 'Call', notes: notesToLog, author: callData.author }),
                        logActivity(leadId, { 
                            type: 'Update', 
                            notes: `Moved to Outbound and ${assignMsg}.`,
                            author: callData.author
                        })
                    ]);
                    return 'New';
                }
            }
        } catch (e) {
            console.error("Error in Prospect No Contact processing:", e);
            // Fall through to standard processing
        }
    }

    // Special logic for "Unqualified Opportunity" processing
    if (callData.outcome === 'Unqualified Opportunity') {
        try {
            const leadRef = doc(firestore, 'leads', leadId);
            const leadSnap = await getDoc(leadRef);
            const leadData = leadSnap.data();
            
            if (leadData?.visitNoteID) {
                const noteRef = doc(firestore, 'visitnotes', leadData.visitNoteID);
                const noteSnap = await getDoc(noteRef);
                const noteData = noteSnap.data();
                
                if (noteData?.capturedByUid) {
                    const userRef = doc(firestore, 'users', noteData.capturedByUid);
                    const userSnap = await getDoc(userRef);
                    const capturer = userSnap.data();
                    
                    if (capturer?.linkedBDR) {
                        await updateDoc(leadRef, {
                            customerStatus: 'Priority Field Lead',
                            fieldSales: false,
                            dialerAssigned: capturer.linkedBDR,
                            statusReason: outcomeReason || ''
                        });
                        await Promise.all([
                            logActivity(leadId, { type: 'Call', notes: notesToLog, author: callData.author }),
                            logActivity(leadId, { 
                                type: 'Update', 
                                notes: `Moved to Outbound and assigned to ${capturer.linkedBDR} (Linked BDR for ${noteData.capturedBy}).`,
                                author: callData.author
                            })
                        ]);
                        return 'Priority Field Lead';
                    }
                }
            }
        } catch (e) {
            console.error("Error in special outcome processing:", e);
            // Fall through to standard processing
        }
    }

    // Prevent changing status if lead is in a protected post-sale or trialing state
    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    const currentStatus = leadSnap.data()?.customerStatus;
    const protectedStatuses = ['Won', 'Signed', 'LocalMile Pending', 'LocalMile Opportunity', 'Trialing LocalMile'];
    
    const shouldUpdateStatus = status && currentStatus && !protectedStatuses.includes(currentStatus);

    await Promise.all([
        logActivity(leadId, { type: 'Call', notes: notesToLog, author: callData.author }),
        shouldUpdateStatus ? updateLeadStatus(leadId, status, outcomeReason) : Promise.resolve()
    ]);
    
    return shouldUpdateStatus ? status : currentStatus;
}

async function logNoteActivity(leadId: string, noteData: { content: string; author: string, date: string }): Promise<void> {
    await addDoc(collection(firestore, 'leads', leadId, 'notes'), { ...noteData, syncedWithNetSuite: false });
    await logActivity(leadId, { type: 'Update', notes: `Note added: ${noteData.content.substring(0, 100)}...`, date: noteData.date });
}

async function logTranscriptActivity(leadId: string, transcriptData: { content: string; author?: string, callId: string, phoneNumber?: string }): Promise<Transcript> {
    const ref = collection(firestore, 'leads', leadId, 'transcripts');
    const existing = await getDocs(query(ref, where('callId', '==', transcriptData.callId), limit(1)));
    if (!existing.empty) return sanitizeData({ id: existing.docs[0].id, ...existing.docs[0].data() }) as Transcript;

    const newTranscript = { ...transcriptData, author: transcriptData.author || 'System', date: new Date().toISOString() };
    const docRef = await addDoc(ref, prepareForFirestore(newTranscript));
    await logActivity(leadId, { type: 'Update', notes: `Transcript added for call ID ${transcriptData.callId}` });
    return { ...newTranscript, id: docRef.id } as Transcript;
}

async function updateContactInLead(leadId: string, contactId: string, contactData: Partial<Omit<Contact, 'id'>>): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'contacts', contactId), prepareForFirestore({ ...contactData, syncedWithNetSuite: false }));
    await logActivity(leadId, { type: 'Update', notes: `Contact updated: ${contactData.name || ''}` });
}

async function deleteContactFromLead(leadId: string, contactId: string, contactName: string): Promise<void> {
    await deleteDoc(doc(firestore, 'leads', leadId, 'contacts', contactId));
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactName} deleted.` });
    const leadRef = doc(firestore, 'leads', leadId);
    const snap = await getDoc(leadRef);
    await updateDoc(leadRef, { contactCount: (snap.data()?.contactCount || 0) - 1 });
}

async function updateLeadDetails(leadId: string, oldLead: Lead | MapLead, newLeadData: Partial<Lead>): Promise<void> {
    const col = oldLead.status === 'Won' ? 'companies' : 'leads';
    await updateDoc(doc(firestore, col, leadId), prepareForFirestore(newLeadData));
    await logActivity(leadId, { type: 'Update', notes: 'Lead details updated.' });
}

async function updateTranscriptAnalysis(leadId: string, transcriptId: string, analysis: TranscriptAnalysis): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'transcripts', transcriptId), { analysis });
}

async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
    const variations = [phoneNumber, phoneNumber.replace(/\D/g, '')];
    for (const num of variations) {
        const snap = await getDocs(query(collection(firestore, 'leads'), where('customerPhone', '==', num), limit(1)));
        if (!snap.empty) return { id: snap.docs[0].id };
    }
    return null;
}

async function getAllUserTasks(displayName: string): Promise<Array<Task & { leadId: string; leadName: string }>> {
    const q = query(collectionGroup(firestore, 'tasks'), where('dialerAssigned', '==', displayName));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id, leadId: doc.ref.parent.parent!.id, leadName: 'Lead' } as any));
}

async function addTaskToLead(leadId: string, taskData: { title: string; dueDate: string; author: string }): Promise<Task> {
    const leadSnap = await getDoc(doc(firestore, 'leads', leadId));
    const newTask = { ...taskData, dialerAssigned: leadSnap.data()?.dialerAssigned || null, isCompleted: false, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(firestore, 'leads', leadId, 'tasks'), prepareForFirestore(newTask));
    return { ...newTask, id: docRef.id } as Task;
}

async function updateTaskCompletion(leadId: string, taskId: string, isCompleted: boolean): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'tasks', taskId), { isCompleted, completedAt: isCompleted ? new Date().toISOString() : null });
}

async function deleteTaskFromLead(leadId: string, taskId: string): Promise<void> {
    await deleteDoc(doc(firestore, 'leads', leadId, 'tasks', taskId));
}

async function updateLeadDiscoveryData(leadId: string, data: DiscoveryData): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId), prepareForFirestore({ discoveryData: data }));
}

async function updateLeadCheckinQuestions(leadId: string, questions: CheckinQuestion[]): Promise<any> {
    const { score, routingTag, scoringReason } = calculateCheckinScore(questions);
    await updateDoc(doc(firestore, 'leads', leadId), prepareForFirestore({ checkinQuestions: questions, checkinScore: score, checkinRoutingTag: routingTag, checkinScoringReason: scoringReason }));
}

async function addScorecard(leadId: string, data: any): Promise<any> {
    const docRef = await addDoc(collection(firestore, 'leads', leadId, 'scorecards'), prepareForFirestore({ ...data, createdAt: new Date().toISOString() }));
    const snap = await getDoc(docRef);
    return { id: docRef.id, ...sanitizeData(snap.data()) };
}

async function updateScorecardAnalysis(leadId: string, scorecardId: string, analysis: TranscriptAnalysis): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'scorecards', scorecardId), { analysis });
}

async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(firestore, 'users'));
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), uid: doc.id, displayName: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim() || doc.data().email } as UserProfile));
}

async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
    await updateDoc(doc(firestore, 'users', uid), prepareForFirestore(data));
}

async function createNotification(userId: string, notification: { title: string, message: string, type: string, [key: string]: any }) {
    const ref = collection(firestore, 'users', userId, 'notifications');
    await addDoc(ref, {
        ...notification,
        createdAt: new Date().toISOString(),
        isRead: false
    });
}

async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    await updateDoc(doc(firestore, 'users', userId, 'notifications', notificationId), { isRead: true });
}

async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const q = query(collection(firestore, 'users', userId, 'notifications'), where('isRead', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(firestore);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
}

async function bulkUpdateLeadDialerRep(leadIds: string[], newDialerReps: (string | null)[], isInbound: boolean = false): Promise<void> {
    const batch = writeBatch(firestore);
    const updateField = isInbound ? 'salesRepAssigned' : 'dialerAssigned';
    leadIds.forEach((id, i) => {
        const rep = newDialerReps[i % newDialerReps.length];
        batch.update(doc(firestore, 'leads', id), { [updateField]: rep === null ? deleteField() : rep });
    });
    await batch.commit();
}

async function addLeadsToMarketingList(leadIds: string[], listName: string): Promise<void> {
    const batch = writeBatch(firestore);
    const oldBuckets: Record<string, string> = {};
    try {
        for (const id of leadIds) {
            const snap = await getDoc(doc(firestore, 'leads', id));
            if (snap.exists()) {
                const data = snap.data();
                oldBuckets[id] = data.bucket || (data.fieldSales ? 'field_sales' : 'outbound');
            }
        }
    } catch (e) {
        console.error("Failed to fetch old buckets:", e);
    }

    leadIds.forEach(id => {
        batch.update(doc(firestore, 'leads', id), { 
            marketingLists: arrayUnion(listName),
            bucket: 'marketing'
        });
        addBucketChangeToBatch(batch, id, oldBuckets[id] || 'unknown', 'marketing', 'System');
    });
    await batch.commit();
}

async function removeLeadsFromMarketingList(leadIds: string[], listName: string): Promise<void> {
    const batch = writeBatch(firestore);
    leadIds.forEach(id => {
        batch.update(doc(firestore, 'leads', id), { marketingLists: arrayRemove(listName) });
    });
    await batch.commit();
}

async function renameMarketingList(oldName: string, newName: string): Promise<void> {
    const q = query(collection(firestore, 'leads'), where('marketingLists', 'array-contains', oldName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;

    const batch = writeBatch(firestore);
    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        let lists: string[] = Array.isArray(data.marketingLists) ? data.marketingLists : [];
        lists = lists.filter(l => l !== oldName);
        if (!lists.includes(newName)) lists.push(newName);
        batch.update(docSnap.ref, { marketingLists: lists });
    });
    await batch.commit();
}

async function bulkUpdateFieldSales(updates: {id: string, type: 'leads' | 'companies', data?: any}[], fieldSales?: boolean): Promise<void> {
    const batch = writeBatch(firestore);
    updates.forEach(update => {
        const updateData = update.data || { fieldSales };
        batch.update(doc(firestore, update.type, update.id), updateData);
    });
    await batch.commit();
}

async function addCallReview(leadId: string, activityId: string, data: any): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'activity', activityId), { review: { ...data, date: new Date().toISOString() }, isReviewed: true });
}

async function getLastNote(leadId: string): Promise<Note | null> {
    const snap = await getDocs(query(collection(firestore, 'leads', leadId, 'notes'), orderBy('date', 'desc'), limit(1)));
    return snap.empty ? null : sanitizeData({ id: snap.docs[0].id, ...snap.docs[0].data() }) as Note;
}

async function getLastActivity(leadId: string): Promise<Activity | null> {
    const snap = await getDocs(query(collection(firestore, 'leads', leadId, 'activity'), orderBy('date', 'desc'), limit(1)));
    return snap.empty ? null : sanitizeData({ id: snap.docs[0].id, ...snap.docs[0].data() }) as Activity;
}

async function createNewLead(data: any): Promise<any> {
    const res = await sendNewLeadToNetSuite(data);
    return { ...res, leadId: String(res.leadId) };
}

async function prospectWebsiteTool(input: { leadId: string; websiteUrl: string }): Promise<any> {
    return await aiProspectWebsiteTool(input);
}

async function checkForDuplicateLead(name: string, web?: string, email?: string, addr?: Address): Promise<string | null> {
    const snap = await getDocs(query(collection(firestore, 'leads'), where('companyName', '==', name), limit(1)));
    return snap.empty ? null : snap.docs[0].id;
}

async function findExistingCompanyOrLead(name: string, website?: string, phone?: string): Promise<{ id: string; type: 'Lead' | 'Signed Customer'; companyName: string } | null> {
    const normalizedName = name.trim();
    if (!normalizedName) return null;

    try {
        const collections = [
            { name: 'companies', type: 'Signed Customer' as const }
        ];

        for (const col of collections) {
            // 1. Try Prefix Match (most flexible for "Company Name" vs "Company Name - Region")
            const qName = query(
                collection(firestore, col.name),
                where('companyName', '>=', normalizedName),
                where('companyName', '<=', normalizedName + '\uf8ff'),
                limit(1)
            );
            const snapName = await getDocs(qName);
            if (!snapName.empty) {
                return {
                    id: snapName.docs[0].id,
                    type: col.type,
                    companyName: snapName.docs[0].data().companyName
                };
            }

            // 2. Try Website Match (if provided)
            if (website) {
                const cleanWebsite = website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                if (cleanWebsite) {
                    const qWeb = query(
                        collection(firestore, col.name),
                        where('websiteUrl', '>=', cleanWebsite),
                        where('websiteUrl', '<=', cleanWebsite + '\uf8ff'),
                        limit(1)
                    );
                    const snapWeb = await getDocs(qWeb);
                    if (!snapWeb.empty) {
                        return {
                            id: snapWeb.docs[0].id,
                            type: col.type,
                            companyName: snapWeb.docs[0].data().companyName
                        };
                    }
                }
            }

            // 3. Try Phone Match (if provided)
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, '');
                if (cleanPhone) {
                    const qPhone = query(
                        collection(firestore, col.name),
                        where('customerPhone', '>=', cleanPhone),
                        where('customerPhone', '<=', cleanPhone + '\uf8ff'),
                        limit(1)
                    );
                    const snapPhone = await getDocs(qPhone);
                    if (!snapPhone.empty) {
                        return {
                            id: snapPhone.docs[0].id,
                            type: col.type,
                            companyName: snapPhone.docs[0].data().companyName
                        };
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in findExistingCompanyOrLead:', error);
    }

    return null;
}

async function deleteLead(ids: string | string[]): Promise<void> {
    const batch = writeBatch(firestore);
    const list = Array.isArray(ids) ? ids : [ids];
    list.forEach(id => batch.delete(doc(firestore, 'leads', id)));
    await batch.commit();
}

async function deleteCompany(ids: string | string[]): Promise<void> {
    const batch = writeBatch(firestore);
    const list = Array.isArray(ids) ? ids : [ids];
    list.forEach(id => batch.delete(doc(firestore, 'companies', id)));
    await batch.commit();
}

async function bulkDeleteSubCollectionItems(leadId: string, sub: string, ids: string[]): Promise<void> {
    const batch = writeBatch(firestore);
    ids.forEach(id => batch.delete(doc(firestore, 'leads', leadId, sub, id)));
    await batch.commit();
}

async function saveUserRoute(uid: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'users', uid, 'routes'), prepareForFirestore(data));
    return docRef.id;
}

async function getUserRoutes(uid: string): Promise<SavedRoute[]> {
    const snap = await getDocs(query(collection(firestore, 'users', uid, 'routes'), orderBy('createdAt', 'desc')));
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id, directions: doc.data().directions ? JSON.parse(doc.data().directions) : null } as any));
}

async function getAllUserRoutes(): Promise<any[]> {
    const snap = await getDocs(collectionGroup(firestore, 'routes'));
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id, userId: doc.ref.parent.parent!.id, directions: doc.data().directions ? JSON.parse(doc.data().directions) : null }));
}

async function deleteUserRoute(uid: string, rid: string): Promise<void> {
    await deleteDoc(doc(firestore, 'users', uid, 'routes', rid));
}

async function moveUserRoute(src: string, target: string, rid: string): Promise<void> {
    const docSnap = await getDoc(doc(firestore, 'users', src, 'routes', rid));
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', target, 'routes', rid), docSnap.data()!);
    batch.delete(doc(firestore, 'users', src, 'routes', rid));
    await batch.commit();
}

async function updateLeadServices(id: string, s: ServiceSelection[]): Promise<void> {
    const leadRef = doc(firestore, 'leads', id);
    await updateDoc(leadRef, { services: s, updatedAt: new Date() });
}

async function updateLeadCommReg(id: string, commRegId: string, dynamicScfUrl: string): Promise<void> {
    const leadRef = doc(firestore, 'leads', id);
    await updateDoc(leadRef, { 
        commRegId, 
        dynamicScfUrl, 
        updatedAt: new Date() 
    });
}

async function updateUserRoute(uid: string, rid: string, data: any): Promise<void> {
    await updateDoc(doc(firestore, 'users', uid, 'routes', rid), prepareForFirestore(data));
}

async function bulkMoveLeadsToNurtureCampaign(leadIds: string[], journeyId: string, author: string): Promise<void> {
    const journeyRef = doc(firestore, 'Journeys', journeyId);
    const journeySnap = await getDoc(journeyRef);
    if (!journeySnap.exists()) {
        throw new Error('Nurture campaign not found');
    }
    const journey = journeySnap.data();
    const journeyName = journey.name || 'Nurture Campaign';
    const startNode = journey.nodes?.find((n: any) => n.type === 'trigger');
    const firstEdge = journey.edges?.find((e: any) => e.source === startNode?.id);
    const initialNodeId = firstEdge ? firstEdge.target : (startNode?.id || 'trigger_1');
    const nowStr = new Date().toISOString();

    const batch = writeBatch(firestore);
    const oldBuckets: Record<string, string> = {};
    try {
        for (const id of leadIds) {
            const snap = await getDoc(doc(firestore, 'leads', id));
            if (snap.exists()) {
                const data = snap.data();
                oldBuckets[id] = data.bucket || (data.fieldSales ? 'field_sales' : 'outbound');
            }
        }
    } catch (e) {
        console.error("Failed to fetch old buckets:", e);
    }

    leadIds.forEach((leadId: string) => {
        const leadRef = doc(firestore, 'leads', leadId);
        
        batch.update(leadRef, {
            bucket: 'nurture',
            fieldSales: false,
            activeJourneys: arrayUnion(journeyId)
        });

        const stateRef = doc(firestore, 'leads', leadId, 'journey_states', journeyId);
        batch.set(stateRef, {
            leadId,
            journeyId,
            status: 'active',
            currentNodeId: initialNodeId,
            entryTime: nowStr,
            lastExecutionTime: nowStr,
            executionHistory: [
                {
                    nodeId: startNode?.id || 'trigger_1',
                    nodeType: 'trigger',
                    executedAt: nowStr,
                    actionResult: `Enrolled via Nurture bucket shift by ${author}.`
                }
            ]
        });

        const activityRef = doc(collection(firestore, 'leads', leadId, 'activity'));
        batch.set(activityRef, prepareForFirestore({
            type: 'Update',
            date: nowStr,
            notes: `Moved to Nurture bucket and enrolled in campaign '${journeyName}'.`,
            author
        }));

        addBucketChangeToBatch(batch, leadId, oldBuckets[leadId] || 'unknown', 'nurture', author);
    });

    await batch.commit();
}

async function logBucketChange(leadId: string, oldBucket: string, newBucket: string, author: string): Promise<void> {
    try {
        const historyRef = collection(firestore, 'leads', leadId, 'bucket_history');
        await addDoc(historyRef, {
            oldBucket: oldBucket || 'unassigned',
            newBucket: newBucket || 'unassigned',
            date: new Date().toISOString(),
            author: author || 'System'
        });
    } catch (error) {
        console.error('Failed to log bucket change:', error);
    }
}

function addBucketChangeToBatch(batch: any, leadId: string, oldBucket: string, newBucket: string, author: string): void {
    const historyRef = doc(collection(firestore, 'leads', leadId, 'bucket_history'));
    batch.set(historyRef, {
        oldBucket: oldBucket || 'unassigned',
        newBucket: newBucket || 'unassigned',
        date: new Date().toISOString(),
        author: author || 'System'
    });
}

async function bulkMoveLeadsToBucket(data: any): Promise<void> {
    const batch = writeBatch(firestore);
    const newBucket = data.fieldSales ? 'field_sales' : 'outbound';
    const oldBuckets: Record<string, string> = {};
    try {
        for (const id of data.leadIds) {
            const snap = await getDoc(doc(firestore, 'leads', id));
            if (snap.exists()) {
                const dataSnap = snap.data();
                oldBuckets[id] = dataSnap.bucket || (dataSnap.fieldSales ? 'field_sales' : 'outbound');
            }
        }
    } catch (e) {
        console.error("Failed to fetch old buckets:", e);
    }

    data.leadIds.forEach((id: string) => {
        batch.update(doc(firestore, 'leads', id), { 
            fieldSales: data.fieldSales, 
            dialerAssigned: data.assigneeDisplayName,
            bucket: newBucket
        });
        addBucketChangeToBatch(batch, id, oldBuckets[id] || 'unknown', newBucket, 'System');
    });
    await batch.commit();
}

async function bulkAssignUnassignedLeads(leadIds: string[], newBucket: string, assignmentMap: Record<string, string>, author: string): Promise<void> {
    const batch = writeBatch(firestore);
    leadIds.forEach(id => {
        const updateData: any = { bucket: newBucket };
        if (newBucket === 'outbound') updateData.dialerAssigned = assignmentMap[id];
        if (newBucket === 'field_sales') updateData.fieldRepAssigned = assignmentMap[id];
        if (newBucket === 'inbound') updateData.salesRepAssigned = assignmentMap[id];
        if (newBucket === 'account_manager') updateData.accountManagerAssigned = assignmentMap[id];
        if (newBucket === 'customer_success') updateData.customerSuccessAssigned = assignmentMap[id];
        
        batch.update(doc(firestore, 'leads', id), updateData);
        addBucketChangeToBatch(batch, id, 'unassigned', newBucket, author);
    });
    await batch.commit();
}


async function deleteLeadsByCampaign(c: string): Promise<void> {
    const snap = await getDocs(query(collection(firestore, 'leads'), where('customerCampaign', '==', c)));
    const batch = writeBatch(firestore);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

async function updateContactSendEmail(id: string, cid: string): Promise<void> {
    await updateDoc(doc(firestore, 'leads', id, 'contacts', cid), { sendEmail: 'yes' });
}

async function addVisitNote(note: any): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'visitnotes'), { 
        status: 'New',
        ...prepareForFirestore(note), 
        createdAt: new Date().toISOString() 
    });
    return docRef.id;
}

async function getVisitNotes(uid?: string): Promise<VisitNote[]> {
    let q: Query = collection(firestore, 'visitnotes');
    if (uid) q = query(q, where('capturedByUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as VisitNote)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function updateVisitNote(id: string, data: any): Promise<void> {
    await updateDoc(doc(firestore, 'visitnotes', id), prepareForFirestore(data));
}

async function deleteVisitNote(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'visitnotes', id));
}

async function logUpsell(data: any): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'upsells'), prepareForFirestore(data));
    return docRef.id;
}

async function getUpsells(uid?: string): Promise<Upsell[]> {
    let q: Query = collection(firestore, 'upsells');
    if (uid) q = query(q, where('repUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Upsell));
}

async function logDailyArea(data: any): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'daily_area_logs'), { ...prepareForFirestore(data), createdAt: new Date().toISOString() });
    return docRef.id;
}

async function getDailyAreaLogs(date?: string): Promise<DailyDeployment[]> {
    try {
        let q = query(collection(firestore, 'daily_area_logs'), orderBy('date', 'desc'));
        if (date) q = query(q, where('date', '==', date));
        const snap = await getDocs(q);
        const logs = snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as DailyDeployment));
        return logs.sort((a, b) => {
            if (a.date !== b.date) return 0;
            return a.startTime.localeCompare(b.startTime);
        });
    } catch (error) {
        console.warn('Failed to fetch daily logs:', error);
        return [];
    }
}

async function deleteDailyAreaLog(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'daily_area_logs', id));
}

async function getTodayDeploymentForUser(uid: string): Promise<DailyDeployment | null> {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
    const snap = await getDocs(query(collection(firestore, 'daily_area_logs'), where('userId', '==', uid), where('date', '==', today), limit(1)));
    return snap.empty ? null : sanitizeData({ id: snap.docs[0].id, ...snap.docs[0].data() }) as DailyDeployment;
}

async function saveFieldSalesSchedule(id: string, data: any): Promise<void> {
    await setDoc(doc(firestore, 'field_sales_schedules', id), { ...prepareForFirestore(data), updatedAt: new Date().toISOString() });
}

async function deleteFieldSalesSchedule(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'field_sales_schedules', id));
}

async function getFieldSalesSchedules(): Promise<FieldSalesSchedule[]> {
    const snap = await getDocs(collection(firestore, 'field_sales_schedules'));
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as FieldSalesSchedule));
}

async function getLeadContacts(leadId: string): Promise<Contact[]> {
    return getSubCollection<Contact>('leads', leadId, 'contacts', documentId());
}

async function getLeadActivity(leadId: string): Promise<Activity[]> {
    return getSubCollection<Activity>('leads', leadId, 'activity', 'date');
}

async function getLeadNotes(leadId: string): Promise<Note[]> {
    return getSubCollection<Note>('leads', leadId, 'notes', 'date');
}

async function getAllNotes(): Promise<Note[]> {
    const snapshot = await getDocs(collectionGroup(firestore, 'notes'));
    return snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Note));
}

async function getLeadTranscripts(leadId: string): Promise<Transcript[]> {
    return getSubCollection<Transcript>('leads', leadId, 'transcripts', 'date');
}

async function getLeadTasks(leadId: string): Promise<Task[]> {
    return getSubCollection<Task>('leads', leadId, 'tasks', 'dueDate', 'asc');
}

async function mergeLeads(masterLeadId: string, duplicateLeadId: string): Promise<void> {
    const batch = writeBatch(firestore);
    
    // 1. Fetch duplicate data
    const duplicateRef = doc(firestore, 'leads', duplicateLeadId);
    const duplicateSnap = await getDoc(duplicateRef);
    if (!duplicateSnap.exists()) throw new Error('Duplicate lead not found');
    
    // 2. Fetch subcollections from duplicate
    const contacts = await getLeadContacts(duplicateLeadId);
    const activity = await getLeadActivity(duplicateLeadId);
    const notes = await getLeadNotes(duplicateLeadId);
    const transcripts = await getLeadTranscripts(duplicateLeadId);
    const tasks = await getLeadTasks(duplicateLeadId);
    
    // 3. Move subcollections to master (re-mapping IDs to prevent collisions)
    contacts.forEach(c => {
        const { id, ...data } = c;
        batch.set(doc(firestore, 'leads', masterLeadId, 'contacts', id), prepareForFirestore(data));
    });
    
    activity.forEach(a => {
        const { id, ...data } = a;
        batch.set(doc(firestore, 'leads', masterLeadId, 'activity', id), prepareForFirestore(data));
    });
    
    notes.forEach(n => {
        const { id, ...data } = n;
        batch.set(doc(firestore, 'leads', masterLeadId, 'notes', id), prepareForFirestore(data));
    });
    
    transcripts.forEach(t => {
        const { id, ...data } = t;
        batch.set(doc(firestore, 'leads', masterLeadId, 'transcripts', id), prepareForFirestore(data));
    });
    
    tasks.forEach(t => {
        const { id, ...data } = t;
        batch.set(doc(firestore, 'leads', masterLeadId, 'tasks', id), prepareForFirestore(data));
    });
    
    // 4. Update master metadata
    batch.update(doc(firestore, 'leads', masterLeadId), {
        isDuplicate: false,
        similarLeads: [],
        contactCount: increment(contacts.length)
    });
    
    // 5. Log merge activity
    const mergeLog = {
        type: 'Update',
        notes: `Lead merged with duplicate ${duplicateLeadId}. All history and contacts transferred.`,
        date: new Date().toISOString()
    };
    batch.set(doc(firestore, 'leads', masterLeadId, 'activity', `merge-${Date.now()}`), prepareForFirestore(mergeLog));
    
    // 6. Delete duplicate
    batch.delete(duplicateRef);
    
    await batch.commit();
}

async function getAllTasks(): Promise<Task[]> {
    const snapshot = await getDocs(collectionGroup(firestore, 'tasks'));
    return snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Task));
}

async function getAllFranchisees(): Promise<import('@/lib/types').Franchisee[]> {
    try {
        const snapshot = await getDocs(collection(firestore, 'franchisees'));
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                internalId: doc.id,
                ...data
            } as import('@/lib/types').Franchisee;
        });
    } catch (error) {
        console.error("Failed to fetch franchisees:", error);
        return [];
    }
}

async function getOperatorsForFranchisee(franchiseeId: string): Promise<import('@/lib/types').Operator[]> {
    try {
        const qMain = query(collection(firestore, 'operators'), where('mainFranchiseeId', '==', franchiseeId));
        const qLinked = query(collection(firestore, 'operators'), where('linkedFranchiseeIds', 'array-contains', franchiseeId));
        
        const [mainSnap, linkedSnap] = await Promise.all([getDocs(qMain), getDocs(qLinked)]);
        
        const operatorsMap = new Map<string, import('@/lib/types').Operator>();
        
        mainSnap.docs.forEach(doc => {
            operatorsMap.set(doc.id, { internalId: doc.id, ...sanitizeData(doc.data()) } as import('@/lib/types').Operator);
        });
        
        linkedSnap.docs.forEach(doc => {
            operatorsMap.set(doc.id, { internalId: doc.id, ...sanitizeData(doc.data()) } as import('@/lib/types').Operator);
        });
        
        return Array.from(operatorsMap.values());
    } catch (error) {
        console.error("Failed to fetch operators:", error);
        return [];
    }
}

async function getFranchiseeByName(name: string): Promise<import('@/lib/types').Franchisee | null> {
    try {
        if (!name) return null;
        const q = query(collection(firestore, 'franchisees'), where('name', '==', name), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        return {
            internalId: doc.id,
            ...doc.data()
        } as import('@/lib/types').Franchisee;
    } catch (error) {
        console.error("Failed to fetch franchisee by name:", error);
        return null;
    }
}

async function findFranchiseeForAddress(city: string, state: string, zip: string): Promise<string | undefined> {
    try {
        const snap = await getDocs(collection(firestore, 'franchisees'));
        const franchisees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const leadCity = city?.toLowerCase().trim();
        const leadState = state?.toLowerCase().trim();
        const leadZip = zip?.toLowerCase().trim();
        
        if (!leadCity || !leadState || !leadZip) return undefined;

        const match = franchisees.find(f => {
            if (!f.territoryJson) return false;
            return f.territoryJson.some((t: any) => 
                t.suburbs?.toLowerCase().trim() === leadCity &&
                t.state?.toLowerCase().trim() === leadState &&
                t.post_code?.toLowerCase().trim() === leadZip
            );
        });
        return match?.name;
    } catch (error) {
        console.error("Failed to find franchisee for address:", error);
        return undefined;
    }
}

async function createChildSiteLead(parentLeadId: string, companyName: string, siteAddress: Address, localManager: Contact, copiedContacts: Contact[]): Promise<string> {
    // 1. Find Franchisee
    const franchiseeName = await findFranchiseeForAddress(siteAddress.city, siteAddress.state, siteAddress.zip);
    
    // 2. Fetch Parent Lead Data for NetSuite Sync
    let parentLeadData: any = {};
    try {
        const parentDoc = await getDoc(doc(firestore, 'leads', parentLeadId));
        if (parentDoc.exists()) {
            parentLeadData = parentDoc.data();
        }
    } catch (e) {
        console.warn("Could not fetch parent lead data for NetSuite sync", e);
    }

    // 3. Push to NetSuite (NetSuite will create the lead in Firestore)
    const netSuitePayload = {
        companyName: companyName,
        websiteUrl: parentLeadData.websiteUrl || '',
        customerPhone: localManager.phone || parentLeadData.customerPhone || '',
        customerServiceEmail: localManager.email || parentLeadData.customerServiceEmail || '',
        abn: parentLeadData.abn || '',
        industryCategory: parentLeadData.industryCategory || '',
        campaign: parentLeadData.campaign || 'Multi-Site Child',
        address: siteAddress,
        contact: {
            firstName: localManager.name?.split(' ')[0] || '',
            lastName: localManager.name?.split(' ').slice(1).join(' ') || '',
            title: localManager.title || 'Local Site Manager',
            email: localManager.email || '',
            phone: localManager.phone || ''
        },
        franchiseeName: franchiseeName,
        dialerAssigned: parentLeadData.dialerAssigned || '',
    };
    
    const nsResult = await sendNewLeadToNetSuite(netSuitePayload);
    
    if (!nsResult || !nsResult.success || !nsResult.leadId) {
        throw new Error(nsResult?.message || "Failed to create child lead in NetSuite.");
    }
    
    const newLeadId = String(nsResult.leadId);

    // 4. Link the child lead to the parent lead using setDoc with merge to ensure it doesn't fail if NetSuite is slow
    await setDoc(doc(firestore, 'leads', newLeadId), { 
        parentLeadId: parentLeadId,
        franchisee: franchiseeName || 'Unassigned',
        salesRecordInternalId: newLeadId
    }, { merge: true });

    // 5. Add Local Manager Contact to the new lead's subcollection
    const contactsSubRef = collection(firestore, 'leads', newLeadId, 'contacts');
    if (localManager && localManager.name) {
        await addDoc(contactsSubRef, prepareForFirestore({
            ...localManager,
            createdAt: new Date().toISOString()
        }));
    }

    // 6. Copy Parent Contacts to the new lead's subcollection
    for (const contact of copiedContacts) {
        const { id, ...contactData } = contact;
        if (contactData.name) {
             await addDoc(contactsSubRef, prepareForFirestore({
                ...contactData,
                createdAt: new Date().toISOString()
             }));
        }
    }

    // 7. Log Activity on the new child lead
    const activityRef = collection(firestore, 'leads', newLeadId, 'activity');
    await addDoc(activityRef, prepareForFirestore({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead created as a multi-site child from parent lead ${parentLeadId}.`,
      author: 'System'
    }));

    return newLeadId;
}

async function createScfRecord(leadId: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'leads', leadId, 'scfs'), prepareForFirestore({
        ...data,
        createdAt: new Date().toISOString()
    }));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
}

async function getScfRecord(leadId: string, scfId: string): Promise<any> {
    const docSnap = await getDoc(doc(firestore, 'leads', leadId, 'scfs', scfId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
}

async function getScfRecords(leadId: string): Promise<any[]> {
    const snap = await getDocs(collection(firestore, 'leads', leadId, 'scfs'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateScfStatus(leadId: string, scfId: string, status: 'Pending' | 'Accepted'): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'scfs', scfId), { status });
}

export { 
    bulkAssignUnassignedLeads,
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
    updateLeadNextBestAction,
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
    updateLeadFieldSales,
    updateLeadCheckinQuestions,
    addScorecard,
    updateScorecardAnalysis,
    getAllUsers,
    updateUser,
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    bulkUpdateLeadDialerRep,
    addLeadsToMarketingList,
    removeLeadsFromMarketingList,
    renameMarketingList,
    bulkUpdateFieldSales,
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
    updateLeadCommReg,
    updateUserRoute,
    bulkMoveLeadsToBucket,
    bulkMoveLeadsToNurtureCampaign,
    deleteLeadsByCampaign,
    updateContactSendEmail,
    getUserActivitiesForPeriod,
    addVisitNote,
    getVisitNotes,
    updateVisitNote,
    deleteVisitNote,
    logUpsell,
    getUpsells,
    logDailyArea,
    getDailyAreaLogs,
    deleteDailyAreaLog,
    getTodayDeploymentForUser,
    saveFieldSalesSchedule,
    deleteFieldSalesSchedule,
    getFieldSalesSchedules,
    findExistingCompanyOrLead,
    mergeLeads,
    getAllFranchisees,
    createChildSiteLead,
    createScfRecord,
    getScfRecord,
    getScfRecords,
    updateScfStatus,
    getFranchiseeByName,
    logBucketChange,
    addBucketChangeToBatch,
    addCompanyInsight,
  getCompanyInsights,
    getOperatorsForFranchisee,
    updateFranchiseeCampaigns,
};
export async function getServices() {
  const q = query(collection(firestore, 'services'), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as any[];
}

async function addCompanyInsight(leadId: string, insight: Omit<CompanyInsight, 'id'>): Promise<string> {
  try {
    const insightsRef = collection(firestore, 'leads', leadId, 'company_insights');
    const docRef = await addDoc(insightsRef, prepareForFirestore({
      ...insight,
      scannedAt: new Date().toISOString()
    }));
    return docRef.id;
  } catch (error) {
    console.error(`Failed to add company insight for lead ${leadId}:`, error);
    throw new Error(`Failed to save company insight to Firebase`);
  }
}

async function getCompanyInsights(leadId: string): Promise<CompanyInsight[]> {
  try {
    return await getSubCollection<CompanyInsight>('leads', leadId, 'company_insights', 'scannedAt', 'desc');
  } catch (error) {
    console.error(`Failed to get company insights for lead ${leadId}:`, error);
    return [];
  }
}

async function updateFranchiseeCampaigns(franchiseeId: string, campaignPriorities: { campaign: string; priority: 'High' | 'Medium' | 'Low' }[]): Promise<void> {
  try {
    const docRef = doc(firestore, 'franchisees', franchiseeId);
    await updateDoc(docRef, {
      campaignPriorities,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to update campaigns for franchisee ${franchiseeId}:`, error);
    throw new Error(`Failed to update franchisee campaigns`);
  }
}
