import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function POST(
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
    const rawCompanyId = resolvedParams.id;

    if (!rawCompanyId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameter: companyId' },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Empty payload provided' },
        { status: 400 }
      );
    }

    // Resolve company document ID (supports doc ID or internalid)
    let companyDocId = rawCompanyId;
    let companyDoc = await db.collection('companies').doc(companyDocId).get();

    if (!companyDoc.exists) {
      let querySnap = await db.collection('companies').where('internalid', '==', rawCompanyId).limit(1).get();
      if (querySnap.empty && !isNaN(Number(rawCompanyId))) {
        querySnap = await db.collection('companies').where('internalid', '==', Number(rawCompanyId)).limit(1).get();
      }
      if (querySnap.empty) {
        querySnap = await db.collection('companies').where('internalId', '==', rawCompanyId).limit(1).get();
      }

      if (!querySnap.empty) {
        companyDocId = querySnap.docs[0].id;
      } else {
        return NextResponse.json(
          { success: false, message: 'Company not found' },
          { status: 404 }
        );
      }
    }

    const invoicesRef = db.collection('companies').doc(companyDocId).collection('invoices');

    // Determine target document ID
    const docId = String(
      body.invoiceDocumentID || body.invoiceInternalID || body.invoiceNum || body.id || invoicesRef.doc().id
    );

    // Format items if provided
    let items: any[] = [];
    if (Array.isArray(body.items)) {
      items = body.items.map((item: any) => ({
        service: item.service || item.description || item.name || '',
        rate: Number(item.rate || 0),
        qty: Number(item.qty || item.quantity || 1),
        totalAmount: Number(item.totalAmount || item.amount || (Number(item.rate || 0) * Number(item.qty || item.quantity || 1)))
      }));
    }

    const invoicePayload = {
      invoiceDate: body.invoiceDate || new Date().toISOString(),
      invoiceDocumentID: body.invoiceDocumentID || body.invoiceNum || docId,
      invoiceInternalID: body.invoiceInternalID || body.internalid || '',
      invoiceStatus: body.invoiceStatus || body.status || 'Paid In Full',
      invoiceTotal: body.invoiceTotal != null ? String(body.invoiceTotal) : '0.00',
      invoiceType: body.invoiceType || 'Service Invoice',
      invoiceURL: body.invoiceURL || '',
      syncedWithNetSuite: body.syncedWithNetSuite !== undefined ? Boolean(body.syncedWithNetSuite) : true,
      items: items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await invoicesRef.doc(docId).set(invoicePayload, { merge: true });

    return NextResponse.json(
      {
        success: true,
        message: 'Invoice document created successfully',
        companyId: companyDocId,
        invoiceId: docId,
        invoice: invoicePayload
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Invoice Creation API Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
