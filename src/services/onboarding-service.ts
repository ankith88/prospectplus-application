import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { logActivity } from '@/services/firebase';
import type { 
  OnboardingRequest, 
  OnboardingRequestStatus, 
  OnboardingRequestPriority, 
  OnboardingAppointmentDetails,
  OnboardingMetricsSummary 
} from '@/lib/types';

export const DEFAULT_LIAM_UID = 'Uh71ctLejpg8dietKngBQwnqivI2';
export const DEFAULT_LIAM_NAME = 'Liam';

export interface CreateOnboardingRequestPayload {
  leadId: string;
  companyId?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedByUid: string;
  requestedByName: string;
  priority?: OnboardingRequestPriority;
  assignedToUid?: string;
  assignedToName?: string;
  preferredTimeframe?: string;
  notes?: string;
  isLpoPlus?: boolean;
}

const sanitize = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

/**
 * Creates a new onboarding request doc in Firestore collection `onboardingRequests`
 */
export async function createOnboardingRequest(payload: CreateOnboardingRequestPayload): Promise<string> {
  const now = new Date().toISOString();
  
  const requestData = sanitize({
    leadId: payload.leadId,
    companyId: payload.companyId || payload.leadId,
    companyName: payload.companyName,
    contactName: payload.contactName,
    contactEmail: payload.contactEmail || '',
    contactPhone: payload.contactPhone || '',
    requestedByUid: payload.requestedByUid,
    requestedByName: payload.requestedByName,
    requestedAt: now,
    status: 'Pending' as OnboardingRequestStatus,
    priority: payload.priority || 'Standard',
    assignedToUid: payload.assignedToUid || DEFAULT_LIAM_UID,
    assignedToName: payload.assignedToName || DEFAULT_LIAM_NAME,
    preferredTimeframe: payload.preferredTimeframe || '',
    notes: payload.notes || '',
    isLpoPlus: Boolean(payload.isLpoPlus),
    createdAt: now,
    updatedAt: now,
  });

  const docRef = await addDoc(collection(firestore, 'onboardingRequests'), requestData);

  // Log activity on the lead / company timeline
  try {
    await logActivity(payload.leadId, {
      type: 'Update',
      date: now,
      notes: `Onboarding Request ${payload.isLpoPlus ? 'for LPO.Plus ' : ''}created for ${payload.companyName}. Assigned to ${requestData.assignedToName}.`,
      author: payload.requestedByName,
    }, 'companies');
  } catch (err) {
    console.error('Failed to log activity for onboarding request creation:', err);
  }

  // Trigger email notification to Liam (CCing alexandra.bathman@mailplus.com.au)
  try {
    fetch('/api/onboarding-requests/notify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: docRef.id,
        companyName: payload.companyName,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        priority: payload.priority || 'Standard',
        preferredTimeframe: payload.preferredTimeframe,
        requestedByName: payload.requestedByName,
        assignedToUid: requestData.assignedToUid,
        assignedToName: requestData.assignedToName,
        notes: payload.notes,
        isLpoPlus: Boolean(payload.isLpoPlus),
      }),
    }).catch(err => console.error('Error dispatching onboarding email notification:', err));
  } catch (emailErr) {
    console.error('Failed to trigger onboarding email notification:', emailErr);
  }

  return docRef.id;
}

/**
 * Fetches all onboarding requests from Firestore
 */
export async function getOnboardingRequests(options?: {
  assignedToUid?: string;
  status?: OnboardingRequestStatus;
  leadId?: string;
}): Promise<OnboardingRequest[]> {
  try {
    let q = query(collection(firestore, 'onboardingRequests'), orderBy('requestedAt', 'desc'));
    
    if (options?.leadId) {
      q = query(collection(firestore, 'onboardingRequests'), where('leadId', '==', options.leadId), orderBy('requestedAt', 'desc'));
    }

    const snap = await getDocs(q);
    const results: OnboardingRequest[] = snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as OnboardingRequest));

    // Client side filter if options passed
    let filtered = results;
    if (options?.assignedToUid) {
      filtered = filtered.filter(r => r.assignedToUid === options.assignedToUid);
    }
    if (options?.status) {
      filtered = filtered.filter(r => r.status === options.status);
    }

    return filtered;
  } catch (err) {
    console.error('Error fetching onboarding requests:', err);
    return [];
  }
}

/**
 * Gets active onboarding request for a specific lead / company if any exists
 */
export async function getOnboardingRequestByLeadId(leadId: string): Promise<OnboardingRequest | null> {
  try {
    const q = query(collection(firestore, 'onboardingRequests'), where('leadId', '==', leadId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    
    // Return the latest one
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as OnboardingRequest));
    docs.sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''));
    return docs[0];
  } catch (err) {
    console.error('Error getting onboarding request by leadId:', err);
    return null;
  }
}

/**
 * Organises/books an onboarding appointment for a request
 */
export async function bookOnboardingAppointment(
  requestId: string,
  appointment: {
    appointmentDate: string;
    appointmentType?: string;
    locationOrLink?: string;
    notes?: string;
    scheduledByUid: string;
    scheduledByName: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const reqRef = doc(firestore, 'onboardingRequests', requestId);
  const snap = await getDoc(reqRef);

  if (!snap.exists()) {
    throw new Error('Onboarding request not found');
  }

  const reqData = snap.data() as OnboardingRequest;

  const appointmentDetails: OnboardingAppointmentDetails = sanitize({
    appointmentDate: appointment.appointmentDate,
    appointmentType: appointment.appointmentType || 'Video Call',
    locationOrLink: appointment.locationOrLink || '',
    notes: appointment.notes || '',
    scheduledByUid: appointment.scheduledByUid,
    scheduledByName: appointment.scheduledByName,
    scheduledAt: now,
  });

  await updateDoc(reqRef, sanitize({
    status: 'Appointment Booked' as OnboardingRequestStatus,
    appointmentDetails,
    updatedAt: now,
  }));

  // Log activity on the lead / company timeline
  try {
    await logActivity(reqData.leadId, {
      type: 'Meeting',
      date: now,
      notes: `Onboarding appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleString()} by ${appointment.scheduledByName}. Type: ${appointment.appointmentType || 'Video Call'}. ${appointment.notes ? `Notes: ${appointment.notes}` : ''}`,
      author: appointment.scheduledByName,
    }, 'companies');
  } catch (err) {
    console.error('Failed to log meeting activity for onboarding appointment:', err);
  }
}

/**
 * Updates status of an onboarding request (e.g. Mark Completed, Cancel)
 */
export async function updateOnboardingRequestStatus(
  requestId: string,
  status: OnboardingRequestStatus,
  metadata?: {
    userUid: string;
    userName: string;
    reason?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const reqRef = doc(firestore, 'onboardingRequests', requestId);
  
  const updatePayload: any = {
    status,
    updatedAt: now,
  };

  if (status === 'Completed' && metadata) {
    updatePayload.completedAt = now;
    updatePayload.completedByUid = metadata.userUid;
    updatePayload.completedByName = metadata.userName;
  } else if (status === 'Cancelled' && metadata) {
    updatePayload.cancelledAt = now;
    updatePayload.cancellationReason = metadata.reason || 'No reason provided';
  }

  await updateDoc(reqRef, sanitize(updatePayload));
}

/**
 * Reassigns an onboarding request to another CS team member
 */
export async function reassignOnboardingRequest(
  requestId: string,
  assignedToUid: string,
  assignedToName: string
): Promise<void> {
  const now = new Date().toISOString();
  const reqRef = doc(firestore, 'onboardingRequests', requestId);
  await updateDoc(reqRef, {
    assignedToUid,
    assignedToName,
    updatedAt: now,
  });
}

/**
 * Calculates top reporting metrics summary from onboarding requests
 */
export function calculateOnboardingMetrics(requests: OnboardingRequest[]): OnboardingMetricsSummary {
  const totalRequests = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const bookedCount = requests.filter(r => r.status === 'Appointment Booked').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;
  const cancelledCount = requests.filter(r => r.status === 'Cancelled').length;

  const bookingRatePercentage = totalRequests > 0 
    ? Math.round(((bookedCount + completedCount) / totalRequests) * 100) 
    : 0;

  return {
    totalRequests,
    pendingCount,
    bookedCount,
    completedCount,
    cancelledCount,
    bookingRatePercentage,
  };
}
