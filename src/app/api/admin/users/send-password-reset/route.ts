import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required.' },
        { status: 400 }
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.firestore();

    // Fetch user profile name if available
    let userName = email;
    try {
      const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!usersSnap.empty) {
        const uData = usersSnap.docs[0].data();
        const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
        if (fullName) userName = fullName;
      }
    } catch (dbErr) {
      console.warn('[Password Reset API] Error fetching user profile:', dbErr);
    }

    // Generate secure password reset link using Firebase Admin SDK
    const resetLink = await auth.generatePasswordResetLink(email);

    // Build MailPlus branded HTML email following table-based layout rules
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Prospect+ Password</title>
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
                Reset Your Password
              </h2>
              <p style="margin: 0 0 16px; font-size: 15px; color: #4a5568;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #4a5568; line-height: 1.6;">
                An administrator has requested a password reset for your Prospect+ CRM account. Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.25);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.05em;">
                  Direct Link
                </p>
                <p style="margin: 0; font-size: 12px; color: #095c7b; word-break: break-all; font-family: monospace;">
                  <a href="${resetLink}" style="color: #095c7b; text-decoration: underline;">${resetLink}</a>
                </p>
              </div>

              <p style="margin: 0 0 16px; font-size: 13px; color: #718096;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
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
</html>
    `;

    // Dispatch email with customFrom = 'mailplusit@mailplus.com.au'
    const sendResult = await sendPhysicalEmail({
      to: email,
      subject: 'Reset Your Prospect+ Password',
      html: emailHtml,
      customFrom: 'MailPlus IT Support <mailplusit@mailplus.com.au>',
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to send password reset email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Branded password reset email sent to ${email} from mailplusit@mailplus.com.au.`,
    });
  } catch (error: any) {
    console.error('[Send Password Reset API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate password reset email.' },
      { status: 500 }
    );
  }
}
