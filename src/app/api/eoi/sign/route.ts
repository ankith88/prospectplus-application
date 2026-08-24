import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { decodeProspectToken, encodeProspectToken } from '@/lib/presale-token';

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
        { success: false, message: 'Invalid token.' },
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
    return NextResponse.json(
      {
        success: true,
        prospect: {
          id: docSnap.id,
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          preferredTerritory: data.preferredTerritory || '',
          preferredState: data.preferredState || '',
          eoiData: data.eoiData || {
            publicToken: token || encodeProspectToken('eoi', docSnap.id),
            status: 'not_started',
          },
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching EOI form data:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      prospectId: rawProspectId,
      signerName,
      signerEmail,
      signatureDataUrl,
      formData = {},
    } = body;

    let prospectId = rawProspectId || '';
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

    if (!signerName || !signatureDataUrl) {
      return NextResponse.json(
        { success: false, message: 'Signer name and digital signature are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = snap.data() || {};
    const publicToken = token || currentData.eoiData?.publicToken || encodeProspectToken('eoi', prospectId);

    const fullEOIData = {
      ...(currentData.eoiData || {}),
      publicToken,
      status: 'signed_online',
      sentAt: currentData.eoiData?.sentAt || new Date().toISOString(),
      signedAt: new Date().toISOString(),
      signerName: signerName.trim(),
      signerEmail: (signerEmail || currentData.email || '').trim(),
      signatureDataUrl,
      ...formData,
    };

    const isNabFundingRequired = formData.fundingType === 'nab' || formData.accreditationFundingRequired === true || String(formData.fundingSource || '').toLowerCase().includes('nab');

    const updatedNabFunding = {
      accreditationFundingRequired: isNabFundingRequired,
      nabStatus: isNabFundingRequired ? (currentData.nabFunding?.nabStatus === 'confirmed' ? 'confirmed' : 'pending_michael_confirmation') : 'not_required',
      nabNotes: currentData.nabFunding?.nabNotes || '',
    };

    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      text: `Expression of Interest (EOI) form completed and digitally signed by ${signerName}. Funding method: ${isNabFundingRequired ? 'NAB Accreditation Funding' : 'Sole Trader Funding / Self-Funded'}.`,
      createdAt: new Date().toISOString(),
      createdByName: 'Candidate Online Portal',
      createdByUid: 'system_portal',
    };

    await ref.update({
      eoiData: fullEOIData,
      nabFunding: updatedNabFunding,
      status: 'EOI Signed',
      notes: [...(currentData.notes || []), newNote],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Expression of Interest (EOI) form signed and submitted successfully.',
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error submitting EOI form:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit EOI form.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
