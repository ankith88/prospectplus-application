import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prospectId,
      stepType,
      customMessage = '',
      toEmail = '',
      ccEmail = '',
      bccEmail = '',
      subject: customSubject = '',
    } = body;

    if (!prospectId || !stepType) {
      return NextResponse.json({ success: false, message: 'Missing required parameters' }, { status: 400 });
    }

    const prospectRef = db.collection('franchise_prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return NextResponse.json({ success: false, message: 'Prospect not found' }, { status: 404 });
    }

    const prospectData = prospectSnap.data() || {};
    const recipientEmail = (toEmail || prospectData.email || '').trim();
    const recipientName = prospectData.fullName || prospectData.firstName || 'Valued Candidate';
    const preferredTerritory = prospectData.preferredTerritory || 'MailPlus Territory';

    if (!recipientEmail) {
      return NextResponse.json({ success: false, message: 'Recipient email address is required' }, { status: 400 });
    }

    // Sender & CC/BCC configuration:
    const senderEmail = 'greg.hart@mailplus.com.au';
    const senderName = 'Greg Hart (MailPlus National Sales)';
    const finalCcEmail = ccEmail !== undefined && ccEmail !== null ? ccEmail.trim() : 'michael.mcdaid@mailplus.com.au';
    const finalBccEmail = bccEmail ? bccEmail.trim() : '';

    // Generate origin for links
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';

    let defaultSubject = '';
    let linkUrl = '';
    let emailBodyHtml = '';

    const formatCustomMessage = (msg: string) => {
      if (!msg || !msg.trim()) return '';
      return msg
        .split('\n')
        .filter((p) => p.trim().length > 0)
        .map((p) => `<p style="margin-bottom: 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${p.trim()}</p>`)
        .join('');
    };

    if (stepType === 'fact_sheet') {
      const token = prospectData.keyFactSheet?.publicToken || prospectId;
      linkUrl = `${origin}/fact-sheet/${token}`;
      defaultSubject = `MailPlus Key Fact Sheet - Franchise Opportunity in ${preferredTerritory}`;

      const franchiseFee = prospectData.keyFactSheet?.franchiseFee || 35000;
      const trainingFee = prospectData.keyFactSheet?.trainingFee || 5000;

      const bodyContent = customMessage
        ? formatCustomMessage(customMessage)
        : `<p style="margin-bottom: 16px;">Thank you for your interest in joining the MailPlus franchise network for the <strong>${preferredTerritory}</strong> territory.</p>
           <p style="margin-bottom: 20px;">We have prepared your personalized <strong>MailPlus Key Fact Sheet</strong>, which outlines the key territory financials, franchise fees, marketing structure, and operational overview.</p>`;

      emailBodyHtml = `
        <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; font-weight: 700;">Hi ${recipientName},</h2>
        ${bodyContent}
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px;">
              <strong style="color: #095c7b; display: block; margin-bottom: 8px; font-size: 15px;">Territory Highlights:</strong>
              <p style="margin: 4px 0; font-size: 13px;">&bull; <strong>Territory:</strong> ${preferredTerritory}</p>
              <p style="margin: 4px 0; font-size: 13px;">&bull; <strong>Franchise Fee:</strong> $${Number(franchiseFee).toLocaleString('en-AU')}</p>
              <p style="margin: 4px 0; font-size: 13px;">&bull; <strong>Training & Onboarding Fee:</strong> $${Number(trainingFee).toLocaleString('en-AU')}</p>
            </td>
          </tr>
        </table>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${linkUrl}" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">View Your Key Fact Sheet &rarr;</a>
        </p>

        <p style="font-size: 13px; color: #64748b;">If you have any questions after reviewing the fact sheet, please feel free to reach out directly to Greg Hart.</p>
      `;
    } else if (stepType === 'confidentiality_deed') {
      const token = prospectData.confidentialityDeed?.publicToken || prospectId;
      linkUrl = `${origin}/confidentiality-deed/${token}`;
      defaultSubject = `MailPlus Confidentiality Deed - Run-Along Requirement for ${preferredTerritory}`;

      const bodyContent = customMessage
        ? formatCustomMessage(customMessage)
        : `<p style="margin-bottom: 16px;">Before we arrange your hands-on territory run-along in <strong>${preferredTerritory}</strong>, MailPlus requires all prospective buyers to sign a digital Confidentiality Deed.</p>
           <p style="margin-bottom: 20px;">This protects confidential operational route data, client names, and financial insights you will observe during your run-along.</p>`;

      emailBodyHtml = `
        <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; font-weight: 700;">Hi ${recipientName},</h2>
        ${bodyContent}

        <p style="text-align: center; margin: 30px 0;">
          <a href="${linkUrl}" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Sign Confidentiality Deed Online &rarr;</a>
        </p>

        <p style="font-size: 13px; color: #64748b;">You can easily review and sign the deed digitally from your phone, tablet, or desktop.</p>
      `;
    } else if (stepType === 'eoi') {
      const token = prospectData.eoiData?.publicToken || prospectId;
      linkUrl = `${origin}/eoi/${token}`;
      defaultSubject = `MailPlus Expression of Interest (EOI) Application - ${preferredTerritory}`;

      const bodyContent = customMessage
        ? formatCustomMessage(customMessage)
        : `<p style="margin-bottom: 16px;">Congratulations on progressing in the MailPlus Franchise Selection process for <strong>${preferredTerritory}</strong>!</p>
           <p style="margin-bottom: 20px;">The next step is completing your official <strong>Expression of Interest (EOI)</strong> application form online.</p>`;

      emailBodyHtml = `
        <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; font-weight: 700;">Hi ${recipientName},</h2>
        ${bodyContent}

        <p style="text-align: center; margin: 30px 0;">
          <a href="${linkUrl}" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px;">Complete & Sign EOI Form Online &rarr;</a>
        </p>

        <p style="font-size: 13px; color: #64748b;">Please have your entity details, ABN, and financial summary ready when filling out the online form.</p>
      `;
    } else {
      return NextResponse.json({ success: false, message: 'Invalid stepType specified' }, { status: 400 });
    }

    const finalSubject = customSubject.trim() || defaultSubject;

    // Standardized AGENTS.md Email Wrapper
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${finalSubject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <!-- Brand Header Banner -->
                <tr>
                  <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
                    <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 30px 25px; color: #2d3748; line-height: 1.6; font-size: 14px;">
                    ${emailBodyHtml}
                  </td>
                </tr>

                <!-- Brand Footer -->
                <tr>
                  <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                      <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
                    </p>
                    <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                      Sent by ${senderName} &bull; Powered by MailPlus Australia
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                      &copy; 2026 MailPlus. All rights reserved. <br />
                      If you no longer wish to receive marketing communications, you can&nbsp;
                      <a href="${origin}/unsubscribe" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
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

    // Send Email via Dispatcher
    const dispatchRes = await sendPhysicalEmail({
      to: recipientEmail,
      subject: finalSubject,
      html: fullHtml,
      customFrom: senderEmail,
      cc: finalCcEmail || undefined,
      bcc: finalBccEmail || undefined,
    });

    // Log Sent Email to Firestore Prospect Record
    const emailLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      sentAt: new Date().toISOString(),
      sentByUid: 'greg.hart',
      sentByName: 'Greg Hart (greg.hart@mailplus.com.au)',
      recipientEmail,
      ccEmail: finalCcEmail,
      bccEmail: finalBccEmail,
      subject: finalSubject,
      templateType: stepType,
    };

    const updatedEmailLogs = [...(prospectData.emailLogs || []), emailLogEntry];

    // Add internal timeline note
    const noteEntry = {
      id: Math.random().toString(36).substring(2, 9),
      text: `Sent ${stepType.replace('_', ' ').toUpperCase()} email to ${recipientEmail}${finalCcEmail ? ` (CC: ${finalCcEmail})` : ''}${finalBccEmail ? ` (BCC: ${finalBccEmail})` : ''}. Subject: "${finalSubject}".`,
      createdAt: new Date().toISOString(),
      createdByName: 'Greg Hart',
      createdByUid: 'greg.hart',
    };

    const updatedNotes = [...(prospectData.notes || []), noteEntry];

    const updatesToApply: Record<string, any> = {
      emailLogs: updatedEmailLogs,
      notes: updatedNotes,
    };

    if (stepType === 'confidentiality_deed' && prospectData.confidentialityDeed?.status !== 'signed_online') {
      updatesToApply['confidentialityDeed.status'] = 'sent';
    }

    await prospectRef.update(updatesToApply);

    return NextResponse.json({
      success: true,
      message: `Email dispatched successfully to ${recipientEmail}`,
      simulated: dispatchRes.simulated,
    });
  } catch (error: any) {
    console.error('Error in send-step-email route:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
