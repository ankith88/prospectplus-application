import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { UserAiTrainingConfig } from '@/lib/ask/query-spec';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

async function authenticate(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.substring(7);
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await db.collection('users').doc(uid).collection('ai_training').doc('preferences').get();
    if (!doc.exists) {
      const defaultConfig: UserAiTrainingConfig = {
        userId: uid,
        customInstructions: '',
        defaultChartType: 'bar',
        bookmarkedQueries: [
          { id: '1', label: '🔥 My Hot Leads', queryText: 'Show my hot leads this week', icon: 'Flame' },
          { id: '2', label: '📊 Leads by Status', queryText: 'Count leads by status', icon: 'BarChart' },
          { id: '3', label: '🧾 Invoices Last Month', queryText: 'Show invoices from last month', icon: 'Receipt' },
          { id: '4', label: '🚚 LocalMile Active', queryText: 'Show LocalMile customers with terms accepted', icon: 'Truck' },
        ],
        customVocabulary: [],
        corrections: []
      };
      return NextResponse.json(defaultConfig);
    }

    return NextResponse.json({ userId: uid, ...doc.data() });
  } catch (err: any) {
    console.error('Error in GET /api/ask/training:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch AI training settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await authenticate(request);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customInstructions, defaultChartType, bookmarkedQueries, customVocabulary, corrections } = body;

    const dataToSave: Partial<UserAiTrainingConfig> = {
      userId: uid,
      ...(customInstructions !== undefined && { customInstructions: String(customInstructions).trim() }),
      ...(defaultChartType !== undefined && { defaultChartType }),
      ...(Array.isArray(bookmarkedQueries) && { bookmarkedQueries }),
      ...(Array.isArray(customVocabulary) && { customVocabulary }),
      ...(Array.isArray(corrections) && { corrections }),
    };

    await db.collection('users').doc(uid).collection('ai_training').doc('preferences').set(dataToSave, { merge: true });

    return NextResponse.json({ success: true, config: dataToSave });
  } catch (err: any) {
    console.error('Error in POST /api/ask/training:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save AI training settings' }, { status: 500 });
  }
}
