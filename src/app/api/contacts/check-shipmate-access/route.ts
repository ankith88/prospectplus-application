import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentId, parentType = 'companies', contactId, email } = body;

    if (!parentId || !contactId || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters (parentId, contactId, email)' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim();
    const mainURL = 'https://mpns.protechly.com/outbound_emails?email=' + encodeURIComponent(cleanEmail);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj',
    };

    const res = await fetch(mainURL, { headers });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch portal status from MPNS (Status ${res.status})` },
        { status: 502 }
      );
    }

    const emailSubjects = await res.json();

    const createPasswordEmailSent = Array.isArray(emailSubjects)
      ? emailSubjects.some(item =>
          [
            'Create Your ShipMate Password Now',
            'Your MailPlus shipping portal is now ready for you to set up.',
          ].includes(item?.subject)
        )
      : false;

    const accountActivated = Array.isArray(emailSubjects)
      ? emailSubjects.some(item =>
          typeof item?.subject === 'string' && item.subject.includes('Welcome to your MailPlus Shipping Portal.')
        )
      : false;

    const accessToShipMate: 'yes' | 'no' = (accountActivated || createPasswordEmailSent) ? 'yes' : 'no';
    let shipmateStatus: 'Activated' | 'Password Sent' | 'No Access' = 'No Access';
    if (accountActivated) {
      shipmateStatus = 'Activated';
    } else if (createPasswordEmailSent) {
      shipmateStatus = 'Password Sent';
    }

    const shipmateCheckedAt = new Date().toISOString();
    const updateData = {
      accessToShipMate,
      accountActivated,
      createPasswordEmailSent,
      shipmateStatus,
      shipmateCheckedAt,
    };

    const collectionName = parentType === 'leads' ? 'leads' : 'companies';
    const contactRef = db.collection(collectionName).doc(parentId).collection('contacts').doc(contactId);

    // Check if document exists before updating
    const contactSnap = await contactRef.get();
    if (contactSnap.exists) {
      await contactRef.update(updateData);
    }

    return NextResponse.json({
      success: true,
      ...updateData,
    });
  } catch (error: any) {
    console.error('[check-shipmate-access API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
