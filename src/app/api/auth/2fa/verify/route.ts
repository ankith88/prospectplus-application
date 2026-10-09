import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, code } = body;

    if (!uid || !code) {
      return NextResponse.json(
        { success: false, message: 'Missing user ID or verification code.' },
        { status: 400 }
      );
    }

    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          code: 'CHALLENGE_NOT_FOUND',
          message: 'Verification code expired or not found. Please request a new code.',
        },
        { status: 400 }
      );
    }

    const challenge = challengeDoc.data() || {};

    // 1. Check max attempts (limit to 5 attempts to prevent brute-forcing)
    const attempts = (challenge.attempts || 0) + 1;
    if (attempts > 5) {
      await challengeRef.delete();
      return NextResponse.json(
        {
          success: false,
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Too many incorrect attempts. Please request a new code.',
        },
        { status: 429 }
      );
    }

    // 2. Check expiration
    if (Date.now() > challenge.expiresAt) {
      await challengeRef.delete();
      return NextResponse.json(
        {
          success: false,
          code: 'CODE_EXPIRED',
          message: 'Verification code has expired. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 3. Check code match
    if (challenge.code !== code.toString().trim()) {
      await challengeRef.update({ attempts });
      const remaining = 5 - attempts;
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_CODE',
          message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        },
        { status: 400 }
      );
    }

    // 4. Code is valid! Clean up challenge and record successful verification on user doc
    await challengeRef.delete();
    await db.collection('users').doc(uid).set(
      {
        twoFactorVerifiedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Two-factor verification successful.',
    });
  } catch (error: any) {
    console.error('[2FA Verify Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
