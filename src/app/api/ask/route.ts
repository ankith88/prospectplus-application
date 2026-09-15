import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { askQueryFlow } from '@/ai/flows/ask-query-flow';
import { validateQuerySpec, isQuerySpecSafe, getSydneyDateBoundaries, QuerySpec, UserAiTrainingConfig } from '@/lib/ask/query-spec';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

const parseDateString = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    const d = new Date(dateVal);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      const d = dateVal.toDate();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if ('seconds' in dateVal && 'nanoseconds' in dateVal) {
      const d = new Date(dateVal.seconds * 1000 + dateVal.nanoseconds / 1000000);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  let cleaned = String(dateVal).trim();
  cleaned = cleaned.replace(/\s*\([^)]*\)$/, '');
  const dateTimeParts = cleaned.split(' ');
  const datePart = dateTimeParts[0];
  const dateParts = datePart.split('/');
  if (dateParts.length === 3) {
    const [day, month, year] = dateParts.map(Number);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month - 1, day, 0, 0, 0, 0);
    }
  }
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Helper to resolve franchisee name(s) for a user profile from all possible fields or Firestore lookup
 */
async function resolveUserFranchisee(userProfile: any, db: FirebaseFirestore.Firestore): Promise<string | string[] | null> {
  if (typeof userProfile.franchisee === 'string' && userProfile.franchisee.trim()) {
    return userProfile.franchisee.trim();
  }
  if (typeof userProfile.franchiseeName === 'string' && userProfile.franchiseeName.trim()) {
    return userProfile.franchiseeName.trim();
  }
  if (Array.isArray(userProfile.linkedFranchisees) && userProfile.linkedFranchisees.length > 0) {
    const names = userProfile.linkedFranchisees
      .map((f: any) => (typeof f === 'string' ? f : (f?.franchiseeName || f?.name)))
      .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0);
    if (names.length === 1) return names[0].trim();
    if (names.length > 1) return Array.from(new Set(names.map((n: string) => n.trim())));
  }

  const possibleIds: string[] = [];
  if (userProfile.franchiseeId) possibleIds.push(String(userProfile.franchiseeId));
  if (userProfile.franchiseeInternalId) possibleIds.push(String(userProfile.franchiseeInternalId));
  if (Array.isArray(userProfile.linkedFranchiseeIds)) {
    userProfile.linkedFranchiseeIds.forEach((id: any) => {
      if (id) possibleIds.push(String(id));
    });
  }

  const uniqueIds = Array.from(new Set(possibleIds)).filter(Boolean);
  const names: string[] = [];

  for (const franId of uniqueIds) {
    try {
      const franDoc = await db.collection('franchisees').doc(franId).get();
      if (franDoc.exists) {
        const name = franDoc.data()?.name || franDoc.data()?.franchiseeName || franDoc.data()?.territory;
        if (name && typeof name === 'string' && name.trim()) {
          names.push(name.trim());
          continue;
        }
      }

      const qSnap = await db.collection('franchisees').where('internalId', '==', franId).limit(1).get();
      if (!qSnap.empty) {
        const name = qSnap.docs[0].data()?.name || qSnap.docs[0].data()?.franchiseeName || qSnap.docs[0].data()?.territory;
        if (name && typeof name === 'string' && name.trim()) {
          names.push(name.trim());
          continue;
        }
      }
    } catch (err) {
      console.warn(`[resolveUserFranchisee] Error searching franchisee ${franId}:`, err);
    }
  }

  if (names.length === 1) return names[0];
  if (names.length > 1) return Array.from(new Set(names));

  const userEmail = userProfile.email || userProfile.personalEmail;
  if (userEmail && typeof userEmail === 'string') {
    try {
      const emailSnap = await db.collection('franchisees').where('email', '==', userEmail).limit(1).get();
      if (!emailSnap.empty) {
        const name = emailSnap.docs[0].data()?.name || emailSnap.docs[0].data()?.franchiseeName || emailSnap.docs[0].data()?.territory;
        if (name && typeof name === 'string' && name.trim()) {
          return name.trim();
        }
      }
    } catch (err) {
      console.warn(`[resolveUserFranchisee] Error matching by email:`, err);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
    } catch (err) {
      console.error('ID Token verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid ID Token' }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // 2. Fetch User Profile & User Training Configuration
    const [userDoc, trainingDoc] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('ai_training').doc('preferences').get()
    ]);

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }
    const userProfile = userDoc.data() || {};
    const trainingConfig: UserAiTrainingConfig = trainingDoc.exists ? (trainingDoc.data() as UserAiTrainingConfig) : {};

    const role = (
      userProfile.activeRole ||
      userProfile.role ||
      userProfile.defaultRole ||
      (Array.isArray(userProfile.assignedRoles) && userProfile.assignedRoles[0]) ||
      ''
    ).trim();

    const userAssignedRoles: string[] = Array.isArray(userProfile.assignedRoles)
      ? userProfile.assignedRoles.map((r: any) => String(r).toLowerCase())
      : [];

    const privilegedRoles = [
      'admin', 'super user', 'superadmin', 'sales manager', 'lead gen admin', 'field sales admin', 'operations', 'data admin'
    ];

    const isPrivileged = privilegedRoles.includes(role.toLowerCase()) ||
      userAssignedRoles.some(r => privilegedRoles.includes(r));

    const resolvedFranchisee = await resolveUserFranchisee(userProfile, db);

    if (resolvedFranchisee && !userProfile.franchisee) {
      const primaryFranName = Array.isArray(resolvedFranchisee) ? resolvedFranchisee[0] : resolvedFranchisee;
      db.collection('users').doc(uid).update({ franchisee: primaryFranName }).catch(err => {
        console.warn('Failed to backfill franchisee on user doc:', err);
      });
    }

    const franchiseeStr = Array.isArray(resolvedFranchisee)
      ? resolvedFranchisee.join(', ')
      : (resolvedFranchisee || '');

    // 3. Parse Request Body
    const body = await request.json();
    const { question, conversationHistory, previousSpec } = body;
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    let spec: QuerySpec;
    try {
      spec = await askQueryFlow({
        question,
        userProfile: {
          uid,
          email: userProfile.email || '',
          displayName: userProfile.displayName || userProfile.name || '',
          activeRole: role,
          franchisee: franchiseeStr,
        },
        conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
        previousSpec: previousSpec || null,
        userTrainingConfig: {
          customInstructions: trainingConfig.customInstructions || '',
          defaultChartType: trainingConfig.defaultChartType || 'bar',
          customVocabulary: trainingConfig.customVocabulary || [],
          corrections: trainingConfig.corrections || []
        }
      });
    } catch (flowErr: any) {
      console.error('Genkit askQueryFlow failed:', flowErr);
      return NextResponse.json({
        error: "I couldn't process this question. Try rephrasing or clicking one of the example questions.",
        suggestions: [
          'Show my hot leads',
          'Count leads by status',
          'Quotes sent this week'
        ]
      }, { status: 200 });
    }

    // 4. Server-side validation of the QuerySpec (prevent AI jailbreaks)
    if (!validateQuerySpec(spec)) {
      return NextResponse.json({
        error: "I'm sorry, I couldn't translate that question into a valid secure query. Try using simpler terms.",
        suggestions: [
          'Show my hot leads',
          'Count leads by status',
          'Quotes sent this week'
        ]
      }, { status: 200 });
    }

    if (!isQuerySpecSafe(spec)) {
      return NextResponse.json({
        error: "To run this query, please narrow your search by specifying a date range (e.g. 'this week', 'last month') or an assignment/territory filter.",
        suggestions: [
          'Show my hot leads this week',
          'Count leads by status in Sydney franchisee territory',
          'Quotes sent this month'
        ]
      }, { status: 200 });
    }

    // 5. Inject role-based scope restrictions
    const isFranchisee = role.toLowerCase() === 'franchisee' && !isPrivileged;

    if (isFranchisee) {
      if (!resolvedFranchisee) {
        return NextResponse.json({
          error: "Your account is set to the Franchisee role, but no assigned franchisee territory was found on your profile. Please contact an administrator to link your account.",
          suggestions: [
            'Show my hot leads',
            'Count leads by status',
            'Quotes sent this week'
          ]
        }, { status: 200 });
      }

      const isArrayFran = Array.isArray(resolvedFranchisee);
      const franOp = isArrayFran ? 'in' : '==';
      const franValue = resolvedFranchisee;

      if (spec.collection === 'leads' || spec.collection === 'companies') {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee');
        spec.filters.push({ field: 'franchisee', op: franOp, value: franValue });
      } else if (spec.collection === 'packages') {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee_name');
        spec.filters.push({ field: 'franchisee_name', op: franOp, value: franValue });
      } else if (spec.collection === 'users') {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee');
        spec.filters.push({ field: 'franchisee', op: franOp, value: franValue });
      } else if (spec.collection === 'franchisees') {
        spec.filters = spec.filters.filter(f => f.field !== 'name');
        spec.filters.push({ field: 'name', op: franOp, value: franValue });
      } else if (['visitnotes', 'cancellations', 'scfs', 'checkins', 'contacts', 'invoices', 'buckethistory', 'leadhistory'].includes(spec.collection)) {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee');
        spec.filters.push({ field: 'franchisee', op: franOp, value: franValue });
      }
    }

    if (spec.collection === 'users' && !isPrivileged && !isFranchisee) {
      spec.filters = [{ field: 'email', op: '==', value: userProfile.email }];
    }

    // 6. Build and execute Firestore query
    let query: any;
    if (['activity', 'tasks', 'appointments', 'contacts', 'scfs', 'checkins', 'routes', 'invoices'].includes(spec.collection)) {
      query = db.collectionGroup(spec.collection);
    } else if (spec.collection === 'buckethistory' || spec.collection === 'leadhistory') {
      query = db.collectionGroup('bucket_history');
    } else {
      query = db.collection(spec.collection);
    }

    for (const filter of spec.filters) {
      query = query.where(filter.field, filter.op, filter.value);
    }

    const defaultChart = spec.chartType || (spec.intent === 'aggregate' ? (trainingConfig.defaultChartType || 'bar') : (spec.intent === 'list' ? 'table' : 'none'));

    if (spec.dateRange) {
      if (spec.intent === 'list') {
        query = query.limit(1000);
      } else {
        query = query.limit(5000);
      }

      const snap = await query.get();
      let rows = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      const boundaries = getSydneyDateBoundaries(spec.dateRange.from || '');
      const fromDate = boundaries.from ? new Date(boundaries.from) : null;
      const toDate = boundaries.to ? new Date(boundaries.to) : null;

      rows = rows.filter((row: any) => {
        const dateVal = row[spec.dateRange!.field];
        const parsedDate = parseDateString(dateVal);
        if (!parsedDate) return false;
        if (fromDate && parsedDate < fromDate) return false;
        if (toDate && parsedDate > toDate) return false;
        return true;
      });

      if (spec.sort) {
        const { field, direction } = spec.sort;
        rows.sort((a: any, b: any) => {
          let valA = a[field];
          let valB = b[field];
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      if (spec.intent === 'count') {
        const count = rows.length;
        return NextResponse.json({
          spec,
          humanSummary: `${spec.humanSummary} — Total count: ${count}`,
          insights: spec.insights || `Found ${count} total records matching the criteria.`,
          chartType: 'none',
          suggestedFollowUps: spec.suggestedFollowUps || ['Show me the detailed list', 'Break down by status', 'Export report to CSV'],
          value: count,
          columns: ['Count'],
          rows: [{ count }]
        });
      }

      if (spec.intent === 'aggregate' && spec.groupBy) {
        const counts: Record<string, number> = {};
        for (const row of rows) {
          const val: any = row[spec.groupBy] || 'Unknown';
          const key = Array.isArray(val) ? val.join(', ') : String(val);
          counts[key] = (counts[key] || 0) + 1;
        }
        const aggRows = Object.entries(counts).map(([group, count]) => ({ group, count }));
        return NextResponse.json({
          spec,
          humanSummary: `${spec.humanSummary} — Grouped by ${spec.groupBy}`,
          insights: spec.insights || `Grouped ${rows.length} records into ${aggRows.length} categories by ${spec.groupBy}.`,
          chartType: defaultChart,
          suggestedFollowUps: spec.suggestedFollowUps || [`Show records in top ${spec.groupBy}`, 'Export as PDF Report', 'Compare with previous period'],
          value: counts,
          columns: [spec.groupBy, 'Count'],
          rows: aggRows
        });
      }

      const limitVal = spec.limit ? Math.min(spec.limit, 1000) : 25;
      const sliced = rows.slice(0, limitVal);
      const columns = sliced.length > 0 ? Object.keys(sliced[0]).filter(k => k !== 'id') : [];

      return NextResponse.json({
        spec,
        humanSummary: `${spec.humanSummary} — Showing ${sliced.length} result(s)`,
        insights: spec.insights || `Retrieved ${sliced.length} records. Click any row for instant details.`,
        chartType: 'table',
        suggestedFollowUps: spec.suggestedFollowUps || ['Group these results by status', 'Export to CSV', 'Create follow-up task'],
        rows: sliced,
        columns
      });

    } else {
      if (spec.sort) {
        query = query.orderBy(spec.sort.field, spec.sort.direction);
      }

      if (spec.intent === 'count') {
        const countSnap = await query.count().get();
        const count = countSnap.data().count;
        return NextResponse.json({
          spec,
          humanSummary: `${spec.humanSummary} — Total count: ${count}`,
          insights: spec.insights || `Found ${count} total records matching the criteria.`,
          chartType: 'none',
          suggestedFollowUps: spec.suggestedFollowUps || ['Show me the detailed list', 'Break down by status', 'Export to CSV'],
          value: count,
          columns: ['Count'],
          rows: [{ count }]
        });
      }

      if (spec.intent === 'list') {
        const limitVal = spec.limit ? Math.min(spec.limit, 1000) : 25;
        query = query.limit(limitVal);
      } else {
        query = query.limit(5000);
      }

      const snap = await query.get();
      const rows = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      if (spec.intent === 'aggregate' && spec.groupBy) {
        const counts: Record<string, number> = {};
        for (const row of rows) {
          const val: any = row[spec.groupBy] || 'Unknown';
          const key = Array.isArray(val) ? val.join(', ') : String(val);
          counts[key] = (counts[key] || 0) + 1;
        }
        const aggRows = Object.entries(counts).map(([group, count]) => ({ group, count }));
        return NextResponse.json({
          spec,
          humanSummary: `${spec.humanSummary} — Grouped by ${spec.groupBy}`,
          insights: spec.insights || `Grouped ${rows.length} records into ${aggRows.length} categories by ${spec.groupBy}.`,
          chartType: defaultChart,
          suggestedFollowUps: spec.suggestedFollowUps || [`Show records in top ${spec.groupBy}`, 'Export as PDF Report', 'Compare with previous period'],
          value: counts,
          columns: [spec.groupBy, 'Count'],
          rows: aggRows
        });
      }

      const columns = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : [];

      return NextResponse.json({
        spec,
        humanSummary: `${spec.humanSummary} — Showing ${rows.length} result(s)`,
        insights: spec.insights || `Retrieved ${rows.length} records. Click any row for instant details.`,
        chartType: 'table',
        suggestedFollowUps: spec.suggestedFollowUps || ['Group these results by status', 'Export to CSV', 'Create follow-up task'],
        rows,
        columns
      });
    }

  } catch (err: any) {
    console.error('Error handling /api/ask:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
