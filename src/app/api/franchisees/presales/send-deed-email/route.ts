import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { franchiseeId, recipientEmail, recipientName } = body;

    if (!franchiseeId) {
      return NextResponse.json({ success: false, message: 'franchiseeId is required' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const presaleRef = db.collection('franchisee_presales').doc(String(franchiseeId));
    const presaleDoc = await presaleRef.get();

    let mainDetails = presaleDoc.exists ? presaleDoc.data()?.mainDetails || {} : {};
    let deedOfVariation = presaleDoc.exists ? presaleDoc.data()?.deedOfVariation || {} : {};

    const targetEmail = recipientEmail || mainDetails.email;
    const contactName = recipientName || mainDetails.mainContact || mainDetails.tradingEntity || 'Franchisee';
    const tradingEntity = mainDetails.tradingEntity || String(franchiseeId);

    if (!targetEmail) {
      return NextResponse.json({ success: false, message: 'Recipient email address is required.' }, { status: 400 });
    }

    // Determine public URL for Deed signing
    const origin = request.headers.get('origin') || 'https://prospectplus.com.au';
    const deedSigningUrl = `${origin}/deed-of-variation/${franchiseeId}`;

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deed of Variation - Exit Program</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${contactName},
              </div>
              
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Please find below the digital link to review and execute the <strong>Deed of Variation - Exit Program Assistance Offer</strong> for your territory (<strong>${tradingEntity}</strong>).
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Executing this Deed of Variation allows MailPlus to officially process your territory presales valuation and list your territory under the Exit Program.
              </p>

              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="background-color: #095c7b; border-radius: 8px; padding: 14px 28px;">
                    <a href="${deedSigningUrl}" target="_blank" style="color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                      Review & Sign Deed of Variation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 13px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                Or copy and paste this link into your browser: <br />
                <a href="${deedSigningUrl}" style="color: #095c7b; word-break: break-all;">${deedSigningUrl}</a>
              </p>

              <p style="margin: 20px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">MailPlus Operations & Presales Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img
                src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
                alt="MailPlus Logo"
                width="135"
                style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;"
              />
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
</html>`;

    // Send email
    await sendPhysicalEmail({
      to: targetEmail,
      subject: `Deed of Variation - Exit Program Assistance Offer (${tradingEntity})`,
      html: emailHtml,
    });

    const nowIso = new Date().toISOString();
    const updatedDeed = {
      ...deedOfVariation,
      status: deedOfVariation.status === 'not_started' ? 'sent' : deedOfVariation.status,
      dateSent: nowIso,
      sentAt: nowIso,
      sentToEmail: targetEmail,
    };

    // Update presale doc in Firestore
    await presaleRef.set({
      deedOfVariation: updatedDeed,
      step2Status: presaleDoc.exists && presaleDoc.data()?.step2Status === 'Completed' ? 'Completed' : 'In Progress',
      status: 'Step 2: Deed Pending',
      updatedAt: nowIso,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Deed of Variation email sent successfully.',
      dateSent: nowIso,
      deedSigningUrl,
    });
  } catch (error: any) {
    console.error('Error sending Deed of Variation email:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
