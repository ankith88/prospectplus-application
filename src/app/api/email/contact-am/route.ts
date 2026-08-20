import { NextRequest, NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      prospectPlusId,
      companyName,
      leadStatus,
      isCompany,
      amName = 'Account Manager',
      amEmail,
      senderName = 'MailPlus Franchisee',
      senderEmail,
      subject,
      message
    } = body;

    if (!amEmail) {
      return NextResponse.json({ error: 'Missing account manager email address' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const displayId = prospectPlusId || leadId || 'N/A';
    const emailSubject = subject || `[ID: ${displayId}] Regarding ${companyName || 'Lead'} (${leadStatus || 'Quote/Trial'})`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
    const profileUrl = isCompany ? `${baseUrl}/companies/${leadId}` : `${baseUrl}/leads/${leadId}`;

    // Always CC Luke Forbes alongside the Franchisee sender email
    const ccRecipients = Array.from(new Set([senderEmail, 'luke.forbes@mailplus.com.au'].filter(Boolean))).join(', ');

    const htmlContent = `
<!DOCTYPE html>
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
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 30px 25px; color: #2d3748;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #095c7b;">
                Franchisee Lead Inquiry
              </h2>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4a5568;">
                Hi <strong>${amName}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4a5568;">
                <strong>${senderName}</strong> has sent you a message regarding the following priority lead in Prospect+:
              </p>

              <!-- Lead Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #718096; width: 120px; padding-bottom: 6px;">Company:</td>
                        <td style="font-size: 14px; font-weight: 700; color: #1a202c; padding-bottom: 6px;">${companyName || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; width: 120px; padding-bottom: 6px;">Status:</td>
                        <td style="font-size: 13px; font-weight: 600; color: #095c7b; padding-bottom: 6px;">${leadStatus || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #718096; width: 120px; padding-bottom: 6px;">Prospect+ ID:</td>
                        <td style="font-size: 13px; font-weight: 700; color: #095c7b; padding-bottom: 6px;">${displayId}</td>
                      </tr>
                      ${leadId ? `
                      <tr>
                        <td style="font-size: 13px; color: #718096; width: 120px; padding-top: 6px;">Lead Profile:</td>
                        <td style="font-size: 13px; padding-top: 6px;">
                          <a href="${profileUrl}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 12px;">
                            View Lead Profile in Prospect+ &rarr;
                          </a>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message Box -->
              <div style="background-color: #ffffff; border-left: 4px solid #095c7b; padding: 16px; margin-bottom: 24px; border-radius: 4px; border-top: 1px solid #edf2f7; border-right: 1px solid #edf2f7; border-bottom: 1px solid #edf2f7;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #718096; letter-spacing: 0.5px;">
                  Message from ${senderName}:
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">${message.trim()}</p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #718096; line-height: 1.5;">
                You can reply directly to this email or contact <strong>${senderName}</strong> at <a href="mailto:${senderEmail}" style="color: #095c7b; text-decoration: underline;">${senderEmail}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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

    await sendPhysicalEmail({
      to: amEmail,
      customFrom: senderEmail ? `"${senderName}" <${senderEmail}>` : undefined,
      cc: ccRecipients,
      subject: emailSubject,
      html: htmlContent,
      leadId: leadId || undefined,
      trackingCategory: 'custom'
    });

    return NextResponse.json({
      success: true,
      message: `Email successfully sent to ${amName} (${amEmail}) with CC to Luke Forbes`
    });
  } catch (error: any) {
    console.error('Failed to send AM contact email:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 });
  }
}
