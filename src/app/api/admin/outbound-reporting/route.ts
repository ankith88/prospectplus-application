import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { isManualActivity } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  timestamp: number;
  data: any;
}

// In-memory cache for fast sub-second tab switching (60s TTL)
let memoryCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000;

function safeGetStatus(val: any): string {
  if (!val) return 'Uncontacted';
  if (typeof val === 'string') return val;
  return String(val);
}

function parseDateString(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const now = Date.now();
    const isDefaultQuery = !startDateParam && !endDateParam;

    // Return in-memory cached data if available and fresh (for default views)
    if (!forceRefresh && isDefaultQuery && memoryCache && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        cached: true,
        cachedAt: new Date(memoryCache.timestamp).toISOString(),
        data: memoryCache.data
      });
    }

    const db = getFirestore(adminApp);

    // Calculate start boundary
    let startISO = new Date(2026, 6, 1).toISOString(); // Default 1st July 2026
    if (startDateParam) {
      const parsedStart = new Date(startDateParam);
      if (!isNaN(parsedStart.getTime())) {
        startISO = parsedStart.toISOString();
      }
    }

    // Parallel server-side Firestore fetches via Firebase Admin SDK
    const activityQuery = db.collectionGroup('activity').where('date', '>=', startISO);
    const apptQuery = db.collectionGroup('appointments');
    const usersQuery = db.collection('users').get();
    const leadsQuery = db.collection('leads').where('bucket', '==', 'outbound').get();
    const companiesQuery = db.collection('companies').where('bucket', '==', 'outbound').get();

    const [activitiesSnap, apptsSnap, usersSnap, leadsSnap, companiesSnap] = await Promise.all([
      activityQuery.get(),
      apptQuery.get(),
      usersQuery,
      leadsQuery,
      companiesQuery
    ]);

    // 1. Process User/Dialer List
    const userList: string[] = [];
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || data.email;
      if (!name) return;

      const role = (data.role || '').toLowerCase();
      const activeRole = (data.activeRole || '').toLowerCase();
      const assignedRoles = (data.assignedRoles || []).map((r: string) => (r || '').toLowerCase());

      const isUserRole =
        role === 'user' ||
        activeRole === 'user' ||
        assignedRoles.includes('user') ||
        role === 'dialer' ||
        role === 'dialers' ||
        activeRole === 'dialer' ||
        activeRole === 'dialers' ||
        assignedRoles.includes('dialer') ||
        assignedRoles.includes('dialers') ||
        role === 'lead gen' ||
        activeRole === 'lead gen' ||
        assignedRoles.includes('lead gen');

      if (isUserRole && !data.disabled) {
        userList.push(name);
      }
    });

    // 2. Process Leads & Companies into Lean Objects
    const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot, isFromCompanies = false) => {
      const data = doc.data();
      return {
        id: doc.id,
        prospectPlusId: data.prospectPlusId || data.id || doc.id,
        entityId: data.entityId || data.customerEntityId || data.internalid || null,
        companyName: data.companyName || 'Unknown Company',
        dialerAssigned: data.dialerAssigned || null,
        salesRepAssigned: data.salesRepAssigned || null,
        status: safeGetStatus(data.customerStatus || data.status),
        customerStatus: data.customerStatus || null,
        franchisee: data.franchisee || null,
        fieldSales: data.fieldSales || false,
        dateLeadEntered: data.dateLeadEntered || data.createdAt || null,
        assignedToDialerAt: data.assignedToDialerAt || null,
        discoveryData: data.discoveryData || null,
        visitNoteID: data.visitNoteID || null,
        isFromCompaniesCollection: isFromCompanies,
        providedShipMateOnboarding: data.providedShipMateOnboarding || false,
        firstJobCreatedAt: data.firstJobCreatedAt || null,
        jobCount: data.jobCount || 0,
        localMileTrialsRemaining: data.localMileTrialsRemaining || 0,
        localMileTermsAccepted: data.localMileTermsAccepted || false,
        bucket: data.bucket || 'outbound',
        wasOutbound: data.wasOutbound || false,
        notes: data.notes || '',
      };
    };

    const rawLeads = leadsSnap.docs.map(d => processDoc(d, false)).filter(l => l.fieldSales !== true);
    const rawCompanies = companiesSnap.docs.map(d => processDoc(d, true)).filter(l => l.fieldSales !== true);

    const leadMap = new Map<string, any>();
    for (const lead of [...rawLeads, ...rawCompanies]) {
      if (lead.isFromCompaniesCollection) {
        leadMap.set(lead.id, lead);
      } else if (!leadMap.has(lead.id)) {
        leadMap.set(lead.id, lead);
      }
    }

    const combinedLeads = Array.from(leadMap.values()).filter(l => {
      const isOutbound = l.bucket === 'outbound' || l.wasOutbound === true || !!l.dialerAssigned;
      if (!isOutbound) return false;
      const companyNameLower = (l.companyName || '').toLowerCase();
      const notesLower = (l.notes || '').toLowerCase();
      const statusLower = (l.status || '').toLowerCase();
      return !(companyNameLower.includes('website') || notesLower.includes('website') || statusLower.includes('website'));
    });

    const activeLeadMap = new Map<string, any>();
    combinedLeads.forEach(l => activeLeadMap.set(l.id, l));

    // 3. Process Activities & Calls
    const rawActivities: any[] = [];
    activitiesSnap.docs.forEach(doc => {
      const data = doc.data();
      const leadId = doc.ref.parent.parent?.id;
      if (!leadId) return;
      const lead = activeLeadMap.get(leadId);
      if (!lead) return;
      if (!isManualActivity(data)) return;

      let author = data.author || '';
      if (author.trim().toLowerCase() === 'leeroy russell') {
        author = 'Lee Russell';
      }

      const authorLower = author.toLowerCase();
      const notesLower = (data.notes || '').toLowerCase();
      if (
        authorLower.includes('system') ||
        authorLower.includes('script') ||
        authorLower.includes('backfill') ||
        notesLower.includes('performed by: system') ||
        notesLower.includes('system backfill script')
      ) {
        return;
      }

      rawActivities.push({
        id: doc.id,
        leadId,
        author,
        notes: data.notes || '',
        date: data.date || '',
        type: data.type || 'Note',
      });
    });

    const rawCalls = rawActivities
      .filter(a => a.type === 'Call')
      .map(activity => {
        const lead = activeLeadMap.get(activity.leadId)!;
        const outcomeMatch = activity.notes.match(/Outcome: ([^.]+)\./);
        const outcome = outcomeMatch ? outcomeMatch[1] : (activity.notes.includes('Initiated call to') ? 'No Answer' : 'Other');
        return {
          ...activity,
          leadName: lead.companyName,
          leadStatus: lead.status,
          dialerAssigned: lead.dialerAssigned || 'Unassigned',
          outcome,
        };
      });

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
        const parsedAttempt = parseDateString(attempt.date);
        const attemptTime = parsedAttempt ? parsedAttempt.getTime() : 0;
        const matched = outcomes.some(outcome => {
          const parsedOutcome = parseDateString(outcome.date);
          const outcomeTime = parsedOutcome ? parsedOutcome.getTime() : 0;
          return attemptTime && outcomeTime && Math.abs(outcomeTime - attemptTime) < 5 * 60 * 1000;
        });
        if (!matched) {
          finalCalls.push(attempt);
        }
      });
    });

    finalCalls.sort((a, b) => {
      const dateA = parseDateString(a.date) || new Date(0);
      const dateB = parseDateString(b.date) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // 4. Process Appointments
    const cutoffDate = new Date(2026, 6, 1);
    const appts: any[] = [];
    apptsSnap.docs.forEach(doc => {
      const data = doc.data();
      const authorLower = ((data as any).author || (data as any).createdBy || '').toLowerCase();
      const notesLower = ((data as any).notes || (data as any).title || '').toLowerCase();
      if (
        authorLower.includes('system') ||
        authorLower.includes('script') ||
        authorLower.includes('backfill') ||
        notesLower.includes('performed by: system') ||
        notesLower.includes('system backfill script')
      ) {
        return;
      }

      const apptDate = parseDateString(data.starttime || data.duedate || data.date || data.appointmentDate || (data as any).createdAt);
      if (apptDate && apptDate < cutoffDate) {
        return;
      }

      const leadId = doc.ref.parent.parent?.id;
      if (!leadId) return;
      const lead = activeLeadMap.get(leadId);
      if (!lead) return;

      appts.push({
        id: doc.id,
        leadId,
        leadName: lead.companyName,
        dialerAssigned: lead.dialerAssigned,
        leadStatus: lead.status,
        discoveryData: lead.discoveryData,
        entityId: lead.entityId,
        duedate: data.duedate || data.date || '',
        starttime: data.starttime || data.date || '',
        appointmentDate: data.appointmentDate || data.createdAt || '',
        assignedTo: data.assignedTo || data.amName || '',
        status: data.status || 'Scheduled',
        title: data.title || '',
        author: data.author || data.createdBy || '',
        notes: data.notes || '',
        franchisee: lead.franchisee || '',
        statusCategory: data.statusCategory || '',
        trialOutcome: data.trialOutcome || '',
      });
    });

    appts.sort((a, b) => {
      const dateA = parseDateString(a.starttime) || new Date(0);
      const dateB = parseDateString(b.starttime) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    const responseData = {
      leads: combinedLeads,
      activities: rawActivities,
      calls: finalCalls,
      appointments: appts,
      dialers: userList,
    };

    // Store default query results in server cache
    if (isDefaultQuery) {
      memoryCache = {
        timestamp: Date.now(),
        data: responseData,
      };
    }

    return NextResponse.json({
      success: true,
      cached: false,
      timestamp: new Date().toISOString(),
      data: responseData,
    });
  } catch (error: any) {
    console.error('Failed to fetch outbound reporting data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reporting data' },
      { status: 500 }
    );
  }
}
