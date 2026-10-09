import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function GET() {
  try {
    const auth = adminApp.auth();
    const listUsersResult = await auth.listUsers(1000);

    const verificationMap: Record<string, { emailVerified: boolean; email?: string; lastSignInTime?: string; creationTime?: string }> = {};
    
    listUsersResult.users.forEach((user) => {
      verificationMap[user.uid] = {
        emailVerified: user.emailVerified,
        email: user.email,
        lastSignInTime: user.metadata.lastSignInTime,
        creationTime: user.metadata.creationTime,
      };
    });

    return NextResponse.json({
      success: true,
      verificationMap,
    });
  } catch (error: any) {
    console.error('[Admin Email Verification GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch verification status.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, uid, email, uids, emails } = body;

    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const hostHeader = request.headers.get('host') || '';
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (hostHeader ? `${protocol}://${hostHeader}` : 'https://prospectplus.com.au');

    // 1. Single Manual Verify Override
    if (action === 'manual-verify') {
      if (!uid) {
        return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
      }
      await auth.updateUser(uid, { emailVerified: true });
      await db.collection('users').doc(uid).set({ emailVerified: true, emailVerifiedAt: new Date() }, { merge: true });

      return NextResponse.json({
        success: true,
        message: 'User email marked as verified successfully.',
      });
    }

    // 2. Bulk Manual Verify Override
    if (action === 'bulk-verify') {
      const targetUids: string[] = uids || (uid ? [uid] : []);
      if (!targetUids.length) {
        return NextResponse.json({ success: false, message: 'No user IDs provided.' }, { status: 400 });
      }

      const results = await Promise.allSettled(
        targetUids.map(async (uId) => {
          await auth.updateUser(uId, { emailVerified: true });
          await db.collection('users').doc(uId).set({ emailVerified: true, emailVerifiedAt: new Date() }, { merge: true });
        })
      );

      const successfulCount = results.filter((r) => r.status === 'fulfilled').length;
      return NextResponse.json({
        success: true,
        message: `Successfully marked ${successfulCount} of ${targetUids.length} user(s) as verified.`,
      });
    }

    // 3. Single or Bulk Resend Verification Email
    if (action === 'resend' || action === 'bulk-resend') {
      const targetEmails: string[] = emails || (email ? [email] : []);
      if (!targetEmails.length) {
        return NextResponse.json({ success: false, message: 'No email addresses provided.' }, { status: 400 });
      }

      const sendResults = await Promise.allSettled(
        targetEmails.map(async (targetEmail) => {
          let userName = targetEmail;
          try {
            const usersSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
            if (!usersSnap.empty) {
              const uData = usersSnap.docs[0].data();
              const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
              if (fullName) userName = fullName;
            }
          } catch (e) {
            // fallback to email
          }

          const actionCodeSettings = {
            url: `${baseUrl}/signin?verified=true`,
            handleCodeInApp: true,
          };
          const rawLink = await auth.generateEmailVerificationLink(targetEmail, actionCodeSettings);

          let brandedVerifyLink = rawLink;
          try {
            const urlObj = new URL(rawLink);
            const oobCode = urlObj.searchParams.get('oobCode');
            const apiKey = urlObj.searchParams.get('apiKey') || '';
            if (oobCode) {
              brandedVerifyLink = `${baseUrl}/verify-email?oobCode=${encodeURIComponent(oobCode)}&mode=verifyEmail${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`;
            }
          } catch (e) {}

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your MailPlus Prospect+ Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px; color: #2d3748; line-height: 1.6;">
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #095c7b;">
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 16px; font-size: 15px; color: #4a5568;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #4a5568; line-height: 1.6;">
                An administrator has sent you a verification link for your MailPlus Prospect+ account (<strong>${targetEmail}</strong>). Please click the button below to verify your email:
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${brandedVerifyLink}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.25);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 24px; background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td width="32" valign="top" style="font-size: 14px; line-height: 1.5; color: #095c7b; font-weight: bold;">
                    &#9656;
                  </td>
                  <td style="font-size: 13px; color: #4a5568; line-height: 1.5;">
                    This link is single-use and will expire in 24 hours.
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="font-size: 14px; line-height: 1.5; color: #095c7b; font-weight: bold; padding-top: 6px;">
                    &#9656;
                  </td>
                  <td style="font-size: 13px; color: #4a5568; line-height: 1.5; padding-top: 6px;">
                    After verifying, you will complete Two-Factor Authentication (2FA) with Google Authenticator.
                  </td>
                </tr>
              </table>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 0 0 24px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.05em;">
                  Direct Link
                </p>
                <p style="margin: 0; font-size: 11px; color: #095c7b; word-break: break-all; font-family: monospace; line-height: 1.4;">
                  <a href="${brandedVerifyLink}" style="color: #095c7b; text-decoration: underline;">${brandedVerifyLink}</a>
                </p>
              </div>

              <div style="border-top: 1px solid #edf2f7; padding-top: 20px; margin-top: 24px; font-size: 13px; color: #718096;">
                <p style="margin: 0;">Kind regards,</p>
                <p style="margin: 4px 0 0 0; font-weight: 700; color: #2d3748;">MailPlus IT Support Team</p>
                <p style="margin: 2px 0 0 0; color: #718096;">mailplusit@mailplus.com.au</p>
              </div>
            </td>
          </tr>
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

          return sendPhysicalEmail({
            to: targetEmail,
            subject: 'Verify your email address for Prospect+',
            html: emailHtml,
            customFrom: 'MailPlus IT Support <mailplusit@mailplus.com.au>',
          });
        })
      );

      const successfulDispatches = sendResults.filter((r) => r.status === 'fulfilled' && (r as any).value?.success).length;

      return NextResponse.json({
        success: true,
        message: `Dispatched ${successfulDispatches} of ${targetEmails.length} verification email(s).`,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error('[Admin Email Verification POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred processing the request.' },
      { status: 500 }
    );
  }
}
