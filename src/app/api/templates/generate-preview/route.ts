import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, body: rawBody, leadId, contactId } = body;

    let templateHtml = rawBody || '';
    let templateSubject = 'Notification';

    if (templateId) {
      const templateDoc = await db.collection('marketing_templates').doc(templateId).get();
      if (templateDoc.exists) {
        const templateData = templateDoc.data();
        templateHtml = templateData?.body || templateData?.htmlContent || templateData?.content || '';
        templateSubject = templateData?.subject || templateSubject;
      }
    }

    // 1. Default fallback values
    let contactName = 'Valued Customer';
    let contactEmail = '';
    let companyName = 'Your Company';
    let salesRepName = 'Sales Representative';
    let franchiseeName = 'MailPlus';
    let accountManagerName = 'Account Manager';
    let accountManagerMobile = '0412 345 678';
    let accountManagerCalendly = 'https://calendly.com/sample';
    let leadCity = 'Sydney';
    let trialsRemaining = 5;
    let leadScfLink = 'https://scf.mailplus.com.au/preview';
    let bookingUrlId = '';
    let generalBookingUrlId = '';

    // 2. Fetch Lead details if leadId is provided
    if (leadId) {
      const leadSnap = await db.collection('leads').doc(leadId).get();
      if (leadSnap.exists) {
        const leadData = leadSnap.data() || {};
        companyName = leadData.companyName || leadData.company || companyName;
        salesRepName = leadData.accountManagerAssigned || leadData.dialerAssigned || leadData.salesRepAssigned || salesRepName;
        franchiseeName = leadData.franchisee || franchiseeName;
        contactEmail = leadData.customerServiceEmail || '';

        accountManagerName = leadData.accountManagerAssigned || leadData.salesRepAssigned || accountManagerName;
        accountManagerCalendly = leadData.salesRepAssignedCalendlyLink || accountManagerCalendly;
        leadCity = leadData.address?.city || leadCity;
        trialsRemaining = leadData.localMileTrialsRemaining !== undefined ? leadData.localMileTrialsRemaining : trialsRemaining;
        leadScfLink = leadData.dynamicScfUrl || leadScfLink;
        bookingUrlId = leadData.bookingUrlId || '';
        generalBookingUrlId = leadData.generalBookingUrlId || '';

        if (accountManagerName !== 'Account Manager') {
            const userQuery = await db.collection('users').where('displayName', '==', accountManagerName).limit(1).get();
            if (!userQuery.empty) {
                accountManagerMobile = userQuery.docs[0].data().phoneNumber || accountManagerMobile;
            }
        }

        // Try to fetch contacts from subcollection
        const contactsSnap = await leadSnap.ref.collection('contacts').get();
        if (!contactsSnap.empty) {
          let contactDoc = contactsSnap.docs[0];
          if (contactId) {
            const matched = contactsSnap.docs.find(d => d.id === contactId);
            if (matched) contactDoc = matched;
          }
          const cData = contactDoc.data();
          contactName = cData.name || contactName;
          contactEmail = cData.email || contactEmail;
        }
      }
    }

    // 3. Fetch brand profile
    const brandSnap = await db.collection('brandProfiles').doc('default_company').get();
    const brandData = brandSnap.exists ? brandSnap.data() : null;
    const primaryColor = brandData?.designTokens?.primaryColor || '#095C7B';
    const fontFamily = brandData?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const logoUrl = brandData?.designTokens?.logoUrl || '';

    // 4. Compile placeholders
    const contactFirstName = contactName.split(' ')[0];

    // Case-insensitive replacement of all standard placeholders
    templateHtml = templateHtml.replace(/\{\{Contact\.Name\}\}/gi, contactName);
    templateHtml = templateHtml.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
    templateHtml = templateHtml.replace(/\{\{contact_first_name\}\}/gi, contactFirstName);
    templateHtml = templateHtml.replace(/\{\{Company\.Name\}\}/gi, companyName);
    templateHtml = templateHtml.replace(/\{\{company_name\}\}/gi, companyName);
    templateHtml = templateHtml.replace(/\{\{SalesRep\.Name\}\}/gi, salesRepName);
    templateHtml = templateHtml.replace(/\{\{sales_rep_name\}\}/gi, salesRepName);
    templateHtml = templateHtml.replace(/\{\{Franchisee\.Name\}\}/gi, franchiseeName);
    templateHtml = templateHtml.replace(/\{\{franchisee_name\}\}/gi, franchiseeName);
    templateHtml = templateHtml.replace(/\{\{AccountManager\.Name\}\}/gi, accountManagerName);
    templateHtml = templateHtml.replace(/\{\{AccountManager\.Mobile\}\}/gi, accountManagerMobile);
    templateHtml = templateHtml.replace(/\{\{AccountManager\.Calendly\}\}/gi, accountManagerCalendly);
    templateHtml = templateHtml.replace(/\{\{Lead\.City\}\}/gi, leadCity);
    templateHtml = templateHtml.replace(/\{\{Lead\.ContactBookingLink\}\}/gi, bookingUrlId ? `${origin}/book/${bookingUrlId}` : '');
    templateHtml = templateHtml.replace(/\{\{Lead\.GeneralBookingLink\}\}/gi, generalBookingUrlId ? `${origin}/book/${generalBookingUrlId}` : '');
    templateHtml = templateHtml.replace(/\{\{Trials\.Remaining\}\}/gi, trialsRemaining.toString());
    templateHtml = templateHtml.replace(/\{\{Lead\.SCFLink\}\}/gi, leadScfLink);
    templateHtml = templateHtml.replace(/\{\{unsubscribe_link\}\}/gi, '#');
    templateHtml = templateHtml.replace(/\{\{unsubscribe_url\}\}/gi, '#');

    // 5. Wrap the compiled template body in the brand layout HTML
    const wrappedHtml = `
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
        ${templateHtml}
      </div>
    </div>
  </body>
</html>
    `;

    return NextResponse.json({
      success: true,
      html: wrappedHtml,
      subject: templateSubject,
      contactEmail
    });

  } catch (error: any) {
    console.error('Error generating general template preview:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
