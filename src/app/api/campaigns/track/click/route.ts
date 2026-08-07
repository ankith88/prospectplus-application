import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get('id');
  const targetUrl = searchParams.get('url');

  const fallbackUrl = '/'; // Default redirect fallback if parsing fails

  if (!deliveryId || !targetUrl) {
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }

  try {
    const deliveryRef = db.collection('campaign_deliveries').doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();

    if (deliveryDoc.exists) {
      const data = deliveryDoc.data();
      const campaignId = data?.campaignId;
      const leadId = data?.leadId;
      const openedAt = data?.openedAt || [];
      const clickedAt = data?.clickedAt || [];

      const now = new Date().toISOString();
      const isFirstClick = clickedAt.length === 0;
      const isFirstOpen = openedAt.length === 0;

      const updateData: Record<string, any> = {
        clickedAt: FieldValue.arrayUnion(now)
      };

      if (isFirstOpen) {
        updateData.openedAt = FieldValue.arrayUnion(now);
        updateData.status = 'opened';
      }

      await deliveryRef.update(updateData);

      if (isFirstClick && campaignId) {
        // Increment global campaign clicks
        const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
        await campaignRef.update({
          'metrics.clicked': FieldValue.increment(1)
        });
      }

      if (isFirstOpen && campaignId) {
        const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
        await campaignRef.update({
          'metrics.opened': FieldValue.increment(1)
        });
      }

      // Update lead document & post timeline activity
      if (leadId) {
        try {
          await db.collection('leads').doc(leadId).collection('activity').add({
            type: 'Email',
            date: now,
            notes: `Recipient (${data?.leadEmail || 'Contact'}) clicked link in email '${data?.subject || 'Outbound Email'}'.`,
            author: 'Email Click Tracker'
          });

          const leadUpdatePayload = {
            hasOpenedEmail: true,
            lastEmailOpenedAt: now,
            lastOpenedEmailSubject: data?.subject || 'Outbound Email',
            emailOpenCount: FieldValue.increment(1)
          };

          const leadRefDoc = db.collection('leads').doc(leadId);
          const leadSnap = await leadRefDoc.get();
          if (leadSnap.exists) {
            await leadRefDoc.update(leadUpdatePayload);
          } else {
            const compRefDoc = db.collection('companies').doc(leadId);
            const compSnap = await compRefDoc.get();
            if (compSnap.exists) {
              await compRefDoc.update(leadUpdatePayload);
            }
          }
        } catch (actErr) {
          console.error('Error updating lead for click event:', actErr);
        }
      }

      // If this is the first open (triggered via link click because images were blocked) and notify is enabled
      if (isFirstOpen && data?.notifyOnOpen !== false) {
        try {
          let resolvedCompany = data?.companyName;
          if ((!resolvedCompany || resolvedCompany.includes('@')) && leadId) {
            try {
              const lDoc = await db.collection('leads').doc(leadId).get();
              if (lDoc.exists) {
                resolvedCompany = lDoc.data()?.companyName || lDoc.data()?.company_name || null;
              } else {
                const cDoc = await db.collection('companies').doc(leadId).get();
                if (cDoc.exists) {
                  resolvedCompany = cDoc.data()?.companyName || cDoc.data()?.company_name || null;
                }
              }
            } catch (e) {}
          }

          const companyDisplay = resolvedCompany || 'N/A';
          const recipientLabel = resolvedCompany || data?.leadName || data?.leadEmail || 'Recipient';
          const emailSubject = data?.subject || 'Outbound Email';

          let targetUserId = data?.notifyUserId;
          let repEmail = data?.notifyUserEmail || data?.customFrom;

          if ((!targetUserId || targetUserId === 'all') && repEmail) {
            const usersSnap = await db.collection('users').where('email', '==', repEmail.toLowerCase().trim()).limit(1).get();
            if (!usersSnap.empty) {
              targetUserId = usersSnap.docs[0].id;
            }
          }

          if (!repEmail && targetUserId && targetUserId !== 'all') {
            const userDoc = await db.collection('users').doc(targetUserId).get();
            if (userDoc.exists) {
              repEmail = userDoc.data()?.email;
            }
          }

          const notifMessage = `${recipientLabel} opened email & clicked link: "${emailSubject}"`;
          const notifLink = leadId ? `/leads/${leadId}` : '/admin/mailbox';

          if (targetUserId && targetUserId !== 'all') {
            await db.collection('users').doc(targetUserId).collection('notifications').add({
              title: '📬 Email Link Clicked & Opened',
              message: notifMessage,
              type: 'email_opened',
              link: notifLink,
              createdAt: now,
              isRead: false,
              leadId: leadId || null
            });
          }

          if (repEmail) {
            const formattedDate = new Date(now).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
            const alertSubject = `[Click & Open Alert] ${recipientLabel} clicked link in email: "${emailSubject}"`;
            
            const alertHtml = `
<table width="100%" style="background-color: #f4f7f8; padding: 20px 0; margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <tr>
    <td align="center">
      <table align="center" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; text-align: left;">
        <tr>
          <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 25px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #2d3748;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #095c7b;">📬 Email Click & Open Alert</h2>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #4a5568;">
              Great news! A recipient has just opened your email and clicked a link inside.
            </p>
            <table width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; padding: 16px; border-collapse: separate;">
              <tr>
                <td style="font-size: 14px; color: #4a5568; padding: 6px 0; border: 0;"><strong>Recipient:</strong> ${data?.leadEmail || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; color: #4a5568; padding: 6px 0; border: 0;"><strong>Company:</strong> ${companyDisplay}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; color: #4a5568; padding: 6px 0; border: 0;"><strong>Subject:</strong> ${emailSubject}</td>
              </tr>
              <tr>
                <td style="font-size: 14px; color: #4a5568; padding: 6px 0; border: 0;"><strong>Clicked At:</strong> ${formattedDate} (Sydney Time)</td>
              </tr>
            </table>
            ${leadId ? `
            <p style="margin: 0 0 12px; text-align: center;">
              <a href="https://prospectplus.com.au/leads/${leadId}" style="background-color: #095c7b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">View Lead Profile in ProspectPlus</a>
            </p>` : ''}
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
            <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
            </p>
            <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              Powered by MailPlus Australia
            </p>
            <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              &copy; 2026 MailPlus. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
            `;

            await sendPhysicalEmail({
              to: repEmail,
              subject: alertSubject,
              html: alertHtml,
              skipTracking: true
            });
          }
        } catch (notifErr) {
          console.error('Error sending click fallback open alert:', notifErr);
        }
      }
    }

    return NextResponse.redirect(targetUrl);

  } catch (error) {
    console.error('Error tracking click redirect:', error);
    try {
      return NextResponse.redirect(targetUrl);
    } catch {
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }
  }
}
