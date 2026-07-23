import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/services/firebase-server';
import { encryptLeadId } from '@/lib/localmile-security';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, to, cc, subject, message } = body;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing lead ID' }, { status: 400 });
    }

    if (!Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one recipient (To) email is required' }, { status: 400 });
    }

    // Fetch lead/company from Firestore
    let docRef = adminDb.collection('leads').doc(leadId);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = adminDb.collection('companies').doc(leadId);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      const qLeads = await adminDb.collection('leads').where('id', '==', leadId).limit(1).get();
      if (!qLeads.empty) {
        docSnap = qLeads.docs[0];
        docRef = docSnap.ref;
      } else {
        const qComp = await adminDb.collection('companies').where('id', '==', leadId).limit(1).get();
        if (!qComp.empty) {
          docSnap = qComp.docs[0];
          docRef = docSnap.ref;
        }
      }
    }

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Lead document not found' }, { status: 404 });
    }

    const leadData = docSnap.data() || {};
    const companyName = leadData.companyName || leadData.tradingName || 'LPO Opportunity';
    const prospectPlusId = leadData.prospectPlusId || leadData.lpoProspectPlusId || `LPO-${docSnap.id.substring(0, 8).toUpperCase()}`;

    // Construct encrypted public URL
    const encryptedToken = encryptLeadId(docSnap.id);
    const origin = req.nextUrl.origin;
    const publicUrl = `${origin}/lpo-opportunity/${encodeURIComponent(encryptedToken)}`;

    // Build Email HTML per AGENTS.md rules
    const emailSubject = subject || `Shared LPO Opportunity: ${companyName}`;
    const formattedMessage = message ? message.replace(/\n/g, '<br />') : '';

    const emailHtml = `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <tr>
          <td align="center">
            <table align="center" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              
              <!-- Brand Header Banner per AGENTS.md -->
              <tr>
                <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
                  <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
                </td>
              </tr>

              <!-- Content Area -->
              <tr>
                <td style="padding: 32px 28px; background-color: #ffffff;">
                  <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #095c7b; line-height: 1.3;">
                    Shared LPO Opportunity Profile
                  </h2>
                  <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.6;">
                    The details for <strong>${companyName}</strong> (Prospect+ ID: <strong>${prospectPlusId}</strong>) have been shared with you.
                  </p>

                  ${formattedMessage ? `
                    <div style="background-color: #f8fafb; border-left: 4px solid #095c7b; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 8px 8px 0; font-size: 13px; color: #2d3748; line-height: 1.5;">
                      <strong>Note from sender:</strong><br />
                      ${formattedMessage}
                    </div>
                  ` : ''}

                  <!-- Opportunity Brief Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 8px;">
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-weight: 700; color: #718096; width: 140px;">Company Name</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 14px; font-weight: 600; color: #1a202c;">${companyName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-weight: 700; color: #718096;">Prospect+ ID</td>
                      <td style="padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 13px; font-weight: 600; color: #095c7b;">${prospectPlusId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #718096;">Current Status</td>
                      <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #2b6cb0;">${leadData.status || leadData.customerStatus || 'LPO Opportunity'}</td>
                    </tr>
                  </table>

                  <!-- Primary CTA Button -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding: 10px 0 20px;">
                        <a href="${publicUrl}" target="_blank" style="background-color: #095c7b; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.2);">
                          View LPO Opportunity Profile &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; font-size: 12px; color: #a0aec0; text-align: center;">
                    If the button above does not work, copy and paste this URL into your web browser:<br />
                    <a href="${publicUrl}" style="color: #095c7b; word-break: break-all;">${publicUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Standardized Footer per AGENTS.md -->
              <tr>
                <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; line-height: 1.5;">
                  <p style="margin: 0 0 6px; font-size: 12px;">
                    <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
                  </p>
                  <p style="margin: 0 0 15px; font-size: 12px;">
                    Powered by MailPlus Australia
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #a0aec0; line-height: 1.5;">
                    &copy; 2026 MailPlus. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    `;

    // Send physical email via dispatcher
    const toRecipientsString = to.join(',');
    const ccRecipientsString = Array.isArray(cc) && cc.length > 0 ? cc.join(',') : undefined;

    const emailResult = await sendPhysicalEmail({
      to: toRecipientsString,
      cc: ccRecipientsString,
      subject: emailSubject,
      html: emailHtml,
      leadId: docSnap.id,
      prospectPlusId,
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to dispatch email');
    }

    // Log Activity & Note entry on the lead
    const nowISO = new Date().toISOString();
    const activityText = `Public LPO Opportunity link shared via email to: ${to.join(', ')}${cc && cc.length > 0 ? ` (CC: ${cc.join(', ')})` : ''}.`;
    
    const newActivity = {
      id: `act-${Date.now()}`,
      type: 'Email',
      date: nowISO,
      notes: activityText,
      author: 'Shared Opportunities Portal',
    };

    const newNoteObj = {
      id: `note-${Date.now()}`,
      date: nowISO,
      author: 'Shared Opportunities Portal',
      content: activityText,
    };

    await docRef.collection('activity').add(newActivity).catch(() => {});
    await docRef.collection('notes').add(newNoteObj).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Opportunity link emailed successfully to ${to.length} recipient(s).`,
    });
  } catch (error: any) {
    console.error('Error sharing LPO Opportunity via email:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
