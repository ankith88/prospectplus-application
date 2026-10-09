import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { verifySync } from 'otplib';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, code, secret } = body;

    if (!uid || !code) {
      return NextResponse.json(
        { success: false, message: 'Missing user ID or verification code.' },
        { status: 400 }
      );
    }

    const cleanCode = code.toString().trim();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'User profile not found.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const method = userData.twoFactorMethod || 'sms';

    // 1. Verification for Google Authenticator (TOTP)
    if (method === 'totp') {
      const activeSecret = secret || userData.totpSecret;

      if (!activeSecret) {
        return NextResponse.json(
          { success: false, message: 'Authenticator setup incomplete. Please scan the QR code first.' },
          { status: 400 }
        );
      }

      const { valid: isValid } = verifySync({ token: cleanCode, secret: activeSecret });

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_TOTP_CODE',
            message: 'Invalid 6-digit code. Please check your Google Authenticator app and device time.',
          },
          { status: 400 }
        );
      }

      // Valid TOTP!
      const updateData: Record<string, any> = {
        twoFactorVerifiedAt: new Date(),
      };
      if (secret && (!userData.totpConfirmed || userData.totpSecret !== secret)) {
        updateData.totpSecret = secret;
        updateData.totpConfirmed = true;
      }
      await userRef.set(updateData, { merge: true });

      // Clean challenge if any
      await db.collection('_two_factor_challenges').doc(uid).delete();

      return NextResponse.json({
        success: true,
        message: 'Authenticator verification successful.',
      });
    }

    // 2. Verification for SMS OTP
    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Verification code expired or not found. Please request a new SMS code.',
        },
        { status: 400 }
      );
    }

    const challenge = challengeDoc.data() || {};

    // Check max attempts (limit to 5 attempts to prevent brute-forcing)
    const attempts = (challenge.attempts || 0) + 1;
    if (attempts > 5) {
      await challengeRef.delete();
      return NextResponse.json(
        {
          success: false,
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many incorrect attempts. Please request a new SMS code.',
        },
        { status: 429 }
      );
    }

    // Check expiration
    if (Date.now() > challenge.expiresAt) {
      await challengeRef.delete();
      return NextResponse.json(
        {
          success: false,
          code: 'CODE_EXPIRED',
          message: 'Verification code has expired. Please request a new SMS code.',
        },
        { status: 400 }
      );
    }

    // Check code match
    if (challenge.code !== cleanCode) {
      await challengeRef.update({ attempts });
      const remaining = 5 - attempts;
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_CODE',
          message: `Incorrect SMS code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        },
        { status: 400 }
      );
    }

    // Code is valid! Clean up challenge and record verification
    await challengeRef.delete();
    await userRef.set(
      {
        twoFactorVerifiedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'SMS verification successful.',
    });
  } catch (error: any) {
    console.error('[2FA Verify Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
