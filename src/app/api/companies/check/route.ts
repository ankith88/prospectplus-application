import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function GET(req: NextRequest) {
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
    const id = searchParams.get('id') || searchParams.get('companyId');
    const companyName = searchParams.get('companyName');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const internalid = searchParams.get('internalid') || searchParams.get('internalId');

    if (!id && !companyName && !email && !phone && !internalid) {
      return NextResponse.json(
        { success: false, message: 'Please provide id, companyId, companyName, email, phone, or internalid to check company existence' },
        { status: 400 }
      );
    }

    if (id) {
      const docRef = db.collection('companies').doc(id);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        return NextResponse.json({
          success: true,
          exists: true,
          company: { id: docSnap.id, ...data }
        });
      }
    }

    let queryRef: FirebaseFirestore.Query = db.collection('companies');

    if (internalid) {
      queryRef = queryRef.where('internalid', '==', internalid);
    } else if (companyName) {
      queryRef = queryRef.where('companyName', '==', companyName);
    } else if (email) {
      queryRef = queryRef.where('customerServiceEmail', '==', email);
    } else if (phone) {
      queryRef = queryRef.where('customerPhone', '==', phone);
    }

    let querySnapshot = await queryRef.get();

    if (querySnapshot.empty && internalid && !isNaN(Number(internalid))) {
      querySnapshot = await db.collection('companies').where('internalid', '==', Number(internalid)).get();
    }

    if (!querySnapshot.empty) {
      const firstDoc = querySnapshot.docs[0];
      return NextResponse.json({
        success: true,
        exists: true,
        company: { id: firstDoc.id, ...firstDoc.data() }
      });
    }

    return NextResponse.json({ success: true, exists: false, message: 'Company not found' });
  } catch (error: any) {
    console.error('Company Check API Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
