import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { replaceTemplatePlaceholders, extractUserMobile } from '@/lib/template-replacer';

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
    let franchiseeMainContact = '';
    let franchiseeEmail = '';
    let franchiseeMobile = '';
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

        // Fetch Franchisee contact details from franchisees collection
        try {
          let franchiseeData: any = null;
          if (leadData.franchisee_id) {
            const fIdStr = String(leadData.franchisee_id);
            const franDoc = await db.collection('franchisees').doc(fIdStr).get();
            if (franDoc.exists) {
              franchiseeData = franDoc.data();
            } else {
              const franSnap1 = await db.collection('franchisees').where('internalId', '==', fIdStr).limit(1).get();
              if (!franSnap1.empty) {
                franchiseeData = franSnap1.docs[0].data();
              } else {
                const franSnap2 = await db.collection('franchisees').where('internalId', '==', Number(leadData.franchisee_id)).limit(1).get();
                if (!franSnap2.empty) {
                  franchiseeData = franSnap2.docs[0].data();
                }
              }
            }
          }
          if (!franchiseeData && leadData.franchisee) {
            const franSnap = await db.collection('franchisees').where('name', '==', leadData.franchisee).limit(1).get();
            if (!franSnap.empty) {
              franchiseeData = franSnap.docs[0].data();
            }
          }
          if (franchiseeData) {
            franchiseeName = franchiseeData.name || franchiseeData.mainContact || leadData.franchisee || franchiseeName;
            franchiseeMainContact = franchiseeData.mainContact || franchiseeData.name || '';
            franchiseeEmail = franchiseeData.email || '';
            franchiseeMobile = franchiseeData.mobile || franchiseeData.phone || '';
          }
        } catch (err) {
          console.error('[Template Preview] Failed to fetch franchisee details:', err);
        }

        if (accountManagerName && accountManagerName !== 'Account Manager') {
            const usersSnap = await db.collection('users').get();
            const targetName = accountManagerName.trim().toLowerCase();
            const matchedUser = usersSnap.docs.find(doc => {
                const data = doc.data() || {};
                const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
                const displayName = (data.displayName || '').trim().toLowerCase();
                const name = (data.name || '').trim().toLowerCase();
                const email = (data.email || '').trim().toLowerCase();
                return fullName === targetName || displayName === targetName || name === targetName || email === targetName || doc.id.toLowerCase() === targetName;
            });
            if (matchedUser) {
                const data = matchedUser.data() || {};
                accountManagerMobile = data.mobileNumber || data.mobile || data.phoneNumber || data.phone || data.aircallPhoneNumber || accountManagerMobile;
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
    templateHtml = replaceTemplatePlaceholders(templateHtml, {
      lead: leadSnap.exists ? { ...leadSnap.data(), id: leadId } : { companyName, address: { city: leadCity }, dynamicScfUrl: leadScfLink, bookingUrlId, generalBookingUrlId, localMileTrialsRemaining: trialsRemaining },
      contact: { name: contactName, email: contactEmail },
      accountManager: {
        name: accountManagerName,
        mobile: accountManagerMobile,
        calendly: accountManagerCalendly
      },
      salesRep: salesRepName,
      franchisee: {
        name: franchiseeName,
        mainContact: franchiseeMainContact,
        email: franchiseeEmail,
        mobile: franchiseeMobile
      },
      customLinks: {
        bookingUrlId,
        generalBookingUrlId,
        scfLink: leadScfLink,
        trialsRemaining
      }
    });

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
