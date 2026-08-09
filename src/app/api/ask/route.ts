import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { askQueryFlow } from '@/ai/flows/ask-query-flow';
import { validateQuerySpec, isQuerySpecSafe, getSydneyDateBoundaries, QuerySpec } from '@/lib/ask/query-spec';

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
  // 1. Direct string property 'franchisee'
  if (typeof userProfile.franchisee === 'string' && userProfile.franchisee.trim()) {
    return userProfile.franchisee.trim();
  }

  // 2. Direct string property 'franchiseeName'
  if (typeof userProfile.franchiseeName === 'string' && userProfile.franchiseeName.trim()) {
    return userProfile.franchiseeName.trim();
  }

  // 3. Array of linkedFranchisees objects or strings
  if (Array.isArray(userProfile.linkedFranchisees) && userProfile.linkedFranchisees.length > 0) {
    const names = userProfile.linkedFranchisees
      .map((f: any) => (typeof f === 'string' ? f : (f?.franchiseeName || f?.name)))
      .filter((n: any): n is string => typeof n === 'string' && n.trim().length > 0);
    if (names.length === 1) return names[0].trim();
    if (names.length > 1) return Array.from(new Set(names.map(n => n.trim())));
  }

  // 4. Collect all possible franchisee IDs
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
      // Try direct doc ID
      const franDoc = await db.collection('franchisees').doc(franId).get();
      if (franDoc.exists) {
        const name = franDoc.data()?.name || franDoc.data()?.franchiseeName || franDoc.data()?.territory;
        if (name && typeof name === 'string' && name.trim()) {
          names.push(name.trim());
          continue;
        }
      }

      // Try query by internalId (string or number)
      const qSnap = await db.collection('franchisees').where('internalId', '==', franId).limit(1).get();
      if (!qSnap.empty) {
        const name = qSnap.docs[0].data()?.name || qSnap.docs[0].data()?.franchiseeName || qSnap.docs[0].data()?.territory;
        if (name && typeof name === 'string' && name.trim()) {
          names.push(name.trim());
          continue;
        }
      }

      const numId = Number(franId);
      if (!isNaN(numId)) {
        const qSnapNum = await db.collection('franchisees').where('internalId', '==', numId).limit(1).get();
        if (!qSnapNum.empty) {
          const name = qSnapNum.docs[0].data()?.name || qSnapNum.docs[0].data()?.franchiseeName || qSnapNum.docs[0].data()?.territory;
          if (name && typeof name === 'string' && name.trim()) {
            names.push(name.trim());
            continue;
          }
        }
      }
    } catch (err) {
      console.warn(`[resolveUserFranchisee] Error searching franchisee ${franId}:`, err);
    }
  }

  if (names.length === 1) return names[0];
  if (names.length > 1) return Array.from(new Set(names));

  // 5. Try matching by email
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

    // 2. Fetch User Profile
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }
    const userProfile = userDoc.data() || {};

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

    // If franchisee was resolved but not set as top-level 'franchisee' on Firestore user doc, backfill it
    if (resolvedFranchisee && !userProfile.franchisee) {
      const primaryFranName = Array.isArray(resolvedFranchisee) ? resolvedFranchisee[0] : resolvedFranchisee;
      db.collection('users').doc(uid).update({ franchisee: primaryFranName }).catch(err => {
        console.warn('Failed to backfill franchisee on user doc:', err);
      });
    }

    const franchiseeStr = Array.isArray(resolvedFranchisee)
      ? resolvedFranchisee.join(', ')
      : (resolvedFranchisee || '');

    // 3. Run AI flow
    const body = await request.json();
    const { question } = body;
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

    // Franchisee scoping: Must restrict all collections to their specific franchisee territory
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

    // Non-privileged users query restrictions on 'users' collection
    if (spec.collection === 'users' && !isPrivileged && !isFranchisee) {
      // Non-privileged users can only query their own user record
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

    // Apply filters
    for (const filter of spec.filters) {
      query = query.where(filter.field, filter.op, filter.value);
    }

    if (spec.dateRange) {
      // Set query size safety constraints (retrieve more for in-memory date filtering)
      if (spec.intent === 'list') {
        query = query.limit(1000);
      } else {
        query = query.limit(5000);
      }

      // Execute Firestore query
      const snap = await query.get();
      let rows = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      // Parse and filter dates in-memory
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

      // Sort
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
          value: counts,
          columns: [spec.groupBy, 'Count'],
          rows: aggRows
        });
      }

      // Slice list view to the target limit
      const limitVal = spec.limit ? Math.min(spec.limit, 1000) : 25;
      const sliced = rows.slice(0, limitVal);
      const columns = sliced.length > 0 ? Object.keys(sliced[0]).filter(k => k !== 'id') : [];

      return NextResponse.json({
        spec,
        humanSummary: `${spec.humanSummary} — Showing ${sliced.length} result(s)`,
        rows: sliced,
        columns
      });

    } else {
      // Standard database-side execution for queries without date ranges
      if (spec.sort) {
        query = query.orderBy(spec.sort.field, spec.sort.direction);
      }

      if (spec.intent === 'count') {
        const countSnap = await query.count().get();
        const count = countSnap.data().count;
        return NextResponse.json({
          spec,
          humanSummary: `${spec.humanSummary} — Total count: ${count}`,
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
          value: counts,
          columns: [spec.groupBy, 'Count'],
          rows: aggRows
        });
      }

      const columns = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : [];

      return NextResponse.json({
        spec,
        humanSummary: `${spec.humanSummary} — Showing ${rows.length} result(s)`,
        rows,
        columns
      });
    }

  } catch (err: any) {
    console.error('Error handling /api/ask:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
