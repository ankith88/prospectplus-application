import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { askQueryFlow } from '@/ai/flows/ask-query-flow';
import { validateQuerySpec, isQuerySpecSafe, getSydneyDateBoundaries, QuerySpec } from '@/lib/ask/query-spec';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

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
          displayName: userProfile.displayName || '',
          activeRole: userProfile.activeRole || '',
          franchisee: userProfile.franchisee || '',
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
    const role = userProfile.activeRole || '';
    const isFranchisee = role === 'Franchisee';
    const isPrivileged = [
      'admin', 'super user', 'Sales Manager', 'Lead Gen Admin', 'Field Sales Admin', 'Operations', 'Data Admin'
    ].includes(role);

    // Franchisee scoping: Must restrict all collections to their specific franchisee territory
    if (isFranchisee) {
      const userFranchisee = userProfile.franchisee;
      if (!userFranchisee) {
        return NextResponse.json({ error: 'Forbidden: Franchisee user profile lacks assigned franchisee' }, { status: 403 });
      }

      if (spec.collection === 'leads' || spec.collection === 'companies') {
        // Remove any existing filters on 'franchisee' to prevent bypass, then force theirs
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee');
        spec.filters.push({ field: 'franchisee', op: '==', value: userFranchisee });
      } else if (spec.collection === 'packages') {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee_name');
        spec.filters.push({ field: 'franchisee_name', op: '==', value: userFranchisee });
      } else if (spec.collection === 'users') {
        spec.filters = spec.filters.filter(f => f.field !== 'franchisee');
        spec.filters.push({ field: 'franchisee', op: '==', value: userFranchisee });
      } else if (spec.collection === 'franchisees') {
        spec.filters = spec.filters.filter(f => f.field !== 'name');
        spec.filters.push({ field: 'name', op: '==', value: userFranchisee });
      }
    }

    // Non-privileged users query restrictions on 'users' collection
    if (spec.collection === 'users' && !isPrivileged && !isFranchisee) {
      // Non-privileged users can only query their own user record
      spec.filters = [{ field: 'email', op: '==', value: userProfile.email }];
    }

    // 6. Build and execute Firestore query
    let query: any = db.collection(spec.collection);

    // Apply filters
    for (const filter of spec.filters) {
      query = query.where(filter.field, filter.op, filter.value);
    }

    // Apply dateRange
    if (spec.dateRange) {
      const boundaries = getSydneyDateBoundaries(spec.dateRange.from || '');
      if (boundaries.from) {
        query = query.where(spec.dateRange.field, '>=', boundaries.from);
      }
      if (boundaries.to) {
        query = query.where(spec.dateRange.field, '<=', boundaries.to);
      }
    }

    // Apply sort
    if (spec.sort) {
      query = query.orderBy(spec.sort.field, spec.sort.direction);
    }

    // Apply limit clamp
    const limitVal = spec.limit ? Math.min(spec.limit, 1000) : 25;
    query = query.limit(limitVal);

    // 7. Execute based on intent
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

    // Regular list intent
    const columns = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'id') : [];

    return NextResponse.json({
      spec,
      humanSummary: `${spec.humanSummary} — Showing ${rows.length} result(s)`,
      rows,
      columns
    });

  } catch (err: any) {
    console.error('Error handling /api/ask:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
