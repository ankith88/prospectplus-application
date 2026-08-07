import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

// 1x1 transparent pixel PNG data
const TRANSPARENT_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get('id');

    if (!deliveryId) {
      return new Response(TRANSPARENT_PIXEL, {
        headers: { 'Content-Type': 'image/png' },
      });
    }

    const deliveryRef = db.collection('campaign_deliveries').doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();

    if (deliveryDoc.exists) {
      const data = deliveryDoc.data();
      const campaignId = data?.campaignId;
      const leadId = data?.leadId;
      const openedAt = data?.openedAt || [];

      // Only increment and log if this is the first open, or track subsequent opens in arrays
      const now = new Date().toISOString();
      const isFirstOpen = openedAt.length === 0;

      await deliveryRef.update({
        openedAt: FieldValue.arrayUnion(now),
        status: 'opened'
      });

      if (isFirstOpen) {
        if (campaignId) {
          // Increment global campaign open counts
          const campaignRef = db.collection('marketing_campaigns').doc(campaignId);
          await campaignRef.update({
            'metrics.opened': FieldValue.increment(1)
          });
        }

        // Post activity on the lead timeline and update lead doc open metrics
        if (leadId) {
          try {
            await db.collection('leads').doc(leadId).collection('activity').add({
              type: 'Email',
              date: now,
              notes: `Recipient (${data?.leadEmail || 'Contact'}) opened email: '${data?.subject || 'Outbound Email'}'.`,
              author: 'Email Open Tracker'
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
            console.error('Error logging lead activity for open event:', actErr);
          }
        }

        // Handle notifications if enabled
        if (data?.notifyOnOpen !== false) {
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

            // If targetUserId is missing or 'all', try resolving from notifyUserEmail / customFrom
            if ((!targetUserId || targetUserId === 'all') && repEmail) {
              const usersSnap = await db.collection('users').where('email', '==', repEmail.toLowerCase().trim()).limit(1).get();
              if (!usersSnap.empty) {
                targetUserId = usersSnap.docs[0].id;
              }
            }

            // If repEmail is missing, try resolving from notifyUserId
            if (!repEmail && targetUserId && targetUserId !== 'all') {
              const userDoc = await db.collection('users').doc(targetUserId).get();
              if (userDoc.exists) {
                repEmail = userDoc.data()?.email;
              }
            }

            // If still missing, check lead assigned account manager or sales rep
            if ((!targetUserId || targetUserId === 'all' || !repEmail) && leadId) {
              const leadSnap = await db.collection('leads').doc(leadId).get();
              if (leadSnap.exists) {
                const leadData = leadSnap.data();
                const repName = leadData?.accountManagerAssigned || leadData?.salesRepAssigned || leadData?.dialerAssigned;
                if (repName) {
                  const usersSnap = await db.collection('users').get();
                  const matchedUser = usersSnap.docs.find(d => {
                    const u = d.data();
                    const full = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                    const disp = (u.displayName || '').trim().toLowerCase();
                    return full === repName.trim().toLowerCase() || disp === repName.trim().toLowerCase() || d.id === repName;
                  });
                  if (matchedUser) {
                    if (!targetUserId || targetUserId === 'all') targetUserId = matchedUser.id;
                    if (!repEmail) repEmail = matchedUser.data()?.email;
                  }
                }
              }
            }

            const notifMessage = `${recipientLabel} opened email: "${emailSubject}"`;
            const notifLink = leadId ? `/leads/${leadId}` : '/admin/mailbox';

            // 1. Create In-App Notification in user's subcollection (for real-time popup toast & notification center)
            if (targetUserId && targetUserId !== 'all') {
              await db.collection('users').doc(targetUserId).collection('notifications').add({
                title: '📬 Email Opened',
                message: notifMessage,
                type: 'email_opened',
                link: notifLink,
                createdAt: now,
                isRead: false,
                leadId: leadId || null
              });
            }

            // Also record in root notifications collection
            await db.collection('notifications').add({
              userId: targetUserId || 'all',
              title: '📬 Email Opened',
              message: notifMessage,
              body: notifMessage,
              link: notifLink,
              createdAt: now,
              isRead: false,
              type: 'email_opened',
              leadId: leadId || null
            });

            // 2. Send instant Email Alert to Rep
            if (repEmail) {
              const formattedDate = new Date(now).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
              const alertSubject = `[Open Alert] ${recipientLabel} opened your email: "${emailSubject}"`;
              
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
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #095c7b;">📬 Email Open Alert</h2>
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5; color: #4a5568;">
              Great news! A recipient has just opened an email you sent.
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
                <td style="font-size: 14px; color: #4a5568; padding: 6px 0; border: 0;"><strong>Opened At:</strong> ${formattedDate} (Sydney Time)</td>
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
            console.error('Error sending open notifications / email alert:', notifErr);
          }
        }
      }
    }

    return new Response(TRANSPARENT_PIXEL, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error tracking open pixel:', error);
    return new Response(TRANSPARENT_PIXEL, {
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
