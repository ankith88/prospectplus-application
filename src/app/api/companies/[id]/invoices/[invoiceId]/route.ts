import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

async function handleUpdate(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
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
    const rawInvoiceId = resolvedParams.invoiceId;

    if (!rawCompanyId || !rawInvoiceId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters: companyId or invoiceId' },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Empty update payload provided' },
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

    // Resolve invoice document ID
    let targetInvoiceDocId = rawInvoiceId;
    let invoiceDoc = await invoicesRef.doc(targetInvoiceDocId).get();

    if (!invoiceDoc.exists) {
      let qSnap = await invoicesRef.where('invoiceInternalID', '==', rawInvoiceId).limit(1).get();
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('invoiceNum', '==', rawInvoiceId).limit(1).get();
      }
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('invoiceDocumentID', '==', rawInvoiceId).limit(1).get();
      }
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('documentId', '==', rawInvoiceId).limit(1).get();
      }

      if (!qSnap.empty) {
        targetInvoiceDocId = qSnap.docs[0].id;
        invoiceDoc = qSnap.docs[0];
      }
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (body.invoiceStatus !== undefined || body.status !== undefined) {
      updatePayload.invoiceStatus = body.invoiceStatus || body.status;
      updatePayload.status = body.invoiceStatus || body.status;
    }

    if (body.invoiceTotal !== undefined) {
      updatePayload.invoiceTotal = String(body.invoiceTotal);
    }

    if (body.invoiceDate !== undefined) {
      updatePayload.invoiceDate = body.invoiceDate;
    }

    if (body.invoiceURL !== undefined) {
      updatePayload.invoiceURL = body.invoiceURL;
    }

    if (body.syncedWithNetSuite !== undefined) {
      updatePayload.syncedWithNetSuite = Boolean(body.syncedWithNetSuite);
    }

    if (Array.isArray(body.items)) {
      updatePayload.items = body.items.map((item: any) => ({
        service: item.service || item.description || item.name || '',
        rate: Number(item.rate || 0),
        qty: Number(item.qty || item.quantity || 1),
        totalAmount: Number(item.totalAmount || item.amount || (Number(item.rate || 0) * Number(item.qty || item.quantity || 1)))
      }));
    }

    await invoicesRef.doc(targetInvoiceDocId).set(updatePayload, { merge: true });

    const finalDocSnap = await invoicesRef.doc(targetInvoiceDocId).get();

    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      companyId: companyDocId,
      invoiceId: targetInvoiceDocId,
      invoice: { id: finalDocSnap.id, ...finalDocSnap.data() }
    });
  } catch (error: any) {
    console.error('Invoice Update API Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; invoiceId: string }> }) {
  return handleUpdate(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; invoiceId: string }> }) {
  return handleUpdate(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; invoiceId: string }> }) {
  return handleUpdate(req, ctx);
}

