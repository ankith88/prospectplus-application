import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prospectId, action, notes, confirmedBy } = body;

    if (!prospectId) {
      return NextResponse.json(
        { success: false, message: 'prospectId is required.' },
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
    const nowIso = new Date().toISOString();

    const isConfirmed = action === 'confirm';
    const nabFunding = {
      accreditationFundingRequired: true,
      nabStatus: isConfirmed ? 'confirmed' : 'rejected',
      nabConfirmedBy: confirmedBy || 'Michael McDaid',
      nabConfirmedAt: nowIso,
      nabNotes: notes || (isConfirmed ? 'Formal NAB accreditation facility confirmed.' : 'NAB funding application rejected.'),
    };

    await ref.update({
      nabFunding,
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: isConfirmed 
          ? 'Formal NAB confirmation recorded by Michael. Legal instruction workflow unlocked.'
          : 'NAB funding marked as rejected by Michael.',
        nabFunding,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error updating NAB confirmation status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update NAB confirmation.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
