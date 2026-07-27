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
    const rawCompanyId = resolvedParams.id;

    if (!rawCompanyId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameter: companyId' },
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
        companyDoc = querySnap.docs[0];
      } else {
        return NextResponse.json({
          success: true,
          exists: false,
          message: 'Company not found'
        });
      }
    }

    const invoiceNum = searchParams.get('invoiceNum') || searchParams.get('invoiceId') || searchParams.get('number');

    const invoicesRef = db.collection('companies').doc(companyDocId).collection('invoices');

    if (invoiceNum) {
      // Direct doc ID check
      const docDirect = await invoicesRef.doc(invoiceNum).get();
      if (docDirect.exists) {
        return NextResponse.json({
          success: true,
          exists: true,
          invoice: { id: docDirect.id, ...docDirect.data() }
        });
      }

      // Query check by invoiceInternalID, invoiceNum, invoiceDocumentID, or number
      let qSnap = await invoicesRef.where('invoiceInternalID', '==', invoiceNum).limit(1).get();
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('invoiceNum', '==', invoiceNum).limit(1).get();
      }
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('invoiceDocumentID', '==', invoiceNum).limit(1).get();
      }
      if (qSnap.empty) {
        qSnap = await invoicesRef.where('documentId', '==', invoiceNum).limit(1).get();
      }

      if (!qSnap.empty) {
        const docMatch = qSnap.docs[0];
        return NextResponse.json({
          success: true,
          exists: true,
          invoice: { id: docMatch.id, ...docMatch.data() }
        });
      }

      return NextResponse.json({
        success: true,
        exists: false,
        message: `Invoice ${invoiceNum} not found for company`
      });
    }

    // No specific invoice requested — check if subcollection has any invoice documents
    const invoicesSnap = await invoicesRef.limit(10).get();

    return NextResponse.json({
      success: true,
      exists: !invoicesSnap.empty,
      count: invoicesSnap.size,
      message: invoicesSnap.empty ? 'No invoices found for this company' : 'Company has existing invoices'
    });
  } catch (error: any) {
    console.error('Invoices Subcollection Exists API Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
