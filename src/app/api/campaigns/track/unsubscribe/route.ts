import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get('id');
  const isUndo = searchParams.get('re') === 'true';

  if (!deliveryId) {
    return new Response('<h1>Invalid Request</h1><p>Unsubscribe tracking ID is missing.</p>', {
      headers: { 'Content-Type': 'text/html' },
      status: 400
    });
  }

  let emailUnsubscribed = '';
  let companyName = 'Unknown Company';
  let leadName = 'Customer';

  try {
    const deliveryRef = db.collection('campaign_deliveries').doc(deliveryId);
    const deliveryDoc = await deliveryRef.get();

    if (!deliveryDoc.exists) {
      // If delivery log doesn't exist, we still want to show a graceful page
      return new Response(renderUnsubscribeSuccessPage('General Request', 'System Campaign', deliveryId), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const data = deliveryDoc.data();
    const campaignId = data?.campaignId;
    const leadId = data?.leadId;
    const leadEmail = data?.leadEmail;
    companyName = data?.companyName || companyName;
    leadName = data?.leadName || leadName;
    emailUnsubscribed = leadEmail || '';

    if (!leadEmail) {
      return new Response('<h1>Invalid Request</h1><p>Email address not found in delivery record.</p>', {
        headers: { 'Content-Type': 'text/html' },
        status: 400
      });
    }

    const emailKey = leadEmail.toLowerCase().trim();

    if (isUndo) {
      // --- RESUBSCRIBE / UNDO FLOW ---
      
      // 1. Check if suppressed
      const suppressionRef = db.collection('marketing_suppression_list').doc(emailKey);
      const suppressionSnap = await suppressionRef.get();

      if (suppressionSnap.exists) {
        // Delete from suppression list
        await suppressionRef.delete();
      }

      // 2. Clear unsubscribedAt on delivery log
      await deliveryRef.update({
        unsubscribedAt: null
      });

      // 3. Decrement global campaign unsubscribes if it was recorded
      if (campaignId) {
        try {
          await db.collection('marketing_campaigns').doc(campaignId).update({
            'metrics.unsubscribed': require('firebase-admin').firestore.FieldValue.increment(-1)
          });
        } catch (e) {
          console.warn('Could not decrement campaign metrics:', e);
        }
      }

      // 4. Update the contact record if associated with a lead
      if (leadId) {
        const leadRef = db.collection('leads').doc(leadId);
        const leadDocSnapshot = await leadRef.get();

        if (leadDocSnapshot.exists) {
          // Find contact subcollection document matching this email
          const contactsSnap = await leadRef.collection('contacts').where('email', '==', leadEmail).get();
          
          if (!contactsSnap.empty) {
            for (const doc of contactsSnap.docs) {
              await doc.ref.update({
                sendEmail: 'yes',
                optedOut: false
              });
            }
          }

          // Log activity on the lead profile
          await leadRef.collection('activity').add({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `Marketing Re-Opt-In: Contact '${leadName}' (${leadEmail}) opted back in via the unsubscribe landing page. Suppressed status removed.`,
            author: 'Campaign Opt-Out Engine'
          });
        }
      }

      return new Response(renderResubscribeSuccessPage(emailUnsubscribed, companyName), {
        headers: { 'Content-Type': 'text/html' }
      });

    } else {
      // --- UNSUBSCRIBE FLOW ---
      const now = new Date().toISOString();

      // 1. Update delivery log
      await deliveryRef.update({
        unsubscribedAt: now
      });

      // 2. Increment global campaign unsubscribes
      if (campaignId) {
        try {
          await db.collection('marketing_campaigns').doc(campaignId).update({
            'metrics.unsubscribed': require('firebase-admin').firestore.FieldValue.increment(1)
          });
        } catch (e) {
          console.warn('Could not increment campaign metrics:', e);
        }
      }

      // 3. Add to global suppression list
      await db.collection('marketing_suppression_list').doc(emailKey).set({
        email: emailKey,
        unsubscribedAt: now,
        deliveryId,
        campaignId: campaignId || 'direct',
        leadId: leadId || 'direct',
        companyName: companyName,
        leadName: leadName
      });

      // 4. Update the contact record if associated with a lead
      if (leadId) {
        const leadRef = db.collection('leads').doc(leadId);
        const leadDocSnapshot = await leadRef.get();

        if (leadDocSnapshot.exists) {
          // Find contact subcollection document matching this email
          const contactsSnap = await leadRef.collection('contacts').where('email', '==', leadEmail).get();
          
          if (!contactsSnap.empty) {
            for (const doc of contactsSnap.docs) {
              await doc.ref.update({
                sendEmail: 'no',
                optedOut: true
              });
            }
          }

          // Log activity on the lead profile
          await leadRef.collection('activity').add({
            type: 'Update',
            date: now,
            notes: `Marketing Opt-Out: Contact '${leadName}' (${leadEmail}) unsubscribed from outbound email campaigns. Suppressed globally.`,
            author: 'Campaign Opt-Out Engine'
          });
        }
      }

      return new Response(renderUnsubscribeSuccessPage(emailUnsubscribed, companyName, deliveryId), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

  } catch (error: any) {
    console.error('Error tracking unsubscribe/resubscribe:', error);
    return new Response(
      `<h1>Error Processing Request</h1><p>We could not process your request automatically. Please contact admin support at MailPlus to be manually updated.</p>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}

function renderUnsubscribeSuccessPage(email: string, company: string, deliveryId: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribe Confirmed | MailPlus</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background-color: #F8FAFC;
          color: #0F2942;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .container {
          background-color: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15, 41, 66, 0.04);
        }

        .logo {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #0F2942;
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }

        .logo-plus {
          color: #E1251B;
        }

        .icon-box {
          width: 72px;
          height: 72px;
          background-color: rgba(225, 37, 27, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
        }

        .icon {
          color: #E1251B;
          width: 36px;
          height: 36px;
        }

        h1 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0 0 16px;
          color: #0F2942;
          letter-spacing: -0.3px;
        }

        p {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #475569;
          margin: 0 0 24px;
        }

        .email-badge {
          background-color: #F1F5F9;
          color: #0F2942;
          font-family: monospace;
          font-size: 0.95rem;
          padding: 8px 16px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .company-badge {
          font-size: 0.9rem;
          color: #E1251B;
          font-weight: 600;
          margin-bottom: 32px;
          display: block;
        }

        .undo-btn {
          display: inline-block;
          background-color: #0F2942;
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          padding: 12px 24px;
          border-radius: 12px;
          margin-top: 8px;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .undo-btn:hover {
          background-color: #1A3E62;
        }

        .undo-btn:active {
          transform: scale(0.98);
        }

        .divider {
          height: 1px;
          background-color: #E2E8F0;
          margin: 32px 0;
        }

        .footer {
          font-size: 0.85rem;
          color: #64748B;
        }

        .footer a {
          color: #E1251B;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Mail<span class="logo-plus">Plus</span></div>
        
        <div class="icon-box">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>

        <h1>Unsubscribed Successfully</h1>
        <p>You have been removed from outbound marketing campaigns from MailPlus.</p>
        
        <div class="email-badge">${email}</div>
        <div class="company-badge">Associated with ${company}</div>

        <div>
          <a href="/api/campaigns/track/unsubscribe?id=${deliveryId}&re=true" class="undo-btn">Undo Unsubscribe</a>
        </div>

        <div class="divider"></div>
        
        <div class="footer">
          If you believe this was an error, please contact your account manager or <a href="mailto:admin@mailplus.com.au">admin@mailplus.com.au</a>.
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderResubscribeSuccessPage(email: string, company: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Re-subscribed Successfully | MailPlus</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background-color: #F8FAFC;
          color: #0F2942;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .container {
          background-color: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15, 41, 66, 0.04);
        }

        .logo {
          font-family: 'Outfit', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #0F2942;
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }

        .logo-plus {
          color: #E1251B;
        }

        .icon-box {
          width: 72px;
          height: 72px;
          background-color: rgba(34, 197, 94, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
        }

        .icon {
          color: #22C55E;
          width: 36px;
          height: 36px;
        }

        h1 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0 0 16px;
          color: #0F2942;
          letter-spacing: -0.3px;
        }

        p {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #475569;
          margin: 0 0 24px;
        }

        .email-badge {
          background-color: #F1F5F9;
          color: #0F2942;
          font-family: monospace;
          font-size: 0.95rem;
          padding: 8px 16px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .company-badge {
          font-size: 0.9rem;
          color: #E1251B;
          font-weight: 600;
          margin-bottom: 32px;
          display: block;
        }

        .divider {
          height: 1px;
          background-color: #E2E8F0;
          margin: 32px 0;
        }

        .footer {
          font-size: 0.85rem;
          color: #64748B;
        }

        .footer a {
          color: #E1251B;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Mail<span class="logo-plus">Plus</span></div>
        
        <div class="icon-box">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>

        <h1>Re-subscribed Successfully</h1>
        <p>You have been successfully opted back into MailPlus outbound marketing campaigns.</p>
        
        <div class="email-badge">${email}</div>
        <div class="company-badge">Associated with ${company}</div>

        <div class="divider"></div>
        
        <div class="footer">
          If you need further assistance, please contact <a href="mailto:admin@mailplus.com.au">admin@mailplus.com.au</a>.
        </div>
      </div>
    </body>
    </html>
  `;
}
