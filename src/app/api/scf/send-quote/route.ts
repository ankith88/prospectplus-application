import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, contactId, scfUrl, scfId, startDate, services, customHtml, customSubject, customTo, cc, bcc } = body;

    if (!leadId || !contactId || !scfUrl) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch Contact to get name and email (supports comma-separated contactId)
    const contactIds = contactId.includes(',') ? contactId.split(',') : [contactId];
    const contactsData = [];
    for (const cId of contactIds) {
      const trimmedId = cId.trim();
      if (!trimmedId) continue;
      const contactSnap = await db.collection('leads').doc(leadId).collection('contacts').doc(trimmedId).get();
      if (contactSnap.exists) {
        contactsData.push(contactSnap.data());
      }
    }

    if (contactsData.length === 0) {
      return NextResponse.json({ success: false, message: 'Contact not found' }, { status: 404 });
    }

    const contactEmails = contactsData.map(c => c?.email).filter(Boolean);
    const contactName = contactsData[0]?.name || '';
    const contactFirstName = contactName.split(' ')[0];

    if (contactEmails.length === 0) {
      return NextResponse.json({ success: false, message: 'Selected contacts have no email address' }, { status: 400 });
    }
    const contactEmail = contactEmails.join(', ');
    
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
      }
      .logo-header {
        background-color: #d0dece;
        padding: 20px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
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

    // If custom HTML and subject are provided, use them directly (wrapping if not already wrapped)
    if (customHtml && customSubject) {
      const isAlreadyWrapped = customHtml.trim().toLowerCase().startsWith('<!doctype') || customHtml.trim().toLowerCase().startsWith('<html');
      const formattedHtml = isAlreadyWrapped ? customHtml : wrapEmailHtml(customHtml);

      const dispatchResult = await sendPhysicalEmail({
        to: customTo || contactEmail,
        subject: customSubject,
        html: formattedHtml,
        cc,
        bcc
      });

      if (!dispatchResult.success) {
         return NextResponse.json({ success: false, message: dispatchResult.error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Quote email sent successfully' });
    }

    // 2. Fetch the "Service Quote" Template
    const templatesSnap = await db.collection('marketing_templates').where('name', '==', 'Service Quote').limit(1).get();
    let templateHtml = '';
    let templateSubject = 'Your MailPlus Service Quote';

    if (!templatesSnap.empty) {
      const templateData = templatesSnap.docs[0].data();
      templateHtml = templateData.htmlContent || templateData.content || templateData.body || '';
      templateSubject = templateData.subject || templateSubject;
    } else {
      // Fallback template if "Service Quote" doesn't exist
      templateHtml = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Your MailPlus Service Quote</h2>
          <p>Hi {{Contact.FirstName}},</p>
          <p>Thank you for considering MailPlus. Please find the details of your service quote below. Services are scheduled to start on {{service_start_date}}.</p>
          <div style="margin: 20px 0;">
            {{service_details_html}}
          </div>
          <p>To review and accept the terms and conditions, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{scf_link}}" style="background-color: #095c7b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Review & Accept Quote</a>
          </div>
          <p>If you have any questions, please reach out to your Account Manager.</p>
        </div>
      `;
    }

    // 2b. Fetch Lead details
    const leadSnap = await db.collection('leads').doc(leadId).get();
    const leadData = leadSnap.exists ? leadSnap.data() || {} : {};
    const companyName = leadData.companyName || '';
    const salesRepName = leadData.accountManagerAssigned || leadData.dialerAssigned || leadData.salesRepAssigned || 'Sales Representative';
    const franchiseeName = leadData.franchisee || 'MailPlus';

    // 3. Generate Service Details HTML Table
    let serviceDetailsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left;">
            <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Service</th>
            <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Frequency</th>
            <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Rate</th>
          </tr>
        </thead>
        <tbody>
    `;

    (services || []).forEach((s: any) => {
      let freqStr = s.frequency;
      if (Array.isArray(freqStr)) freqStr = freqStr.join(', ');
      serviceDetailsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${s.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${freqStr}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">$${parseFloat(s.rate).toFixed(2)}</td>
        </tr>
      `;
    });
    serviceDetailsHtml += `</tbody></table>`;

    // 4. Replace Variables case-insensitively
    templateHtml = templateHtml.replace(/\{\{Contact\.Name\}\}/gi, contactName);
    templateHtml = templateHtml.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
    templateHtml = templateHtml.replace(/\{\{contact_first_name\}\}/gi, contactFirstName);
    
    templateHtml = templateHtml.replace(/\{\{Company\.Name\}\}/gi, companyName);
    templateHtml = templateHtml.replace(/\{\{company_name\}\}/gi, companyName);
    
    templateHtml = templateHtml.replace(/\{\{SalesRep\.Name\}\}/gi, salesRepName);
    templateHtml = templateHtml.replace(/\{\{sales_rep_name\}\}/gi, salesRepName);
    
    templateHtml = templateHtml.replace(/\{\{Franchisee\.Name\}\}/gi, franchiseeName);
    templateHtml = templateHtml.replace(/\{\{franchisee_name\}\}/gi, franchiseeName);
    
    templateHtml = templateHtml.replace(/\{\{service_start_date\}\}/gi, startDate);
    templateHtml = templateHtml.replace(/\{\{serviceStartDate\}\}/gi, startDate);
    templateHtml = templateHtml.replace(/\{\{service_details_html\}\}/gi, serviceDetailsHtml);

    const serviceNames = (services || []).map((s:any) => s.name).join('<br/>');
    const serviceFrequencies = (services || []).map((s:any) => Array.isArray(s.frequency)?s.frequency.join(', '):s.frequency).join('<br/>');
    const serviceRates = (services || []).map((s:any) => parseFloat(s.rate).toFixed(2)).join('<br/>');

    templateHtml = templateHtml.replace(/\{\{serviceName\}\}/gi, serviceNames || 'N/A');
    templateHtml = templateHtml.replace(/\{\{serviceFrequency\}\}/gi, serviceFrequencies || 'N/A');
    templateHtml = templateHtml.replace(/\{\{serviceRate\}\}/gi, serviceRates || '0.00');
    templateHtml = templateHtml.replace(/\{\{scf_link\}\}/gi, scfUrl);
    templateHtml = templateHtml.replace(/\{\{scf_url\}\}/gi, scfUrl);
    templateHtml = templateHtml.replace(/\{\{Lead\.SCFLink\}\}/gi, scfUrl);
    templateHtml = templateHtml.replace(/\{\{acceptUrl\}\}/gi, scfUrl);
    templateHtml = templateHtml.replace(/\{\{unsubscribe_link\}\}/gi, '#');
    templateHtml = templateHtml.replace(/\{\{unsubscribe_url\}\}/gi, '#');
    
    // Fallback for {{service_details}} in case they use that
    const plainList = (services || []).map((s:any) => `- ${s.name} (${Array.isArray(s.frequency)?s.frequency.join(', '):s.frequency}) at $${parseFloat(s.rate).toFixed(2)}`).join('<br/>');
    templateHtml = templateHtml.replace(/\{\{service_details\}\}/gi, plainList);

    const formattedFallbackHtml = wrapEmailHtml(templateHtml);

    // 5. Dispatch Email
    const dispatchResult = await sendPhysicalEmail({
      to: contactEmail,
      subject: templateSubject,
      html: formattedFallbackHtml
    });

    if (!dispatchResult.success) {
       return NextResponse.json({ success: false, message: dispatchResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Quote email sent successfully' });

  } catch (error: any) {
    console.error('API Error sending quote email:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
