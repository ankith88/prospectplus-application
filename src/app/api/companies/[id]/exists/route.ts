import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const { searchParams } = new URL(req.url);
  const apiKeyQuery = searchParams.get('api_key');
  const providedKey = apiKeyHeader || apiKeyQuery;

  const API_KEY = process.env.PROSPECTPLUS_API_KEY || process.env.NETSUITE_API_KEY;

  if (API_KEY && providedKey !== API_KEY) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized. Please provide a valid X-API-KEY or api_key parameter.' },
      { status: 401 }
    );
  }

  try {
    const resolvedParams = await params;
    const companyId = resolvedParams.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameter: companyId' },
        { status: 400 }
      );
    }

    const docRef = db.collection('companies').doc(String(companyId));
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      return NextResponse.json({
        success: true,
        exists: true,
        company: {
          id: docSnap.id,
          companyName: data?.companyName || data?.name || '',
          internalid: data?.internalid || data?.internalId || '',
          status: data?.status || ''
        }
      });
    }

    // Fallback search by internalid / internalId
    let querySnap = await db.collection('companies').where('internalid', '==', companyId).limit(1).get();
    if (querySnap.empty && !isNaN(Number(companyId))) {
      querySnap = await db.collection('companies').where('internalid', '==', Number(companyId)).limit(1).get();
    }
    if (querySnap.empty) {
      querySnap = await db.collection('companies').where('internalId', '==', companyId).limit(1).get();
    }

    if (!querySnap.empty) {
      const matchedDoc = querySnap.docs[0];
      const data = matchedDoc.data();
      return NextResponse.json({
        success: true,
        exists: true,
        company: {
          id: matchedDoc.id,
          companyName: data?.companyName || data?.name || '',
          internalid: data?.internalid || data?.internalId || '',
          status: data?.status || ''
        }
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: 'Company not found'
    });
  } catch (error: any) {
    console.error('Company Exists API Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
