import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get('id');

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

    if (deliveryDoc.exists) {
      const data = deliveryDoc.data();
      const campaignId = data?.campaignId;
      const leadId = data?.leadId;
      const leadEmail = data?.leadEmail;
      companyName = data?.companyName || companyName;
      leadName = data?.leadName || leadName;
      emailUnsubscribed = leadEmail || '';

      if (leadEmail) {
        const now = new Date().toISOString();

        // 1. Update delivery log
        await deliveryRef.update({
          unsubscribedAt: now
        });

        // 2. Increment global campaign unsubscribes
        if (campaignId) {
          await db.collection('marketing_campaigns').doc(campaignId).update({
            'metrics.unsubscribed': require('firebase-admin').firestore.FieldValue.increment(1)
          });
        }

        // 3. Add to global suppression list
        await db.collection('marketing_suppression_list').doc(leadEmail.toLowerCase().trim()).set({
          email: leadEmail.toLowerCase().trim(),
          unsubscribedAt: now,
          deliveryId,
          campaignId: campaignId || 'direct',
          leadId: leadId || 'direct'
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
      }
    } else {
      // If delivery log doesn't exist, we still want to show a graceful page
      return new Response(renderUnsubscribeSuccessPage('General Request', 'System Campaign'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response(renderUnsubscribeSuccessPage(emailUnsubscribed || 'your email', companyName), {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    console.error('Error tracking unsubscribe:', error);
    return new Response(
      `<h1>Error Processing Request</h1><p>We could not process your unsubscription request automatically. Please contact Ankith Ravindran or admin support at MailPlus to be manually removed.</p>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}

function renderUnsubscribeSuccessPage(email: string, company: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribe Confirmed | prospect.plus</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Outfit:wght@100..900&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background-color: #FFFDF6;
          color: #1A3D33;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .container {
          background-color: #ffffff;
          border: 1px solid #F0EDE4;
          border-radius: 24px;
          padding: 48px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(26, 61, 51, 0.05);
        }

        .logo {
          font-family: 'Fraunces', serif;
          font-size: 2rem;
          font-weight: 400;
          color: #095C7B;
          margin-bottom: 24px;
        }

        .logo-plus {
          font-weight: 500;
          font-style: italic;
          color: #A8763A;
        }

        .icon-box {
          width: 72px;
          height: 72px;
          background-color: rgba(9, 92, 123, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
        }

        .icon {
          color: #095C7B;
          width: 36px;
          height: 36px;
        }

        h1 {
          font-family: 'Fraunces', serif;
          font-size: 2.2rem;
          font-weight: 400;
          margin: 0 0 16px;
          color: #1A3D33;
        }

        p {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #2A4E43;
          margin: 0 0 32px;
        }

        .email-badge {
          background-color: #F0EDE4;
          color: #1A3D33;
          font-family: monospace;
          font-size: 0.95rem;
          padding: 8px 16px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 8px;
        }

        .company-badge {
          font-size: 0.9rem;
          color: #A8763A;
          font-weight: 600;
          margin-bottom: 24px;
          display: block;
        }

        .divider {
          height: 1px;
          background-color: #F0EDE4;
          margin: 32px 0;
        }

        .footer {
          font-size: 0.85rem;
          color: #2A4E43;
          opacity: 0.7;
        }

        .footer a {
          color: #095C7B;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">prospect<span class="logo-plus">.plus</span></div>
        
        <div class="icon-box">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        </div>

        <h1>Unsubscribed Successfully</h1>
        <p>You have been removed from outbound marketing campaigns for this workspace.</p>
        
        <div class="email-badge">${email}</div>
        <div class="company-badge">Associated with ${company}</div>

        <div class="divider"></div>
        
        <div class="footer">
          If you believe this was an error, please contact your account manager at <a href="mailto:admin@mailplus.com.au">admin@mailplus.com.au</a>.
        </div>
      </div>
    </body>
    </html>
  `;
}
