import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { ServiceSelection } from '@/lib/types';

export interface CSRequestNotificationData {
  requestType: 'change_of_service' | 'cancellation';
  leadId?: string;
  prospectPlusId?: string;
  netsuiteId?: string;
  abn?: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  // Change of service fields
  serviceChangeCategories?: string[];
  requestedServices?: ServiceSelection[];
  effectiveDate?: string;
  
  // Cancellation fields
  cancellationTheme?: string;
  cancellationWhy?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  trueServiceCancellationDate?: string;
  
  // Attachments & Notes
  cancellationNotes?: string;
  attachments?: Array<{ name: string; url: string; size?: number }>;
  notes?: string;
  processedBy?: string;
  baseUrl?: string;
}

export async function sendCSRequestNotificationEmail(data: CSRequestNotificationData) {
  try {
    const {
      requestType,
      leadId,
      prospectPlusId,
      netsuiteId,
      abn,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      serviceChangeCategories = [],
      requestedServices = [],
      effectiveDate,
      cancellationTheme,
      cancellationWhy,
      cancellationReason,
      cancellationDate,
      trueServiceCancellationDate,
      attachments = [],
      notes,
      processedBy,
      baseUrl: rawBaseUrl,
    } = data;

    const to = 'sarah.hart@mailplus.com.au';
    const cc = 'alexandra.bathman@mailplus.com.au';
    const baseUrl = (rawBaseUrl || 'https://prospect.mailplus.com.au').replace(/\/$/, '');
    const requestsHubUrl = `${baseUrl}/customer-success/cs-requests`;

    const isCancellation = requestType === 'cancellation';
    const titleText = isCancellation ? 'New Cancellation Request' : 'New Change of Service Request';
    const subject = `${isCancellation ? 'Cancellation Request' : 'Service Change Request'}: ${companyName}${leadId ? ` (ID: #${leadId})` : ''}`;

    // Format services table rows for email
    let servicesHtml = '';
    if (requestedServices && requestedServices.length > 0) {
      servicesHtml = requestedServices.map(s => {
        const freq = Array.isArray(s.frequency) ? s.frequency.join(', ') : (s.frequency || 'Adhoc');
        const rate = s.rate !== undefined ? `$${s.rate.toFixed(2)}` : 'N/A';
        return `<li style="margin-bottom: 4px;"><strong>${s.name}</strong> - ${freq} @ ${rate}</li>`;
      }).join('');
    }

    // Format attachments links for email
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
      attachmentsHtml = attachments.map(a => {
        return `<li style="margin-bottom: 4px;"><a href="${a.url}" target="_blank" style="color: #095c7b; text-decoration: underline; font-weight: 600;">📎 ${a.name}</a></li>`;
      }).join('');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleText}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .content-cell {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Inner container table -->
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <!-- 1. Body Text & Content Row -->
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                ${titleText} Submitted
              </div>
              
              <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                A new <strong>${isCancellation ? 'Cancellation' : 'Change of Service'}</strong> request has been submitted for <strong>${companyName}</strong> via the public customer portal.
              </p>
              
              <!-- Structured Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                    <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Company Name:</strong> ${companyName}</p>
                    ${(prospectPlusId || leadId) ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Prospect+ ID:</strong> #${prospectPlusId || leadId}</p>` : ''}
                    ${netsuiteId ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">NetSuite ID:</strong> #${netsuiteId}</p>` : ''}
                    ${abn ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">ABN:</strong> ${abn}</p>` : ''}
                    ${contactName ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Contact Person:</strong> ${contactName}</p>` : ''}
                    ${contactEmail ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Email:</strong> <a href="mailto:${contactEmail}" style="color: #095c7b; text-decoration: underline;">${contactEmail}</a></p>` : ''}
                    ${contactPhone ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Phone:</strong> ${contactPhone}</p>` : ''}
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                    
                    ${isCancellation ? `
                      ${cancellationTheme ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Theme:</strong> ${cancellationTheme}</p>` : ''}
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Primary Reason:</strong> ${cancellationReason || 'Other'}</p>
                      ${cancellationWhy ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Category / Feedback:</strong> ${cancellationWhy}</p>` : ''}
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Requested Stop Date:</strong> ${cancellationDate || 'N/A'}</p>
                      ${trueServiceCancellationDate ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">True Stop Date:</strong> ${trueServiceCancellationDate}</p>` : ''}
                    ` : `
                      ${serviceChangeCategories.length > 0 ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Change Categories:</strong> ${serviceChangeCategories.map(c => c.replace('_', ' ')).join(', ')}</p>` : ''}
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Requested Effective Start Date:</strong> ${effectiveDate || 'N/A'}</p>
                      ${servicesHtml ? `
                        <p style="margin: 8px 0 4px;"><strong style="color: #095c7b;">Requested Services & Rates:</strong></p>
                        <ul style="margin: 0 0 8px; padding-left: 20px;">
                          ${servicesHtml}
                        </ul>
                      ` : ''}
                    `}

                    ${notes ? `<p style="margin: 8px 0 0;"><strong style="color: #095c7b;">Additional Customer Notes:</strong> ${notes}</p>` : ''}
                    
                    ${attachmentsHtml ? `
                      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                      <p style="margin: 0 0 4px;"><strong style="color: #095c7b;">Uploaded Attachments:</strong></p>
                      <ul style="margin: 0; padding-left: 20px;">
                        ${attachmentsHtml}
                      </ul>
                    ` : ''}

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                    <p style="margin: 0;"><strong style="color: #095c7b;">Submitted By:</strong> ${processedBy || 'Customer Online Portal'}</p>
                  </td>
                </tr>
              </table>

              <!-- Button to Customer Success Requests Center -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${requestsHubUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; display: inline-block; font-weight: 600; background-color: #095c7b;">
                      Open CS Requests Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">ProspectPlus Customer Success System</strong>
              </p>

            </td>
          </tr>

          <!-- 2. Brand Navy Banner containing MailPlus Logo -->
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

          <!-- 3. Standard Legal and Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br />
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="${baseUrl}/unsubscribe" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return await sendPhysicalEmail({
      to,
      cc,
      subject,
      html,
      leadId,
    });
  } catch (error) {
    console.error('[CS Request Email Error] Failed to send notification email:', error);
    return { success: false, simulated: false, error: (error as any).message };
  }
}

export async function sendCancellationNotificationEmail(data: any) {
  return sendCSRequestNotificationEmail({
    ...data,
    requestType: 'cancellation'
  });
}
