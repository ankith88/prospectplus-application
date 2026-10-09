import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, requestorUid, disable2FA = false } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Target user ID (uid) is required.' },
        { status: 400 }
      );
    }

    if (!requestorUid || !SUPER_ADMIN_UIDS.includes(requestorUid)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Only Super Administrators can reset 2FA.' },
        { status: 403 }
      );
    }

    const db = adminApp.firestore();

    // 1. Delete active OTP challenges
    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    await challengeRef.delete();

    // 2. Update user doc (clear verification timestamp, reset TOTP secret & confirmation)
    const userRef = db.collection('users').doc(uid);
    const updatePayload: Record<string, any> = {
      twoFactorVerifiedAt: null,
      totpSecret: null,
      totpConfirmed: false,
    };
    if (disable2FA) {
      updatePayload.requires2FA = false;
    }

    await userRef.set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      message: disable2FA 
        ? 'Two-Factor Authentication has been reset and disabled for this user.'
        : 'Two-Factor Authentication credentials, active sessions, and TOTP keys have been reset for this user.',
    });
  } catch (error: any) {
    console.error('[Reset 2FA Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to reset 2FA.' },
      { status: 500 }
    );
  }
}
