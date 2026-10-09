import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { verifySync } from 'otplib';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const { uid, code, secret } = body || {};

    if (!uid || !code || !secret) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters (uid, code, secret).' },
        { status: 400 }
      );
    }

    // 1. Verify code against the secret safely
    let isValid = false;
    try {
      const verification = verifySync({ token: code.toString().trim(), secret });
      isValid = !!verification.valid;
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_TOTP_CODE',
          message: 'Invalid 6-digit code. Please ensure your device clock is synchronized and try again.',
        },
        { status: 400 }
      );
    }

    // 2. Persist confirmed secret to user doc
    const userRef = db.collection('users').doc(uid);
    await userRef.set(
      {
        requires2FA: true,
        twoFactorMethod: 'totp',
        totpSecret: secret,
        totpConfirmed: true,
        twoFactorVerifiedAt: new Date(),
      },
      { merge: true }
    );

    // 3. Clear pending challenge
    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    await challengeRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Google Authenticator 2FA has been successfully configured and verified.',
    });
  } catch (error: any) {
    console.error('[TOTP Confirm Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to confirm authenticator setup.' },
      { status: 500 }
    );
  }
}
