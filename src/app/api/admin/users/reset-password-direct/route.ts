import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { generateWelcomeEmailHtml } from '@/lib/welcome-email-template';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword, sendWelcomeEmail = true, emailType = 'welcome' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    // Find the user by email in Firebase Auth
    let authUser;
    try {
      authUser = await auth.getUserByEmail(cleanEmail);
    } catch (authErr: any) {
      return NextResponse.json(
        { success: false, message: `User account not found for email ${cleanEmail}.` },
        { status: 404 }
      );
    }

    // Directly reset/update the password in Firebase Auth
    await auth.updateUser(authUser.uid, {
      password: newPassword,
    });

    // Fetch user display name from Firestore if available
    let userName = authUser.displayName || cleanEmail;
    try {
      const userDoc = await db.collection('users').doc(authUser.uid).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        const fullName = `${uData?.firstName || ''} ${uData?.lastName || ''}`.trim();
        if (fullName) {
          userName = fullName;
        } else if (uData?.displayName) {
          userName = uData.displayName;
        }
      }
    } catch (dbErr) {
      console.warn('[Direct Reset API] Warning fetching user profile:', dbErr);
    }

    let emailSent = false;
    let emailMessage = '';

    // Determine actual email dispatch mode (legacy sendWelcomeEmail boolean or emailType)
    const effectiveEmailType = (sendWelcomeEmail === false || emailType === 'none') 
      ? 'none' 
      : (emailType === 'password_reset' ? 'password_reset' : 'welcome');

    if (effectiveEmailType !== 'none') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.mailplus.com.au';
      const signInLink = `${baseUrl}/signin`;

      const isWelcome = effectiveEmailType === 'welcome';
      const emailSubject = isWelcome
        ? 'Your Prospect+ Account is Ready'
        : 'Your Prospect+ Password Has Been Reset';

      const emailHtml = generateWelcomeEmailHtml({
        recipientName: userName,
        email: cleanEmail,
        password: newPassword,
        signInLink,
        isPasswordReset: !isWelcome,
      });

      const sendResult = await sendPhysicalEmail({
        to: cleanEmail,
        subject: emailSubject,
        html: emailHtml,
        customFrom: 'MailPlus IT Support <mailplusit@mailplus.com.au>',
      });

      if (sendResult.success) {
        emailSent = true;
        emailMessage = `${isWelcome ? 'Welcome' : 'Password reset'} email sent to ${cleanEmail}.`;
      } else {
        emailMessage = `Password reset succeeded, but email dispatch failed: ${sendResult.error || 'Unknown error'}.`;
      }
    } else {
      emailMessage = `Password reset succeeded. No email sent.`;
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${cleanEmail}. ${emailMessage}`,
      emailSent,
    });
  } catch (error: any) {
    console.error('[Direct Reset API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
