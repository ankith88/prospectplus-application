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
        { success: false, message: 'Prospect not found.' },
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
          keyFactSheet: data.keyFactSheet || null,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error fetching Fact Sheet:', error);
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
      prospectId,
      senderUid = '',
      senderName = '',
      ...factSheetFields
    } = body;

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'prospectId is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const ref = db.collection('franchise_prospects').doc(prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: 'Prospect not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = snap.data() || {};
    const existingFactSheet = currentData.keyFactSheet || {};
    const publicToken = existingFactSheet.publicToken || encodeProspectToken('kfs', prospectId);

    const updatedFactSheet = {
      ...existingFactSheet,
      ...factSheetFields,
      publicToken,
      updatedAt: new Date().toISOString(),
      updatedByUid: senderUid,
      updatedByName: senderName,
      territoryName: factSheetFields.territoryName || currentData.preferredTerritory || '',
    };

    await ref.update({
      keyFactSheet: updatedFactSheet,
      preferredTerritory: updatedFactSheet.territoryName,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Key Fact Sheet saved successfully.',
        keyFactSheet: updatedFactSheet,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error saving Fact Sheet:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to save fact sheet.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
