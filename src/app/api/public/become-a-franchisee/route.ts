import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName = '',
      lastName = '',
      fullName = '',
      email = '',
      phone = '',
      preferredState = '',
      preferredTerritory = '',
      message = '',
      sourceApp = 'mailplus-website',
    } = body;

    const parsedFirstName = firstName || fullName.split(' ')[0] || '';
    const parsedLastName = lastName || fullName.split(' ').slice(1).join(' ') || '';
    const finalFullName = fullName || `${parsedFirstName} ${parsedLastName}`.trim() || 'Franchise Applicant';

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Email or phone number is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const prospectData = {
      firstName: parsedFirstName,
      lastName: parsedLastName,
      fullName: finalFullName,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      preferredState: preferredState.trim(),
      preferredTerritory: preferredTerritory.trim(),
      message: message.trim(),
      status: 'New',
      submittedAt: new Date().toISOString(),
      sourceApp,
      notes: [],
    };

    const docRef = await db.collection('franchise_prospects').add(prospectData);

    return NextResponse.json(
      {
        success: true,
        message: 'Franchise application received successfully.',
        prospectId: docRef.id,
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error processing public become-a-franchisee submission:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit application.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
