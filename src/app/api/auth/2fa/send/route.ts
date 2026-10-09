import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendSms } from '@/services/sms-service';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email } = body;

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

    const method = userData.twoFactorMethod || 'sms';

    // 3. Handle TOTP (Google Authenticator)
    if (method === 'totp') {
      if (userData.totpConfirmed && userData.totpSecret) {
        return NextResponse.json({
          success: true,
          requires2FA: true,
          method: 'totp',
          message: 'Please enter the 6-digit code from Google Authenticator.',
        });
      }

      // First time setup needed for this TOTP user
      const userEmail = email || userData.email || 'user@mailplus.com.au';
      const secret = generateSecret();
      const otpAuthUrl = generateURI({ secret, label: userEmail, issuer: 'ProspectPlus' });
      const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { margin: 2, width: 240 });

      // Save pending secret
      await db.collection('_two_factor_challenges').doc(uid).set(
        {
          uid,
          pendingTotpSecret: secret,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        requires2FA: true,
        method: 'totp_setup_needed',
        secret,
        qrDataUrl,
        message: 'Scan the QR code in Google Authenticator to complete setup.',
      });
    }

    // 4. Handle SMS 2FA
    const mobileNumber = (userData.mobileNumber || userData.phoneNumber || '').toString().trim();
    if (!mobileNumber) {
      return NextResponse.json(
        {
          success: false,
          code: 'NO_MOBILE_NUMBER',
          message: 'Two-factor authentication via SMS is required for your account, but no mobile number is registered. Please contact a Super Administrator.',
        },
        { status: 400 }
      );
    }

    // Rate-limit check (prevent spamming SMS within 30 seconds)
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
            message: `Please wait ${waitSec} seconds before requesting another SMS code.`,
          },
          { status: 429 }
        );
      }
    }

    // Generate secure 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Mask phone number for UI display
    const cleanDigits = mobileNumber.replace(/\D/g, '');
    const lastDigits = cleanDigits.slice(-3);
    const maskedMobile = `•••• ••• ${lastDigits}`;

    // Send SMS via MailPlus SMS API
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

    // Store challenge in Firestore
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
      method: 'sms',
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
