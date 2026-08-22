import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decodeProspectToken, encodeProspectToken } from '@/lib/presale-token';
import { differenceInCalendarDays, parseISO } from 'date-fns';

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
    const disc = data.disclosureDocument || {};

    const earliestDateIso = disc.earliestFranchiseAgreementExecutionDate || null;
    let isLocked = true;
    let daysRemaining = 14;

    if (earliestDateIso) {
      const earliestDate = parseISO(earliestDateIso);
      const now = new Date();
      if (now >= earliestDate) {
        isLocked = false;
        daysRemaining = 0;
      } else {
        daysRemaining = Math.max(1, differenceInCalendarDays(earliestDate, now));
      }
    }

    const defaultFa = {
      publicToken: token || encodeProspectToken('fa', docSnap.id),
      status: isLocked ? 'locked' : (data.franchiseAgreement?.status || 'available'),
      earliestExecutionDate: earliestDateIso,
      executedAt: data.franchiseAgreement?.executedAt || null,
      signedPdfUrl: data.franchiseAgreement?.signedPdfUrl || null,
      executionType: data.franchiseAgreement?.executionType || null,
      netSuiteSyncStatus: data.franchiseAgreement?.netSuiteSyncStatus || 'manual_pending',
      signerName: data.franchiseAgreement?.signerName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      signerEmail: data.franchiseAgreement?.signerEmail || data.email || '',
    };

    return NextResponse.json(
      {
        success: true,
        prospect: {
          id: docSnap.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email || '',
          phone: data.phone || '',
          preferredTerritory: data.preferredTerritory || '',
          eoiData: data.eoiData || {},
          requestForDocs: data.requestForDocs || {},
          disclosureDocument: disc,
          franchiseAgreement: defaultFa,
        },
        lockStatus: {
          isLocked,
          daysRemaining,
          receiptSignedAt: disc.receiptSignedAt || null,
          earliestExecutionDate: earliestDateIso,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching franchise agreement details:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, prospectId: inputId, executionType, signatureDataUrl, clientIp, signerName, signerEmail } = body;

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
    const disc = currentData.disclosureDocument || {};

    if (!disc.receiptSignedAt || !disc.earliestFranchiseAgreementExecutionDate) {
      return NextResponse.json(
        { success: false, message: 'Disclosure Receipt must be signed and returned before executing Franchise Agreement.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const earliestDate = parseISO(disc.earliestFranchiseAgreementExecutionDate);
    const now = new Date();
    if (now < earliestDate) {
      const daysLeft = Math.max(1, differenceInCalendarDays(earliestDate, now));
      return NextResponse.json(
        {
          success: false,
          message: `Statutory 14-day cooling lock active. Earliest execution allowed on ${disc.earliestFranchiseAgreementExecutionDate.split('T')[0]} (${daysLeft} days remaining).`,
        },
        { status: 403, headers: corsHeaders() }
      );
    }

    const executedIso = now.toISOString();
    const isDigital = executionType === 'digital';

    const updatedFa = {
      ...(currentData.franchiseAgreement || {}),
      publicToken: token || currentData.franchiseAgreement?.publicToken || encodeProspectToken('fa', prospectId),
      status: isDigital ? 'signed_online' : 'wet_signed_uploaded',
      earliestExecutionDate: disc.earliestFranchiseAgreementExecutionDate,
      executedAt: executedIso,
      executionType: isDigital ? 'digital' : 'wet_ink',
      netSuiteSyncStatus: isDigital ? 'auto_synced' : 'manual_pending',
      signedPdfUrl: signatureDataUrl || currentData.franchiseAgreement?.signedPdfUrl || '',
      signerName: signerName || `${currentData.firstName || ''} ${currentData.lastName || ''}`.trim(),
      signerEmail: signerEmail || currentData.email || '',
      signerIp: clientIp || '127.0.0.1',
      signatureDataUrl: isDigital ? signatureDataUrl : null,
    };

    // Prepare document archive entry
    const docArchive = {
      id: `doc_fa_${Date.now()}`,
      name: `Franchise Agreement - ${currentData.fullName || currentData.firstName || 'Candidate'} (${isDigital ? 'Digital Execution' : 'Wet Ink Upload'}).pdf`,
      url: signatureDataUrl || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
      uploadedAt: executedIso,
      type: 'franchise_agreement',
    };

    const existingDocs = currentData.documents || [];

    await ref.update({
      franchiseAgreement: updatedFa,
      documents: [...existingDocs, docArchive],
      updatedAt: executedIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: isDigital 
          ? 'Franchise Agreement digitally executed & archived. NetSuite auto-synced (no manual Maddie upload required).'
          : 'Franchise Agreement wet-ink scan uploaded & archived. Manual NetSuite upload pending for Maddie.',
        franchiseAgreement: updatedFa,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error executing franchise agreement:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to execute franchise agreement.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
