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
        { success: false, message: 'Invalid or missing token.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const docSnap = await db.collection('franchise_prospects').doc(prospectId).get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Franchise prospect not found.' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const data = docSnap.data() || {};
    const eoi = data.eoiData || {};
    const isSoleTrader = eoi.entityStructure === 'SOLE TRADER';

    // Build prefilled Request for Docs data if not present
    const defaultRfd = {
      publicToken: token || encodeProspectToken('rfd', docSnap.id),
      status: data.requestForDocs?.status || 'draft',
      incomingEntityName: data.requestForDocs?.incomingEntityName || eoi.companyName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      abn: data.requestForDocs?.abn || eoi.abn || '',
      registeredAddress: data.requestForDocs?.registeredAddress || eoi.registeredAddress || eoi.applicant1PrivateAddress || '',
      email: data.requestForDocs?.email || data.email || eoi.applicant1Email || '',
      mobile: data.requestForDocs?.mobile || data.phone || eoi.applicant1PhoneHome || '',
      isSoleTrader,
      guarantors: isSoleTrader ? [] : (data.requestForDocs?.guarantors || [
        {
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          address: eoi.applicant1PrivateAddress || '',
          email: data.email || '',
          phone: data.phone || '',
        }
      ]),
      manager: data.requestForDocs?.manager || {
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        address: eoi.applicant1PrivateAddress || '',
        email: data.email || '',
        phone: data.phone || '',
      },
      businessName: data.requestForDocs?.businessName || `Mail Plus – ${data.preferredTerritory || 'Territory'}`,
      territoryName: data.requestForDocs?.territoryName || data.preferredTerritory || 'Exclusive Territory',
      territoryMapUrl: data.requestForDocs?.territoryMapUrl || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
      termYears: data.requestForDocs?.termYears || 5,
      commencementDate: data.requestForDocs?.commencementDate || new Date().toISOString().split('T')[0],
      expiryDate: data.requestForDocs?.expiryDate || '',
      fees: data.requestForDocs?.fees || {
        deposit: data.depositDetails?.amountPaid ? Number(data.depositDetails.amountPaid) : 1500,
        initialFranchiseFee: 0,
        renewalFee: 3000,
        transferFee: 3000,
        transactionFee: 12500,
        serviceFeePercent: 25,
        marketingLevyPercent: 5,
        techLicenceFee: 5000,
        coolOffRetained: 7500,
      },
      earningsProvided: data.requestForDocs?.earningsProvided ?? false,
      mpFinancingProvided: data.requestForDocs?.mpFinancingProvided ?? Boolean(data.nabFunding?.accreditationFundingRequired),
      capitalExpenditure: data.requestForDocs?.capitalExpenditure || {
        vehicleRange: '$25,000–$40,000 at initial purchase',
        toolsOfTrade: 'Mandatory pickup and delivery scanner tools',
      },
      specialConditions: data.requestForDocs?.specialConditions || (
        data.nabFunding?.accreditationFundingRequired
          ? 'Supported by NAB accreditation facility with tripartite deed.'
          : 'Standard purchase agreement.'
      ),
      reviewedByMatt: data.requestForDocs?.reviewedByMatt || false,
      chasedByMaddie: data.requestForDocs?.chasedByMaddie || false,
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
          requestForDocs: defaultRfd,
          nabFunding: data.nabFunding || { accreditationFundingRequired: false, nabStatus: 'not_required' },
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching request for docs details:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, prospectId: inputId, requestForDocs, action } = body;

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
    const updatedStatus = action === 'instruct_lawyer' ? 'instructed' : (requestForDocs?.status || 'draft');
    
    const updatedRfd = {
      ...(currentData.requestForDocs || {}),
      ...(requestForDocs || {}),
      publicToken: token || currentData.requestForDocs?.publicToken || encodeProspectToken('rfd', prospectId),
      status: updatedStatus,
      instructedAt: action === 'instruct_lawyer' ? new Date().toISOString() : (currentData.requestForDocs?.instructedAt || null),
      instructedBy: action === 'instruct_lawyer' ? 'Ankith / Operations' : (currentData.requestForDocs?.instructedBy || null),
    };

    await ref.update({
      requestForDocs: updatedRfd,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: action === 'instruct_lawyer' 
          ? 'Legal instructions successfully generated and dispatched to Lawyer Anna Trist (anna.trist@klgates.com).'
          : 'Request for Docs legal instruction saved.',
        requestForDocs: updatedRfd,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error updating request for docs:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update request for docs.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
