import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { encodePresaleId } from '@/lib/presale-token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { franchiseeId, recipientEmail, recipientName, presalesDetails } = body;

    if (!franchiseeId) {
      return NextResponse.json({ success: false, message: 'franchiseeId is required' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const presaleRef = db.collection('franchisee_presales').doc(String(franchiseeId));
    const presaleDoc = await presaleRef.get();

    let mainDetails = presaleDoc.exists ? presaleDoc.data()?.mainDetails || {} : {};
    let existingPresalesDetails = presaleDoc.exists ? presaleDoc.data()?.presalesDetails || {} : {};

    const mergedPresalesDetails = {
      ...existingPresalesDetails,
      ...(presalesDetails || {}),
    };

    const targetEmail = recipientEmail || mainDetails.email;
    const contactName = recipientName || mainDetails.mainContact || mainDetails.tradingEntity || 'Franchisee';
    const tradingEntity = mergedPresalesDetails.territoryName || mainDetails.tradingEntity || String(franchiseeId);

    if (!targetEmail) {
      return NextResponse.json({ success: false, message: 'Recipient email address is required.' }, { status: 400 });
    }

    // Determine public URL for IM signing
    const origin = request.headers.get('origin') || 'https://prospectplus.com.au';
    const publicToken = encodePresaleId(franchiseeId);
    const imSigningUrl = `${origin}/franchisee-im/${publicToken}`;

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Franchisee Information Memorandum Confirmation</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
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
            <td class="content-cell" style="padding: 40px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${contactName},
              </div>
              
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                The Operations team has prepared the <strong>Franchisee Information Memorandum (IM) Schedule & Territory Profile</strong> for your territory (<strong>${tradingEntity}</strong>).
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Please click the button below to review all territory profile details, inspect the attached territory map, and digitally confirm/e-sign the document.
              </p>

              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center" style="background-color: #095c7b; border-radius: 8px; padding: 14px 28px;">
                    <a href="${imSigningUrl}" target="_blank" style="color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                      Review & E-Sign Franchisee IM &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 13px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                Or copy and paste this link into your browser: <br />
                <a href="${imSigningUrl}" style="color: #095c7b; word-break: break-all;">${imSigningUrl}</a>
              </p>

              <p style="margin: 20px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">Greg Hart</strong><br />
                <span style="font-size: 13px; color: #718096;">MailPlus Operations & Presales Team</span>
              </p>
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

    // Send email from greg.hart@mailplus.com.au and CC michael.mcdaid@mailplus.com.au
    await sendPhysicalEmail({
      to: targetEmail,
      customFrom: 'greg.hart@mailplus.com.au',
      cc: 'michael.mcdaid@mailplus.com.au',
      subject: `Action Required: Confirm & Sign Franchisee IM Schedule (${tradingEntity})`,
      html: emailHtml,
    });

    const nowIso = new Date().toISOString();
    const updatedPresalesDetails = {
      ...mergedPresalesDetails,
      imStatus: 'sent',
      sentAt: nowIso,
      sentToEmail: targetEmail,
      sentFromEmail: 'greg.hart@mailplus.com.au',
      ccEmail: 'michael.mcdaid@mailplus.com.au',
      publicToken,
    };

    // Update presale doc in Firestore
    await presaleRef.set({
      presalesDetails: updatedPresalesDetails,
      step4Status: 'Pending Review',
      status: 'Step 4: Franchisee IM Confirmation',
      updatedAt: nowIso,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Franchisee IM email sent successfully.',
      dateSent: nowIso,
      imSigningUrl,
    });
  } catch (error: any) {
    console.error('Error sending Franchisee IM email:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
