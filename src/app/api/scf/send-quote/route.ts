import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, contactId, scfUrl, scfId, startDate, services } = body;

    if (!leadId || !contactId || !scfUrl) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch Contact to get name and email
    const contactSnap = await db.collection('leads').doc(leadId).collection('contacts').doc(contactId).get();
    if (!contactSnap.exists) {
      return NextResponse.json({ success: false, message: 'Contact not found' }, { status: 404 });
    }
    const contactData = contactSnap.data();
    const contactEmail = contactData?.email;
    const contactName = contactData?.name || '';
    const contactFirstName = contactName.split(' ')[0];

    if (!contactEmail) {
      return NextResponse.json({ success: false, message: 'Contact has no email address' }, { status: 400 });
    }

    // 2. Fetch the "Service Quote" Template
    const templatesSnap = await db.collection('marketing_templates').where('name', '==', 'Service Quote').limit(1).get();
    let templateHtml = '';
    let templateSubject = 'Your MailPlus Service Quote';

    if (!templatesSnap.empty) {
      const templateData = templatesSnap.docs[0].data();
      templateHtml = templateData.htmlContent || templateData.content || '';
      templateSubject = templateData.subject || templateSubject;
    } else {
      // Fallback template if "Service Quote" doesn't exist
      templateHtml = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
          <h2>Your MailPlus Service Quote</h2>
          <p>Hi {{contact_first_name}},</p>
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

    // 4. Replace Variables
    templateHtml = templateHtml.replace(/\{\{contact_first_name\}\}/g, contactFirstName);
    templateHtml = templateHtml.replace(/\{\{service_start_date\}\}/g, startDate);
    templateHtml = templateHtml.replace(/\{\{service_details_html\}\}/g, serviceDetailsHtml);
    templateHtml = templateHtml.replace(/\{\{scf_link\}\}/g, scfUrl);
    
    // Fallback for {{service_details}} in case they use that
    const plainList = (services || []).map((s:any) => `- ${s.name} (${Array.isArray(s.frequency)?s.frequency.join(', '):s.frequency}) at $${parseFloat(s.rate).toFixed(2)}`).join('<br/>');
    templateHtml = templateHtml.replace(/\{\{service_details\}\}/g, plainList);

    // 5. Dispatch Email
    const dispatchResult = await sendPhysicalEmail({
      to: contactEmail,
      subject: templateSubject,
      html: templateHtml
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
