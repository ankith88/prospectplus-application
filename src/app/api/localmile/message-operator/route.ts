import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const API_KEY = process.env.EXTERNAL_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

async function findCompanyAndFranchisee(customerid: string) {
  const db = getFirestore(adminApp);
  const companiesRef = db.collection('companies');
  let companySnap = await companiesRef.where('internalid', '==', customerid).limit(1).get();

  if (companySnap.empty) {
    const numId = parseInt(customerid, 10);
    if (!isNaN(numId)) {
      companySnap = await companiesRef.where('internalid', '==', numId).limit(1).get();
    }
  }

  let isLead = false;
  let companyDoc = !companySnap.empty ? companySnap.docs[0] : null;

  if (!companyDoc) {
    const leadsRef = db.collection('leads');
    let leadSnap = await leadsRef.where('internalid', '==', customerid).limit(1).get();
    if (leadSnap.empty) {
      const numId = parseInt(customerid, 10);
      if (!isNaN(numId)) {
        leadSnap = await leadsRef.where('internalid', '==', numId).limit(1).get();
      }
    }
    if (!leadSnap.empty) {
      companyDoc = leadSnap.docs[0];
      isLead = true;
    }
  }

  if (!companyDoc) {
    return { company: null, franchisee: null };
  }

  const companyData = companyDoc.data();
  const companyId = companyDoc.id;
  const collectionName = isLead ? 'leads' : 'companies';

  let franchiseeData: any = null;
  if (companyData.franchisee_id) {
    const franchiseeDoc = await db.collection('franchisees').doc(companyData.franchisee_id).get();
    if (franchiseeDoc.exists) {
      franchiseeData = franchiseeDoc.data();
    }
  }

  return {
    company: {
      id: companyId,
      collectionName,
      ...companyData
    } as any,
    franchisee: franchiseeData
  };
}

export async function GET(req: NextRequest) {
  try {
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader !== API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerid = searchParams.get('customerid');
    const loginemail = searchParams.get('loginemail');

    if (!customerid || !loginemail) {
      return NextResponse.json({ error: 'Missing customerid or loginemail' }, { status: 400 });
    }

    const { company, franchisee } = await findCompanyAndFranchisee(customerid);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      companyName: company.companyName,
      prospectPlusId: company.prospectPlusId,
      franchiseeName: franchisee?.name || company.franchisee || 'Linked Franchisee',
      franchiseeEmail: franchisee?.email || null
    });
  } catch (error: any) {
    console.error('Error verifying customer in prospectplus:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader !== API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerid, loginemail, message } = await req.json();

    if (!customerid || !loginemail || !message) {
      return NextResponse.json({ error: 'Missing customerid, loginemail, or message' }, { status: 400 });
    }

    const { company, franchisee } = await findCompanyAndFranchisee(customerid);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const franchiseeEmail = franchisee?.email;
    if (!franchiseeEmail) {
      return NextResponse.json({ error: 'Franchisee email address not found.' }, { status: 404 });
    }

    // Format the email body
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #2d3748;
        line-height: 1.6;
        padding: 20px;
        margin: 0;
        background-color: #f7fafc;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        max-width: 600px;
        margin: 0 auto;
        padding: 30px;
        position: relative;
      }
      .top-right {
        float: right;
        font-size: 11px;
        color: #a0aec0;
        text-align: right;
        margin-bottom: 20px;
      }
      .clear {
        clear: both;
      }
      h2 {
        color: #095c7b;
        font-size: 20px;
        font-weight: 700;
        margin-top: 0;
        margin-bottom: 20px;
        border-bottom: 2px solid #edf2f7;
        padding-bottom: 10px;
      }
      .field {
        margin-bottom: 12px;
      }
      .label {
        font-weight: bold;
        color: #4a5568;
        display: inline-block;
        width: 120px;
      }
      .value {
        color: #2d3748;
      }
      .message-box {
        background-color: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 15px;
        margin-top: 20px;
        white-space: pre-wrap;
        color: #2d3748;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="top-right">ID: ${company.prospectPlusId || 'N/A'}</div>
      <div class="clear"></div>
      <h2>Message from Customer</h2>
      <div class="field">
        <span class="label">Company:</span>
        <span class="value">${company.companyName}</span>
      </div>
      <div class="field">
        <span class="label">Customer ID:</span>
        <span class="value">${customerid}</span>
      </div>
      <div class="field">
        <span class="label">Login Email:</span>
        <span class="value">${loginemail}</span>
      </div>
      <div class="message-box">${message}</div>
    </div>
  </body>
</html>
    `;

    const subject = `Message from Customer: ${company.companyName}`;

    // Send the email using native prospectplus dispatcher
    const sendResult = await sendPhysicalEmail({
      to: franchiseeEmail,
      subject,
      html: emailHtml,
      prospectPlusId: company.prospectPlusId
    });

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Failed to dispatch email.' }, { status: 500 });
    }

    // Log the sent email and action details in Firestore
    try {
      const db = getFirestore(adminApp);
      const companyRef = db.collection(company.collectionName).doc(company.id);
      
      // Log to emails subcollection
      await companyRef.collection('emails').add({
        subject,
        bodyHtml: emailHtml,
        sentAt: new Date().toISOString(),
        sender: 'system@mailplus.com.au',
        recipient: franchiseeEmail,
        status: sendResult.simulated ? 'simulated' : 'sent'
      });

      // Log to activity subcollection
      await companyRef.collection('activity').add({
        type: 'Email',
        date: new Date().toISOString(),
        notes: `Sent email message to franchisee (${franchiseeEmail}). Subject: "${subject}".`,
        author: 'Customer Portal'
      });
    } catch (logError) {
      console.error('Failed to log email activities in Firestore:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Email dispatched successfully.',
      simulated: sendResult.simulated
    });
  } catch (error: any) {
    console.error('Error sending message to operator:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
