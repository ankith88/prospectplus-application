import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const API_KEY = process.env.EXTERNAL_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

async function generateUniqueLpoProspectPlusId(db: FirebaseFirestore.Firestore): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `LPO${generateRandomAlphanumeric(6)}`;
    const lpoLeadsSnap = await db.collection('lpo_leads').where('prospectPlusId', '==', candidate).limit(1).get();
    if (lpoLeadsSnap.empty) {
      unique = true;
    }
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const {
      lpoName,
      lpoOwnerName,
      email,
      phone,
      address1,
      address2,
      city,
      state,
      postcode,
      lat,
      lng,
      notes,
      pageURL,
    } = body;

    if (!lpoName || !lpoOwnerName || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getFirestore(adminApp);
    const prospectPlusId = await generateUniqueLpoProspectPlusId(db);

    const lpoLeadData = {
      prospectPlusId,
      lpoName,
      lpoOwnerName,
      email,
      phone,
      address1: address1 || '',
      address2: address2 || '',
      city: city || '',
      state: state || '',
      postcode: postcode || '',
      lat: lat || '',
      lng: lng || '',
      notes: notes || '',
      status: 'New',
      source: 'Website',
      pageURL: pageURL || '',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('lpo_leads').add(lpoLeadData);
    const leadId = docRef.id;

    // Send confirmation email
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
    const baseUrl = origin.replace(/\/$/, '');
    const profileUrl = `${baseUrl}/lpo-leads/${leadId}`;

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New LPO Lead: ${lpoName}</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f8; padding: 20px 0; width: 100%;">
    <tr>
      <td align="center">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(9, 92, 123, 0.06);">
          
          <!-- Body Text & Content Row -->
          <tr>
            <td style="padding: 40px 30px; color: #2d3748; font-size: 15px; line-height: 1.6; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              
              <h2 style="color: #095c7b; margin: 0 0 16px; font-size: 20px; text-align: center; font-weight: 700;">New LPO Lead Received</h2>
              
              <p style="margin: 0 0 20px; font-size: 15px; color: #2d3748; text-align: center;">
                A new LPO Owner enquiry has been submitted. Here are the details of the lead:
              </p>
              
              <!-- Lead Details Box Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <tr>
                  <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #2d3748;">
                      <tr style="border-bottom: 1px solid #edf2f7;">
                        <td width="140" style="padding: 8px 0; font-weight: 700; color: #4a5568;">LPO Location/Name:</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #095c7b;">${lpoName}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px 0; font-weight: 700; color: #4a5568;">LPO Owner Name:</td>
                        <td style="padding: 8px 0;">${lpoOwnerName}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px 0; font-weight: 700; color: #4a5568;">Contact Email:</td>
                        <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #095c7b; text-decoration: underline;">${email}</a></td>
                      </tr>
                      <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px 0; font-weight: 700; color: #4a5568;">Contact Phone:</td>
                        <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #095c7b; text-decoration: underline;">${phone}</a></td>
                      </tr>
                      <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 8px 0; font-weight: 700; color: #4a5568;">Address:</td>
                        <td style="padding: 8px 0;">${address1 ? address1 + ', ' : ''}${address2 ? address2 + ', ' : ''}${city} ${state} ${postcode}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 700; color: #4a5568; vertical-align: top;">Notes:</td>
                        <td style="padding: 8px 0; white-space: pre-wrap;">${notes || 'No notes provided.'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" target="_blank" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 30px; font-weight: 700; font-size: 15px; display: inline-block; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                      View LPO Lead Profile &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Navy Banner with Logo per AGENTS.md -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- Footer per AGENTS.md -->
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

    try {
      await sendPhysicalEmail({
        to: 'kerry.oneill@mailplus.com.au',
        cc: 'Michael.McDaid@mailplus.com.au, ankith.ravindran@mailplus.com.au',
        subject: `New LPO Lead: ${lpoName}`,
        html: emailHtml,
      });
    } catch (emailErr) {
      console.error('[LPO Lead API] Email dispatch failed:', emailErr);
    }

    return NextResponse.json({ success: true, id: leadId, prospectPlusId });
  } catch (error: any) {
    console.error('Error creating LPO lead:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
