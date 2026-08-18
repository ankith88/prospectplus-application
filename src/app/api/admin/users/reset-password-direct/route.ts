import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

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

      const emailHeading = isWelcome
        ? 'Welcome to Prospect+ CRM'
        : 'Password Reset Notice';

      const emailGreeting = `Hello <strong>${userName}</strong>,`;

      const emailIntroText = isWelcome
        ? 'Your account has been created for you in Prospect+ CRM. You can now log in and start managing outbound leads and campaigns.'
        : 'Your Prospect+ CRM password has been reset. Here are your updated login details:';

      const credentialsBoxTitle = isWelcome
        ? 'Your Login Credentials'
        : 'Updated Login Credentials';

      const passwordLabel = isWelcome
        ? 'Password:'
        : 'New Password:';

      const emailFooterNotice = isWelcome
        ? 'If you have any questions or require assistance, please reach out to the MailPlus IT support team.'
        : 'For security reasons, we recommend updating your password after logging in to your account.';

      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Brand Header Banner -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px; color: #2d3748; line-height: 1.6;">
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #095c7b;">
                ${emailHeading}
              </h2>
              <p style="margin: 0 0 16px; font-size: 15px; color: #4a5568;">
                ${emailGreeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.6;">
                ${emailIntroText}
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                <h3 style="color: #095c7b; font-size: 13px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">${credentialsBoxTitle}</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #718096; width: 110px; font-weight: 600;">Email:</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #1a202c; font-weight: 700; font-family: monospace;">${cleanEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #718096; width: 110px; font-weight: 600;">${passwordLabel}</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #095c7b; font-weight: 700; font-family: monospace; letter-spacing: 0.5px;">${newPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${signInLink}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.25);">
                      Sign In to Prospect+
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 13px; color: #718096;">
                ${emailFooterNotice}
              </p>

              <div style="border-top: 1px solid #edf2f7; padding-top: 20px; margin-top: 24px; font-size: 13px; color: #718096;">
                <p style="margin: 0;">Kind regards,</p>
                <p style="margin: 4px 0 0 0; font-weight: 700; color: #2d3748;">MailPlus IT Support Team</p>
                <p style="margin: 2px 0 0 0; color: #718096;">mailplusit@mailplus.com.au</p>
              </div>
            </td>
          </tr>

          <!-- Standard Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
