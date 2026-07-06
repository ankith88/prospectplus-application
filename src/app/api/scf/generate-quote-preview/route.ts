import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, contactId, scfUrl, startDate, services, products } = body;

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

    // 1b. Fetch Lead details
    const leadSnap = await db.collection('leads').doc(leadId).get();
    if (!leadSnap.exists) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }
    const leadData = leadSnap.data() || {};
    const companyName = leadData.companyName || '';
    const salesRepName = leadData.accountManagerAssigned || leadData.dialerAssigned || leadData.salesRepAssigned || 'Sales Representative';
    const franchiseeName = leadData.franchisee || 'MailPlus';

    // 1c. Fetch Brand Profile
    const brandSnap = await db.collection('brandProfiles').doc('default_company').get();
    const brandData = brandSnap.exists ? brandSnap.data() : null;
    const primaryColor = brandData?.designTokens?.primaryColor || '#095C7B';
    const fontFamily = brandData?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const logoUrl = brandData?.designTokens?.logoUrl || '';

    // 2. Fetch the "Service Quote" Template
    const templatesSnap = await db.collection('marketing_templates').where('name', '==', 'Service Quote').limit(1).get();
    let templateHtml = '';
    let templateSubject = 'Your MailPlus Custom Quote';

    if (!templatesSnap.empty) {
      const templateData = templatesSnap.docs[0].data();
      templateHtml = templateData.htmlContent || templateData.content || templateData.body || '';
      templateSubject = templateData.subject || templateSubject;
    } else {
      // Fallback template if "Service Quote" doesn't exist
      templateHtml = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333333;">
          <h2 style="color: #095c7b;">Your MailPlus Custom Quote</h2>
          <p>Hi {{Contact.FirstName}},</p>
          <p>Thank you for considering MailPlus. Please find the details of your quote below. Services are scheduled to start on {{service_start_date}}.</p>
          <div style="margin: 20px 0;">
            {{service_details_html}}
          </div>
          <p>To review and accept the terms and conditions, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{scf_link}}" style="background-color: #095c7b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Review & Accept Quote</a>
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
            <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Rate</th>
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
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${parseFloat(s.rate).toFixed(2)}</td>
        </tr>
      `;
    });
    serviceDetailsHtml += `</tbody></table>`;

    // 3b. Generate Products Details HTML Table (if any)
    let productsDetailsHtml = '';
    const hasProducts = Array.isArray(products) && products.length > 0;
    const hasServices = Array.isArray(services) && services.length > 0;

    if (hasProducts) {
      productsDetailsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Product</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Weight</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Base Price</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Fuel Surcharge</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Total (Exc. GST)</th>
            </tr>
          </thead>
          <tbody>
      `;

      // Fetch surcharge rates
      const surchargeRates = { express: 12.5, premium: 12.5 }; // Default fallback
      try {
        const snap = await db.collection('settings').doc('surcharges').get();
        if (snap.exists) {
          const sData = snap.data();
          if (sData?.express !== undefined) surchargeRates.express = Number(sData.express);
          if (sData?.premium !== undefined) surchargeRates.premium = Number(sData.premium);
        }
      } catch (err) {
        console.error("Error loading surcharges inside api:", err);
      }

      products.forEach((p: any) => {
        const basePrice = Number(p.salesPriceExcGst || 0);
        const speed = (p.deliverySpeed || '').toLowerCase();
        const surchargePerc = speed === 'premium' ? surchargeRates.premium : (speed === 'express' ? surchargeRates.express : 0);
        const surchargeAmt = basePrice * (surchargePerc / 100);
        const total = basePrice + surchargeAmt;

        productsDetailsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.name || p.id}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.productWeight || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${basePrice.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${surchargePerc > 0 ? '$' + surchargeAmt.toFixed(2) + ' (' + surchargePerc + '%)' : '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">$${total.toFixed(2)}</td>
          </tr>
        `;
      });
      productsDetailsHtml += `</tbody></table>`;
    }

    // 4. Construct combined HTML detail sections
    let combinedDetailsHtml = '';
    if (hasServices) {
      combinedDetailsHtml += `
        <h3 style="color: #095c7b; font-size: 16px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Requested Services</h3>
        ${serviceDetailsHtml}
      `;
    }
    if (hasProducts) {
      combinedDetailsHtml += `
        <h3 style="color: #095c7b; font-size: 16px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Product Pricing</h3>
        ${productsDetailsHtml}
      `;
    }

    // 5. Replace Variables case-insensitively
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
    
    // Replace placeholders
    if (templateHtml.includes('{{service_details_html}}') || templateHtml.includes('{{serviceDetailsHtml}}')) {
      templateHtml = templateHtml.replace(/\{\{service_details_html\}\}/gi, combinedDetailsHtml);
      templateHtml = templateHtml.replace(/\{\{serviceDetailsHtml\}\}/gi, combinedDetailsHtml);
    } else {
      // Append if placeholder not found
      templateHtml += `<br/>${combinedDetailsHtml}`;
    }

    templateHtml = templateHtml.replace(/\{\{products_details_html\}\}/gi, productsDetailsHtml);
    templateHtml = templateHtml.replace(/\{\{products_table\}\}/gi, productsDetailsHtml);
    templateHtml = templateHtml.replace(/\{\{products_section_html\}\}/gi, productsDetailsHtml);
    
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

    return NextResponse.json({ 
      success: true, 
      subject: templateSubject, 
      html: templateHtml,
      contactEmail: contactEmail,
      primaryColor,
      fontFamily,
      logoUrl
    });

  } catch (error: any) {
    console.error('API Error generating quote preview:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
