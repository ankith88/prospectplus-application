import { adminDb } from '@/services/firebase-server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { ServiceSelection } from '@/lib/types';

export interface FranchiseeCancellationOutcomeData {
  outcome: 'Saved' | 'Cancelled';
  leadId: string;
  companyName: string;
  processedBy?: string;
  processedByEmail?: string;
  customFrom?: string;

  // Saved customer specifics
  saveStrategy?: string;
  savedDate?: string;
  services?: ServiceSelection[];
  saveNotes?: string;

  // Cancelled customer specifics
  cancellationTheme?: string;
  cancellationWhy?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  trueServiceCancellationDate?: string;
  cancellationNotes?: string;

  baseUrl?: string;
}

/**
 * Resolves the franchisee email from Firestore using franchisee_id from the company/lead.
 */
export async function getFranchiseeInfoForLead(leadId: string, preloadedData?: any): Promise<{
  franchiseeId?: string;
  franchiseeName?: string;
  franchiseeContact?: string;
  franchiseeEmail?: string;
  address?: string;
  companyName?: string;
}> {
  let data = preloadedData;
  if (!data) {
    const compDoc = await adminDb.collection('companies').doc(leadId).get();
    const leadDoc = await adminDb.collection('leads').doc(leadId).get();
    data = (compDoc.exists ? compDoc.data() : leadDoc.data()) || {};
  }

  const franchiseeId = data.franchisee_id || data.franchiseeId || '';
  const franchiseeName = data.franchisee || data.franchiseeName || '';
  const companyName = data.companyName || '';
  
  // Format address
  const street = data.street || data.address1 || '';
  const city = data.city || data.suburb || '';
  const state = data.state || '';
  const zip = data.zip || data.postcode || '';
  const address = [street, city, state, zip].filter(Boolean).join(', ') || 'Address on file';

  let franData: any = null;

  // 1. Look up by franchisee_id (document ID or internalId)
  if (franchiseeId) {
    const docById = await adminDb.collection('franchisees').doc(String(franchiseeId)).get();
    if (docById.exists) {
      franData = docById.data();
    } else {
      const qById = await adminDb.collection('franchisees')
        .where('internalId', '==', String(franchiseeId))
        .limit(1)
        .get();
      if (!qById.empty) {
        franData = qById.docs[0].data();
      } else {
        const qByLower = await adminDb.collection('franchisees')
          .where('internalid', '==', String(franchiseeId))
          .limit(1)
          .get();
        if (!qByLower.empty) {
          franData = qByLower.docs[0].data();
        }
      }
    }
  }

  // 2. Fallback lookup by franchisee name if not found by ID
  if (!franData && franchiseeName) {
    const qByName = await adminDb.collection('franchisees')
      .where('name', '==', franchiseeName)
      .limit(1)
      .get();
    if (!qByName.empty) {
      franData = qByName.docs[0].data();
    }
  }

  const franchiseeEmail = franData?.email || data.franchiseeEmail || '';
  const franchiseeContact = franData?.mainContact || franData?.name || franchiseeName || 'Franchisee';
  const resolvedName = franData?.name || franchiseeName || '';

  return {
    franchiseeId: String(franchiseeId || ''),
    franchiseeName: resolvedName,
    franchiseeContact,
    franchiseeEmail,
    address,
    companyName: companyName || data.companyName || 'Valued Customer',
  };
}

/**
 * Dispatches an automated email to the assigned Franchisee when a customer is Saved or Cancelled.
 */
export async function sendFranchiseeCancellationOutcomeEmail(
  payload: FranchiseeCancellationOutcomeData
): Promise<{ success: boolean; simulated?: boolean; recipient?: string; reason?: string }> {
  try {
    const {
      outcome,
      leadId,
      companyName: initialCompanyName,
      processedBy = 'Head Office Customer Success Team',
      processedByEmail,
      customFrom,
      saveStrategy,
      savedDate,
      services = [],
      saveNotes,
      cancellationTheme,
      cancellationWhy,
      cancellationReason,
      cancellationDate,
      trueServiceCancellationDate,
      cancellationNotes,
      baseUrl: rawBaseUrl,
    } = payload;

    const baseUrl = (rawBaseUrl || 'https://prospect.mailplus.com.au').replace(/\/$/, '');
    const companyDirectUrl = `${baseUrl}/companies/${leadId}`;
    const unsubscribeLink = `${baseUrl}/unsubscribe`;

    // Determine the sender (send as the processing staff member)
    const effectiveSenderEmail = processedByEmail && processedByEmail.includes('@') ? processedByEmail.trim() : 'sarah.hart@mailplus.com.au';
    const effectiveCustomFrom = customFrom || `${processedBy || 'MailPlus Customer Success'} <${effectiveSenderEmail}>`;

    // 1. Resolve franchisee details and email
    const franInfo = await getFranchiseeInfoForLead(leadId);
    const franchiseeEmail = franInfo.franchiseeEmail;

    if (!franchiseeEmail) {
      console.warn(`[Franchisee Email] No franchisee email found for lead ${leadId} (${franInfo.franchiseeName || 'Unassigned'}). Skipping notification.`);
      return { success: false, reason: `No franchisee email found for franchisee '${franInfo.franchiseeName || 'Unassigned'}'` };
    }

    const companyName = franInfo.companyName || initialCompanyName || 'Customer';
    const address = franInfo.address || 'Address on file';
    const greetingName = franInfo.franchiseeContact || franInfo.franchiseeName || 'Franchisee';

    const isSaved = outcome === 'Saved';
    const subject = isSaved
      ? `Customer Retained: ${companyName} - Save Outcome Confirmed`
      : `Customer Cancellation: ${companyName} - Service Termination Notice`;

    // Format active services table for Saved outcome
    let servicesRowsHtml = '';
    if (services && services.length > 0) {
      servicesRowsHtml = services.map(s => {
        const freq = Array.isArray(s.frequency) ? (s.frequency.length > 0 ? s.frequency.join(', ') : 'Adhoc') : (s.frequency || 'Adhoc');
        const rate = s.rate !== undefined ? `$${Number(s.rate).toFixed(2)}` : '0.00';
        return `
          <tr>
            <td width="32" valign="top" style="padding: 4px 0; font-size: 14px; line-height: 1.5;">✓</td>
            <td valign="top" style="padding: 4px 0; font-size: 14px; line-height: 1.5; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <strong>${s.name}</strong> &mdash; ${freq} @ <span style="color: #095c7b; font-weight: 700;">${rate}</span> / trip
            </td>
          </tr>
        `;
      }).join('');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <!-- Outer Wrapper Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <!-- Inner Box Table (600px Max) -->
        <table class="email-container" align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <!-- Content Row -->
          <tr>
            <td class="content-cell" style="padding: 45px 35px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              
              <div class="greeting" style="font-size: 20px; color: #095c7b; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.5px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${greetingName},
              </div>
              
              ${isSaved ? `
                <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                  We are pleased to inform you that customer <strong>${companyName}</strong> in your territory has been <span style="color: #10b981; font-weight: 700;">successfully saved</span> from cancellation and will continue receiving MailPlus services.
                </p>
              ` : `
                <p style="margin: 0 0 16px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                  Please be advised that customer <strong>${companyName}</strong> in your territory has <span style="color: #e11d48; font-weight: 700;">cancelled their services</span> with MailPlus.
                </p>
              `}
              
              <!-- Structured Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; padding: 16px;">
                <tr>
                  <td style="font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                    <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Company Name:</strong> ${companyName}</p>
                    <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Address:</strong> ${address}</p>
                    <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Franchise Territory:</strong> ${franInfo.franchiseeName || 'Assigned Territory'}</p>
                    <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Outcome:</strong> <span style="color: ${isSaved ? '#059669' : '#e11d48'}; font-weight: 700;">${isSaved ? 'Customer Retained (Saved)' : 'Service Cancelled'}</span></p>

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />

                    ${isSaved ? `
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Saved / Effective Date:</strong> ${savedDate || new Date().toISOString().split('T')[0]}</p>
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Retention Strategy:</strong> ${saveStrategy || 'Keep Existing Services & Pricing'}</p>
                      ${saveNotes ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Save Notes / Agreement:</strong> ${saveNotes}</p>` : ''}
                      
                      ${servicesRowsHtml ? `
                        <p style="margin: 12px 0 6px;"><strong style="color: #095c7b;">Active Service Schedule:</strong></p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 8px;">
                          ${servicesRowsHtml}
                        </table>
                      ` : ''}
                    ` : `
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Final Service / True Stop Date:</strong> <span style="font-weight: 700; color: #e11d48;">${trueServiceCancellationDate || cancellationDate || 'Effective Immediately'}</span></p>
                      ${cancellationTheme ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Theme:</strong> ${cancellationTheme}</p>` : ''}
                      ${cancellationWhy ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Category:</strong> ${cancellationWhy}</p>` : ''}
                      <p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Reason:</strong> ${cancellationReason || 'Other'}</p>
                      ${cancellationNotes ? `<p style="margin: 0 0 8px;"><strong style="color: #095c7b;">Exit Notes / Feedback:</strong> ${cancellationNotes}</p>` : ''}
                    `}

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
                    <p style="margin: 0;"><strong style="color: #095c7b;">Processed By:</strong> ${processedBy}</p>
                  </td>
                </tr>
              </table>

              <!-- Operational Instructions -->
              ${isSaved ? `
                <p style="margin: 16px 0; font-size: 14px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                  <strong>Action for Franchisee:</strong> Please continue providing scheduled pickup and delivery services for ${companyName} as normal.
                </p>
              ` : `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; margin: 16px 0; padding: 14px;">
                  <tr>
                    <td style="font-size: 13px; color: #9f1239; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                      <strong>Action for Franchisee:</strong>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 6px;">
                        <tr>
                          <td width="24" valign="top">•</td>
                          <td valign="top" style="color: #9f1239;">Continue servicing this customer up to and including the Final Service Date (<strong>${trueServiceCancellationDate || cancellationDate || 'today'}</strong>).</td>
                        </tr>
                        <tr>
                          <td width="24" valign="top">•</td>
                          <td valign="top" style="color: #9f1239;">Collect any MailPlus equipment, satchels, or stands on your final service run.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              `}

              <!-- CTA Button Table -->
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #095c7b;">
                    <a href="${companyDirectUrl}" target="_blank" style="font-size: 15px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 26px; display: inline-block; font-weight: 600; background-color: #095c7b;">
                      View Customer in ProspectPlus &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 6px; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                Kind regards,
              </p>
              
              <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6;">
                <strong style="font-weight: 700; color: #2d3748;">ProspectPlus Customer Success Team</strong>
              </p>

            </td>
          </tr>

          <!-- Navy Blue Banner with MailPlus Logo -->
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

          <!-- Standardized Legal & Brand Footer -->
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
                <a href="${unsubscribeLink}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const cc = 'mailplusit@mailplus.com.au, sarah.hart@mailplus.com.au';

    const sendRes = await sendPhysicalEmail({
      to: franchiseeEmail,
      cc,
      customFrom: effectiveCustomFrom,
      subject,
      html,
      leadId,
    });

    if (sendRes.success) {
      // Log activity to company/lead timeline
      const nowIso = new Date().toISOString();
      const activityPayload = {
        type: 'Email',
        date: nowIso,
        notes: `Automated ${isSaved ? 'Customer Retained' : 'Service Cancellation'} email sent to Franchisee (${franchiseeEmail}) [CC: ${cc}].`,
        author: processedBy || 'Customer Success System',
      };

      const [compSnap, leadSnap] = await Promise.all([
        adminDb.collection('companies').doc(leadId).get(),
        adminDb.collection('leads').doc(leadId).get(),
      ]);

      if (compSnap.exists) {
        await adminDb.collection('companies').doc(leadId).collection('activity').add(activityPayload);
      }
      if (leadSnap.exists) {
        await adminDb.collection('leads').doc(leadId).collection('activity').add(activityPayload);
      }
    }

    return {
      success: sendRes.success,
      simulated: sendRes.simulated,
      recipient: franchiseeEmail,
    };
  } catch (err: any) {
    console.error('[Franchisee Cancellation Outcome Email Error]:', err);
    return { success: false, reason: err.message || 'Internal error dispatching email' };
  }
}
