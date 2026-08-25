'use client';

/**
 * @fileOverview A service for interacting with the Firebase Realtime Database.
 */
import { app, firestore } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getSydneyISOString } from '@/lib/utils';
import type { Lead, LeadStatus, Address, TaggedAddress, Contact, Activity, EmailRecord, Note, Transcript, TranscriptAnalysis, UserProfile, Task, DiscoveryData, Appointment, AppointmentStatus, Review, ReviewCategory, Invoice, SavedRoute, StorableRoute, ServiceSelection, CheckinQuestion, VisitNote, Upsell, DailyDeployment, FieldSalesSchedule, MapLead, CompanyInsight } from '@/lib/types';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, limit, collectionGroup, orderBy, writeBatch, startAfter, documentId, Query, FieldPath, increment, deleteField, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { sendNewLeadToNetSuite, sendLeadUpdateToNetSuite } from './netsuite';
import { rekeyLeadToNetSuite } from './rekey-lead';
import { calculateCheckinScore } from '@/lib/checkin-scoring';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';
import { deactivateLocalMileAccessForLead } from './localmile-deactivation';
import { REVERSE_OUTCOME_TO_STATUS_MAP } from '@/lib/status-outcome-mapping';
import { MULTISITE_ACCOUNT_MANAGER_UID, isMultisiteCampaign } from '@/lib/constants';

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
export function prepareForFirestore(obj: any): any {
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

async function generateProspectPlusIdClient(): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `MP${generateRandomAlphanumeric(6)}`;
    const qLeads = query(collection(firestore, 'leads'), where('prospectPlusId', '==', candidate));
    const snapLeads = await getDocs(qLeads);
    if (!snapLeads.empty) continue;
    
    const qCompanies = query(collection(firestore, 'companies'), where('prospectPlusId', '==', candidate));
    const snapCompanies = await getDocs(qCompanies);
    if (!snapCompanies.empty) continue;
    
    unique = true;
  }
  return candidate;
}


export async function getLeadOrCompanyCollection(id: string, leadObject?: any): Promise<'companies' | 'leads'> {
    if (!id) return 'leads';
    if (leadObject) {
        if (leadObject.status === 'Won' || leadObject.leadType === 'Company' || leadObject.collectionName === 'companies') {
            return 'companies';
        }
    }
    try {
        const compSnap = await getDoc(doc(firestore, 'companies', id));
        if (compSnap.exists()) return 'companies';
    } catch (e) {
        console.warn(`Error checking collection for ${id}:`, e);
    }
    return 'leads';
}

async function logActivity(
  leadId: string,
  activity: Partial<Omit<Activity, 'id' | 'date'>> & { date?: string },
  collectionName?: 'leads' | 'companies'
): Promise<string> {
    try {
        const colName = collectionName || await getLeadOrCompanyCollection(leadId);
        const activityRef = collection(firestore, colName, leadId, 'activity');
        
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        const author = activity.author || currentUser?.displayName || currentUser?.email || 'System';

        const email = activity.email || currentUser?.email || undefined;

        const activityLog: Partial<Activity> = {
            ...activity,
            date: activity.date || getSydneyISOString(),
            author,
            ...(email ? { email } : {}),
            syncedWithNetSuite: false,
        };

        const docRef = await addDoc(activityRef, prepareForFirestore(activityLog));
        return docRef.id;
    } catch (error) {
        console.error(`Failed to log activity for ${leadId}:`, error);
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
    const validStatuses: LeadStatus[] = ['New', 'Hot Lead', 'Priority Lead', 'Priority Field Lead', 'Contacted', 'Qualified', 'Appointment Booked', 'Unqualified', 'Lost', 'Lost Customer', 'Won', 'LPO Review', 'LPO Opportunity', 'In Progress', 'Connected', 'High Touch', 'Pre Qualified', 'Trialing ShipMate', 'Reschedule', 'LocalMile Pending', 'LocalMile Opportunity', 'Trialing LocalMile', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'In Qualification', 'Quote Sent', 'Quote Accepted', 'Out of Territory', 'Future Follow-up', 'No Answer', 'Address Check', 'Address Confirmed', 'LocalMile Trial Stopped', 'ShipMate Trial Stopped'];
    if (typeof status === 'string') {
        const trimmedStatus = status.trim();
        if (trimmedStatus === 'SUSPECT-Unqualified' || trimmedStatus === 'SUSPECT - Unqualified') return 'New';
        let cleanStatus = trimmedStatus.replace(/^SUSPECT\s*-\s*/i, '');
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
          internalid: data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.salesRecordInternalId || '')),
          internalId: data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.salesRecordInternalId || '')),
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A lead for ${companyName}. Industry: ${data.industryCategory || 'N/A'}.`,
          address: address,
          postalAddress: data.postalAddress,
          billingAddressType: data.billingAddressType,
          billingAddress: data.billingAddress,
          sofLink: data.sofLink,
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
          assignedToDialerAt: data.assignedToDialerAt,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          abn: data.abn,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          // Enrichment Fields (BR - BZ)
          lodgementEvidence: data.lodgementEvidence || data.discoveryData?.lodgementEvidence,
          prospectSummary: data.prospectSummary || data.discoveryData?.prospectSummary,
          shipperEvidence: data.shipperEvidence || data.discoveryData?.shipperEvidence,
          shopifyDetected: data.shopifyDetected || data.discoveryData?.shopifyDetected,
          xeroDetected: data.xeroDetected || data.discoveryData?.xeroDetected,
          apRelationship: data.apRelationship || data.discoveryData?.apRelationship,
          suggestedProduct: data.suggestedProduct || data.discoveryData?.suggestedProduct,
          suggestedOpener: data.suggestedOpener || data.discoveryData?.suggestedOpener,
          suggestedPersonalisation: data.suggestedPersonalisation || data.discoveryData?.suggestedPersonalisation,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          dateRegistrationSent: data.dateRegistrationSent,
          registrationSentAt: data.registrationSentAt,
          localMileRegistrationSentAt: data.localMileRegistrationSentAt,
          dateLocalmileAccepted: data.dateLocalmileAccepted,
          localMileAcceptedAt: data.localMileAcceptedAt,
          customerSource: data.customerSource || data.source || data.leadSource,
          visitNoteID: data.visitNoteID,
          cancellationTheme: data.cancellationTheme,
          cancellationThemeId: data.cancellationThemeId,
          cancellationCategory: data.cancellationCategory,
          cancellationWhyId: data.cancellationWhyId,
          cancellationReason: data.cancellationReason,
          cancellationReasonId: data.cancellationReasonId,
          cancellationdate: data.cancellationdate,
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          attribution: data.attribution,
          marketingChannel: data.marketingChannel || data.attribution?.channel,
          posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
          isDuplicate: data.isDuplicate,
          ignoreDuplicateWarning: data.ignoreDuplicateWarning,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
          currentCarrier: data.currentCarrier,
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
          generalBookingUrlId: data.generalBookingUrlId,
          bookingContactId: data.bookingContactId,
          followUpDate: data.followUpDate,
          parentLeadId: data.parentLeadId,
          multiSiteLocations: data.multiSiteLocations,
          weeklyParcels: data.weeklyParcels,
          prospectPlusId: data.prospectPlusId || data.prospectplusId || data.prospect_plus_id || data.customerEntityId || data.entityId || data.internalid || data.salesRecordInternalId,
          quoteSentAt: data.quoteSentAt,
          signedUpAt: data.signedUpAt,
          scfAcceptedAt: data.scfAcceptedAt,
          trialStartedAt: data.trialStartedAt,
          selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
          inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
          pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
          lpoPlusStatus: data.lpoPlusStatus,
          lpoPlusProvisionedAt: data.lpoPlusProvisionedAt,
          lpoPlusPasswordResetAt: data.lpoPlusPasswordResetAt,
          defaultPassword: data.defaultPassword,
        };

        if (includeSubCollections) {
            const [contacts, activities, emails, notes, transcripts, tasks, appointments, invoices, bucketHistory, companyInsights, additionalAddresses] = await Promise.all([
                getSubCollection<Contact>('leads', leadId, 'contacts', documentId()),
                getSubCollection<Activity>('leads', leadId, 'activity', 'date'),
                getSubCollection<EmailRecord>('leads', leadId, 'emails', 'sentAt', 'desc'),
                getSubCollection<Note>('leads', leadId, 'notes', 'date'),
                getSubCollection<Transcript>('leads', leadId, 'transcripts', 'date'),
                getSubCollection<Task>('leads', leadId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('leads', leadId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('leads', leadId, 'invoices', 'invoiceDate', 'desc'),
                getSubCollection<any>('leads', leadId, 'bucket_history', 'date', 'desc'),
                getSubCollection<CompanyInsight>('leads', leadId, 'company_insights', 'scannedAt', 'desc'),
                getSubCollection<TaggedAddress>('leads', leadId, 'addresses', documentId())
            ]);

            let finalContacts = contacts;
            if (contacts.length === 0) {
                if (data.contacts && Array.isArray(data.contacts) && data.contacts.length > 0) {
                    finalContacts = data.contacts.map((c: any, i: number) => ({
                        id: c.id || `contact-${i}`,
                        name: c.name || data.contactName || data.lpoOwnerName || 'Primary Contact',
                        email: c.email || data.contactEmail || data.customerServiceEmail || '',
                        phone: c.phone || c.mobile || data.contactPhone || data.customerPhone || '',
                        mobile: c.mobile || c.phone || data.contactPhone || data.customerPhone || '',
                        title: c.title || 'Primary Contact',
                        isPrimary: i === 0 || c.isPrimary
                    } as unknown as Contact));
                } else {
                    const legacyName = (typeof data.contactName === 'string' && data.contactName.trim().toLowerCase() !== 'n/a') ? data.contactName.trim() : (data.lpoOwnerName || data.lpoContactName || '');
                    const legacyEmail = (typeof data.contactEmail === 'string' && data.contactEmail.trim().toLowerCase() !== 'n/a') ? data.contactEmail.trim() : (data.customerServiceEmail || data.email || '');
                    const legacyPhone = (typeof data.contactPhone === 'string' && data.contactPhone.trim().toLowerCase() !== 'n/a') ? data.contactPhone.trim() : (data.customerPhone || data.phone || '');
                    if (legacyName || legacyEmail || legacyPhone) {
                        finalContacts = [{
                            id: 'primary-contact',
                            name: legacyName || 'Primary Contact',
                            email: legacyEmail,
                            phone: legacyPhone,
                            mobile: legacyPhone,
                            title: 'Primary Contact',
                            isPrimary: true
                        } as unknown as Contact];
                    }
                }
            }

            transformedLead.contacts = finalContacts;
            transformedLead.activity = activities;
            transformedLead.emails = emails;
            transformedLead.notes = notes;
            transformedLead.transcripts = transcripts;
            transformedLead.tasks = tasks;
            transformedLead.appointments = appointments;
            transformedLead.invoices = invoices;
            transformedLead.contactCount = finalContacts.length;
            transformedLead.bucketHistory = bucketHistory;
            transformedLead.companyInsights = companyInsights;
            transformedLead.additionalAddresses = additionalAddresses;
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
          internalid: data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.salesRecordInternalId || '')),
          internalId: data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.salesRecordInternalId || '')),
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: companyName,
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
          address: address,
          postalAddress: data.postalAddress,
          billingAddressType: data.billingAddressType,
          billingAddress: data.billingAddress,
          sofLink: data.sofLink,
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
          assignedToDialerAt: data.assignedToDialerAt,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          abn: data.abn,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          // Enrichment Fields (BR - BZ)
          lodgementEvidence: data.lodgementEvidence || data.discoveryData?.lodgementEvidence,
          prospectSummary: data.prospectSummary || data.discoveryData?.prospectSummary,
          shipperEvidence: data.shipperEvidence || data.discoveryData?.shipperEvidence,
          shopifyDetected: data.shopifyDetected || data.discoveryData?.shopifyDetected,
          xeroDetected: data.xeroDetected || data.discoveryData?.xeroDetected,
          apRelationship: data.apRelationship || data.discoveryData?.apRelationship,
          suggestedProduct: data.suggestedProduct || data.discoveryData?.suggestedProduct,
          suggestedOpener: data.suggestedOpener || data.discoveryData?.suggestedOpener,
          suggestedPersonalisation: data.suggestedPersonalisation || data.discoveryData?.suggestedPersonalisation,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          dateRegistrationSent: data.dateRegistrationSent,
          registrationSentAt: data.registrationSentAt,
          localMileRegistrationSentAt: data.localMileRegistrationSentAt,
          dateLocalmileAccepted: data.dateLocalmileAccepted,
          localMileAcceptedAt: data.localMileAcceptedAt,
          customerSource: data.customerSource || data.source || data.leadSource,
          visitNoteID: data.visitNoteID,
          cancellationTheme: data.cancellationTheme,
          cancellationThemeId: data.cancellationThemeId,
          cancellationCategory: data.cancellationCategory,
          cancellationWhyId: data.cancellationWhyId,
          cancellationReason: data.cancellationReason,
          cancellationReasonId: data.cancellationReasonId,
          cancellationdate: data.cancellationdate,
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          attribution: data.attribution,
          marketingChannel: data.marketingChannel || data.attribution?.channel,
          posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
          isDuplicate: data.isDuplicate,
          ignoreDuplicateWarning: data.ignoreDuplicateWarning,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
          currentCarrier: data.currentCarrier,
          marketingLists: data.marketingLists,
          hasCreatedJob: data.hasCreatedJob,
          jobCount: data.jobCount,
          lastLocalMileJobCreatedAt: data.lastLocalMileJobCreatedAt,
          localMileTrialsRemaining: data.localMileTrialsRemaining,
          localMileTermsAccepted: data.localMileTermsAccepted,
          localMileTermsAcceptedAt: data.localMileTermsAcceptedAt,
          localMileTnCAcceptedAt: data.localMileTnCAcceptedAt,
          activeJourneys: data.activeJourneys || [],
          parentLeadId: data.parentLeadId,
          multiSiteLocations: data.multiSiteLocations,
          weeklyParcels: data.weeklyParcels,
          prospectPlusId: data.prospectPlusId || data.prospectplusId || data.prospect_plus_id || data.customerEntityId || data.entityId || data.internalid || data.salesRecordInternalId,
          quoteSentAt: data.quoteSentAt,
          signedUpAt: data.signedUpAt,
          scfAcceptedAt: data.scfAcceptedAt,
          trialStartedAt: data.trialStartedAt,
          isExported: data.isExported || false,
          exportedAt: data.exportedAt,
          exportedBy: data.exportedBy,
          exportedToCompany: data.exportedToCompany,
          exportBatchId: data.exportBatchId,
          exportHistory: data.exportHistory || [],
          lpoPlusStatus: data.lpoPlusStatus,
          lpoPlusProvisionedAt: data.lpoPlusProvisionedAt,
          lpoPlusPasswordResetAt: data.lpoPlusPasswordResetAt,
          defaultPassword: data.defaultPassword,
        };
        
        if (includeSubCollections) {
            const [contacts, activities, emails, notes, transcripts, tasks, appointments, invoices, bucketHistory, companyInsights, additionalAddresses, scfs] = await Promise.all([
                getSubCollection<Contact>('companies', companyId, 'contacts', documentId()),
                getSubCollection<Activity>('companies', companyId, 'activity', 'date'),
                getSubCollection<EmailRecord>('companies', companyId, 'emails', 'sentAt', 'desc'),
                getSubCollection<Note>('companies', companyId, 'notes', 'date'),
                getSubCollection<Transcript>('companies', companyId, 'transcripts', 'date'),
                getSubCollection<Task>('companies', companyId, 'tasks', 'dueDate', 'asc'),
                getSubCollection<Appointment>('companies', companyId, 'appointments', 'duedate'),
                getSubCollection<Invoice>('companies', companyId, 'invoices', 'invoiceDate', 'desc'),
                getSubCollection<any>('companies', companyId, 'bucket_history', 'date', 'desc'),
                getSubCollection<CompanyInsight>('companies', companyId, 'company_insights', 'scannedAt', 'desc'),
                getSubCollection<TaggedAddress>('companies', companyId, 'addresses', documentId()),
                getSubCollection<any>('companies', companyId, 'scfs', documentId())
            ]);

            let finalCompanyContacts = contacts;
            if (contacts.length === 0 && (data.contactName || data.contactEmail || data.contactPhone)) {
                const legacyName = typeof data.contactName === 'string' && data.contactName.trim().toLowerCase() !== 'n/a' ? data.contactName.trim() : '';
                const legacyEmail = typeof data.contactEmail === 'string' && data.contactEmail.trim().toLowerCase() !== 'n/a' ? data.contactEmail.trim() : '';
                const legacyPhone = typeof data.contactPhone === 'string' && data.contactPhone.trim().toLowerCase() !== 'n/a' ? data.contactPhone.trim() : '';
                if (legacyName || legacyEmail || legacyPhone) {
                    finalCompanyContacts = [{
                        id: 'legacy-primary-contact',
                        name: legacyName || 'Primary Contact',
                        email: legacyEmail,
                        phone: legacyPhone,
                        isPrimary: true
                    } as Contact];
                }
            }

            transformedCompany.contacts = finalCompanyContacts;
            transformedCompany.activity = activities;
            transformedCompany.emails = emails;
            transformedCompany.notes = notes;
            transformedCompany.transcripts = transcripts;
            transformedCompany.tasks = tasks;
            transformedCompany.appointments = appointments;
            transformedCompany.invoices = invoices;
            transformedCompany.contactCount = finalCompanyContacts.length;
            transformedCompany.bucketHistory = bucketHistory;
            transformedCompany.companyInsights = companyInsights;
            transformedCompany.additionalAddresses = additionalAddresses;
            transformedCompany.scfs = scfs;
        }

        return transformedCompany;
    } catch (error) {
        console.error(`Firebase fetch failed for company ${companyId}:`, error);
        return null;
    }
}

async function getLeadsFromFirebase(options?: { leadId?: string, leadIds?: string[], summary?: boolean, dialerAssigned?: string, franchisee?: string, includeDuplicates?: boolean }): Promise<Lead[]> {
  const { leadId, leadIds, summary = false, dialerAssigned, franchisee, includeDuplicates = false } = options || {};
  
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
        .filter((doc) => !doc.id.startsWith('fran-training-') && (includeDuplicates || !doc.data().isDuplicate))
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
          internalid: data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.salesRecordInternalId || '')),
          internalId: data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.salesRecordInternalId || '')),
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: data.companyName || data.company || data.name || data.customerName || 'Unknown Company',
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A lead for ${data.companyName}.`,
          address: address,
          postalAddress: data.postalAddress,
          billingAddressType: data.billingAddressType,
          billingAddress: data.billingAddress,
          sofLink: data.sofLink,
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
          assignedToDialerAt: data.assignedToDialerAt,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          abn: data.abn,
          contactCount: data.contactCount || 0,
          aiScore: data.aiScore,
          aiReason: data.aiReason,
          discoveryData: data.discoveryData,
          companyDescription: data.companyDescription,
          // Enrichment Fields (BR - BZ)
          lodgementEvidence: data.lodgementEvidence || data.discoveryData?.lodgementEvidence,
          prospectSummary: data.prospectSummary || data.discoveryData?.prospectSummary,
          shipperEvidence: data.shipperEvidence || data.discoveryData?.shipperEvidence,
          shopifyDetected: data.shopifyDetected || data.discoveryData?.shopifyDetected,
          xeroDetected: data.xeroDetected || data.discoveryData?.xeroDetected,
          apRelationship: data.apRelationship || data.discoveryData?.apRelationship,
          suggestedProduct: data.suggestedProduct || data.discoveryData?.suggestedProduct,
          suggestedOpener: data.suggestedOpener || data.discoveryData?.suggestedOpener,
          suggestedPersonalisation: data.suggestedPersonalisation || data.discoveryData?.suggestedPersonalisation,
          leadType: data.leadType,
          demoCompleted: data.demoCompleted,
          fieldSales: data.fieldSales,
          services: data.services || [],
          lastProspected: data.lastProspected,
          dateLeadEntered: data.dateLeadEntered,
          dateRegistrationSent: data.dateRegistrationSent,
          registrationSentAt: data.registrationSentAt,
          localMileRegistrationSentAt: data.localMileRegistrationSentAt,
          dateLocalmileAccepted: data.dateLocalmileAccepted,
          localMileAcceptedAt: data.localMileAcceptedAt,
          customerSource: data.customerSource || data.source || data.leadSource,
          visitNoteID: data.visitNoteID,
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          attribution: data.attribution,
          marketingChannel: data.marketingChannel || data.attribution?.channel,
          posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
          isDuplicate: data.isDuplicate,
          ignoreDuplicateWarning: data.ignoreDuplicateWarning,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
          currentCarrier: data.currentCarrier,
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
          followUpDate: data.followUpDate,
          selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
          inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
          pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
          prospectPlusId: data.prospectPlusId || data.prospectplusId || data.prospect_plus_id || data.customerEntityId || data.entityId || data.internalid || data.salesRecordInternalId,
          cancellationTheme: data.cancellationTheme,
          cancellationThemeId: data.cancellationThemeId,
          cancellationCategory: data.cancellationCategory,
          cancellationWhyId: data.cancellationWhyId,
          cancellationReason: data.cancellationReason,
          cancellationReasonId: data.cancellationReasonId,
          cancellationdate: data.cancellationdate || data.cancellationDate,
          cancellationDate: data.cancellationDate || data.cancellationdate,
          serviceCancelledOnDate: data.serviceCancelledOnDate,
          serviceCancelledBy: data.serviceCancelledBy,
        } as Lead;
      });

      if (!summary) {
          const BATCH_SIZE = 15;
          const leadsWithContacts: Lead[] = [];
          for (let i = 0; i < leads.length; i += BATCH_SIZE) {
              const batch = leads.slice(i, i + BATCH_SIZE);
              const batchResults = await Promise.all(
                  batch.map(async (lead) => {
                      try {
                          const contacts = await getSubCollection<Contact>('leads', lead.id, 'contacts', documentId());
                          return { ...lead, contacts, contactCount: contacts.length };
                      } catch (err) {
                          console.warn(`Failed to fetch contacts for lead ${lead.id}:`, err);
                          return lead;
                      }
                  })
              );
              leadsWithContacts.push(...batchResults);
          }
          return leadsWithContacts;
      }

      return leads;
  } catch (error) {
    console.error("Firebase fetch failed:", error);
    return [];
  }
}

function subscribeLeadsFromFirebase(
  callback: (leads: Lead[]) => void,
  options?: { dialerAssigned?: string, franchisee?: string, bucket?: string }
): () => void {
  const { dialerAssigned, franchisee, bucket } = options || {};

  let leadsQuery = query(collection(firestore, 'leads'));
  if (dialerAssigned) leadsQuery = query(leadsQuery, where('dialerAssigned', '==', dialerAssigned));
  if (franchisee) leadsQuery = query(leadsQuery, where('franchisee', '==', franchisee));
  if (bucket) leadsQuery = query(leadsQuery, where('bucket', '==', bucket));

  return onSnapshot(leadsQuery, (snapshot) => {
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
          internalid: data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.salesRecordInternalId || '')),
          internalId: data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.salesRecordInternalId || '')),
          entityId: data['customerEntityId'] || data['entityId'] || '',
          salesRecordInternalId: data.salesRecordInternalId,
          companyName: data.companyName || 'Unknown Company',
          status: safeGetStatus(data.customerStatus),
          customerStatus: data.customerStatus,
          statusReason: data.statusReason,
          profile: `A lead for ${data.companyName}.`,
          address: address,
          postalAddress: data.postalAddress,
          sofLink: data.sofLink,
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
          assignedToDialerAt: data.assignedToDialerAt,
          accountManagerAssigned: data.accountManagerAssigned,
          customerSuccessAssigned: data.customerSuccessAssigned,
          fieldRepAssigned: data.fieldRepAssigned,
          campaign: data.campaign || data.customerCampaign,
          customerServiceEmail: data.customerServiceEmail,
          customerPhone: data.customerPhone,
          abn: data.abn,
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
          dateRegistrationSent: data.dateRegistrationSent,
          registrationSentAt: data.registrationSentAt,
          localMileRegistrationSentAt: data.localMileRegistrationSentAt,
          dateLocalmileAccepted: data.dateLocalmileAccepted,
          localMileAcceptedAt: data.localMileAcceptedAt,
          customerSource: data.customerSource || data.source,
          visitNoteID: data.visitNoteID,
          netsuiteLeadStatus: data.netsuiteLeadStatus,
          bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
          inboundDetails: data.inboundDetails,
          attribution: data.attribution,
          marketingChannel: data.marketingChannel || data.attribution?.channel,
          posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
          isDuplicate: data.isDuplicate,
          ignoreDuplicateWarning: data.ignoreDuplicateWarning,
          similarLeads: data.similarLeads,
          hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
          parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
          currentCarrier: data.currentCarrier,
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
          followUpDate: data.followUpDate,
          selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
          inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
          pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
          prospectPlusId: data.prospectPlusId || data.prospectplusId || data.prospect_plus_id || data.customerEntityId || data.entityId || data.internalid || data.salesRecordInternalId,
          cancellationTheme: data.cancellationTheme,
          cancellationThemeId: data.cancellationThemeId,
          cancellationCategory: data.cancellationCategory,
          cancellationWhyId: data.cancellationWhyId,
          cancellationReason: data.cancellationReason,
          cancellationReasonId: data.cancellationReasonId,
          cancellationdate: data.cancellationdate || data.cancellationDate,
          cancellationDate: data.cancellationDate || data.cancellationdate,
          serviceCancelledOnDate: data.serviceCancelledOnDate,
          serviceCancelledBy: data.serviceCancelledBy,
        } as Lead;
      });
    callback(leads);
  }, (error) => {
    console.error("Firestore onSnapshot subscription failed:", error);
  });
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
                    internalid: data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.salesRecordInternalId || '')),
                    internalId: data.internalId !== undefined && data.internalId !== null ? String(data.internalId) : (data.internalid !== undefined && data.internalid !== null ? String(data.internalid) : (data.salesRecordInternalId || '')),
                    entityId: data['customerEntityId'] || data['entityId'] || '',
                    salesRecordInternalId: data.salesRecordInternalId,
                    companyName: data.companyName || data.company || data.name || data.customerName || 'Unknown Company',
                    status: safeGetStatus(data.customerStatus),
                    customerStatus: data.customerStatus,
                    profile: `A company profile for ${data.companyName || 'Unknown Company'}.`,
                    address: address,
                    postalAddress: data.postalAddress,
                    sofLink: data.sofLink,
                    sofDetails: data.sofDetails,
                    latitude: isNaN(lat) ? undefined : lat,
                    longitude: isNaN(lng) ? undefined : lng,
                    franchisee: data.franchisee,
                    websiteUrl: data.websiteUrl === 'null' ? undefined : data.websiteUrl,
                    industryCategory: data.industryCategory,
                    customerServiceEmail: data.customerServiceEmail,
                    customerPhone: data.customerPhone,
                    abn: data.abn,
                    salesRepAssigned: data.salesRepAssigned,
                    dialerAssigned: data.dialerAssigned,
                    assignedToDialerAt: data.assignedToDialerAt,
                    accountManagerAssigned: data.accountManagerAssigned,
                    customerSuccessAssigned: data.customerSuccessAssigned,
                    fieldRepAssigned: data.fieldRepAssigned,
                    fieldSales: data.fieldSales,
                    services: data.services || [],
                    lastProspected: data.lastProspected,
                    dateLeadEntered: data.dateLeadEntered,
                    dateRegistrationSent: data.dateRegistrationSent,
                    registrationSentAt: data.registrationSentAt,
                    localMileRegistrationSentAt: data.localMileRegistrationSentAt,
                    dateLocalmileAccepted: data.dateLocalmileAccepted,
                    localMileAcceptedAt: data.localMileAcceptedAt,
                    customerSource: data.customerSource || data.source || data.leadSource,
                    visitNoteID: data.visitNoteID,
                    netsuiteLeadStatus: data.netsuiteLeadStatus,
                    bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                    inboundDetails: data.inboundDetails,
                    attribution: data.attribution,
                    marketingChannel: data.marketingChannel || data.attribution?.channel,
                    posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
                    isDuplicate: data.isDuplicate,
                    ignoreDuplicateWarning: data.ignoreDuplicateWarning,
                    similarLeads: data.similarLeads,
                    hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                    parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
                    currentCarrier: data.currentCarrier,
                    marketingLists: data.marketingLists,
                    activeJourneys: data.activeJourneys || [],
                    selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
                    inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
                    pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
                    prospectPlusId: data.prospectPlusId || data.prospectplusId || data.prospect_plus_id || data.customerEntityId || data.entityId || data.internalid || data.salesRecordInternalId,
                    cancellationTheme: data.cancellationTheme,
                    cancellationThemeId: data.cancellationThemeId,
                    cancellationCategory: data.cancellationCategory,
                    cancellationWhyId: data.cancellationWhyId,
                    cancellationReason: data.cancellationReason,
                    cancellationReasonId: data.cancellationReasonId,
                    cancellationdate: data.cancellationdate || data.cancellationDate,
                    cancellationDate: data.cancellationDate || data.cancellationdate,
                    serviceCancelledOnDate: data.serviceCancelledOnDate,
                    serviceCancelledBy: data.serviceCancelledBy,
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
        const archivedStatusesForQuery: (LeadStatus | 'Signed')[] = ['Lost', 'Qualified', 'Won', 'LPO Review', 'LPO Opportunity', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate', 'Signed', 'LocalMile Pending', 'LocalMile Opportunity', 'Free Trial', 'Prospect Opportunity', 'Customer Opportunity', 'Email Brush Off', 'Lost Customer', 'In Qualification', 'Quote Sent', 'Quote Accepted', 'Future Follow-up', 'Appointment Booked', 'LocalMile Trial Stopped', 'ShipMate Trial Stopped'];
        
        let q = query(collection(firestore, 'leads'), where('customerStatus', 'in', archivedStatusesForQuery));
        if (franchisee) q = query(q, where('franchisee', '==', franchisee));
        
        const snapshot = await getDocs(q);
        const leads: Lead[] = snapshot.docs.map((doc) => {
            const data = sanitizeData(doc.data() || {});
            return {
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
                sofLink: data.sofLink,
                sofDetails: data.sofDetails,
                franchisee: data.franchisee,
                dialerAssigned: data.dialerAssigned,
                assignedToDialerAt: data.assignedToDialerAt,
                salesRepAssigned: data.salesRepAssigned,
                accountManagerAssigned: data.accountManagerAssigned,
                customerSuccessAssigned: data.customerSuccessAssigned,
                fieldRepAssigned: data.fieldRepAssigned,
                industryCategory: data.industryCategory,
                abn: data.abn,
                discoveryData: data.discoveryData,
                fieldSales: data.fieldSales,
                services: data.services || [],
                lastProspected: data.lastProspected,
                dateLeadEntered: data.dateLeadEntered,
                dateRegistrationSent: data.dateRegistrationSent,
                registrationSentAt: data.registrationSentAt,
                localMileRegistrationSentAt: data.localMileRegistrationSentAt,
                dateLocalmileAccepted: data.dateLocalmileAccepted,
                localMileAcceptedAt: data.localMileAcceptedAt,
                customerSource: data.customerSource || data.source,
                visitNoteID: data.visitNoteID,
                bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                inboundDetails: data.inboundDetails,
                attribution: data.attribution,
                marketingChannel: data.marketingChannel || data.attribution?.channel,
                posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
                isDuplicate: data.isDuplicate,
                ignoreDuplicateWarning: data.ignoreDuplicateWarning,
                similarLeads: data.similarLeads,
                hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
                currentCarrier: data.currentCarrier,
                marketingLists: data.marketingLists,
                activeJourneys: data.activeJourneys || [],
                selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
                inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
                pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
            };
        });

        return leads.sort((a, b) => {
            const dateA = a.lastProspected ? new Date(a.lastProspected).getTime() : 0;
            const dateB = b.lastProspected ? new Date(b.lastProspected).getTime() : 0;
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
                assignedToDialerAt: data.assignedToDialerAt,
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
                sofLink: data.sofLink,
                sofDetails: data.sofDetails,
                abn: data.abn,
                campaign: data.campaign || data.customerCampaign,
                leadType: data.leadType,
                demoCompleted: data.demoCompleted,
                franchisee: data.franchisee,
                fieldSales: data.fieldSales === true,
                activity: [],
                lastProspected: data.lastProspected,
                dateLeadEntered: data.dateLeadEntered,
                dateRegistrationSent: data.dateRegistrationSent,
                registrationSentAt: data.registrationSentAt,
                localMileRegistrationSentAt: data.localMileRegistrationSentAt,
                dateLocalmileAccepted: data.dateLocalmileAccepted,
                localMileAcceptedAt: data.localMileAcceptedAt,
                customerSource: data.customerSource || data.source,
                visitNoteID: data.visitNoteID,
                netsuiteLeadStatus: data.netsuiteLeadStatus,
                bucket: data.bucket || (data.fieldSales ? 'field_sales' : 'outbound'),
                inboundDetails: data.inboundDetails,
                attribution: data.attribution,
                marketingChannel: data.marketingChannel || data.attribution?.channel,
                posthogSessionUrl: data.posthogSessionUrl || data.attribution?.posthogSessionUrl || (data.attribution?.posthogSessionId ? `https://us.posthog.com/project/108577/replay/${data.attribution.posthogSessionId}` : undefined),
                isDuplicate: data.isDuplicate,
                ignoreDuplicateWarning: data.ignoreDuplicateWarning,
                similarLeads: data.similarLeads,
                hasMyPostBusinessAccount: data.hasMyPostBusinessAccount,
                parcelVolumeGreaterThan20: data.parcelVolumeGreaterThan20,
                currentCarrier: data.currentCarrier,
                marketingLists: data.marketingLists,
                activeJourneys: data.activeJourneys || [],
                selectedServiceOption: data.selectedServiceOption || data.selectedService || data.interestedIn,
                inboundPageUrl: data.inboundPageUrl || data.pageUrl || data.pageURL || data.inboundDetails?.landingPage || data.attribution?.landingPage || data.sourcePageUrl,
                pageURL: data.pageURL || data.inboundPageUrl || data.pageUrl,
            } as Lead;
        });
    } catch (error) {
        console.error("Failed to fetch leads for report:", error);
        return [];
    }
}

async function getSubCollection<T>(
    parentCollection: string, 
    docId: string, 
    subCollectionName: string, 
    orderByField: string | FieldPath, 
    orderDirection: 'asc' | 'desc' = 'desc'
): Promise<T[]> {
    try {
        const ref = collection(firestore, parentCollection, docId, subCollectionName);
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => {
            const data = sanitizeData(doc.data() || {});
            if (subCollectionName === 'invoices' && (!data.invoiceType || data.invoiceType === '- None -')) {
                data.invoiceType = 'Service';
            }
            return { id: doc.id, ...data } as T;
        });

        if (orderByField) {
            const field = typeof orderByField === 'string' ? orderByField : 'id';
            items.sort((a: any, b: any) => {
                const valA = a[field];
                const valB = b[field];
                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
                if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    } catch (error) {
        console.error(`Error in getSubCollection for ${parentCollection}/${docId}/${subCollectionName}:`, error);
        return [];
    }
}

async function getAllCallActivities(startDate?: string, endDate?: string): Promise<any[]> {
    try {
        let q = query(
            collectionGroup(firestore, 'activity'),
            where('type', '==', 'Call')
        );

        if (startDate) {
            q = query(q, where('date', '>=', startDate));
        }
        if (endDate) {
            q = query(q, where('date', '<=', endDate));
        }

        q = query(q, orderBy('date', 'desc'));

        let activitySnapshot;
        try {
            activitySnapshot = await getDocs(q);
        } catch (idxError: any) {
            console.warn('[getAllCallActivities] Query with index failed, falling back to client-side date filter:', idxError.message);
            // Fallback in case index is still building or not present: query type='Call' and filter date in memory
            const fallbackQuery = query(collectionGroup(firestore, 'activity'), where('type', '==', 'Call'));
            const fallbackSnap = await getDocs(fallbackQuery);
            const filteredDocs = fallbackSnap.docs.filter(doc => {
                const data = doc.data() as Activity;
                if (startDate && data.date < startDate) return false;
                if (endDate && data.date > endDate) return false;
                return true;
            });
            activitySnapshot = { docs: filteredDocs };
        }

        const callActivityDocs = activitySnapshot.docs;
        if (callActivityDocs.length === 0) return [];

        const leadIds = [...new Set(callActivityDocs.map(doc => doc.ref.parent.parent!.id))];
        const leadsData: Record<string, Lead> = {};
        
        // Fetch from leads collection
        for (let i = 0; i < leadIds.length; i += 30) {
            const chunk = leadIds.slice(i, i + 30);
            const leadsQuery = query(collection(firestore, 'leads'), where(documentId(), 'in', chunk));
            const leadsSnapshot = await getDocs(leadsQuery);
            leadsSnapshot.forEach(doc => {
                leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
            });
        }

        // Fetch from companies collection for any missing IDs
        const missingIds = leadIds.filter(id => !leadsData[id]);
        if (missingIds.length > 0) {
            for (let i = 0; i < missingIds.length; i += 30) {
                const chunk = missingIds.slice(i, i + 30);
                const companiesQuery = query(collection(firestore, 'companies'), where(documentId(), 'in', chunk));
                const companiesSnapshot = await getDocs(companiesQuery);
                companiesSnapshot.forEach(doc => {
                    leadsData[doc.id] = sanitizeData(doc.data()) as Lead;
                });
            }
        }
        
        // Fetch bucket history and activities for each lead in parallel
        const bucketHistories: Record<string, any[]> = {};
        const leadActivities: Record<string, any[]> = {};
        await Promise.all(leadIds.map(async (leadId) => {
            bucketHistories[leadId] = [];
            leadActivities[leadId] = [];
            
            // Bucket history fetch
            try {
                const historySnap = await getDocs(query(
                    collection(firestore, 'leads', leadId, 'bucket_history')
                ));
                historySnap.forEach(doc => {
                    bucketHistories[leadId].push(sanitizeData(doc.data()));
                });
            } catch (err) {
                try {
                    const historySnap = await getDocs(query(
                        collection(firestore, 'companies', leadId, 'bucket_history')
                    ));
                    historySnap.forEach(doc => {
                        bucketHistories[leadId].push(sanitizeData(doc.data()));
                    });
                } catch (cErr) {
                    // Ignore
                }
            }

            // Lead activities fetch
            try {
                const activitySnap = await getDocs(query(
                    collection(firestore, 'leads', leadId, 'activities')
                ));
                activitySnap.forEach(doc => {
                    leadActivities[leadId].push(sanitizeData(doc.data()));
                });
            } catch (err) {
                try {
                    const activitySnap = await getDocs(query(
                        collection(firestore, 'companies', leadId, 'activities')
                    ));
                    activitySnap.forEach(doc => {
                        leadActivities[leadId].push(sanitizeData(doc.data()));
                    });
                } catch (cErr) {
                    // Ignore
                }
            }
        }));
        
        const rawCalls = callActivityDocs.map(activityDoc => {
            const activityData = sanitizeData(activityDoc.data()) as Activity;
            const leadId = activityDoc.ref.parent.parent?.id;
            if (!leadId || !leadsData[leadId]) return null;

            const history = bucketHistories[leadId] || [];
            const transitions = history
                .filter((h: any) => h.date && new Date(h.date).getTime() > new Date(activityData.date).getTime())
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const nextTransition = transitions[0];

            // Resolve status transitions
            const activities = leadActivities[leadId] || [];
            const statusChanges = activities
                .map(act => {
                    if (!act.notes) return null;
                    const match = act.notes.match(/Status changed to ([^(]+)/);
                    return match && match[1] ? { status: match[1].trim() as LeadStatus, date: act.date } : null;
                })
                .filter((a): a is { status: LeadStatus; date: string } => a !== null)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const timeline: { status: LeadStatus; date: Date }[] = [];
            const enteredDate = new Date(leadsData[leadId].dateLeadEntered || activityData.date);
            timeline.push({ status: 'New', date: enteredDate });
            
            statusChanges.forEach(sc => {
                if (timeline.length === 0 || timeline[timeline.length - 1].status !== sc.status) {
                    timeline.push({ status: sc.status, date: new Date(sc.date) });
                }
            });
            const currentStatus = (leadsData[leadId].customerStatus || leadsData[leadId].status || 'New') as LeadStatus;
            if (timeline.length === 0 || timeline[timeline.length - 1].status !== currentStatus) {
                timeline.push({ status: currentStatus, date: new Date() });
            }

            let statusAtCall: LeadStatus = 'New';
            const callTime = new Date(activityData.date).getTime();
            for (let i = 0; i < timeline.length; i++) {
                if (timeline[i].date.getTime() <= callTime) {
                    statusAtCall = timeline[i].status;
                } else {
                    break;
                }
            }

            let nextStatus: LeadStatus | undefined = undefined;
            for (let i = 0; i < timeline.length; i++) {
                if (timeline[i].date.getTime() > callTime) {
                    if (timeline[i].status !== statusAtCall) {
                        nextStatus = timeline[i].status;
                        break;
                    }
                }
            }

            const sortedHistory = [...history].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let bucketAtCall = '';
            const pastTransitions = sortedHistory.filter((h: any) => h.date && new Date(h.date).getTime() <= callTime);
            if (pastTransitions.length > 0) {
                bucketAtCall = pastTransitions[pastTransitions.length - 1].newBucket;
            } else if (sortedHistory.length > 0) {
                bucketAtCall = sortedHistory[0].oldBucket;
            } else {
                bucketAtCall = leadsData[leadId].bucket || (leadsData[leadId].fieldSales ? 'field_sales' : 'outbound');
            }
            if (!bucketAtCall) {
                bucketAtCall = leadsData[leadId].bucket || (leadsData[leadId].fieldSales ? 'field_sales' : 'outbound');
            }

            return {
                ...activityData,
                id: activityDoc.id,
                leadId: leadId,
                prospectPlusId: leadsData[leadId].prospectPlusId || leadId,
                leadName: leadsData[leadId].companyName || 'Unknown Lead',
                leadStatus: currentStatus,
                dialerAssigned: leadsData[leadId].dialerAssigned || 'Unassigned',
                accountManagerAssigned: leadsData[leadId].accountManagerAssigned || 'Unassigned',
                leadBucket: bucketAtCall,
                movedFromBucket: nextTransition ? nextTransition.oldBucket : undefined,
                movedToBucket: nextTransition ? nextTransition.newBucket : undefined,
                movedFromStatus: nextStatus ? statusAtCall : undefined,
                movedToStatus: nextStatus,
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
        console.error('Failed to fetch call activities:', error);
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
        const apptQuery = query(collectionGroup(firestore, 'appointments'));
        const appointmentsSnapshot = await getDocs(apptQuery);
        let filteredDocs = appointmentsSnapshot.docs;

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate).getTime() : -Infinity;
            const end = endDate ? new Date(endDate).getTime() : Infinity;
            filteredDocs = filteredDocs.filter(doc => {
                const data = doc.data();
                const dateStr = data.date || data.duedate || data.appointmentDate || data.createdAt;
                if (!dateStr) return true;
                const time = new Date(dateStr).getTime();
                if (isNaN(time)) return true;
                return time >= start && time <= end;
            });
        }

        const leadIds = [...new Set(filteredDocs.map(doc => doc.ref.parent.parent!.id))];
        if (leadIds.length === 0) return [];

        const leadsData: Record<string, Lead> = {};
        const leadsChunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 30) {
            leadsChunks.push(leadIds.slice(i, i + 30));
        }
        const leadsSnapshots = await Promise.all(
            leadsChunks.map(chunk => getDocs(query(collection(firestore, 'leads'), where(documentId(), 'in', chunk))))
        );
        leadsSnapshots.forEach(snap => {
            snap.forEach(doc => { leadsData[doc.id] = sanitizeData(doc.data()) as Lead; });
        });

        const missingIds = leadIds.filter(id => !leadsData[id]);
        if (missingIds.length > 0) {
            const compChunks: string[][] = [];
            for (let i = 0; i < missingIds.length; i += 30) {
                compChunks.push(missingIds.slice(i, i + 30));
            }
            const compSnapshots = await Promise.all(
                compChunks.map(chunk => getDocs(query(collection(firestore, 'companies'), where(documentId(), 'in', chunk))))
            );
            compSnapshots.forEach(snap => {
                snap.forEach(doc => { leadsData[doc.id] = sanitizeData(doc.data()) as Lead; });
            });
        }

        return filteredDocs.map(doc => {
            const data = sanitizeData(doc.data()) as any;
            const leadId = doc.ref.parent.parent!.id;
            const lead = leadsData[leadId];
            return {
                ...data,
                id: doc.id,
                leadId,
                prospectPlusId: lead?.prospectPlusId || leadId,
                leadName: (data.isTraining || data.type === 'Teams Training Session')
                    ? (data.leadName || 'Prospect+ Training x Aleyna')
                    : (lead?.companyName || (data.leadName && data.leadName !== 'Unknown Lead' ? data.leadName : 'Prospect+ Training x Aleyna')),
                dialerAssigned: lead?.dialerAssigned,
                leadStatus: (lead?.customerStatus || lead?.status) as LeadStatus,
                discoveryData: lead?.discoveryData,
            };
        }).filter(a => !!a.leadId).sort((a, b) => new Date(a.duedate).getTime() - new Date(b.duedate).getTime());
    } catch (error) {
        return [];
    }
}

async function addContactToLead(leadId: string, contact: Omit<Contact, 'id'>, collectionName: 'leads' | 'companies' = 'leads'): Promise<string> {
  try {
    if (contact.isPrimary) {
      const contactsRef = collection(firestore, collectionName, leadId, 'contacts');
      const q = query(contactsRef, where('isPrimary', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { isPrimary: false });
      });
      await batch.commit();
    }

    const contactsRef = collection(firestore, collectionName, leadId, 'contacts');
    const docRef = await addDoc(contactsRef, prepareForFirestore({ ...contact, syncedWithNetSuite: false }));
    
    await logActivity(leadId, { type: 'Update', notes: `New contact added: ${contact.name}${contact.isPrimary ? ' (Primary Contact)' : ''}` }, collectionName);
    const parentRef = doc(firestore, collectionName, leadId);
    const parentDoc = await getDoc(parentRef);
    await updateDoc(parentRef, { contactCount: (parentDoc.data()?.contactCount || 0) + 1 });
    
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
    const now = new Date().toISOString();
    const updateData: any = { [updateField]: dialerRep === null ? deleteField() : dialerRep };
    if (!isInbound && dialerRep !== null) {
      updateData.assignedToDialerAt = now;
    }
    await updateDoc(doc(firestore, 'leads', leadId), updateData);
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

async function updateLeadStatus(
    leadId: string, 
    status: LeadStatus, 
    reason?: string,
    options?: { source?: string; isDataManagement?: boolean }
): Promise<void> {
    try {
        const updates: any = { customerStatus: status, statusReason: reason || '' };
        const now = new Date().toISOString();
        const colName = await getLeadOrCompanyCollection(leadId);
        const leadRef = doc(firestore, colName, leadId);
        let leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists() && colName === 'companies') {
            const altRef = doc(firestore, 'leads', leadId);
            const altSnap = await getDoc(altRef);
            if (altSnap.exists()) leadSnap = altSnap;
        }
        const leadData = leadSnap.exists() ? leadSnap.data() : {};
        const currentBucket = leadData?.bucket || (leadData?.fieldSales ? 'field_sales' : 'outbound');

        if (status === 'Quote Sent') {
            updates.quoteSentAt = now;
        } else if (status === 'Won') {
            updates.signedUpAt = now;
        } else if (['Trialing ShipMate', 'Trialing LocalMile', 'Free Trial'].includes(status)) {
            updates.trialStartedAt = now;
        } else if (status === 'LocalMile Opportunity') {
            updates.trialStartedAt = now;
            if (currentBucket !== 'outbound') {
                updates.bucket = 'account_manager';
            }
        } else if (status === 'LocalMile Pending') {
            updates.bucket = 'account_manager';
        }
        await updateDoc(leadRef, updates);

        // Synchronize status across LPO Parent and Child leads hierarchy
        const isLpoLeadProcess = Boolean(
            leadData?.isParentLead ||
            leadData?.isChildLead ||
            leadData?.bucket === 'lpo_network' ||
            leadData?.source === 'LPO Lead Conversion' ||
            leadData?.leadSource === 'LPO Expressions of Interest' ||
            leadData?.lpoLeadId ||
            leadData?.parentLeadId
        );

        if (isLpoLeadProcess) {
            try {
                const syncPayload: any = {
                    status: status,
                    customerStatus: status,
                    statusReason: reason || '',
                    updatedAt: new Date()
                };
                if (updates.quoteSentAt) syncPayload.quoteSentAt = updates.quoteSentAt;
                if (updates.signedUpAt) syncPayload.signedUpAt = updates.signedUpAt;
                if (updates.scfAcceptedAt) syncPayload.scfAcceptedAt = updates.scfAcceptedAt;
                if (updates.trialStartedAt) syncPayload.trialStartedAt = updates.trialStartedAt;

                let parentIdToSync = leadData?.isParentLead ? leadId : leadData?.parentLeadId;
                
                if (!parentIdToSync && !leadData?.isParentLead) {
                    const qFindParent = query(collection(firestore, 'leads'), where('createdChildLeadIds', 'array-contains', leadId));
                    const pSnap = await getDocs(qFindParent);
                    if (!pSnap.empty) parentIdToSync = pSnap.docs[0].id;
                }

                if (parentIdToSync) {
                    if (parentIdToSync !== leadId) {
                        await updateDoc(doc(firestore, 'leads', parentIdToSync), syncPayload).catch(err => console.warn('Parent lead status sync warning:', err));
                    }

                    const qChild = query(collection(firestore, 'leads'), where('parentLeadId', '==', parentIdToSync));
                    const childSnap = await getDocs(qChild);
                    for (const childDoc of childSnap.docs) {
                        if (childDoc.id !== leadId) {
                            await updateDoc(doc(firestore, 'leads', childDoc.id), syncPayload).catch(err => console.warn('Child lead status sync warning:', err));
                        }
                    }
                }
            } catch (syncErr) {
                console.warn('Error syncing LPO lead status across hierarchy:', syncErr);
            }
        }

        const isDataMgmt = options?.isDataManagement || options?.source === 'data_management' || (reason && reason.toLowerCase().includes('data management'));
        let logNotes = reason ? `Status changed to ${status} (Reason: ${reason})` : `Status changed to ${status}`;
        if (isDataMgmt) {
            logNotes = `Status changed to ${status} via Data Management${reason ? ` (${reason})` : ''}`;
        } else if (status === 'LocalMile Pending') {
            logNotes += ' - Moved to Account Manager';
        }
        await logActivity(leadId, { 
            type: 'Update', 
            notes: logNotes,
            ...(isDataMgmt ? { source: 'data_management', isDataManagement: true, isAutomated: true } : {})
        });

        if (status === 'Won' || (status as string) === 'Signed') {
            try {
                await duplicateLeadToCompanies(leadId);
            } catch (err) {
                console.error("Failed to duplicate lead to companies on status Won/Signed:", err);
            }
        } else if (status === 'Lost' || (status as string) === 'Lost Customer') {
            try {
                await deactivateLocalMileAccessForLead(leadId);
            } catch (err) {
                console.error("Failed to deactivate LocalMile access on status Lost/Lost Customer:", err);
            }
        }
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

async function logCallActivity(
    leadId: string, 
    callData: { outcome: string; notes: string; author: string; salesRecordInternalId?: string; userRole?: string; }
): Promise<LeadStatus | undefined> {
    const { status, reason: outcomeReason } = REVERSE_OUTCOME_TO_STATUS_MAP[callData.outcome] || {};
    const notesToLog = `Outcome: ${callData.outcome}${outcomeReason ? ` (${outcomeReason})` : ''}. Notes: ${callData.notes || 'N/A'}`;

    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    const leadData = leadSnap.exists() ? leadSnap.data() : {};
    const currentStatus = leadData?.customerStatus || leadData?.status;

    const callerRole = (callData.userRole || 'user').toLowerCase().trim();
    const dialerRoles = ['dialer', 'dialers', 'lead gen', 'lead_gen', 'leadgen', 'user'];
    const isDialer = dialerRoles.includes(callerRole);

    const isLocalMileOpp = currentStatus === 'LocalMile Opportunity' && isDialer;

    // Special logic for "Prospect - No Access/No Contact" processing
    if (callData.outcome === 'Prospect - No Access/No Contact' && !isLocalMileOpp) {
        try {
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
                        logActivity(leadId, { type: 'Update', notes: notesToLog, author: callData.author }),
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
    if (callData.outcome === 'Unqualified Opportunity' && !isLocalMileOpp) {
        try {
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
                            logActivity(leadId, { type: 'Update', notes: notesToLog, author: callData.author }),
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

    // Prevent changing status if lead is in a protected state ('Won', 'Signed', or 'LocalMile Opportunity' for dialers), unless outcome is Lost
    const protectedStatuses = ['Won', 'Signed', ...(isDialer ? ['LocalMile Opportunity'] : [])];
    
    const isLostStatus = status === 'Lost' || status === 'Lost Customer' || (status && status.toLowerCase().includes('lost')) || (callData.outcome && callData.outcome.toLowerCase().includes('lost'));
    const shouldUpdateStatus = status && (!currentStatus || !protectedStatuses.includes(currentStatus) || isLostStatus);

    // Special handling for Appointment Booked outcome: transition bucket to account_manager
    if (callData.outcome === 'Appointment Booked') {
        try {
            const currentBucket = leadData?.bucket || (leadData?.fieldSales ? 'field_sales' : 'outbound');
            if (currentBucket !== 'account_manager') {
                const nowIso = new Date().toISOString();
                const bucketHistoryEntry = {
                    id: `bh-${Date.now()}`,
                    oldBucket: currentBucket,
                    newBucket: 'account_manager',
                    date: nowIso,
                    author: callData.author || 'System'
                };
                await updateDoc(leadRef, {
                    bucket: 'account_manager',
                    bucketHistory: arrayUnion(bucketHistoryEntry)
                });
                await logActivity(leadId, {
                    type: 'Update',
                    notes: `Lead moved to Account Manager bucket after logging outcome Appointment Booked.`,
                    author: callData.author
                });
            }
        } catch (e) {
            console.error("Error updating bucket to account_manager on Appointment Booked:", e);
        }
    }

    await Promise.all([
        logActivity(leadId, { type: 'Update', notes: notesToLog, author: callData.author }),
        updateDoc(leadRef, { attemptCount: increment(1), totalCalls: increment(1) }).catch(err => console.warn('Could not increment attemptCount on lead:', err)),
        shouldUpdateStatus ? updateLeadStatus(leadId, status, outcomeReason) : Promise.resolve()
    ]);
    
    return shouldUpdateStatus ? status : currentStatus;
}

async function logCsCallActivity(
    leadId: string, 
    callData: { outcome: string; notes: string; author: string; salesRecordInternalId?: string; },
    collectionName: 'leads' | 'companies' = 'leads'
): Promise<void> {
    const nowStr = new Date().toISOString();
    const leadRef = doc(firestore, collectionName, leadId);
    
    const csCallEntry = {
        outcome: callData.outcome,
        notes: callData.notes || '',
        author: callData.author || 'System',
        date: nowStr,
        salesRecordInternalId: callData.salesRecordInternalId || '',
        isCustomerSuccess: true
    };

    const notesToLog = `[CS Outcome] ${callData.outcome}. Notes: ${callData.notes || 'N/A'}`;

    const csCallsRef = collection(firestore, collectionName, leadId, 'cs_calls');

    await Promise.all([
        addDoc(csCallsRef, prepareForFirestore(csCallEntry)).catch(err => console.warn('Could not add to cs_calls subcollection:', err)),
        logActivity(leadId, { type: 'Update', notes: notesToLog, author: callData.author }, collectionName),
        updateDoc(leadRef, {
            csCalled: true,
            lastCsContactedDate: nowStr,
            lastCsOutcome: callData.outcome,
            lastCsNotes: callData.notes || '',
            lastCsAuthor: callData.author || '',
            csCallCount: increment(1),
            csOutcomeHistory: arrayUnion(csCallEntry)
        }).catch(err => console.warn('Could not update CS fields on lead:', err))
    ]);
}

async function logNoteActivity(leadId: string, noteData: { content: string; author: string, date: string }, collectionName: 'leads' | 'companies' = 'leads'): Promise<void> {
    await addDoc(collection(firestore, collectionName, leadId, 'notes'), { ...noteData, syncedWithNetSuite: false });
    await logActivity(leadId, { type: 'Update', notes: `Note added: ${noteData.content.substring(0, 100)}...`, date: noteData.date }, collectionName);

    try {
        const leadRef = doc(firestore, collectionName, leadId);
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
            const lData = leadSnap.data() || {};
            const targetParentId = lData.createdParentLeadId || lData.parentLeadId || lData.linkedLeadId || leadId;
            const lpoId = lData.lpoLeadId || lData.linkedLpoLeadId;

            const lpoIdsToUpdate = new Set<string>();
            if (lpoId) lpoIdsToUpdate.add(lpoId);

            if (targetParentId) {
                const q1 = query(collection(firestore, 'lpo_leads'), where('createdParentLeadId', '==', targetParentId));
                const s1 = await getDocs(q1);
                s1.docs.forEach(d => lpoIdsToUpdate.add(d.id));

                const q2 = query(collection(firestore, 'lpo_leads'), where('linkedLeadId', '==', targetParentId));
                const s2 = await getDocs(q2);
                s2.docs.forEach(d => lpoIdsToUpdate.add(d.id));
            }

            const q3 = query(collection(firestore, 'lpo_leads'), where('createdChildLeadIds', 'array-contains', leadId));
            const s3 = await getDocs(q3);
            s3.docs.forEach(d => lpoIdsToUpdate.add(d.id));

            for (const resolvedLpoId of Array.from(lpoIdsToUpdate)) {
                await addDoc(collection(firestore, 'lpo_leads', resolvedLpoId, 'activity'), {
                    type: 'Note',
                    notes: `Note added on Lead (${lData.companyName || leadId}): ${noteData.content}`,
                    author: noteData.author || 'System User',
                    createdAt: noteData.date || new Date().toISOString()
                });
            }
        }
    } catch (err) {
        console.warn('Could not sync note to linked lpo_leads:', err);
    }
}

async function updateNoteActivity(leadId: string, noteId: string, content: string, collectionName: 'leads' | 'companies' = 'leads'): Promise<void> {
    const noteRef = doc(firestore, collectionName, leadId, 'notes', noteId);
    await updateDoc(noteRef, { content, syncedWithNetSuite: false });
    await logActivity(leadId, { type: 'Update', notes: `Note edited: ${content.substring(0, 100)}...` }, collectionName);
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

async function updateContactInLead(leadId: string, contactId: string, contactData: Partial<Omit<Contact, 'id'>>, collectionName: 'leads' | 'companies' = 'leads'): Promise<void> {
    if (contactData.isPrimary) {
      const contactsRef = collection(firestore, collectionName, leadId, 'contacts');
      const q = query(contactsRef, where('isPrimary', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
      snap.docs.forEach(docSnap => {
        if (docSnap.id !== contactId) {
          batch.update(docSnap.ref, { isPrimary: false });
        }
      });
      await batch.commit();
    }
    await updateDoc(doc(firestore, collectionName, leadId, 'contacts', contactId), prepareForFirestore({ ...contactData, syncedWithNetSuite: false }));
    await logActivity(leadId, { type: 'Update', notes: `Contact updated: ${contactData.name || ''}` }, collectionName);
}

async function deleteContactFromLead(leadId: string, contactId: string, contactName: string, collectionName: 'leads' | 'companies' = 'leads'): Promise<void> {
    await deleteDoc(doc(firestore, collectionName, leadId, 'contacts', contactId));
    await logActivity(leadId, { type: 'Update', notes: `Contact ${contactName} deleted.` }, collectionName);
    const parentRef = doc(firestore, collectionName, leadId);
    const snap = await getDoc(parentRef);
    await updateDoc(parentRef, { contactCount: (snap.data()?.contactCount || 0) - 1 });
}

async function updateLeadDetails(leadId: string, oldLead: Lead | MapLead, newLeadData: Partial<Lead>): Promise<void> {
    const col = await getLeadOrCompanyCollection(leadId, oldLead);
    const dataToSave = { ...newLeadData };
    const statusVal = newLeadData.customerStatus || newLeadData.status;
    const now = new Date().toISOString();
    const currentBucket = (oldLead as any).bucket || ((oldLead as any).fieldSales ? 'field_sales' : 'outbound');
    if (statusVal) {
        if (statusVal === 'Quote Sent') {
            dataToSave.quoteSentAt = now;
        } else if (statusVal === 'Won') {
            dataToSave.signedUpAt = now;
        } else if (['Trialing ShipMate', 'Trialing LocalMile', 'LocalMile Opportunity', 'Free Trial'].includes(statusVal)) {
            dataToSave.trialStartedAt = now;
            if (statusVal === 'LocalMile Opportunity') {
                if (!dataToSave.dateRegistrationSent) dataToSave.dateRegistrationSent = now;
                if (!dataToSave.registrationSentAt) dataToSave.registrationSentAt = now;
                if (currentBucket !== 'outbound') {
                    dataToSave.bucket = 'account_manager';
                }
            }
        } else if (statusVal === 'LocalMile Pending') {
            dataToSave.bucket = 'account_manager';
            if (!dataToSave.dateLocalmileAccepted) dataToSave.dateLocalmileAccepted = now;
            if (!dataToSave.localMileAcceptedAt) dataToSave.localMileAcceptedAt = now;
        }
    }
    if (newLeadData.dialerAssigned !== undefined && newLeadData.dialerAssigned !== (oldLead as any).dialerAssigned) {
        dataToSave.assignedToDialerAt = now;
    }
    await updateDoc(doc(firestore, col, leadId), prepareForFirestore(dataToSave));
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

async function addTaskToLead(leadId: string, taskData: { title: string; dueDate: string; author: string; durationMinutes?: number; outlookEventId?: string }): Promise<Task> {
    const leadSnap = await getDoc(doc(firestore, 'leads', leadId));
    const newTask = { ...taskData, dialerAssigned: leadSnap.data()?.dialerAssigned || null, isCompleted: false, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(firestore, 'leads', leadId, 'tasks'), prepareForFirestore(newTask));
    return { ...newTask, id: docRef.id } as Task;
}

async function updateTaskInLead(leadId: string, taskId: string, updates: Partial<Task>): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'tasks', taskId), prepareForFirestore(updates));
}

async function updateTaskCompletion(leadId: string, taskId: string, isCompleted: boolean): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'tasks', taskId), { isCompleted, completedAt: isCompleted ? new Date().toISOString() : null });
}

async function deleteTaskFromLead(leadId: string, taskId: string): Promise<void> {
    await deleteDoc(doc(firestore, 'leads', leadId, 'tasks', taskId));
}

function isLostLeadStatus(status?: string | null): boolean {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return (
        s === 'lost' ||
        s === 'lost customer' ||
        s.includes('lost') ||
        s === 'unqualified' ||
        s === 'email brush off' ||
        s === 'out of territory'
    );
}

async function getPendingItemsForLead(leadId: string, leadInState?: Partial<Lead>): Promise<{
    pendingAppointments: Appointment[];
    pendingTasks: Task[];
}> {
    let appts: Appointment[] = [];
    let tasks: Task[] = [];

    if (leadInState?.appointments && Array.isArray(leadInState.appointments) && leadInState.appointments.length > 0) {
        appts = leadInState.appointments;
    } else {
        appts = await getSubCollection<Appointment>('leads', leadId, 'appointments', 'duedate');
    }

    if (leadInState?.tasks && Array.isArray(leadInState.tasks) && leadInState.tasks.length > 0) {
        tasks = leadInState.tasks;
    } else {
        tasks = await getSubCollection<Task>('leads', leadId, 'tasks', 'dueDate', 'asc');
    }

    const pendingAppointments = appts.filter(a => {
        const s = a.appointmentStatus || 'Pending';
        return s !== 'Completed' && s !== 'Cancelled' && s !== 'No Show';
    });

    const pendingTasks = tasks.filter(t => !t.isCompleted);

    return { pendingAppointments, pendingTasks };
}

async function resolvePendingItemsForLead(
    leadId: string,
    appointmentResolutions: Array<{ id: string; status: AppointmentStatus; notes?: string }>,
    taskResolutions: Array<{ id: string; action: 'complete' | 'cancel' | 'keep' }>,
    author: string = 'System'
): Promise<void> {
    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    const leadData = leadSnap.exists() ? leadSnap.data() : {};
    let existingAppts: Appointment[] = leadData?.appointments || [];

    // Process Appointment Updates
    for (const apptRes of appointmentResolutions) {
        const apptRef = doc(firestore, 'leads', leadId, 'appointments', apptRes.id);
        const updates: any = {
            appointmentStatus: apptRes.status,
            updatedAt: new Date().toISOString()
        };
        if (apptRes.notes?.trim()) {
            updates.notes = apptRes.notes.trim();
        }
        await setDoc(apptRef, updates, { merge: true });

        existingAppts = existingAppts.map(a => a.id === apptRes.id ? { ...a, ...updates } : a);

        await logActivity(leadId, {
            type: 'Update',
            notes: `Appointment status updated to ${apptRes.status}${apptRes.notes?.trim() ? `: ${apptRes.notes.trim()}` : ''}`,
            author
        });
    }

    if (appointmentResolutions.length > 0 && leadData?.appointments) {
        await updateDoc(leadRef, { appointments: existingAppts });
    }

    // Process Task Updates
    for (const taskRes of taskResolutions) {
        if (taskRes.action === 'complete') {
            await updateTaskCompletion(leadId, taskRes.id, true);
            await logActivity(leadId, {
                type: 'Update',
                notes: `Task marked as completed on lead lost status change.`,
                author
            });
        } else if (taskRes.action === 'cancel') {
            await deleteTaskFromLead(leadId, taskRes.id);
            await logActivity(leadId, {
                type: 'Update',
                notes: `Task cancelled/deleted on lead lost status change.`,
                author
            });
        }
    }
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

async function updateScorecardAnalysis(leadId: string, scorecardId: string, analysis: any): Promise<void> {
    await updateDoc(doc(firestore, 'leads', leadId, 'scorecards', scorecardId), { analysis });
}

async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(firestore, 'users'));
    return snap.docs.map(doc => ({ ...sanitizeData(doc.data()), uid: doc.id, displayName: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim() || doc.data().email } as UserProfile));
}

async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
    await updateDoc(doc(firestore, 'users', uid), prepareForFirestore(data));
}

async function deleteUserCompletely(uid: string, requestorUid: string): Promise<void> {
    const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, requestorUid }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete user completely.');
    }
}

async function unlinkUserFromFranchiseeCompletely(uid: string, franchiseeId?: string, requestorUid?: string): Promise<void> {
    const response = await fetch('/api/admin/users/unlink-franchisee', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, franchiseeId, requestorUid }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to unlink user from franchisee.');
    }
}



async function addAdditionalAddress(leadId: string, address: Omit<TaggedAddress, 'id'>, isCompany: boolean): Promise<string> {
    const colName = isCompany ? 'companies' : 'leads';
    const ref = collection(firestore, colName, leadId, 'addresses');
    const docRef = await addDoc(ref, prepareForFirestore({
        ...address,
        createdAt: new Date().toISOString()
    }));
    return docRef.id;
}

async function updateAdditionalAddress(leadId: string, addressId: string, address: Partial<TaggedAddress>, isCompany: boolean): Promise<void> {
    const colName = isCompany ? 'companies' : 'leads';
    const ref = doc(firestore, colName, leadId, 'addresses', addressId);
    await updateDoc(ref, prepareForFirestore(address));
}

async function deleteAdditionalAddress(leadId: string, addressId: string, isCompany: boolean): Promise<void> {
    const colName = isCompany ? 'companies' : 'leads';
    const ref = doc(firestore, colName, leadId, 'addresses', addressId);
    await deleteDoc(ref);
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
    const now = new Date().toISOString();
    leadIds.forEach((id, i) => {
        const rep = newDialerReps[i % newDialerReps.length];
        const updateData: any = { [updateField]: rep === null ? deleteField() : rep };
        if (!isInbound && rep !== null) {
            updateData.assignedToDialerAt = now;
        }
        batch.update(doc(firestore, 'leads', id), updateData);
    });
    await batch.commit();
}

async function addLeadsToMarketingList(leadIds: string[], listName: string, author: string, noteText: string, keepBucket: boolean = false): Promise<void> {
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
        const leadRef = doc(firestore, 'leads', id);
        if (keepBucket) {
            batch.update(leadRef, { 
                marketingLists: arrayUnion(listName)
            });
        } else {
            batch.update(leadRef, { 
                marketingLists: arrayUnion(listName),
                bucket: 'marketing'
            });
            addBucketChangeToBatch(batch, id, oldBuckets[id] || 'unknown', 'marketing', author);
        }

        // Add note to lead's notes subcollection
        const noteRef = doc(collection(firestore, 'leads', id, 'notes'));
        batch.set(noteRef, {
            content: noteText,
            author,
            date: new Date().toISOString(),
            syncedWithNetSuite: false
        });

        // Log Update activity with the note
        const activityRef = doc(collection(firestore, 'leads', id, 'activity'));
        batch.set(activityRef, prepareForFirestore({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `Added to marketing list: ${listName}. Note: ${noteText}`,
            author
        }));
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
    try {
        const snap = await getDocs(collection(firestore, 'leads', leadId, 'notes'));
        if (snap.empty) return null;
        const notes = snap.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as Note);
        notes.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });
        return notes[0];
    } catch (err) {
        console.error(`Failed to get last note for lead ${leadId}:`, err);
        return null;
    }
}

async function getLastActivity(leadId: string): Promise<Activity | null> {
    try {
        const snap = await getDocs(collection(firestore, 'leads', leadId, 'activity'));
        if (snap.empty) return null;
        const activities = snap.docs.map(doc => sanitizeData({ id: doc.id, ...doc.data() }) as Activity);
        activities.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });
        return activities[0];
    } catch (err) {
        console.error(`Failed to get last activity for lead ${leadId}:`, err);
        return null;
    }
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
    const colName = await getLeadOrCompanyCollection(id);
    const leadRef = doc(firestore, colName, id);
    await updateDoc(leadRef, { services: s, updatedAt: new Date() });
}

async function updateLeadCommReg(id: string, commRegId: string, dynamicScfUrl: string): Promise<void> {
    const colName = await getLeadOrCompanyCollection(id);
    const leadRef = doc(firestore, colName, id);
    await updateDoc(leadRef, { 
        commRegId, 
        dynamicScfUrl, 
        updatedAt: new Date() 
    });
}

async function updateUserRoute(uid: string, rid: string, data: any): Promise<void> {
    await updateDoc(doc(firestore, 'users', uid, 'routes', rid), prepareForFirestore(data));
}

async function bulkMoveLeadsToNurtureCampaign(
    leadIds: string[], 
    journeyId: string, 
    author: string, 
    noteText: string,
    keepBucket: boolean = false
): Promise<void> {
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
        
        if (keepBucket) {
            batch.update(leadRef, {
                activeJourneys: arrayUnion(journeyId)
            });
        } else {
            batch.update(leadRef, {
                bucket: 'nurture',
                fieldSales: false,
                activeJourneys: arrayUnion(journeyId)
            });
            addBucketChangeToBatch(batch, leadId, oldBuckets[leadId] || 'unknown', 'nurture', author);
        }

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

        // Add note to lead's notes subcollection
        const noteRef = doc(collection(firestore, 'leads', leadId, 'notes'));
        batch.set(noteRef, {
            content: noteText,
            author,
            date: nowStr,
            syncedWithNetSuite: false
        });

        const activityRef = doc(collection(firestore, 'leads', leadId, 'activity'));
        batch.set(activityRef, prepareForFirestore({
            type: 'Update',
            date: nowStr,
            notes: keepBucket
                ? `Enrolled in nurture campaign '${journeyName}'. Note: ${noteText}`
                : `Moved to Nurture bucket and enrolled in campaign '${journeyName}'. Note: ${noteText}`,
            author
        }));
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

async function bulkReassignLeads(
    leadIds: string[],
    newBucket: string,
    assignmentMap: Record<string, string>,
    author: string,
    leadCurrentBuckets?: Record<string, string>
): Promise<void> {
    const chunkSize = 450;
    for (let i = 0; i < leadIds.length; i += chunkSize) {
        const chunk = leadIds.slice(i, i + chunkSize);
        const batch = writeBatch(firestore);
        
        chunk.forEach(id => {
            const updateData: any = { bucket: newBucket };
            if (newBucket === 'outbound') updateData.dialerAssigned = assignmentMap[id] || '';
            if (newBucket === 'field_sales') updateData.fieldRepAssigned = assignmentMap[id] || '';
            if (newBucket === 'inbound') updateData.salesRepAssigned = assignmentMap[id] || '';
            if (newBucket === 'account_manager') updateData.accountManagerAssigned = assignmentMap[id] || '';
            if (newBucket === 'customer_success') updateData.customerSuccessAssigned = assignmentMap[id] || '';
            
            batch.update(doc(firestore, 'leads', id), updateData);
            const oldBucket = leadCurrentBuckets?.[id] || 'unassigned';
            addBucketChangeToBatch(batch, id, oldBucket, newBucket, author);
        });
        await batch.commit();
    }
}

async function markLeadsAsExported(
    leadIds: string[],
    exportedToCompany: string,
    authorName: string,
    authorUid: string,
    notes?: string
): Promise<{ batchId: string; leadCount: number }> {
    const exportedAt = new Date().toISOString();
    const batchId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const chunkSize = 450;
    for (let i = 0; i < leadIds.length; i += chunkSize) {
        const chunk = leadIds.slice(i, i + chunkSize);
        const batch = writeBatch(firestore);
        
        for (const id of chunk) {
            const leadRef = doc(firestore, 'leads', id);
            const entry = { exportedAt, exportedBy: authorName, exportedToCompany, batchId };
            batch.update(leadRef, {
                isExported: true,
                exportedAt,
                exportedBy: authorName,
                exportedToCompany,
                exportBatchId: batchId,
                exportHistory: arrayUnion(entry)
            });
        }
        await batch.commit();
    }

    await addDoc(collection(firestore, 'lead_export_batches'), {
        batchId,
        exportedToCompany,
        exportedBy: authorName,
        exportedByUid: authorUid,
        leadCount: leadIds.length,
        exportedAt,
        leadIds,
        notes: notes || ''
    });

    return { batchId, leadCount: leadIds.length };
}


async function deleteLeadsByCampaign(c: string): Promise<void> {
    const snap = await getDocs(query(collection(firestore, 'leads'), where('customerCampaign', '==', c)));
    const batch = writeBatch(firestore);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

async function updateContactSendEmail(id: string, cid: string): Promise<void> {
    const colName = await getLeadOrCompanyCollection(id);
    const contactRef = doc(firestore, colName, id, 'contacts', cid);
    const snap = await getDoc(contactRef);
    if (snap.exists()) {
        await updateDoc(contactRef, { sendEmail: 'yes' });
    } else {
        const altCol = colName === 'companies' ? 'leads' : 'companies';
        const altRef = doc(firestore, altCol, id, 'contacts', cid);
        if ((await getDoc(altRef)).exists()) {
            await updateDoc(altRef, { sendEmail: 'yes' });
        }
    }
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
    return mergeMultipleLeads(masterLeadId, [duplicateLeadId]);
}

async function mergeMultipleLeads(targetLeadId: string, sourceLeadIds: string[]): Promise<void> {
    const batch = writeBatch(firestore);
    let totalContactsCount = 0;
    const validSourceLeadIds = sourceLeadIds.filter(id => id && id !== targetLeadId);

    if (validSourceLeadIds.length === 0) return;
    
    for (const sourceLeadId of validSourceLeadIds) {
        const sourceRef = doc(firestore, 'leads', sourceLeadId);
        const sourceSnap = await getDoc(sourceRef);
        if (!sourceSnap.exists()) continue;
        
        // Fetch subcollections from source
        const [
            contacts,
            activity,
            emails,
            notes,
            transcripts,
            tasks,
            appointments,
            invoices,
            bucketHistory,
            companyInsights,
            addresses,
            scorecards
        ] = await Promise.all([
            getSubCollection<any>('leads', sourceLeadId, 'contacts', documentId()),
            getSubCollection<any>('leads', sourceLeadId, 'activity', 'date'),
            getSubCollection<any>('leads', sourceLeadId, 'emails', 'sentAt', 'desc'),
            getSubCollection<any>('leads', sourceLeadId, 'notes', 'date'),
            getSubCollection<any>('leads', sourceLeadId, 'transcripts', 'date'),
            getSubCollection<any>('leads', sourceLeadId, 'tasks', 'dueDate', 'asc'),
            getSubCollection<any>('leads', sourceLeadId, 'appointments', 'duedate'),
            getSubCollection<any>('leads', sourceLeadId, 'invoices', 'invoiceDate', 'desc'),
            getSubCollection<any>('leads', sourceLeadId, 'bucket_history', 'date', 'desc'),
            getSubCollection<any>('leads', sourceLeadId, 'company_insights', 'scannedAt', 'desc'),
            getSubCollection<any>('leads', sourceLeadId, 'addresses', documentId()),
            getSubCollection<any>('leads', sourceLeadId, 'scorecards', 'createdAt')
        ]);
        
        totalContactsCount += contacts.length;
        
        contacts.forEach(c => {
            const { id, ...data } = c;
            batch.set(doc(firestore, 'leads', targetLeadId, 'contacts', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        activity.forEach(a => {
            const { id, ...data } = a;
            batch.set(doc(firestore, 'leads', targetLeadId, 'activity', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        emails.forEach(e => {
            const { id, ...data } = e;
            batch.set(doc(firestore, 'leads', targetLeadId, 'emails', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        notes.forEach(n => {
            const { id, ...data } = n;
            batch.set(doc(firestore, 'leads', targetLeadId, 'notes', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        transcripts.forEach(t => {
            const { id, ...data } = t;
            batch.set(doc(firestore, 'leads', targetLeadId, 'transcripts', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        tasks.forEach(t => {
            const { id, ...data } = t;
            batch.set(doc(firestore, 'leads', targetLeadId, 'tasks', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        appointments.forEach(ap => {
            const { id, ...data } = ap;
            batch.set(doc(firestore, 'leads', targetLeadId, 'appointments', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        invoices.forEach(i => {
            const { id, ...data } = i;
            batch.set(doc(firestore, 'leads', targetLeadId, 'invoices', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        bucketHistory.forEach(bh => {
            const { id, ...data } = bh;
            batch.set(doc(firestore, 'leads', targetLeadId, 'bucket_history', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        companyInsights.forEach(ci => {
            const { id, ...data } = ci;
            batch.set(doc(firestore, 'leads', targetLeadId, 'company_insights', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        addresses.forEach(ad => {
            const { id, ...data } = ad;
            batch.set(doc(firestore, 'leads', targetLeadId, 'addresses', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        scorecards.forEach(sc => {
            const { id, ...data } = sc;
            batch.set(doc(firestore, 'leads', targetLeadId, 'scorecards', `${id}-${sourceLeadId}`), prepareForFirestore(data));
        });
        
        batch.delete(sourceRef);
    }
    
    // Master main collection fields remain unchanged; update only duplicate metadata flags and contact count
    batch.update(doc(firestore, 'leads', targetLeadId), {
        isDuplicate: false,
        similarLeads: [],
        contactCount: increment(totalContactsCount)
    });
    
    const mergeLog = {
        type: 'Update',
        notes: `Leads merged. Transferred subcollections from duplicate leads: ${validSourceLeadIds.join(', ')}. Master main lead fields preserved.`,
        date: new Date().toISOString()
    };
    batch.set(doc(firestore, 'leads', targetLeadId, 'activity', `merge-${Date.now()}`), prepareForFirestore(mergeLog));
    
    await batch.commit();
}

async function getAllTasks(): Promise<Task[]> {
    const snapshot = await getDocs(collectionGroup(firestore, 'tasks'));
    return snapshot.docs.map(doc => ({ ...sanitizeData(doc.data()), id: doc.id } as Task));
}

async function getAllFranchisees(): Promise<import('@/lib/types').Franchisee[]> {
    try {
        const snapshot = await getDocs(collection(firestore, 'franchisees'));
        const list = snapshot.docs.map(doc => {
            const data = doc.data() || {};
            return {
                id: doc.id,
                internalId: data.internalId || data.prospectPlusId || data.id || doc.id,
                ...data
            } as import('@/lib/types').Franchisee;
        });
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
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

export async function findFranchiseeForAddress(city: string, state: string, zip: string): Promise<{ name: string; internalId: string; isMultiple?: boolean }> {
    try {
        const snap = await getDocs(collection(firestore, 'franchisees'));
        const franchisees = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const leadCity = city?.toLowerCase().trim();
        const leadState = state?.toLowerCase().trim();
        const leadZip = zip?.toLowerCase().trim();
        
        if (!leadCity && !leadZip) return { name: 'MailPlus Pty Ltd', internalId: '435' };

        const matches = franchisees.filter(f => {
            const checkTerritory = (tList: any[]) => {
                if (!Array.isArray(tList)) return false;
                return tList.some((t: any) => {
                    const subStr = (t.suburbs || t.suburb || '').toLowerCase();
                    const subMatch = leadCity && (
                        subStr === leadCity ||
                        subStr.includes(leadCity) ||
                        subStr.split(',').map((s: string) => s.trim()).includes(leadCity)
                    );
                    const stateMatch = !leadState || !t.state || t.state.toLowerCase().trim() === leadState;
                    const zipMatch = !leadZip || String(t.post_code || t.postcode || '').toLowerCase().trim() === leadZip;

                    if (leadZip && leadCity) {
                        return zipMatch && subMatch && stateMatch;
                    }
                    if (leadZip) {
                        return zipMatch && stateMatch;
                    }
                    return subMatch && stateMatch;
                });
            };

            const inTerritory = checkTerritory(f.territoryJson);
            const inAusPost = checkTerritory(f.ausPostSuburbsJson);
            return inTerritory || inAusPost;
        });

        if (matches.length >= 1) {
            const matchedFranchisee = matches[0];
            const franchiseeName = matchedFranchisee.name || matchedFranchisee.franchiseeName || 'MailPlus Pty Ltd';
            const franchiseeId = matchedFranchisee.internalId || matchedFranchisee.id || '435';
            return {
                name: franchiseeName,
                internalId: String(franchiseeId),
                isMultiple: matches.length > 1
            };
        }

        return { name: 'MailPlus Pty Ltd', internalId: '435' };
    } catch (error) {
        console.error("Failed to find franchisee for address:", error);
        return { name: 'MailPlus Pty Ltd', internalId: '435' };
    }
}

async function createChildSiteLead(
    parentLeadId: string,
    companyName: string,
    siteAddress: Address,
    localManager: Contact,
    copiedContacts: Contact[],
    notes?: string,
    authorName?: string,
    companyEmail?: string,
    companyPhone?: string,
    customFranchisee?: { name: string; internalId: string }
): Promise<string> {
    // 1. Find Franchisee based on suburb, state & postcode or custom override
    const franchiseeInfo = (customFranchisee && customFranchisee.name)
        ? customFranchisee
        : await findFranchiseeForAddress(siteAddress.city, siteAddress.state, siteAddress.zip);
    const franchiseeName = franchiseeInfo.name;
    const franchiseeInternalId = franchiseeInfo.internalId;
    
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

    // Resolve Account Manager for UID AR2TfLJJCAQBUVf4IxHa6P3AKqG2
    let targetAmName = MULTISITE_ACCOUNT_MANAGER_UID;
    try {
        const amSnap = await getDoc(doc(firestore, 'users', MULTISITE_ACCOUNT_MANAGER_UID));
        if (amSnap.exists()) {
            const amData = amSnap.data();
            targetAmName = amData.displayName || `${amData.firstName || ''} ${amData.lastName || ''}`.trim() || MULTISITE_ACCOUNT_MANAGER_UID;
        }
    } catch (e) {
        console.warn("Could not fetch Account Manager user doc in createChildSiteLead", e);
    }

    const resolvedCustomerPhone = companyPhone || localManager.phone || parentLeadData.customerPhone || '';
    const resolvedCustomerEmail = companyEmail || localManager.email || parentLeadData.customerServiceEmail || '';

    // 3. Push to NetSuite (NetSuite will create the lead and return NetSuite internalId)
    const netSuitePayload = {
        companyName: companyName,
        websiteUrl: parentLeadData.websiteUrl || '',
        customerPhone: resolvedCustomerPhone,
        customerServiceEmail: resolvedCustomerEmail,
        abn: parentLeadData.abn || '',
        industryCategory: parentLeadData.industryCategory || '',
        campaign: parentLeadData.campaign || 'Multi-Site Child',
        address: siteAddress,
        contact: {
            firstName: localManager.name?.split(' ')[0] || '',
            lastName: localManager.name?.split(' ').slice(1).join(' ') || '',
            title: localManager.title || 'Local Site Contact',
            email: localManager.email || '',
            phone: localManager.phone || ''
        },
        franchiseeName: franchiseeName,
        franchiseeInternalId: franchiseeInternalId,
        parentLeadId: parentLeadId,
        parentId: parentLeadId,
        parentCustomer: parentLeadId,
        dialerAssigned: parentLeadData.dialerAssigned || '',
        bucket: 'multisite',
        accountManagerUid: MULTISITE_ACCOUNT_MANAGER_UID,
        assignedTo: MULTISITE_ACCOUNT_MANAGER_UID,
    };
    
    const nsResult = await sendNewLeadToNetSuite(netSuitePayload);
    
    if (!nsResult || !nsResult.success || !nsResult.leadId) {
        throw new Error(nsResult?.message || "Failed to create child lead in NetSuite.");
    }
    
    const newLeadId = String(nsResult.leadId);

    // 4. Link the child lead to the parent lead using setDoc with merge
    const childLeadPayload: any = { 
        parentLeadId: parentLeadId,
        franchisee: franchiseeName || 'MailPlus Pty Ltd',
        franchiseeName: franchiseeName || 'MailPlus Pty Ltd',
        franchisee_id: franchiseeInternalId || '435',
        franchiseeInternalId: franchiseeInternalId || '435',
        salesRecordInternalId: newLeadId,
        address: siteAddress,
        bucket: 'multisite',
        accountManagerUid: MULTISITE_ACCOUNT_MANAGER_UID,
        assignedTo: MULTISITE_ACCOUNT_MANAGER_UID,
        accountManagerAssigned: targetAmName,
        salesRepAssigned: targetAmName,
        customerServiceEmail: resolvedCustomerEmail,
        customerPhone: resolvedCustomerPhone
    };

    if (siteAddress.lat !== undefined && siteAddress.lat !== null) {
        childLeadPayload.latitude = siteAddress.lat;
    }
    if (siteAddress.lng !== undefined && siteAddress.lng !== null) {
        childLeadPayload.longitude = siteAddress.lng;
    }

    await setDoc(doc(firestore, 'leads', newLeadId), prepareForFirestore(childLeadPayload), { merge: true });

    // 5. Log Activity on the new child lead
    const activityRef = collection(firestore, 'leads', newLeadId, 'activity');
    await addDoc(activityRef, prepareForFirestore({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead created as a multi-site child from parent lead ${parentLeadId}.`,
      author: authorName || 'System'
    }));

    // 8. Log initial notes if provided
    if (notes && notes.trim()) {
        try {
            await logNoteActivity(newLeadId, {
                content: notes.trim(),
                author: authorName || 'System',
                date: new Date().toISOString()
            });
        } catch (e) {
            console.warn("Failed to log initial notes on child site lead:", e);
        }
    }

    return newLeadId;
}

async function createScfRecord(leadId: string, data: any): Promise<string> {
    const colName = await getLeadOrCompanyCollection(leadId);
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(firestore, colName, leadId, 'scfs'), prepareForFirestore({
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
        createdBy: data.createdBy || data.createdByName || data.createdByEmail || 'Unknown User'
    }));
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
}

export function isScfSignedOrAccepted(scfData: any): boolean {
    if (!scfData) return false;
    const status = scfData.status || '';
    return status === 'Accepted' || status === 'Signed' || status === 'Quote Accepted' || !!scfData.acceptedAt || !!scfData.signedAt;
}

async function getScfRecord(leadId: string, scfId: string): Promise<any> {
    const colName = await getLeadOrCompanyCollection(leadId);
    const docSnap = await getDoc(doc(firestore, colName, leadId, 'scfs', scfId));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    const altCol = colName === 'companies' ? 'leads' : 'companies';
    const altSnap = await getDoc(doc(firestore, altCol, leadId, 'scfs', scfId));
    if (altSnap.exists()) return { id: altSnap.id, ...altSnap.data() };
    return null;
}

async function getScfRecords(leadId: string): Promise<any[]> {
    const colName = await getLeadOrCompanyCollection(leadId);
    const snap = await getDocs(collection(firestore, colName, leadId, 'scfs'));
    const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (records.length === 0) {
        const altCol = colName === 'companies' ? 'leads' : 'companies';
        const altSnap = await getDocs(collection(firestore, altCol, leadId, 'scfs'));
        return altSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return records;
}

async function updateScfStatus(leadId: string, scfId: string, status: 'Pending' | 'Accepted' | 'Cancelled'): Promise<void> {
    const existing = await getScfRecord(leadId, scfId);
    if (existing && isScfSignedOrAccepted(existing) && status !== existing.status) {
        throw new Error('Signed or accepted Service Commencement Forms cannot be modified or cancelled.');
    }
    const colName = await getLeadOrCompanyCollection(leadId);
    const docRef = doc(firestore, colName, leadId, 'scfs', scfId);
    const docSnap = await getDoc(docRef);
    const targetRef = docSnap.exists() ? docRef : doc(firestore, colName === 'companies' ? 'leads' : 'companies', leadId, 'scfs', scfId);
    await updateDoc(targetRef, { 
        status,
        updatedAt: new Date().toISOString() 
    });
}

async function updateScfRecord(leadId: string, scfId: string, data: any): Promise<void> {
    const existing = await getScfRecord(leadId, scfId);
    if (existing && isScfSignedOrAccepted(existing)) {
        throw new Error('Signed or accepted Service Commencement Forms are locked and cannot be edited.');
    }
    const colName = await getLeadOrCompanyCollection(leadId);
    const docRef = doc(firestore, colName, leadId, 'scfs', scfId);
    const docSnap = await getDoc(docRef);
    const targetRef = docSnap.exists() ? docRef : doc(firestore, colName === 'companies' ? 'leads' : 'companies', leadId, 'scfs', scfId);
    await updateDoc(targetRef, prepareForFirestore({
        ...data,
        updatedAt: new Date().toISOString()
    }));
}

async function updateScfPdfUrl(leadId: string, scfId: string, pdfUrl: string, pdfName?: string, uploadedBy?: string): Promise<void> {
    const now = new Date().toISOString();
    const colName = await getLeadOrCompanyCollection(leadId);
    const docRef = doc(firestore, colName, leadId, 'scfs', scfId);
    const docSnap = await getDoc(docRef);
    const targetRef = docSnap.exists() ? docRef : doc(firestore, colName === 'companies' ? 'leads' : 'companies', leadId, 'scfs', scfId);
    await updateDoc(targetRef, prepareForFirestore({
        uploadedPdfUrl: pdfUrl,
        uploadedPdfName: pdfName || 'SCF_Document.pdf',
        uploadedPdfAt: now,
        uploadedPdfBy: uploadedBy || '',
        updatedAt: now
    }));
}

async function createMultiFranchiseeChildLead(parentLeadId: string, franchiseeName: string, franchiseeId: string): Promise<string> {
    // 1. Fetch Parent Lead Data
    let parentLeadData: any = {};
    const parentDoc = await getDoc(doc(firestore, 'leads', parentLeadId));
    if (parentDoc.exists()) {
        parentLeadData = parentDoc.data();
    } else {
        throw new Error('Parent lead not found.');
    }

    // 2. Fetch Parent Contacts
    const parentContacts = await getLeadContacts(parentLeadId);
    const primaryContact = parentContacts[0] || {};

    const childCompanyName = `${parentLeadData.companyName} - ${franchiseeName}`;

    // 3. Push to NetSuite (NetSuite will create the lead in NetSuite and return leadId)
    const netSuitePayload = {
        companyName: childCompanyName,
        websiteUrl: parentLeadData.websiteUrl || '',
        customerPhone: parentLeadData.customerPhone || '',
        customerServiceEmail: parentLeadData.customerServiceEmail || '',
        abn: parentLeadData.abn || '',
        industryCategory: parentLeadData.industryCategory || '',
        campaign: parentLeadData.campaign || 'Multi-Franchisee Child',
        address: parentLeadData.address || { street: '', city: '', state: '', zip: '', country: 'Australia' },
        contact: {
            firstName: primaryContact.name?.split(' ')[0] || '',
            lastName: primaryContact.name?.split(' ').slice(1).join(' ') || '',
            title: primaryContact.title || 'Contact',
            email: primaryContact.email || '',
            phone: primaryContact.phone || ''
        },
        franchiseeInternalId: franchiseeId,
        franchiseeName: franchiseeName,
        dialerAssigned: parentLeadData.dialerAssigned || '',
    };
    
    const nsResult = await sendNewLeadToNetSuite(netSuitePayload);
    if (!nsResult || !nsResult.success || !nsResult.leadId) {
        throw new Error(nsResult?.message || "Failed to create child lead in NetSuite.");
    }
    
    const newLeadId = String(nsResult.leadId);

    // 4. Create child lead in Firestore
    const childLeadData = {
        ...parentLeadData,
        id: newLeadId,
        companyName: childCompanyName,
        salesRecordInternalId: newLeadId,
        parentLeadId: parentLeadId,
        franchisee: franchiseeName,
        franchisee_id: franchiseeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    // remove subcollections or other references that shouldn't be duplicated in root document fields
    delete childLeadData.contacts;
    delete childLeadData.activity;
    delete childLeadData.notes;
    delete childLeadData.tasks;
    delete childLeadData.appointments;
    delete childLeadData.invoices;

    await setDoc(doc(firestore, 'leads', newLeadId), childLeadData);

    // 5. Copy contacts
    const contactsSubRef = collection(firestore, 'leads', newLeadId, 'contacts');
    for (const contact of parentContacts) {
        const { id, ...contactData } = contact;
        if (contactData.name) {
            await addDoc(contactsSubRef, prepareForFirestore({
                ...contactData,
                createdAt: new Date().toISOString()
            }));
        }
    }

    // 6. Log activity on new child lead
    const activityRef = collection(firestore, 'leads', newLeadId, 'activity');
    await addDoc(activityRef, prepareForFirestore({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Lead created for franchisee "${franchiseeName}" from parent lead ${parentLeadId}.`,
        author: 'System'
    }));

    return newLeadId;
}

async function setupMultiFranchiseeArchitecture(leadId: string, selectedFranchisees: { name: string; id: string }[]): Promise<void> {
    const parentLeadRef = doc(firestore, 'leads', leadId);
    
    // 1. Update the parent lead in Firestore to MailPlus Pty. Ltd (435)
    await updateDoc(parentLeadRef, {
        franchisee: 'MailPlus Pty. Ltd',
        franchisee_id: '435',
        potentialFranchisees: selectedFranchisees.map(f => f.name),
        updatedAt: new Date().toISOString()
    });

    // 2. Sync parent lead update to NetSuite
    const nsResult = await sendLeadUpdateToNetSuite({
        leadId: leadId,
        franchiseeName: 'MailPlus Pty. Ltd',
        franchiseeInternalId: '435'
    });
    if (!nsResult.success) {
        console.warn(`NetSuite parent update warning: ${nsResult.message}`);
    }

    // 3. Log activity on parent lead
    const activityRef = collection(firestore, 'leads', leadId, 'activity');
    await addDoc(activityRef, prepareForFirestore({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Multi-franchisee routing enabled. Assigned to MailPlus Pty. Ltd. Servicing franchisees: ${selectedFranchisees.map(f => f.name).join(', ')}.`,
        author: 'System'
    }));

    // 4. Create child leads
    for (const f of selectedFranchisees) {
        await createMultiFranchiseeChildLead(leadId, f.name, f.id);
    }
}

async function getSiblingLeads(parentLeadId: string): Promise<Lead[]> {
    const qLeads = query(collection(firestore, 'leads'), where('parentLeadId', '==', parentLeadId));
    const qCompanies = query(collection(firestore, 'companies'), where('parentLeadId', '==', parentLeadId));
    const [snapLeads, snapCompanies] = await Promise.all([getDocs(qLeads), getDocs(qCompanies)]);
    
    const leads = snapLeads.docs.map(doc => ({ id: doc.id, ...sanitizeData(doc.data()) } as any as Lead));
    const companies = snapCompanies.docs.map(doc => {
        const data = sanitizeData(doc.data() || {});
        let address = data.address;
        if (!address && (data.street || data.city || data.state || data.zip || data.country)) {
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
            companyName: data.companyName || 'Unknown Company',
            status: safeGetStatus(data.customerStatus),
            customerStatus: data.customerStatus,
            address: address,
            latitude: data.latitude,
            longitude: data.longitude,
            franchisee: data.franchisee,
            abn: data.abn,
            parentLeadId: data.parentLeadId,
            multiSiteLocations: data.multiSiteLocations
        } as Lead;
    });
    
    return [...leads, ...companies];
}

async function duplicateLeadToCompanies(leadId: string): Promise<void> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) {
            console.error(`Lead with ID ${leadId} not found for duplication.`);
            return;
        }
        
        const leadData = leadSnap.data();
        
        // 1. Copy the main document to companies
        const companyRef = doc(firestore, 'companies', leadId);
        await setDoc(companyRef, prepareForFirestore(leadData));
        
        // 2. Define the subcollections to copy
        const subcollections = [
            'contacts',
            'activity',
            'emails',
            'notes',
            'transcripts',
            'tasks',
            'appointments',
            'invoices',
            'addresses',
            'scfs',
            'services',
            'pricing_table',
            'pricing',
            'company_insights',
            'bucket_history'
        ];
        
        // 3. For each subcollection, read all docs from leads and write them to companies
        for (const subName of subcollections) {
            const sourceColRef = collection(firestore, 'leads', leadId, subName);
            const sourceSnap = await getDocs(sourceColRef);
            
            if (!sourceSnap.empty) {
                const destColRef = collection(firestore, 'companies', leadId, subName);
                const batch = writeBatch(firestore);
                sourceSnap.docs.forEach(docSnap => {
                    const destDocRef = doc(destColRef, docSnap.id);
                    batch.set(destDocRef, prepareForFirestore(docSnap.data()));
                });
                await batch.commit();
            }
        }
        console.log(`Successfully duplicated lead ${leadId} to companies collection.`);
    } catch (error) {
        console.error('Error duplicating lead to companies:', error);
        throw error;
    }
}

async function bulkUpdateDialerAssignmentDate(leadIds: string[], newDate: string): Promise<void> {
    const batch = writeBatch(firestore);
    leadIds.forEach(id => {
        batch.update(doc(firestore, 'leads', id), { assignedToDialerAt: newDate });
    });
    await batch.commit();
}

async function getLastInvoiceForCompany(companyId: string): Promise<Invoice | null> {
    if (!companyId) return null;
    try {
        const invoicesRef = collection(firestore, 'companies', companyId, 'invoices');
        const q = query(invoicesRef, orderBy('invoiceDate', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const docSnap = snap.docs[0];
        const data = sanitizeData(docSnap.data() || {});
        return {
            id: docSnap.id,
            documentId: docSnap.id,
            invoiceDocumentID: data.invoiceDocumentID || docSnap.id,
            invoiceInternalID: data.invoiceInternalID || '',
            invoiceDate: data.invoiceDate || '',
            invoiceTotal: data.invoiceTotal != null ? data.invoiceTotal : '0.00',
            invoiceType: data.invoiceType || 'Service Invoice',
            invoiceURL: data.invoiceURL || '',
            invoiceStatus: data.invoiceStatus || data.status || 'Paid In Full',
            syncedWithNetSuite: data.syncedWithNetSuite !== undefined ? Boolean(data.syncedWithNetSuite) : true,
            items: Array.isArray(data.items) ? data.items : [],
        } as Invoice;
    } catch (error) {
        console.error(`Failed to fetch last invoice for company ${companyId}:`, error);
        return null;
    }
}

async function getLastInvoicesForCompanies(companyIds: string[]): Promise<Record<string, Invoice | null>> {
    if (!companyIds || companyIds.length === 0) return {};
    const results: Record<string, Invoice | null> = {};
    const BATCH_SIZE = 15;
    for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
        const batch = companyIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (companyId) => {
                const inv = await getLastInvoiceForCompany(companyId);
                return { companyId, inv };
            })
        );
        batchResults.forEach(({ companyId, inv }) => {
            results[companyId] = inv;
        });
    }
    return results;
}

export { 
    getLastInvoiceForCompany,
    getLastInvoicesForCompanies,
    bulkUpdateDialerAssignmentDate,
    createMultiFranchiseeChildLead,
    setupMultiFranchiseeArchitecture,
    getSiblingLeads,
    bulkAssignUnassignedLeads,
    bulkReassignLeads,
    markLeadsAsExported,
    getLeadsFromFirebase,
    subscribeLeadsFromFirebase,
    getCompaniesFromFirebase,
    getCompanyFromFirebase,
    getArchivedLeads,
    addContactToLead,
    updateLeadSalesRep,
    updateLeadDialerRep,
    updateLeadStatus,
    duplicateLeadToCompanies,
    logCallActivity,
    logCsCallActivity,
    logNoteActivity,
    updateNoteActivity,
    updateContactInLead,
    deleteContactFromLead,
    updateLeadDetails,
    logActivity,
    getLeadFromFirebase,
    addAdditionalAddress,
    updateAdditionalAddress,
    deleteAdditionalAddress,
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
    updateTaskInLead,
    updateTaskCompletion,
    deleteTaskFromLead,
    isLostLeadStatus,
    getPendingItemsForLead,
    resolvePendingItemsForLead,
    updateLeadDiscoveryData,
    updateLeadFieldSales,
    updateLeadCheckinQuestions,
    addScorecard,
    updateScorecardAnalysis,
    getAllUsers,
    updateUser,
    deleteUserCompletely,
    unlinkUserFromFranchiseeCompletely,
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
    mergeMultipleLeads,
    dismissDuplicateWarning,
    getAllFranchisees,
    createChildSiteLead,
    createScfRecord,
    getScfRecord,
    getScfRecords,
    updateScfStatus,
    updateScfRecord,
    updateScfPdfUrl,
    getFranchiseeByName,
    logBucketChange,
    addBucketChangeToBatch,
    addCompanyInsight,
  getCompanyInsights,
    getOperatorsForFranchisee,
    updateFranchiseeCampaigns,
    ensureLeadFranchiseeId,
    generateProspectPlusIdClient,
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

async function dismissDuplicateWarning(leadId: string): Promise<void> {
  try {
    let updated = false;

    // Check leads collection
    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    if (leadSnap.exists()) {
      await updateDoc(leadRef, {
        ignoreDuplicateWarning: true,
        isDuplicate: false,
        similarLeads: []
      });
      const activityRef = doc(firestore, 'leads', leadId, 'activity', `dismiss-dup-${Date.now()}`);
      await setDoc(activityRef, prepareForFirestore({
        type: 'Update',
        notes: 'User marked record as Not a Duplicate (dismissed duplicate warning).',
        date: new Date().toISOString()
      }));
      updated = true;
    }

    // Check companies collection
    const companyRef = doc(firestore, 'companies', leadId);
    const companySnap = await getDoc(companyRef);
    if (companySnap.exists()) {
      await updateDoc(companyRef, {
        ignoreDuplicateWarning: true,
        isDuplicate: false,
        similarLeads: []
      });
      const activityRef = doc(firestore, 'companies', leadId, 'activity', `dismiss-dup-${Date.now()}`);
      await setDoc(activityRef, prepareForFirestore({
        type: 'Update',
        notes: 'User marked record as Not a Duplicate (dismissed duplicate warning).',
        date: new Date().toISOString()
      }));
      updated = true;
    }

    if (!updated) {
      await updateDoc(leadRef, {
        ignoreDuplicateWarning: true,
        isDuplicate: false,
        similarLeads: []
      });
    }
  } catch (error) {
    console.error("Failed to dismiss duplicate warning:", error);
    throw error;
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

async function ensureLeadFranchiseeId(leadId: string, franchiseeName?: string): Promise<string | null> {
    try {
        if (!leadId) return null;
        let leadRef = doc(firestore, 'leads', leadId);
        let leadSnap = await getDoc(leadRef);
        
        // If not found in leads, check companies (Won leads)
        if (!leadSnap.exists()) {
            leadRef = doc(firestore, 'companies', leadId);
            leadSnap = await getDoc(leadRef);
        }

        if (leadSnap.exists()) {
            const data = leadSnap.data();
            if (data.franchisee_id) {
                return data.franchisee_id;
            }
            
            const nameToLookup = franchiseeName || data.franchisee;
            if (nameToLookup && nameToLookup !== 'Unassigned') {
                const franchisee = await getFranchiseeByName(nameToLookup);
                if (franchisee && franchisee.internalId) {
                    await updateDoc(leadRef, { franchisee_id: franchisee.internalId });
                    return franchisee.internalId;
                }
            }
        }
    } catch (error) {
        console.error("Failed to ensure franchisee ID:", error);
    }
    return null;
}

/**
 * Checks whether all leads in an LPO Lead Hierarchy (parent and child leads) are synced with NetSuite.
 */
export async function checkLpoHierarchyNetSuiteSync(leadId: string): Promise<{
    isAllSynced: boolean;
    unsyncedCount: number;
    unsyncedNames: string[];
}> {
    try {
        const leadRef = doc(firestore, 'leads', leadId);
        const leadSnap = await getDoc(leadRef);
        if (!leadSnap.exists()) {
            return { isAllSynced: true, unsyncedCount: 0, unsyncedNames: [] };
        }

        const leadData = leadSnap.data();
        const parentId = leadData.isParentLead ? leadId : (leadData.parentLeadId || leadId);

        const allLeads: { id: string; name: string; isSynced: boolean }[] = [];

        if (parentId) {
            const pRef = doc(firestore, 'leads', parentId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
                const pData = pSnap.data();
                const isSynced = Boolean(pData.syncedWithNetSuite || pData.netsuiteId || pData.internalid);
                allLeads.push({ id: pSnap.id, name: pData.companyName || pData.lpoName || 'Parent Lead', isSynced });
            }
        }

        const qChild = query(collection(firestore, 'leads'), where('parentLeadId', '==', parentId));
        const childSnap = await getDocs(qChild);
        childSnap.docs.forEach(d => {
            const cData = d.data();
            const isSynced = Boolean(cData.syncedWithNetSuite || cData.netsuiteId || cData.internalid);
            if (!allLeads.some(l => l.id === d.id)) {
                allLeads.push({ id: d.id, name: cData.companyName || cData.lpoName || 'Child Lead', isSynced });
            }
        });

        if (leadData.createdChildLeadIds && Array.isArray(leadData.createdChildLeadIds)) {
            for (const childId of leadData.createdChildLeadIds) {
                if (!allLeads.some(l => l.id === childId)) {
                    try {
                        const cSnap = await getDoc(doc(firestore, 'leads', childId));
                        if (cSnap.exists()) {
                            const cData = cSnap.data();
                            const isSynced = Boolean(cData.syncedWithNetSuite || cData.netsuiteId || cData.internalid);
                            allLeads.push({ id: cSnap.id, name: cData.companyName || cData.lpoName || 'Child Lead', isSynced });
                        }
                    } catch (e) {}
                }
            }
        }

        const unsynced = allLeads.filter(l => !l.isSynced);
        return {
            isAllSynced: unsynced.length === 0,
            unsyncedCount: unsynced.length,
            unsyncedNames: unsynced.map(u => u.name)
        };
    } catch (err) {
        console.warn('Error checking LPO NetSuite sync status:', err);
        return { isAllSynced: true, unsyncedCount: 0, unsyncedNames: [] };
    }
}

/**
 * Synchronizes the parent lead and all child leads in an LPO Lead hierarchy to NetSuite.
 */
export async function syncLpoHierarchyWithNetSuite(parentLeadId: string): Promise<{
    success: boolean;
    count: number;
    newParentDocId?: string;
    message: string;
}> {
    try {
        const parentRef = doc(firestore, 'leads', parentLeadId);
        const parentSnap = await getDoc(parentRef);
        if (!parentSnap.exists()) {
            return { success: false, count: 0, message: 'Parent lead document not found.' };
        }

        const parentData = parentSnap.data();
        const targetParentId = parentData.isParentLead ? parentLeadId : (parentData.parentLeadId || parentLeadId);

        const oldChildIds: string[] = [];
        const qChild = query(collection(firestore, 'leads'), where('parentLeadId', '==', targetParentId));
        const childSnap = await getDocs(qChild);
        childSnap.docs.forEach(d => {
            if (d.id !== targetParentId && !oldChildIds.includes(d.id)) {
                oldChildIds.push(d.id);
            }
        });

        if (parentData.createdChildLeadIds && Array.isArray(parentData.createdChildLeadIds)) {
            parentData.createdChildLeadIds.forEach((id: string) => {
                if (id !== targetParentId && !oldChildIds.includes(id)) {
                    oldChildIds.push(id);
                }
            });
        }

        // 1. Re-key Parent Lead first
        let newParentId = targetParentId;
        const isParentAlreadyNumeric = /^\d+$/.test(targetParentId);

        if (!isParentAlreadyNumeric) {
            const parentRekeyRes = await rekeyLeadToNetSuite(targetParentId);
            if (!parentRekeyRes.success || !parentRekeyRes.newDocId) {
                return {
                    success: false,
                    count: 0,
                    message: `Failed to create Parent lead in NetSuite: ${parentRekeyRes.error || 'Unknown error'}`
                };
            }
            newParentId = parentRekeyRes.newDocId;
        }

        // 2. Re-key each Child Lead and update parentLeadId to point to newParentId
        const newChildIds: string[] = [];

        for (const childId of oldChildIds) {
            const isChildAlreadyNumeric = /^\d+$/.test(childId);
            let newChildId = childId;

            try {
                await updateDoc(doc(firestore, 'leads', childId), {
                    parentLeadId: newParentId,
                    updatedAt: new Date()
                });
            } catch (e) {}

            if (!isChildAlreadyNumeric) {
                const childRekeyRes = await rekeyLeadToNetSuite(childId);
                if (childRekeyRes.success && childRekeyRes.newDocId) {
                    newChildId = childRekeyRes.newDocId;
                }
            }

            try {
                await updateDoc(doc(firestore, 'leads', newChildId), {
                    parentLeadId: newParentId,
                    isChildLead: true,
                    syncedWithNetSuite: true,
                    netsuiteId: newChildId,
                    internalid: newChildId,
                    updatedAt: new Date()
                });
            } catch (e) {}

            newChildIds.push(newChildId);
        }

        // 3. Update Parent Lead doc with newChildIds array
        try {
            await updateDoc(doc(firestore, 'leads', newParentId), {
                createdChildLeadIds: newChildIds,
                isParentLead: true,
                syncedWithNetSuite: true,
                netsuiteId: newParentId,
                internalid: newParentId,
                updatedAt: new Date()
            });
        } catch (e) {}

        // 4. Update linked lpo_leads document if exists with new numeric IDs
        try {
            const lpoIdsToUpdate = new Set<string>();

            const qLpo1 = query(collection(firestore, 'lpo_leads'), where('createdParentLeadId', '==', targetParentId));
            const lpoSnap1 = await getDocs(qLpo1);
            lpoSnap1.docs.forEach(d => lpoIdsToUpdate.add(d.id));

            if (newParentId !== targetParentId) {
                const qLpo2 = query(collection(firestore, 'lpo_leads'), where('createdParentLeadId', '==', newParentId));
                const lpoSnap2 = await getDocs(qLpo2);
                lpoSnap2.docs.forEach(d => lpoIdsToUpdate.add(d.id));
            }

            const qLpo3 = query(collection(firestore, 'lpo_leads'), where('linkedLeadId', '==', targetParentId));
            const lpoSnap3 = await getDocs(qLpo3);
            lpoSnap3.docs.forEach(d => lpoIdsToUpdate.add(d.id));

            if (parentData.lpoLeadId) lpoIdsToUpdate.add(parentData.lpoLeadId);
            if (parentData.linkedLpoLeadId) lpoIdsToUpdate.add(parentData.linkedLpoLeadId);

            for (const lpoId of Array.from(lpoIdsToUpdate)) {
                try {
                    const lpoRef = doc(firestore, 'lpo_leads', lpoId);
                    await updateDoc(lpoRef, {
                        createdParentLeadId: newParentId,
                        createdChildLeadIds: newChildIds,
                        linkedLeadId: newParentId,
                        updatedAt: new Date()
                    });
                } catch (e) {
                    console.warn(`Failed to update lpo_leads document ${lpoId} in syncLpoHierarchyWithNetSuite:`, e);
                }
            }
        } catch (e) {
            console.warn('Error updating lpo_leads in syncLpoHierarchyWithNetSuite:', e);
        }

        return {
            success: true,
            count: 1 + newChildIds.length,
            newParentDocId: newParentId,
            message: `Parent lead and ${newChildIds.length} child lead(s) successfully created in NetSuite and converted to numeric NetSuite IDs.`
        };
    } catch (err: any) {
        console.error('Error in syncLpoHierarchyWithNetSuite:', err);
        return {
            success: false,
            count: 0,
            message: err.message || 'Failed to sync and convert LPO hierarchy to NetSuite IDs.'
        };
    }
}

/**
 * Fetches all LPO Parent leads linked to a given franchisee.
 * Finds leads in the 'lpo_network' bucket where the linked franchisee matches the selected franchisee,
 * and extracts the Parent LPO Lead from those child LPO leads (or direct parent LPO leads).
 */
export async function getLpoParentsForFranchisee(
  franchisee: { internalId: string; name?: string; code?: string }
): Promise<{ id: string; companyName: string }[]> {
  if (!franchisee || !franchisee.internalId) return [];

  const fId = String(franchisee.internalId).trim();
  const fName = franchisee.name ? franchisee.name.trim() : '';
  const fCode = franchisee.code ? franchisee.code.trim() : '';

  const parentMap = new Map<string, string>(); // Map<parentLpoId, companyName>

  const addParent = (id: string, name?: string) => {
    if (!id) return;
    const cleanId = String(id).trim();
    if (!cleanId) return;
    const existingName = parentMap.get(cleanId);
    if (!existingName || existingName === cleanId) {
      parentMap.set(cleanId, (name && name.trim()) ? name.trim() : cleanId);
    }
  };

  try {
    // 1. Query 'leads' collection for bucket == 'lpo_network' or 'LPO Network'
    const qLpoNet1 = query(collection(firestore, 'leads'), where('bucket', '==', 'lpo_network'));
    const qLpoNet2 = query(collection(firestore, 'leads'), where('bucket', '==', 'LPO Network'));

    const [snap1, snap2] = await Promise.all([
      getDocs(qLpoNet1).catch(() => ({ docs: [] })),
      getDocs(qLpoNet2).catch(() => ({ docs: [] }))
    ]);

    const uniqueLeadDocsMap = new Map<string, any>();
    [...snap1.docs, ...snap2.docs].forEach(d => uniqueLeadDocsMap.set(d.id, d.data()));

    // Also check leads with franchiseeInternalId matching fId directly
    const qFranLeads = query(collection(firestore, 'leads'), where('franchiseeInternalId', '==', fId));
    const snapFran = await getDocs(qFranLeads).catch(() => ({ docs: [] }));
    snapFran.docs.forEach(d => {
      const data = d.data();
      const b = String(data.bucket || '').toLowerCase();
      if (b === 'lpo_network' || data.isLpoLead || data.lpoLeadId || data.parentLpoId || data.parentLeadId) {
        uniqueLeadDocsMap.set(d.id, data);
      }
    });

    const missingParentIds = new Set<string>();

    // Process all matching LPO leads
    for (const [leadId, data] of Array.from(uniqueLeadDocsMap.entries())) {
      // Check if this lead is linked to the selected franchisee
      const isLinkedToFranchisee =
        String(data.franchiseeInternalId || '').trim() === fId ||
        String(data.franchisee_id || '').trim() === fId ||
        (fName && String(data.franchisee || '').trim().toLowerCase() === fName.toLowerCase()) ||
        (fCode && String(data.franchisee || '').trim().toLowerCase() === fCode.toLowerCase()) ||
        (Array.isArray(data.linkedFranchiseeIds) && data.linkedFranchiseeIds.some((id: any) => String(id).trim() === fId)) ||
        (Array.isArray(data.linkedFranchisees) && data.linkedFranchisees.some((lf: any) => String(lf.franchiseeId || lf.id || '').trim() === fId || (fName && String(lf.name || '').trim().toLowerCase() === fName.toLowerCase()))) ||
        (Array.isArray(data.linkedLPOFranchisees) && data.linkedLPOFranchisees.some((id: any) => String(id).trim() === fId));

      if (!isLinkedToFranchisee) continue;

      // Extract Parent LPO Lead ID
      const parentLeadId = data.parentLeadId || data.ausPostParentLpoId || data.linkedLpoLeadId || data.lpoLeadId || (data.isParentLead ? leadId : null);

      if (parentLeadId) {
        const pIdStr = String(parentLeadId).trim();
        if (uniqueLeadDocsMap.has(pIdStr)) {
          const parentData = uniqueLeadDocsMap.get(pIdStr);
          const pName = parentData.companyName || parentData.lpoName || parentData.name || pIdStr;
          addParent(pIdStr, pName);
        } else {
          const fallbackName = data.lpoLeadName || data.lpoName || (data.companyName ? data.companyName.replace(/\s*-\s*.*$/, '') : null);
          addParent(pIdStr, fallbackName || pIdStr);
          missingParentIds.add(pIdStr);
        }
      } else if (data.isParentLead || !data.isChildLead) {
        const pName = data.companyName || data.lpoName || data.name || leadId;
        addParent(leadId, pName);
      }
    }

    // 2. Also check 'lpo_leads' collection
    const snapLpoLeads = await getDocs(collection(firestore, 'lpo_leads')).catch(() => ({ docs: [] }));
    snapLpoLeads.docs.forEach(d => {
      const data = d.data();
      const lpoFranList = data.linkedFranchisees || [];
      const matchesFran = lpoFranList.some((lf: any) => String(lf.franchiseeId || '').trim() === fId || (fName && String(lf.name || '').trim().toLowerCase() === fName.toLowerCase()));
      if (matchesFran) {
        const parentId = data.createdParentLeadId || data.linkedLeadId || d.id;
        const pName = data.lpoName || data.companyName || d.id;
        addParent(parentId, pName);
        if (data.createdParentLeadId && !uniqueLeadDocsMap.has(data.createdParentLeadId)) {
          missingParentIds.add(data.createdParentLeadId);
        }
      }
    });

    // 3. Also check 'companies' collection for linkedLPOFranchisees
    const qComp = query(collection(firestore, 'companies'), where('linkedLPOFranchisees', 'array-contains', fId));
    const snapComp = await getDocs(qComp).catch(() => ({ docs: [] }));
    snapComp.docs.forEach(d => {
      const data = d.data();
      const pName = data.companyName || data.name || d.id;
      addParent(d.id, pName);
    });

    // Fetch missing parent lead details in parallel
    if (missingParentIds.size > 0) {
      await Promise.all(
        Array.from(missingParentIds).map(async (pId) => {
          try {
            const pDoc = await getDoc(doc(firestore, 'leads', pId));
            if (pDoc.exists()) {
              const pData = pDoc.data();
              const pName = pData?.companyName || pData?.lpoName || pData?.name;
              if (pName) addParent(pId, pName);
            } else {
              const cDoc = await getDoc(doc(firestore, 'companies', pId));
              if (cDoc.exists()) {
                const cData = cDoc.data();
                const cName = cData?.companyName || cData?.name;
                if (cName) addParent(pId, cName);
              }
            }
          } catch (err) {
            console.error(`Error fetching parent LPO lead details for ${pId}:`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error('Error fetching LPO parents for franchisee:', err);
  }

  const result = Array.from(parentMap.entries()).map(([id, companyName]) => ({
    id,
    companyName
  }));

  result.sort((a, b) => a.companyName.localeCompare(b.companyName));
  return result;
}

