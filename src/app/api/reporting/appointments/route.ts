import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { formatBucketLabel } from '@/lib/lead-stage-analytics';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  timestamp: number;
  data: any;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60s cache

function parseFlexibleDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val === 'object' && '_seconds' in val) {
    return new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1000000);
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str) return null;

    // Check Australian / UK format DD/MM/YYYY or DD/MM/YYYY HH:mm
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
      const parts = str.split(/[\s,]+/);
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        let year = parseInt(dateParts[2], 10);
        if (year < 100) year += 2000;

        let hours = 0;
        let minutes = 0;
        if (parts[1] && parts[1].includes(':')) {
          const timeParts = parts[1].split(':');
          hours = parseInt(timeParts[0], 10) || 0;
          minutes = parseInt(timeParts[1], 10) || 0;
        }

        const d = new Date(year, month, day, hours, minutes);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function resolveOriginalBucket(lead: any, appointment: any): string {
  if (appointment?.originalBucket) {
    return formatBucketLabel(appointment.originalBucket);
  }
  if (lead?.initialAppointmentBucket && lead.initialAppointmentBucket !== 'account_manager') {
    return formatBucketLabel(lead.initialAppointmentBucket);
  }
  if (lead?.bucketHistory && Array.isArray(lead.bucketHistory) && lead.bucketHistory.length > 0) {
    const sorted = [...lead.bucketHistory].sort((a, b) => {
      const da = parseFlexibleDate(a.date)?.getTime() || 0;
      const db = parseFlexibleDate(b.date)?.getTime() || 0;
      return da - db;
    });
    const amTransition = sorted.find(h => h.newBucket === 'account_manager' && h.oldBucket && h.oldBucket !== 'account_manager');
    if (amTransition && amTransition.oldBucket) {
      return formatBucketLabel(amTransition.oldBucket);
    }
    const earliestNonAm = sorted.find(h => h.oldBucket && h.oldBucket !== 'account_manager');
    if (earliestNonAm && earliestNonAm.oldBucket) {
      return formatBucketLabel(earliestNonAm.oldBucket);
    }
  }

  const sourceStr = (lead?.customerSource || lead?.source || lead?.leadSource || '').toLowerCase();
  if (
    sourceStr === 'website' || 
    sourceStr.includes('inbound') || 
    lead?.wasInbound || 
    lead?.inboundDetails || 
    lead?.inboundPageUrl || 
    lead?.pageURL
  ) {
    return 'Inbound';
  }

  if (lead?.originalBucket && lead.originalBucket !== 'account_manager') {
    return formatBucketLabel(lead.originalBucket);
  }
  if (lead?.fieldSales || lead?.bucket === 'field_sales') {
    return 'Field Sales';
  }
  if (lead?.bucket === 'multisite' || lead?.isMultiSite) {
    return 'Multisite';
  }
  if (lead?.bucket === 'lpo_plus' || lead?.bucket === 'lpo_network') {
    return 'LPO';
  }
  if (lead?.bucket === 'nurture') {
    return 'Nurture';
  }
  if (lead?.bucket && lead.bucket !== 'account_manager') {
    return formatBucketLabel(lead.bucket);
  }

  return 'Outbound';
}

function resolveBookedBy(lead: any, appointment: any): string {
  const explicit = appointment.bookedBy || appointment.dialerAssigned || appointment.scheduledByName || appointment.author || appointment.userName;
  if (explicit && explicit.trim() && !['Appointment Booking System', 'ProspectPlus Booking'].includes(explicit.trim())) {
    return explicit.trim();
  }

  if (lead?.statusHistory && Array.isArray(lead.statusHistory)) {
    const hist = lead.statusHistory.find((h: any) => 
      (h.newStatus === 'Appointment Booked' || h.newStatus === 'Account Manager') &&
      h.author && 
      !['Appointment Booking System', 'ProspectPlus Booking', 'System'].includes(h.author.trim())
    );
    if (hist && hist.author) {
      return hist.author.trim();
    }
  }

  if (lead?.timeline && Array.isArray(lead.timeline)) {
    const timelineEntry = lead.timeline.find((t: any) => 
      (t.outcome === 'Appointment Booked' || t.outcome === 'Appointment Rescheduled') &&
      t.userDisplayName &&
      !['Appointment Booking System', 'ProspectPlus Booking', 'System'].includes(t.userDisplayName.trim())
    );
    if (timelineEntry && timelineEntry.userDisplayName) {
      return timelineEntry.userDisplayName.trim();
    }
  }

  if (lead?.dialerAssigned && lead.dialerAssigned.trim()) {
    return lead.dialerAssigned.trim();
  }

  if (lead?.assignedTo && lead.assignedTo.trim()) {
    return lead.assignedTo.trim();
  }

  return 'Unassigned';
}

function resolveBookedWith(lead: any, appointment: any): string {
  const am = appointment.amName || appointment.assignedTo || lead?.accountManagerAssigned;
  if (am && am.trim() && !['Unknown', 'Unassigned'].includes(am.trim())) {
    return am.trim();
  }
  return 'Unassigned AM';
}

function resolveBookedAt(lead: any, appointment: any): Date | null {
  const candidates = [
    appointment.createdAt,
    appointment.bookedAt,
    appointment.createdDate,
  ];

  for (const c of candidates) {
    const d = parseFlexibleDate(c);
    if (d) return d;
  }

  if (lead?.statusHistory && Array.isArray(lead.statusHistory)) {
    const hist = lead.statusHistory.find((h: any) => h.newStatus === 'Appointment Booked');
    if (hist?.date) {
      const d = parseFlexibleDate(hist.date);
      if (d) return d;
    }
  }

  if (lead?.timeline && Array.isArray(lead.timeline)) {
    const t = lead.timeline.find((item: any) => item.outcome === 'Appointment Booked');
    if (t?.timestamp) {
      const d = parseFlexibleDate(t.timestamp);
      if (d) return d;
    }
  }

  const apptDate = parseFlexibleDate(appointment.date || appointment.duedate || appointment.appointmentDate || appointment.starttime);
  if (apptDate) return apptDate;

  const leadCreated = parseFlexibleDate(lead?.dateLeadEntered || lead?.createdAt);
  if (leadCreated) return leadCreated;

  return null;
}

function resolveAppointmentDate(appointment: any): Date | null {
  const candidates = [
    appointment.date,
    appointment.duedate,
    appointment.appointmentDate,
    appointment.starttime,
  ];

  for (const c of candidates) {
    const d = parseFlexibleDate(c);
    if (d) return d;
  }

  return null;
}

function isWonStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return ['won', 'signed', 'customer', 'quote accepted', 'signed agreement'].includes(s);
}

function isLostStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return [
    'lost',
    'lost customer',
    'unqualified',
    'email brush off',
    'out of territory',
    'localmile trial stopped',
    'shipmate trial stopped',
    'not interested'
  ].includes(s);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'all_appointments_reporting_fast';
    const cached = memoryCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const db = adminApp.firestore();

    // 1. Fetch only collectionGroup('appointments') - lightweight and fast
    const apptsSnap = await db.collectionGroup('appointments').get();

    // 2. Extract parent lead IDs for only the appointments that actually exist
    const rawApptItems: Array<{ id: string; parentId: string; data: any }> = [];
    const leadIdSet = new Set<string>();

    apptsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const parentId = docSnap.ref.parent.parent?.id || data.leadId;
      if (!parentId) return;
      const apptId = docSnap.id || data.id;
      rawApptItems.push({ id: apptId, parentId, data });
      leadIdSet.add(parentId);
    });

    const uniqueLeadIds = Array.from(leadIdSet);
    const leadsMap = new Map<string, any>();

    // 3. Batch fetch ONLY the specific parent leads needed (chunks of 300 using db.getAll)
    if (uniqueLeadIds.length > 0) {
      const chunkSize = 300;
      for (let i = 0; i < uniqueLeadIds.length; i += chunkSize) {
        const chunk = uniqueLeadIds.slice(i, i + chunkSize);
        const leadDocRefs = chunk.map(id => db.collection('leads').doc(id));
        const snapshots = await db.getAll(...leadDocRefs);
        snapshots.forEach(snap => {
          if (snap.exists) {
            leadsMap.set(snap.id, { id: snap.id, ...snap.data() });
          }
        });
      }

      // Check missing IDs in companies collection
      const missingLeadIds = uniqueLeadIds.filter(id => !leadsMap.has(id));
      if (missingLeadIds.length > 0) {
        for (let i = 0; i < missingLeadIds.length; i += chunkSize) {
          const chunk = missingLeadIds.slice(i, i + chunkSize);
          const compDocRefs = chunk.map(id => db.collection('companies').doc(id));
          const snapshots = await db.getAll(...compDocRefs);
          snapshots.forEach(snap => {
            if (snap.exists) {
              leadsMap.set(snap.id, { id: snap.id, ...snap.data(), isCompany: true });
            }
          });
        }
      }
    }

    const appointmentsList: any[] = [];
    const seenApptKeys = new Set<string>();

    // 4. Enrich appointments
    rawApptItems.forEach(({ id: apptId, parentId, data }) => {
      const lead = leadsMap.get(parentId) || {};
      const key = `${parentId}-${apptId}`;
      if (seenApptKeys.has(key)) return;
      seenApptKeys.add(key);

      const apptDateObj = resolveAppointmentDate(data);
      const bookedAtDate = resolveBookedAt(lead, data);

      // If both appointment scheduled date and booking creation date are completely missing,
      // it's an empty or invalid stub record (e.g. { appointmentStatus: 'Completed' } with no dates) - skip it.
      if (!apptDateObj && !bookedAtDate) {
        return;
      }

      const finalBookedAt = bookedAtDate || apptDateObj!;
      const appointmentDateIso = apptDateObj ? apptDateObj.toISOString() : finalBookedAt.toISOString();
      const rawStatus = (data.appointmentStatus || 'Pending') as string;
      const cleanStatus = ['Completed', 'Cancelled', 'No Show', 'Rescheduled', 'Pending'].includes(rawStatus)
        ? rawStatus
        : 'Pending';

      const isOverdue = cleanStatus === 'Pending' && apptDateObj !== null && apptDateObj.getTime() < now;

      const bookedBy = resolveBookedBy(lead, data);
      const bookedWith = resolveBookedWith(lead, data);
      const originalBucket = resolveOriginalBucket(lead, data);
      const currentLeadStatus = lead.customerStatus || lead.status || 'New';

      const hasStatusChanged = currentLeadStatus !== 'Appointment Booked' && currentLeadStatus !== 'Account Manager';
      
      const statusHistory = Array.isArray(lead.statusHistory) ? lead.statusHistory : [];
      const sortedHistory = [...statusHistory].sort((a, b) => {
        const da = parseFlexibleDate(a.date)?.getTime() || 0;
        const db = parseFlexibleDate(b.date)?.getTime() || 0;
        return da - db;
      });

      const bookedTimestamp = finalBookedAt.getTime();
      const postBookingHistory = sortedHistory.filter(h => {
        const hTime = parseFlexibleDate(h.date)?.getTime() || 0;
        return hTime >= bookedTimestamp - 60000;
      });

      let statusChangeDate: string | null = null;
      if (hasStatusChanged) {
        const firstPostChange = postBookingHistory.find(h => 
          h.newStatus !== 'Appointment Booked' && h.newStatus !== 'Account Manager'
        );
        if (firstPostChange?.date) {
          const d = parseFlexibleDate(firstPostChange.date);
          if (d) statusChangeDate = d.toISOString();
        } else if (lead.lastOutcomeAt) {
          const d = parseFlexibleDate(lead.lastOutcomeAt);
          if (d) statusChangeDate = d.toISOString();
        }
      }

      let outcomeCategory = 'Unchanged';
      if (isWonStatus(currentLeadStatus)) {
        outcomeCategory = 'Won / Signed';
      } else if (isLostStatus(currentLeadStatus)) {
        outcomeCategory = 'Lost / Disqualified';
      } else if (hasStatusChanged) {
        outcomeCategory = 'Active Pipeline';
      }

      const primaryContact = Array.isArray(lead.contacts) ? lead.contacts.find((c: any) => c.isPrimary) || lead.contacts[0] : null;
      const contactName = primaryContact?.name || lead.contactName || lead.contactPerson || '';
      const contactEmail = primaryContact?.email || lead.customerServiceEmail || lead.email || '';
      const contactPhone = primaryContact?.phone || lead.customerServicePhone || lead.phone || '';

      appointmentsList.push({
        id: apptId,
        leadId: parentId,
        companyName: lead.companyName || data.leadName || 'Unnamed Company',
        contactName,
        contactEmail,
        contactPhone,
        bookedAt: finalBookedAt.toISOString(),
        appointmentDate: appointmentDateIso,
        appointmentStatus: cleanStatus,
        isOverdue,
        bookedBy,
        bookedWith,
        originalBucket,
        currentLeadStatus,
        statusChangedPostAppt: hasStatusChanged,
        statusChangeDate,
        statusProgression: postBookingHistory.map(h => ({
          oldStatus: h.oldStatus || '',
          newStatus: h.newStatus || '',
          date: parseFlexibleDate(h.date)?.toISOString() || h.date,
          author: h.author || ''
        })),
        outcomeCategory,
        notes: data.notes || data.statusNotes || '',
        meetingType: data.type || 'Video Call',
        joinUrl: data.joinUrl || '',
        locationOrLink: data.locationOrLink || '',
        franchisee: lead.franchisee || lead.franchiseTerritory || '',
        postcode: lead.postalAddress?.zip || lead.address?.zip || lead.postcode || '',
        state: lead.postalAddress?.state || lead.address?.state || lead.state || '',
      });
    });

    // Check embedded lead.appointments from already fetched leads
    leadsMap.forEach((lead, leadId) => {
      if (Array.isArray(lead.appointments)) {
        lead.appointments.forEach((data: any) => {
          const apptId = data.id || `emb-${leadId}-${data.date || data.duedate}`;
          const key = `${leadId}-${apptId}`;
          if (seenApptKeys.has(key)) return;
          seenApptKeys.add(key);

          const apptDateObj = resolveAppointmentDate(data);
          const bookedAtDate = resolveBookedAt(lead, data);

          if (!apptDateObj && !bookedAtDate) {
            return;
          }

          const finalBookedAt = bookedAtDate || apptDateObj!;
          const rawStatus = (data.appointmentStatus || 'Pending') as string;
          const cleanStatus = ['Completed', 'Cancelled', 'No Show', 'Rescheduled', 'Pending'].includes(rawStatus)
            ? rawStatus
            : 'Pending';

          const appointmentDateIso = apptDateObj ? apptDateObj.toISOString() : finalBookedAt.toISOString();
          const isOverdue = cleanStatus === 'Pending' && apptDateObj !== null && apptDateObj.getTime() < now;

          const bookedBy = resolveBookedBy(lead, data);
          const bookedWith = resolveBookedWith(lead, data);
          const originalBucket = resolveOriginalBucket(lead, data);
          const currentLeadStatus = lead.customerStatus || lead.status || 'New';

          const hasStatusChanged = currentLeadStatus !== 'Appointment Booked' && currentLeadStatus !== 'Account Manager';
          
          let outcomeCategory = 'Unchanged';
          if (isWonStatus(currentLeadStatus)) {
            outcomeCategory = 'Won / Signed';
          } else if (isLostStatus(currentLeadStatus)) {
            outcomeCategory = 'Lost / Disqualified';
          } else if (hasStatusChanged) {
            outcomeCategory = 'Active Pipeline';
          }

          const primaryContact = Array.isArray(lead.contacts) ? lead.contacts.find((c: any) => c.isPrimary) || lead.contacts[0] : null;

          appointmentsList.push({
            id: apptId,
            leadId,
            companyName: lead.companyName || data.leadName || 'Unnamed Company',
            contactName: primaryContact?.name || lead.contactName || '',
            contactEmail: primaryContact?.email || lead.customerServiceEmail || lead.email || '',
            contactPhone: primaryContact?.phone || lead.customerServicePhone || lead.phone || '',
            bookedAt: finalBookedAt.toISOString(),
            appointmentDate: appointmentDateIso,
            appointmentStatus: cleanStatus,
            isOverdue,
            bookedBy,
            bookedWith,
            originalBucket,
            currentLeadStatus,
            statusChangedPostAppt: hasStatusChanged,
            statusChangeDate: null,
            statusProgression: [],
            outcomeCategory,
            notes: data.notes || data.statusNotes || '',
            meetingType: data.type || 'Video Call',
            joinUrl: data.joinUrl || '',
            locationOrLink: data.locationOrLink || '',
            franchisee: lead.franchisee || lead.franchiseTerritory || '',
            postcode: lead.postalAddress?.zip || lead.address?.zip || lead.postcode || '',
            state: lead.postalAddress?.state || lead.address?.state || lead.state || '',
          });
        });
      }
    });

    // Sort default: newest booked first
    appointmentsList.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

    // Extract unique filter options
    const uniqueAccountManagers = Array.from(new Set(appointmentsList.map(a => a.bookedWith))).filter(Boolean).sort();
    const uniqueBookedBy = Array.from(new Set(appointmentsList.map(a => a.bookedBy))).filter(Boolean).sort();
    const uniqueOriginalBuckets = Array.from(new Set(appointmentsList.map(a => a.originalBucket))).filter(Boolean).sort();
    const uniqueAppointmentStatuses = ['Completed', 'Pending', 'No Show', 'Rescheduled', 'Cancelled'];
    const uniqueLeadStatuses = Array.from(new Set(appointmentsList.map(a => a.currentLeadStatus))).filter(Boolean).sort();

    const responsePayload = {
      success: true,
      totalCount: appointmentsList.length,
      appointments: appointmentsList,
      filterOptions: {
        accountManagers: uniqueAccountManagers,
        bookedBy: uniqueBookedBy,
        originalBuckets: uniqueOriginalBuckets,
        appointmentStatuses: uniqueAppointmentStatuses,
        leadStatuses: uniqueLeadStatuses,
      },
      cachedAt: new Date().toISOString()
    };

    memoryCache.set(cacheKey, {
      timestamp: now,
      data: responsePayload
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in appointment reporting API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointment reporting data' },
      { status: 500 }
    );
  }
}
