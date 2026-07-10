import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, customFrom, cc, bcc, attachments, isTemplate } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, subject, html.' },
        { status: 400 }
      );
    }

    // Fetch brand profile details
    const brandSnap = await db.collection('brandProfiles').doc('default_company').get();
    const brandData = brandSnap.exists ? brandSnap.data() : null;
    const primaryColor = brandData?.designTokens?.primaryColor || '#095C7B';
    const fontFamily = brandData?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const logoUrl = brandData?.designTokens?.logoUrl || '';

    const wrapEmailHtml = (htmlContent: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: ${fontFamily}; 
        color: #2e2e2e; 
        line-height: 1.6; 
        padding: 20px; 
        margin: 0;
        background-color: #f8fafc;
      }
      h1, h2, h3 { color: ${primaryColor}; font-weight: normal; margin-top: 0; }
      p { margin-bottom: 16px; }
      a { color: ${primaryColor}; text-decoration: underline; }
      .brand-logo {
        max-height: 48px;
        max-width: 150px;
        display: block;
        margin: 0 auto;
      }
      .preview-footer {
        margin-top: 24px;
        padding-top: 12px;
        border-top: 1px solid #eaeaea;
        font-size: 11px;
        color: #888;
      }
      .logo-header {
        background-color: #095c7b;
        padding: 20px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        text-align: center;
      }
      .email-body {
        padding: 20px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      table td, table th {
        border: 1px solid #ced4da;
        padding: 8px;
        text-align: left;
      }
      table th {
        font-weight: bold;
        background-color: #f1f3f5;
      }
      .email-content {
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
        max-width: 600px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div class="email-content">
      ${logoUrl ? `
      <div class="logo-header">
        <img src="${logoUrl}" class="brand-logo" alt="Logo" />
      </div>
      ` : ''}
      <div class="email-body">
        ${htmlContent}
      </div>
    </div>
  </body>
</html>
    `;

    const wrapEmailHtmlTemplate = (htmlContent: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { 
        font-family: ${fontFamily}; 
        color: #2e2e2e; 
        line-height: 1.6; 
        padding: 20px; 
        margin: 0;
        background-color: #f8fafc;
      }
      h1, h2, h3 { color: ${primaryColor}; font-weight: normal; margin-top: 0; }
      p { margin-bottom: 16px; }
      a { color: ${primaryColor}; text-decoration: underline; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      table td, table th {
        border: 1px solid #ced4da;
        padding: 8px;
        text-align: left;
      }
      table th {
        font-weight: bold;
        background-color: #f1f3f5;
      }
      .email-content {
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .brand-logo {
        max-height: 48px;
        max-width: 150px;
        display: block;
        margin-bottom: 24px;
      }
      .preview-footer {
        margin-top: 24px;
        padding-top: 12px;
        border-top: 1px solid #eaeaea;
        font-size: 11px;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="email-content">
      ${htmlContent}
    </div>
  </body>
</html>
    `;

    const isAlreadyWrapped = html.trim().toLowerCase().startsWith('<!doctype') || html.trim().toLowerCase().startsWith('<html');
    const formattedHtml = isAlreadyWrapped ? html : (isTemplate ? wrapEmailHtmlTemplate(html) : wrapEmailHtml(html));

    const sendResult = await sendPhysicalEmail({
      to,
      subject,
      html: formattedHtml,
      customFrom,
      cc,
      bcc,
      attachments
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to dispatch email.' },
        { status: 500 }
      );
    }

    // Locate the matching lead in Firestore to store the sent message details under leads/{leadId}/emails
    try {
      const searchEmail = to.includes(',') ? to.split(',')[0].toLowerCase().trim() : to.toLowerCase().trim();
      const contactsSnap = await db.collectionGroup('contacts').where('email', '==', searchEmail).limit(1).get();
      if (!contactsSnap.empty) {
        const contactDoc = contactsSnap.docs[0];
        const leadRef = contactDoc.ref.parent.parent;
        if (leadRef) {
          // Log to leads/{leadId}/emails subcollection
          await leadRef.collection('emails').add({
            subject,
            bodyHtml: formattedHtml,
            sentAt: new Date().toISOString(),
            sender: customFrom || 'campaigns@mailplus.com.au',
            recipient: to,
            status: sendResult.simulated ? 'simulated' : 'sent'
          });

          // Log an entry in the activity subcollection
          await leadRef.collection('activity').add({
            type: 'Email',
            date: new Date().toISOString(),
            notes: `Sent email: '${subject}' (Custom message from Mailbox page).`,
            author: 'Mailbox Operator'
          });
        }
      }
    } catch (dbErr) {
      console.error('[Send Custom Email DB Logging Exception]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Email dispatched successfully.',
      simulated: sendResult.simulated
    });

  } catch (error: any) {
    console.error('Error in send-custom-email API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error during send.' },
      { status: 500 }
    );
  }
}
