import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { isManualActivity } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  timestamp: number;
  data: any;
}

// In-memory cache keyed by date range for fast sub-second loads (60s TTL)
const memoryCacheMap = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

function safeGetStatus(val: any): string {
  if (!val) return 'Uncontacted';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === 'SUSPECT-Unqualified' || trimmed === 'SUSPECT - Unqualified') return 'New';
    let clean = trimmed.replace(/^(SUSPECT|Customer)\s*-\s*/i, '');
    if (clean === 'Signed') return 'Won';
    return clean;
  }
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

function sanitizeString(val: any, maxLength?: number): string {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'string' ? val : String(val);
  // Strip ASCII control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F) that cause JSON parse syntax errors
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (maxLength && str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const now = Date.now();

    // Calculate start boundary
    let startISO = new Date(2026, 6, 1).toISOString(); // Default 1st July 2026
    if (startDateParam) {
      const parsedStart = new Date(startDateParam);
      if (!isNaN(parsedStart.getTime())) {
        startISO = parsedStart.toISOString();
      }
    }

    const cacheKey = `${startISO}_${endDateParam || ''}`;
    const cachedEntry = memoryCacheMap.get(cacheKey);

    // Return in-memory cached data if available and fresh (< 60s)
    if (!forceRefresh && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        cached: true,
        cachedAt: new Date(cachedEntry.timestamp).toISOString(),
        data: cachedEntry.data
      });
    }

    const db = getFirestore(adminApp);

    // 1. Filter activities by manual types ('Call', 'Email', 'Note', 'Meeting', 'Task')
    // This avoids fetching 180,000+ automated background 'Update' logs that take 60-80s
    let activityQuery = db.collectionGroup('activity')
      .where('type', 'in', ['Call', 'Email', 'Note', 'Meeting', 'Task'])
      .where('date', '>=', startISO);

    if (endDateParam) {
      const parsedEnd = new Date(endDateParam);
      if (!isNaN(parsedEnd.getTime())) {
        activityQuery = activityQuery.where('date', '<=', parsedEnd.toISOString());
      }
    }

    // 2. Fetch Users to identify active Dialers
    const usersQuery = db.collection('users')
      .select('firstName', 'lastName', 'displayName', 'email', 'role', 'activeRole', 'assignedRoles', 'disabled');

    const apptQuery = db.collectionGroup('appointments');

    const [activitiesSnap, apptsSnap, usersSnap] = await Promise.all([
      activityQuery.get(),
      apptQuery.get(),
      usersQuery.get()
    ]);

    // Process User/Dialer List (strictly Outbound Dialers & Lead Gen reps, excluding AMs/Managers)
    const userList: string[] = [];
    usersSnap.docs.forEach(doc => {
      const data = doc.data();
      const name = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || data.email;
      if (!name || data.disabled) return;

      const role = (data.role || '').toLowerCase().trim();
      const activeRole = (data.activeRole || '').toLowerCase().trim();
      const assignedRoles = (data.assignedRoles || []).map((r: string) => (r || '').toLowerCase().trim());

      const isDialerRole =
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
        assignedRoles.includes('lead gen') ||
        role === 'lead_gen' ||
        activeRole === 'lead_gen' ||
        assignedRoles.includes('lead_gen') ||
        role === 'leadgen' ||
        activeRole === 'leadgen' ||
        assignedRoles.includes('leadgen');

      if (isDialerRole) {
        userList.push(name);
      }
    });

    const dialersParam = searchParams.get('dialers');
    const targetDialers = dialersParam 
      ? dialersParam.split(',').map(s => s.trim()).filter(Boolean)
      : userList;

    // 3. Process Leads & Companies into Lean Objects with targeted fetching
    const leadFields = [
      'companyName', 'status', 'customerStatus', 'dialerAssigned', 'salesRepAssigned',
      'franchisee', 'fieldSales', 'dateLeadEntered', 'createdAt', 'assignedToDialerAt',
      'visitNoteID', 'providedShipMateOnboarding', 'firstJobCreatedAt', 'jobCount',
      'localMileTrialsRemaining', 'localMileTermsAccepted', 'wasOutbound', 'notes',
      'discoveryData', 'entityId', 'prospectPlusId', 'customerEntityId', 'internalid', 'bucket',
      'dateLocalmileAccepted', 'localMileAcceptedAt', 'dateRegistrationSent', 'registrationSentAt', 'bucketHistory',
      'customerSource', 'source', 'leadSource', 'wasInbound', 'inboundDetails', 'inboundPageUrl', 'pageURL'
    ];

    const leadMap = new Map<string, any>();

    const processDoc = (doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot, isFromCompanies = false) => {
      const data = doc.data();
      if (!data) return null;
      return {
        id: doc.id,
        prospectPlusId: data.prospectPlusId || data.id || doc.id,
        entityId: data.entityId || data.customerEntityId || data.internalid || null,
        companyName: sanitizeString(data.companyName || 'Unknown Company', 200),
        dialerAssigned: sanitizeString(data.dialerAssigned, 100) || null,
        salesRepAssigned: sanitizeString(data.salesRepAssigned, 100) || null,
        status: safeGetStatus(data.customerStatus || data.status),
        customerStatus: data.customerStatus || null,
        franchisee: sanitizeString(data.franchisee, 100) || null,
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
        dateLocalmileAccepted: data.dateLocalmileAccepted || null,
        localMileAcceptedAt: data.localMileAcceptedAt || null,
        dateRegistrationSent: data.dateRegistrationSent || null,
        registrationSentAt: data.registrationSentAt || null,
        bucketHistory: Array.isArray(data.bucketHistory) ? data.bucketHistory : [],
        bucket: data.bucket || 'outbound',
        wasOutbound: data.wasOutbound || false,
        notes: sanitizeString(data.notes, 1000),
        customerSource: data.customerSource || data.source || data.leadSource || null,
        wasInbound: data.wasInbound || false,
        inboundDetails: typeof data.inboundDetails === 'object' ? data.inboundDetails : sanitizeString(data.inboundDetails, 500),
        inboundPageUrl: sanitizeString(data.inboundPageUrl || data.pageURL, 500) || null,
      };
    };

    // Run targeted queries for outbound bucket & dialer assigned leads
    const targetedLeadPromises: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
    
    // Outbound bucket queries
    targetedLeadPromises.push(db.collection('leads').where('bucket', '==', 'outbound').select(...leadFields).get());
    targetedLeadPromises.push(db.collection('companies').where('bucket', '==', 'outbound').select(...leadFields).get());
    targetedLeadPromises.push(db.collection('leads').where('wasOutbound', '==', true).select(...leadFields).get());
    targetedLeadPromises.push(db.collection('companies').where('wasOutbound', '==', true).select(...leadFields).get());

    // Dialer assigned queries in chunks of 10
    const dialerChunks: string[][] = [];
    for (let i = 0; i < targetDialers.length; i += 10) {
      dialerChunks.push(targetDialers.slice(i, i + 10));
    }
    dialerChunks.forEach(chunk => {
      targetedLeadPromises.push(db.collection('leads').where('dialerAssigned', 'in', chunk).select(...leadFields).get());
      targetedLeadPromises.push(db.collection('companies').where('dialerAssigned', 'in', chunk).select(...leadFields).get());
    });

    const targetedSnaps = await Promise.all(targetedLeadPromises);
    targetedSnaps.forEach((snap, idx) => {
      const isCompany = idx % 2 === 1;
      snap.docs.forEach(doc => {
        const processed = processDoc(doc, isCompany);
        if (processed && processed.fieldSales !== true) {
          if (isCompany) {
            leadMap.set(doc.id, processed);
          } else if (!leadMap.has(doc.id)) {
            leadMap.set(doc.id, processed);
          }
        }
      });
    });

    // Also collect all active lead IDs from activities and appointments that may not have matched the above
    const activeLeadIds = new Set<string>();
    activitiesSnap.docs.forEach(doc => {
      const leadId = doc.ref.parent.parent?.id;
      if (leadId) activeLeadIds.add(leadId);
    });
    apptsSnap.docs.forEach(doc => {
      const leadId = doc.ref.parent.parent?.id;
      if (leadId) activeLeadIds.add(leadId);
    });

    const missingLeadIds = Array.from(activeLeadIds).filter(id => !leadMap.has(id));
    if (missingLeadIds.length > 0) {
      const leadRefs = missingLeadIds.map(id => db.collection('leads').doc(id));
      const companyRefs = missingLeadIds.map(id => db.collection('companies').doc(id));
      
      const batchSize = 100;
      const allBatches: Promise<FirebaseFirestore.DocumentSnapshot[]>[] = [];
      for (let i = 0; i < leadRefs.length; i += batchSize) {
        allBatches.push(db.getAll(...leadRefs.slice(i, i + batchSize)));
      }
      for (let i = 0; i < companyRefs.length; i += batchSize) {
        allBatches.push(db.getAll(...companyRefs.slice(i, i + batchSize)));
      }

      const batchResults = await Promise.all(allBatches);
      batchResults.forEach((docSnaps, bIdx) => {
        const isCompanyBatch = bIdx >= Math.ceil(leadRefs.length / batchSize);
        docSnaps.forEach(docSnap => {
          if (docSnap.exists) {
            const processed = processDoc(docSnap, isCompanyBatch);
            if (processed && processed.fieldSales !== true) {
              if (isCompanyBatch) {
                leadMap.set(docSnap.id, processed);
              } else if (!leadMap.has(docSnap.id)) {
                leadMap.set(docSnap.id, processed);
              }
            }
          }
        });
      });
    }

    const combinedLeads = Array.from(leadMap.values()).filter(l => {
      // Must be in Outbound bucket, have Outbound history, or be assigned to an active dialer
      const currentBucket = (l.bucket || (l.fieldSales ? 'field_sales' : 'outbound')).toLowerCase();
      const isCurrentlyOutbound = currentBucket === 'outbound';
      const wasOutboundFlag = l.wasOutbound === true;
      const wasInBucketHistory = Array.isArray(l.bucketHistory) && l.bucketHistory.some((bh: any) => 
        (bh.oldBucket || '').toLowerCase() === 'outbound' || (bh.newBucket || '').toLowerCase() === 'outbound'
      );

      const isAssignedToActiveDialer = !!l.dialerAssigned && userList.some(dialerName => {
        const dLower = dialerName.toLowerCase().trim().replace(/\bleeroy\b/g, 'lee');
        const assignedLower = (l.dialerAssigned || '').toLowerCase().trim().replace(/\bleeroy\b/g, 'lee');
        return assignedLower === dLower || assignedLower.startsWith(dLower) || dLower.startsWith(assignedLower);
      });

      return isCurrentlyOutbound || wasOutboundFlag || wasInBucketHistory || isAssignedToActiveDialer;
    });

    const activeLeadMap = new Map<string, any>();
    combinedLeads.forEach(l => activeLeadMap.set(l.id, l));

    // Process Activities & Calls
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
        author: sanitizeString(author, 100),
        notes: sanitizeString(data.notes, 1000),
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

    // Process Appointments
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
        leadName: sanitizeString(lead.companyName, 200),
        dialerAssigned: sanitizeString(lead.dialerAssigned, 100),
        leadStatus: lead.status,
        discoveryData: lead.discoveryData,
        entityId: lead.entityId,
        duedate: data.duedate || data.date || '',
        starttime: data.starttime || data.date || '',
        appointmentDate: data.appointmentDate || data.createdAt || '',
        assignedTo: sanitizeString(data.assignedTo || data.amName, 100),
        status: data.status || 'Scheduled',
        title: sanitizeString(data.title, 200),
        author: sanitizeString(data.author || data.createdBy, 100),
        notes: sanitizeString(data.notes, 1000),
        franchisee: sanitizeString(lead.franchisee, 100),
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

    // Store query results in memory cache
    memoryCacheMap.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData,
    });

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
