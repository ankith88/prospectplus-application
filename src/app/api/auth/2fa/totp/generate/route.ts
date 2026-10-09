import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'User ID is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch user doc
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const userEmail = email || userData.email || 'user@mailplus.com.au';

    // 2. Generate secret or reuse unconfirmed pending secret
    const secret = generateSecret();
    const otpAuthUrl = generateURI({ secret, label: userEmail, issuer: 'ProspectPlus' });
    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      margin: 2,
      width: 240,
    });

    // 3. Store pending secret in challenge doc
    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    await challengeRef.set(
      {
        uid,
        pendingTotpSecret: secret,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      secret,
      qrDataUrl,
      otpAuthUrl,
    });
  } catch (error: any) {
    console.error('[TOTP Generate Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate authenticator QR code.' },
      { status: 500 }
    );
  }
}
