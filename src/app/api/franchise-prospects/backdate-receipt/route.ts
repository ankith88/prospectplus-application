import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { addDays, formatISO, parseISO } from 'date-fns';

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
    const { prospectId, backdatedDate, updatedBy } = body;

    if (!prospectId || !backdatedDate) {
      return NextResponse.json(
        { success: false, message: 'prospectId and backdatedDate are required.' },
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
    const parsedBackdate = parseISO(backdatedDate);

    // Compute statutory 14-day date from the backdated receipt date
    const calculatedEarliestFaDate = formatISO(addDays(parsedBackdate, 14));

    const updatedDisclosure = {
      ...(currentData.disclosureDocument || {}),
      status: 'receipt_signed',
      receiptSignedAt: backdatedDate,
      receiptBackdated: true,
      receiptUploadedAt: new Date().toISOString(),
      earliestFranchiseAgreementExecutionDate: calculatedEarliestFaDate,
    };

    // Keep FA execution date calculation strictly enforced to 14 days post receipt date
    const updatedFa = {
      ...(currentData.franchiseAgreement || {}),
      earliestExecutionDate: calculatedEarliestFaDate,
      status: currentData.franchiseAgreement?.executedAt ? currentData.franchiseAgreement.status : 'locked',
    };

    await ref.update({
      disclosureDocument: updatedDisclosure,
      franchiseAgreement: updatedFa,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Disclosure Receipt date backdated to ${backdatedDate.split('T')[0]} by ${updatedBy || 'Legal Admin'}. Earliest Franchise Agreement execution recomputed to ${calculatedEarliestFaDate.split('T')[0]}.`,
        disclosureDocument: updatedDisclosure,
        franchiseAgreement: updatedFa,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error backdating disclosure receipt date:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to backdate disclosure receipt.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
