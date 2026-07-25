import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://prospect.mailplus.com.au';
    const baseUrl = origin.replace(/\/$/, '');

    if (type === 'lead_assignment_request') {
      const { leadId, companyName, currentAssignee, requesterName, requesterEmail, requestNotes } = payload || {};
      const recipients = ['luke.forbes@mailplus.com.au', 'aleyna.harnett@mailplus.com.au'].join(',');
      const leadDirectUrl = `${baseUrl}/leads?id=${leadId || ''}`;
      const subject = `Lead Assignment Request: ${companyName || 'Lead'} (Requested by ${requesterName || 'AM'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lead Assignment Request</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px;">
                Hi Luke &amp; Aleyna,
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748;">
                Account Manager <strong>${requesterName || 'Unknown AM'}</strong> has submitted a request to be assigned lead <strong>${companyName || 'N/A'}</strong>.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568;">
                    <p style="margin: 0 0 8px;"><strong>Lead Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Currently Assigned To:</strong> ${currentAssignee || 'Unassigned'}</p>
                    <p style="margin: 0 0 8px;"><strong>Requested By:</strong> ${requesterName || 'Unknown'} (${requesterEmail || 'N/A'})</p>
                    <p style="margin: 0;"><strong>Request Notes:</strong> ${requestNotes || 'No notes provided'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${leadDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View &amp; Reassign Lead
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748;">Kind regards,</p>
              <p style="margin: 0; font-size: 15px; color: #2d3748;"><strong style="font-weight: 700;">ProspectPlus System</strong></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; line-height: 1.5;">
              <p style="margin: 0 0 6px;"><strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.</p>
              <p style="margin: 0 0 15px;">Powered by MailPlus Australia</p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0;">&copy; 2026 MailPlus. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const res = await sendPhysicalEmail({ to: recipients, subject, html, leadId });
      return NextResponse.json({ ...res });
    }

    if (type === 'address_change_request') {
      const { companyId, companyName, currentAddress, requestedAddress, requesterName, requesterEmail, notes } = payload || {};
      const recipients = 'mailplusit@mailplus.com.au';
      const customerDirectUrl = `${baseUrl}/signed-customers?companyId=${companyId || ''}`;
      const subject = `Address Change Request: ${companyName || 'Signed Customer'} (Submitted by ${requesterName || 'User'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Address Change Request</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px;">
                Hi MailPlus IT Team,
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748;">
                An address change request has been submitted for signed customer <strong>${companyName || 'N/A'}</strong>.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568;">
                    <p style="margin: 0 0 8px;"><strong>Customer Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Current Address:</strong> ${currentAddress || 'N/A'}</p>
                    <p style="margin: 0 0 8px; color: #095c7b;"><strong>Requested New Address:</strong> ${requestedAddress || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Requested By:</strong> ${requesterName || 'Unknown'} (${requesterEmail || 'N/A'})</p>
                    <p style="margin: 0;"><strong>Additional Notes:</strong> ${notes || 'None'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${customerDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View Signed Customer
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748;">Kind regards,</p>
              <p style="margin: 0; font-size: 15px; color: #2d3748;"><strong style="font-weight: 700;">ProspectPlus System</strong></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; line-height: 1.5;">
              <p style="margin: 0 0 6px;"><strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.</p>
              <p style="margin: 0 0 15px;">Powered by MailPlus Australia</p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0;">&copy; 2026 MailPlus. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const res = await sendPhysicalEmail({ to: recipients, subject, html, leadId: companyId });
      return NextResponse.json({ ...res });
    }

    if (type === 'upsell_notification') {
      const { companyId, companyName, accountManagerName, accountManagerEmail, requesterName, requesterEmail, upsellNotes } = payload || {};
      if (!accountManagerEmail) {
        return NextResponse.json({ success: false, message: 'Account Manager email is required.' }, { status: 400 });
      }

      const customerDirectUrl = `${baseUrl}/signed-customers?companyId=${companyId || ''}`;
      const subject = `Upsell Opportunity Captured: ${companyName || 'Customer'} (Captured by ${requesterName || 'User'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Customer Upsell Notification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px;">
                Hi ${accountManagerName || 'Account Manager'},
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748;">
                An upsell opportunity has been captured for your assigned customer <strong>${companyName || 'N/A'}</strong>.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568;">
                    <p style="margin: 0 0 8px;"><strong>Customer Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Captured By:</strong> ${requesterName || 'Unknown'} (${requesterEmail || 'N/A'})</p>
                    <p style="margin: 0;"><strong>Upsell Notes / Details:</strong> ${upsellNotes || 'None'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${customerDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View Signed Customer
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748;">Kind regards,</p>
              <p style="margin: 0; font-size: 15px; color: #2d3748;"><strong style="font-weight: 700;">ProspectPlus System</strong></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; line-height: 1.5;">
              <p style="margin: 0 0 6px;"><strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.</p>
              <p style="margin: 0 0 15px;">Powered by MailPlus Australia</p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0;">&copy; 2026 MailPlus. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const res = await sendPhysicalEmail({ to: accountManagerEmail, subject, html, leadId: companyId });
      return NextResponse.json({ ...res });
    }

    return NextResponse.json({ success: false, message: 'Invalid notification type.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error sending notification email:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to send email.' }, { status: 500 });
  }
}
