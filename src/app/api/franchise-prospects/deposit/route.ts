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
    const {
      prospectId,
      isPaid = true,
      percentageDeposited = 5,
      amountPaid = 0,
      paymentDate = new Date().toISOString().split('T')[0],
      paymentMethod = 'EFT',
      receiptRef = '',
      notes = '',
      loggedByUid = '',
      loggedByName = '',
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
        { success: false, message: 'Prospect record not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    const currentData = snap.data() || {};
    const depositDetails = {
      isPaid: Boolean(isPaid),
      percentageDeposited: Number(percentageDeposited) || 5,
      amountPaid: Number(amountPaid) || 0,
      paymentDate,
      paymentMethod,
      receiptRef: receiptRef.trim(),
      notes: notes.trim(),
      loggedByUid,
      loggedByName,
      loggedAt: new Date().toISOString(),
    };

    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      text: isPaid
        ? `Deposit Payment Verified: ${percentageDeposited}% ($${amountPaid}) received via ${paymentMethod}. Ref: ${receiptRef || 'N/A'}.`
        : `Deposit payment marked as not paid / refunded.`,
      createdAt: new Date().toISOString(),
      createdByName: loggedByName || 'Operations User',
      createdByUid: loggedByUid || 'system',
    };

    await ref.update({
      depositDetails,
      notes: [...(currentData.notes || []), newNote],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Deposit payment details saved successfully.',
        depositDetails,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error logging deposit details:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to log deposit details.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
