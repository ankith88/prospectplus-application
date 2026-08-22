import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decodeProspectToken, encodeProspectToken } from '@/lib/presale-token';
import { addDays, formatISO } from 'date-fns';

const db = getFirestore(adminApp);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const prospectIdParam = searchParams.get('prospectId');

    let prospectId = prospectIdParam || '';
    if (token) {
      const decoded = decodeProspectToken(token);
      prospectId = decoded.prospectId;
    }

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing token.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const docSnap = await db.collection('franchise_prospects').doc(prospectId).get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect record not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const data = docSnap.data() || {};
    const defaultDisc = {
      publicToken: token || encodeProspectToken('disc', docSnap.id),
      status: data.disclosureDocument?.status || 'not_started',
      dispatchMethod: data.disclosureDocument?.dispatchMethod || 'electronic',
      dispatchedAt: data.disclosureDocument?.dispatchedAt || new Date().toISOString(),
      receiptSignedAt: data.disclosureDocument?.receiptSignedAt || null,
      receiptBackdated: data.disclosureDocument?.receiptBackdated || false,
      receiptUploadedAt: data.disclosureDocument?.receiptUploadedAt || null,
      receiptPdfUrl: data.disclosureDocument?.receiptPdfUrl || null,
      signerName: data.disclosureDocument?.signerName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      signerEmail: data.disclosureDocument?.signerEmail || data.email || '',
      earliestFranchiseAgreementExecutionDate: data.disclosureDocument?.earliestFranchiseAgreementExecutionDate || null,
    };

    return NextResponse.json(
      {
        success: true,
        prospect: {
          id: docSnap.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email || '',
          preferredTerritory: data.preferredTerritory || '',
          disclosureDocument: defaultDisc,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching disclosure details:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, prospectId: inputId, signerName, signerEmail, signatureDataUrl, clientIp, dispatchMethod } = body;

    let prospectId = inputId || '';
    if (token) {
      const decoded = decodeProspectToken(token);
      prospectId = decoded.prospectId;
    }

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'Prospect ID or token is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const docSnap = await ref.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect record not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = docSnap.data() || {};
    const signedTimestamp = new Date();
    const signedIso = signedTimestamp.toISOString();

    // Compute statutory 14-day execution date: signedTimestamp + 14 days
    const earliestExecutionDate = formatISO(addDays(signedTimestamp, 14));

    const updatedDisclosure = {
      ...(currentData.disclosureDocument || {}),
      publicToken: token || currentData.disclosureDocument?.publicToken || encodeProspectToken('disc', prospectId),
      status: 'receipt_signed',
      dispatchMethod: dispatchMethod || currentData.disclosureDocument?.dispatchMethod || 'electronic',
      receiptSignedAt: signedIso,
      receiptUploadedAt: signedIso,
      signerName: signerName || `${currentData.firstName || ''} ${currentData.lastName || ''}`.trim(),
      signerEmail: signerEmail || currentData.email || '',
      signerIp: clientIp || '127.0.0.1',
      receiptPdfUrl: signatureDataUrl || currentData.disclosureDocument?.receiptPdfUrl || '',
      earliestFranchiseAgreementExecutionDate: earliestExecutionDate,
    };

    // Prepare document archive entry
    const docArchive = {
      id: `doc_disc_${Date.now()}`,
      name: `Disclosure Document Receipt - ${currentData.fullName || currentData.firstName || 'Candidate'} (Signed).pdf`,
      url: signatureDataUrl || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
      uploadedAt: signedIso,
      type: 'disclosure_receipt',
    };

    const existingDocs = currentData.documents || [];

    await ref.update({
      disclosureDocument: updatedDisclosure,
      documents: [...existingDocs, docArchive],
      updatedAt: signedIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Disclosure Receipt successfully signed & recorded. Statutory 14-day waiting period initiated.',
        disclosureDocument: updatedDisclosure,
        earliestFranchiseAgreementExecutionDate: earliestExecutionDate,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error processing disclosure receipt:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to record disclosure receipt.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
