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
      firstName = '',
      lastName = '',
      email = '',
      phone = '',
      preferredTerritory = '',
      preferredState = '',
      interest = '',
      vehicle = '',
      experience = '',
      employment = '',
      message = '',
      sendBrochureImmediately = false,
      customMessage = '',
      createdByUid = 'system',
      createdByName = 'Operations User',
    } = body;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim() || 'Franchise Applicant';
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanEmail && !cleanPhone) {
      return NextResponse.json({ success: false, message: 'Email or phone number is required.' }, { status: 400 });
    }

    // Infer state from preferred territory if state not explicitly selected
    let state = preferredState.trim().toUpperCase();
    if (!state && preferredTerritory.includes(',')) {
      const parts = preferredTerritory.split(',');
      state = parts[parts.length - 1].trim().toUpperCase();
    }

    const prospectData: any = {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      fullName,
      email: cleanEmail,
      phone: cleanPhone,
      preferredTerritory: preferredTerritory.trim(),
      preferredState: state,
      interest: interest.trim(),
      vehicle: vehicle.trim(),
      experience: experience.trim(),
      employment: employment.trim(),
      message: message.trim(),
      status: sendBrochureImmediately ? 'Contacted' : 'New',
      submittedAt: new Date().toISOString(),
      sourceApp: 'ProspectPlus UI',
      notes: [
        {
          id: 'nt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          text: `Prospect created manually in ProspectPlus by ${createdByName}.`,
          createdAt: new Date().toISOString(),
          createdByName,
          createdByUid,
        },
      ],
      emailLogs: [],
      brochureSent: false,
    };

    const docRef = await db.collection('franchise_prospects').add(prospectData);
    const prospectId = docRef.id;

    let brochureSent = false;

    // Send brochure immediately if requested
    if (sendBrochureImmediately && cleanEmail) {
      try {
        const brochurePath = path.join(process.cwd(), 'Zee sales process', 'Franchise  Brochure.pdf');
        const attachments: Array<{ name: string; url: string }> = [];
        let brochureSize = 0;

        if (fs.existsSync(brochurePath)) {
          const stat = fs.statSync(brochurePath);
          brochureSize = stat.size;
          attachments.push({
            name: 'MailPlus Franchise Information Brochure.pdf',
            url: brochurePath,
          });
        }

        const territoryText = preferredTerritory ? ` in ${preferredTerritory}` : '';
        const subject = `MailPlus Franchise Opportunity - Information Brochure${territoryText}`;

        const bodyParagraphs = customMessage
          ? customMessage
              .split('\n')
              .filter((p: string) => p.trim().length > 0)
              .map((p: string) => `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${p.trim()}</p>`)
              .join('')
          : `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Thank you for your enquiry regarding MailPlus franchise opportunities${territoryText}.
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                As Step 1 of our franchise review process, please find attached our official <strong>MailPlus Franchise Information Brochure</strong> which details our mobile B2B express logistics model, revenue streams, and head office support.
              </p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Our team will be in contact shortly to discuss your application. If you have immediate questions, feel free to call us on <strong>1300 65 65 95</strong>.
              </p>`;

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Hi ${trimmedFirstName || 'Applicant'},
              </h2>
              ${bodyParagraphs}

              <!-- Key Info Grid -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px;">
                <tr>
                  <td width="36" valign="top" style="font-size: 18px; padding: 4px 8px 4px 12px;">🚚</td>
                  <td style="font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 4px 12px 4px 0;">
                    <strong>Proven Mobile B2B Model:</strong> Recurring revenue with no retail shopfront.
                  </td>
                </tr>
                <tr>
                  <td width="36" valign="top" style="font-size: 18px; padding: 8px 8px 4px 12px;">📍</td>
                  <td style="font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 8px 12px 4px 0;">
                    <strong>Exclusive Territory:</strong> Local dedicated customer base with full daily support.
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 15px; line-height: 1.6; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Kind regards,<br />
                <strong style="color: #095c7b;">Greg Hart</strong><br />
                <span style="font-size: 13px; color: #718096;">Head of Franchise Sales | MailPlus</span>
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

        const sendRes = await sendPhysicalEmail({
          to: cleanEmail,
          customFrom: 'greg.hart@mailplus.com.au',
          cc: 'michael.mcdaid@mailplus.com.au',
          subject,
          html: htmlContent,
          attachments,
        });

        if (sendRes.success) {
          brochureSent = true;
          const emailLog = {
            id: 'em_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            sentAt: new Date().toISOString(),
            sentByUid: createdByUid,
            sentByName: createdByName,
            subject,
            recipient: cleanEmail,
            customMessage: 'Initial Franchise Brochure sent automatically on prospect creation (Step 1).',
            attachments: [
              {
                name: 'MailPlus Franchise Information Brochure.pdf',
                url: 'local://Zee sales process/Franchise Brochure.pdf',
                size: brochureSize,
              },
            ],
            status: 'Sent' as const,
          };

          const brochureNote = {
            id: 'nt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            text: `Step 1 Completed: Franchise Brochure sent to ${cleanEmail}.`,
            createdAt: new Date().toISOString(),
            createdByName,
            createdByUid,
          };

          await docRef.update({
            brochureSent: true,
            brochureSentAt: new Date().toISOString(),
            emailLogs: FieldValue.arrayUnion(emailLog),
            notes: FieldValue.arrayUnion(brochureNote),
          });
        }
      } catch (emailErr) {
        console.error('Failed to auto-send brochure on prospect creation:', emailErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Franchise prospect created successfully.',
        prospectId,
        brochureSent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating franchise prospect:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create prospect.' }, { status: 500 });
  }
}
