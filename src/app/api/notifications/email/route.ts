import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { sendCancellationNotificationEmail } from '@/lib/cancellation-email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://prospect.mailplus.com.au';
    const baseUrl = origin.replace(/\/$/, '');

    if (type === 'cancellation_request') {
      const res = await sendCancellationNotificationEmail({
        ...(payload || {}),
        baseUrl,
      });
      return NextResponse.json({ ...res });
    }

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

    if (type === 'lead_address_check') {
      const { leadId, companyName, oldAddress, newAddress, requesterName, requesterEmail, matchedFranchisees } = payload || {};
      const recipients = ['aleyna.harnett@mailplus.com.au', 'ankith.ravindran@mailplus.com.au'].join(',');
      const leadDirectUrl = `${baseUrl}/leads?id=${leadId || ''}`;
      const subject = `Address Check Needed: ${companyName || 'Lead'} (Captured by ${requesterName || 'User'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Address Check Needed</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi Aleyna &amp; Ankith,
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                A new site address was updated for lead <strong>${companyName || 'Lead'}</strong>, and multiple franchisees can service this location. Please confirm which franchisee should be assigned to this lead.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="margin: 0 0 8px;"><strong>Lead / Company Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Old Address:</strong> ${oldAddress || 'N/A'}</p>
                    <p style="margin: 0 0 8px; color: #095c7b;"><strong>New Address:</strong> ${newAddress || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Captured By:</strong> ${requesterName || 'User'} (${requesterEmail || 'N/A'})</p>
                    <p style="margin: 0;"><strong>Matching Franchisees:</strong> ${matchedFranchisees || 'Multiple'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${leadDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View &amp; Confirm Lead Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">ProspectPlus System</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
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

      const res = await sendPhysicalEmail({ to: recipients, subject, html, leadId });
      return NextResponse.json({ ...res });
    }

    if (type === 'franchisee_priority_lead_notification') {
      const { leadId, companyName, franchiseeName, amEmail, amName, droppedOffBrochures, hadConversationWithContact, addressString } = payload || {};
      const recipients = amEmail ? `${amEmail},luke.forbes@mailplus.com.au` : 'luke.forbes@mailplus.com.au';
      const leadDirectUrl = `${baseUrl}/leads?id=${leadId || ''}`;
      const subject = `🔥 Priority Franchisee Lead: ${companyName || 'Lead'} (Entered by ${franchiseeName || 'Franchisee'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Priority Lead Notification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${amName || 'Account Manager'},
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Franchisee <strong>${franchiseeName || 'Franchisee'}</strong> has entered a <strong>Priority Lead</strong> into your Account Manager bucket.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="margin: 0 0 8px;"><strong>Company Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Address:</strong> ${addressString || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Entered By (Franchisee):</strong> ${franchiseeName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Dropped Off Brochures:</strong> ${droppedOffBrochures ? 'Yes ✅' : 'No'}</p>
                    <p style="margin: 0;"><strong>Had Conversation with Contact:</strong> ${hadConversationWithContact ? 'Yes ✅' : 'No'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${leadDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View Lead Profile Page
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">ProspectPlus System</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
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

      const res = await sendPhysicalEmail({ to: recipients, subject, html, leadId });
      return NextResponse.json({ ...res });
    }

    if (type === 'franchisee_outside_territory_lead') {
      const { leadId, companyName, franchiseeName, addressString, city, state, zip } = payload || {};
      const recipients = 'mailplusit@mailplus.com.au,fiona.harrison@mailplus.com.au';
      const leadDirectUrl = `${baseUrl}/leads?id=${leadId || ''}`;
      const subject = `⚠️ Lead Entered Outside Territory: ${companyName || 'Lead'} (${franchiseeName || 'Franchisee'})`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Outside Territory Lead</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi MailPlus IT &amp; Fiona,
              </div>
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Franchisee <strong>${franchiseeName || 'Franchisee'}</strong> has entered a lead located in a suburb/postcode outside their registered territory. The franchisee confirmed they can service this lead.
              </p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="margin: 0 0 8px;"><strong>Company Name:</strong> ${companyName || 'N/A'}</p>
                    <p style="margin: 0 0 8px;"><strong>Address:</strong> ${addressString || `${city || ''}, ${state || ''} ${zip || ''}`}</p>
                    <p style="margin: 0 0 8px;"><strong>Suburb / Postcode:</strong> ${city || ''} ${zip || ''}</p>
                    <p style="margin: 0;"><strong>Assigned Franchisee:</strong> ${franchiseeName || 'N/A'}</p>
                  </td>
                </tr>
              </table>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${leadDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; display: inline-block; font-weight: 600;">
                      View Lead Details
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">ProspectPlus System</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
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

      const res = await sendPhysicalEmail({ to: recipients, subject, html, leadId });
      return NextResponse.json({ ...res });
    }

    if (type === 'ticket_lit_notification') {
      const {
        ticketId,
        ticketNumber,
        trackingIdentifier,
        customerCompany,
        customerAccountNumber,
        enquirerName,
        enquirerEmail,
        enquirerPhone,
        receiverName,
        receiverAddress,
        notes,
        freightSafeEligible,
        updatedBy
      } = payload || {};

      const recipients = 'mailplusit@mailplus.com.au';
      const cc = 'kaley.drummond@mailplus.com.au';
      const ticketUrl = `${baseUrl}/admin/tickets/${ticketId || ''}`;
      const displayId = ticketNumber || ticketId || 'N/A';
      const subject = `🔴 Ticket Marked as Lost in Transit (LIT) — ${displayId}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket Marked as Lost in Transit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          <tr>
            <td class="content-cell" style="padding: 40px 30px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <div class="greeting" style="font-size: 20px; color: #b91c1c; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px;">
                🔴 Ticket Marked as Lost in Transit (LIT)
              </div>
              <p style="margin: 0 0 16px; font-size: 14px; color: #4a5568;">
                Ticket <strong>${displayId}</strong> has been marked as <strong>Lost in Transit (LIT)</strong>${updatedBy ? ` by <strong>${updatedBy}</strong>` : ''}.
              </p>
              
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td width="160" style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Ticket Number:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c; font-family: monospace; font-weight: bold;">${displayId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Consignment / Ref:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c; font-family: monospace;">${trackingIdentifier || 'N/A'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Customer:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c;">${customerCompany || 'N/A'} ${customerAccountNumber ? `(${customerAccountNumber})` : ''}</td>
                </tr>
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Enquirer:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c;">${enquirerName || 'N/A'}${enquirerEmail ? ` (${enquirerEmail})` : ''}${enquirerPhone ? ` - ${enquirerPhone}` : ''}</td>
                </tr>
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Receiver:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c;">${receiverName || 'N/A'}<br />${receiverAddress || ''}</td>
                </tr>
                <tr style="border-bottom: 1px solid #edf2f7;">
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">FreightSafe Eligible:</td>
                  <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: ${freightSafeEligible ? '#166534' : '#991b1b'};">${freightSafeEligible === true ? 'Yes' : (freightSafeEligible === false ? 'No' : 'Unspecified')}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-weight: bold; font-size: 13px; color: #718096; vertical-align: top;">Notes / Reason:</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #1a202c; white-space: pre-wrap;">${notes || 'No closure notes provided.'}</td>
                </tr>
              </table>

              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #095c7b;">
                    <a href="${ticketUrl}" target="_blank" style="font-size: 14px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; border: 1px solid #095c7b; display: inline-block; font-weight: 600;">
                      View Ticket in ProspectPlus &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
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

      const res = await sendPhysicalEmail({ to: recipients, cc, subject, html, ticketId });
      return NextResponse.json({ ...res });
    }

    return NextResponse.json({ success: false, message: 'Invalid notification type.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error sending notification email:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to send email.' }, { status: 500 });
  }
}
