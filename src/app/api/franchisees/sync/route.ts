import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body || {};

    const db = adminApp.firestore();
    const franchiseesRef = db.collection('franchisees');
    const syncedData: any[] = [];

    let docSnaps: FirebaseFirestore.DocumentSnapshot[] = [];

    if (Array.isArray(ids) && ids.length > 0) {
      const docRefs = ids.map(id => franchiseesRef.doc(String(id)));
      docSnaps = await db.getAll(...docRefs);
    } else {
      const snapshot = await franchiseesRef.get();
      docSnaps = snapshot.docs;
    }

    for (const docSnap of docSnaps) {
      if (docSnap.exists) {
        const data = docSnap.data() || {};
        const docId = docSnap.id;
        const numericDocId = /^\d+$/.test(docId) ? parseInt(docId, 10) : docId;
        
        syncedData.push({
          document_id: numericDocId,
          ...data
        });
      }
    }

    if (syncedData.length === 0) {
      return NextResponse.json({ success: false, message: 'No matching franchisees found to sync' }, { status: 404 });
    }

    // Call the MailPlus API
    const apiKey = process.env.RTA_GENERAL_API_KEY || process.env.MAILPLUS_GENERAL_API_KEY || '708aa067-d67d-73e6-8967-66786247f5d7';
    const response = await fetch('https://app.mailplus.com.au/api/v2/franchisees', {
      method: 'POST',
      headers: {
        'RTA_GENERAL_API_KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncedData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MailPlus API returned status ${response.status}: ${errorText}`);
    }

    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      // Handle non-JSON response or empty body
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${syncedData.length} franchisee(s)`,
      result 
    });

  } catch (error: any) {
    console.error('[API /franchisees/sync] Fatal error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
