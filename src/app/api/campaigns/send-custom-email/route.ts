import { NextResponse } from 'next/server';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, customFrom, cc, bcc } = body;

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
        margin-bottom: 24px;
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
        padding: 20px;
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
      ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" alt="Logo" />` : ''}
      <div class="email-body">
        ${htmlContent}
      </div>
    </div>
  </body>
</html>
    `;

    const isAlreadyWrapped = html.trim().toLowerCase().startsWith('<!doctype') || html.trim().toLowerCase().startsWith('<html');
    const formattedHtml = isAlreadyWrapped ? html : wrapEmailHtml(html);

    const sendResult = await sendPhysicalEmail({
      to,
      subject,
      html: formattedHtml,
      customFrom,
      cc,
      bcc
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, message: sendResult.error || 'Failed to dispatch email.' },
        { status: 500 }
      );
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
