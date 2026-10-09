import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendSms } from '@/services/sms-service';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Missing user identifier.' },
        { status: 400 }
      );
    }

    // 1. Fetch user doc
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'User profile not found.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};

    // 2. Check if user requires 2FA
    if (!userData.requires2FA) {
      return NextResponse.json({
        success: true,
        requires2FA: false,
        message: '2FA is not required for this user.',
      });
    }

    // 3. Extract mobile number
    const mobileNumber = (userData.mobileNumber || userData.phoneNumber || '').toString().trim();
    if (!mobileNumber) {
      return NextResponse.json(
        {
          success: false,
          code: 'NO_MOBILE_NUMBER',
          message: 'Two-factor authentication is required for your account, but no mobile number is registered. Please contact a Super Administrator.',
        },
        { status: 400 }
      );
    }

    // 4. Rate-limit check (prevent spamming SMS within 30 seconds)
    const challengeRef = db.collection('_two_factor_challenges').doc(uid);
    const existingChallenge = await challengeRef.get();
    if (existingChallenge.exists) {
      const challengeData = existingChallenge.data() || {};
      const lastSent = challengeData.createdAt ? challengeData.createdAt.toMillis() : 0;
      if (Date.now() - lastSent < 30000) {
        const waitSec = Math.ceil((30000 - (Date.now() - lastSent)) / 1000);
        return NextResponse.json(
          {
            success: false,
            message: `Please wait ${waitSec} seconds before requesting another code.`,
          },
          { status: 429 }
        );
      }
    }

    // 5. Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Mask the phone number for UI display (e.g. 0412 345 678 -> •••• ••• 678)
    const cleanDigits = mobileNumber.replace(/\D/g, '');
    const lastDigits = cleanDigits.slice(-3);
    const maskedMobile = `•••• ••• ${lastDigits}`;

    // 6. Send SMS via MailPlus SMS API
    const smsMessage = `Your ProspectPlus verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;
    const smsResult = await sendSms(mobileNumber, smsMessage, 'admin');

    if (!smsResult.success) {
      console.error('[2FA Send SMS Error]:', smsResult.message);
      return NextResponse.json(
        {
          success: false,
          code: 'SMS_DELIVERY_FAILED',
          message: smsResult.message || 'Failed to deliver SMS verification code.',
        },
        { status: 500 }
      );
    }

    // 7. Store challenge in Firestore
    await challengeRef.set({
      uid,
      code: otpCode,
      mobileNumber: maskedMobile,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      requires2FA: true,
      maskedMobile,
      expiresAt,
      message: 'Verification code sent.',
    });
  } catch (error: any) {
    console.error('[2FA Send Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
