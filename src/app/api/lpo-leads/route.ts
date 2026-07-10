import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const API_KEY = process.env.MAILPLUS_GENERAL_API_KEY || '708aa067-d67d-73e6-8967-66786247f5d7';

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
      pageURL: pageURL || '',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('lpo_leads').add(lpoLeadData);
    const leadId = docRef.id;

    // Send confirmation email
    const origin = req.nextUrl.origin;
    const profileUrl = `${origin}/lpo-leads/${leadId}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #103d39; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="https://mailplus.com.au/wp-content/uploads/2023/01/MailPlus-Logo.png" alt="MailPlus Logo" style="max-height: 48px;" />
        </div>
        <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; text-align: center;">New LPO Lead Received</h2>
        <p style="font-size: 15px; line-height: 1.5; text-align: center;">
          A new LPO Owner enquiry has been submitted. Here are the details of the lead:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tbody>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold; width: 140px;">LPO Location/Name</td>
              <td style="padding: 10px 0;">${lpoName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold;">LPO Owner Name</td>
              <td style="padding: 10px 0;">${lpoOwnerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold;">Contact Email</td>
              <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #095c7b; text-decoration: none;">${email}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold;">Contact Phone</td>
              <td style="padding: 10px 0;"><a href="tel:${phone}" style="color: #095c7b; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold;">Address</td>
              <td style="padding: 10px 0;">${address1 ? address1 + ', ' : ''}${address2}, ${city} ${state} ${postcode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 10px 0; font-weight: bold;">Notes</td>
              <td style="padding: 10px 0; white-space: pre-wrap;">${notes || 'No notes provided.'}</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="${profileUrl}" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 30px; font-weight: bold; font-size: 15px; display: inline-block;">
            View LPO Lead Profile
          </a>
        </div>
      </div>
    `;

    try {
      await sendPhysicalEmail({
        to: 'kerry.oneill@mailplus.com.au',
        cc: 'michael.cdaid@mailplus.com.au',
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
