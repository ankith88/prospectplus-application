import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import path from 'path';
import fs from 'fs';

const db = getFirestore(adminApp);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prospectId,
      subject,
      customMessage = '',
      includeBrochure = true,
      additionalAttachments = [],
      senderUid = 'system',
      senderName = 'MailPlus Operations',
    } = body;

    if (!prospectId) {
      return NextResponse.json({ success: false, message: 'Prospect ID is required.' }, { status: 400 });
    }

    const docRef = db.collection('franchise_prospects').doc(prospectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: 'Franchise prospect not found.' }, { status: 404 });
    }

    const prospect = docSnap.data();
    if (!prospect?.email) {
      return NextResponse.json({ success: false, message: 'Prospect does not have a valid email address.' }, { status: 400 });
    }

    const prospectName = prospect.firstName || prospect.fullName || 'Applicant';
    const territoryText = prospect.preferredTerritory ? ` in ${prospect.preferredTerritory}` : '';
    const finalSubject = subject || `MailPlus Franchise Opportunity - Information Brochure${territoryText}`;

    // Prepare attachments array for dispatcher
    const emailAttachments: Array<{ name: string; url: string }> = [];
    const logAttachments: Array<{ name: string; url?: string; size?: number }> = [];

    // Step 1: Franchise Brochure PDF attachment
    if (includeBrochure) {
      const brochurePath = path.join(process.cwd(), 'Zee sales process', 'Franchise  Brochure.pdf');
      let brochureSize = 0;
      if (fs.existsSync(brochurePath)) {
        const stat = fs.statSync(brochurePath);
        brochureSize = stat.size;
      }
      emailAttachments.push({
        name: 'MailPlus Franchise Information Brochure.pdf',
        url: brochurePath,
      });
      logAttachments.push({
        name: 'MailPlus Franchise Information Brochure.pdf',
        url: 'local://Zee sales process/Franchise Brochure.pdf',
        size: brochureSize,
      });
    }

    // Additional uploaded/custom attachments
    if (Array.isArray(additionalAttachments)) {
      for (const att of additionalAttachments) {
        if (att.name && att.url) {
          emailAttachments.push({
            name: att.name,
            url: att.url,
          });
          logAttachments.push({
            name: att.name,
            url: att.url,
            size: att.size || 0,
          });
        }
      }
    }

    // Build Email Body following AGENTS.md Outbound Email formatting guidelines
    const messageParagraphs = customMessage
      ? customMessage
          .split('\n')
          .filter((p: string) => p.trim().length > 0)
          .map((p: string) => `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${p.trim()}</p>`)
          .join('')
      : `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Thank you for your interest in owning a MailPlus franchise${territoryText}. We are excited to share more details about our local B2B logistics model.</p>
         <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">Please find attached our official <strong>MailPlus Franchise Information Brochure</strong> which provides a detailed overview of our mobile owner-operator network, recurring income structure, and head office sales support.</p>
         <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">If you have any questions or would like to discuss next steps, please feel free to reply directly to this email or call our team on <strong>1300 65 65 95</strong>.</p>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- Brand Header Banner -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 32px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${prospectName},
              </h2>

              ${messageParagraphs}

              <!-- Highlights Table Grid (Outlook friendly list format) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px;">
                <tr>
                  <td width="36" valign="top" style="font-size: 18px; padding: 4px 8px 4px 12px;">🚚</td>
                  <td style="font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 4px 12px 4px 0;">
                    <strong>Proven Mobile B2B Model:</strong> Recurring revenue with no costly retail shopfront.
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="font-size: 18px; padding: 8px 8px 4px 12px;">📍</td>
                  <td style="font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 8px 12px 4px 0;">
                    <strong>Exclusive Territory:</strong> Local dedicated customer base with full daily support.
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="font-size: 18px; padding: 8px 8px 4px 12px;">📎</td>
                  <td style="font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 8px 12px 4px 0;">
                    <strong>Attached Documents:</strong> Check the PDF attachment(s) included with this email.
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.6; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Kind regards,<br />
                <strong style="color: #095c7b;">MailPlus Franchise Team</strong>
              </p>
            </td>
          </tr>

          <!-- Standardized Brand & Legal Footer -->
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
                <a href="https://mailplus.com.au/unsubscribe" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Dispatch email
    const sendResult = await sendPhysicalEmail({
      to: prospect.email,
      subject: finalSubject,
      html: htmlContent,
      attachments: emailAttachments,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to dispatch email.' },
        { status: 500 }
      );
    }

    // Build log entry
    const emailLogEntry = {
      id: 'em_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sentAt: new Date().toISOString(),
      sentByUid: senderUid,
      sentByName: senderName,
      subject: finalSubject,
      recipient: prospect.email,
      customMessage: customMessage || '',
      attachments: logAttachments,
      status: 'Sent' as const,
    };

    const noteEntry = {
      id: 'nt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: `Email sent to ${prospect.email}: "${finalSubject}" (${logAttachments.length} attachment(s))`,
      createdAt: new Date().toISOString(),
      createdByName: senderName,
      createdByUid: senderUid,
    };

    // Update Firestore Document
    const updates: any = {
      emailLogs: FieldValue.arrayUnion(emailLogEntry),
      notes: FieldValue.arrayUnion(noteEntry),
    };

    if (includeBrochure) {
      updates.brochureSent = true;
      updates.brochureSentAt = new Date().toISOString();
    }

    if (prospect.status === 'New') {
      updates.status = 'Contacted';
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      message: 'Email dispatched and logged successfully.',
      simulated: sendResult.simulated,
      emailLog: emailLogEntry,
    });
  } catch (error: any) {
    console.error('Error sending franchise prospect email:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error.' }, { status: 500 });
  }
}
