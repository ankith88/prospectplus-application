import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { classifyEmailIntent } from '@/ai/flows/classify-email-intent';

export async function GET(req: NextRequest) {
  const validationToken = req.nextUrl.searchParams.get('validationToken');
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: NextRequest) {
  const now = new Date().toISOString();
  let senderEmail = '';
  let subject = '';
  let emailBody = '';
  let recipientEmail = '';

  try {
    const validationToken = req.nextUrl.searchParams.get('validationToken');
    if (validationToken) {
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const payload = await req.json();

    // Handle simulation triggers
    if (payload.isSimulation) {
      senderEmail = payload.senderEmail || 'test-lead@domain.com';
      recipientEmail = payload.recipientEmail || 'rep@mailplus.com.au';
      subject = payload.subject || 'Simulation Email';
      emailBody = payload.body || 'This is a simulation body.';

      const result = await processEmail({
        senderEmail,
        recipientEmail,
        subject,
        body: emailBody,
        messageId: 'simulated-' + Math.random().toString(36).substring(7),
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Handle real MS Graph subscription notifications
    if (payload.value && Array.isArray(payload.value)) {
      const logs = [];
      
      // Fetch Active Outlook Config for credentials mapping if needed
      const configSnap = await getDoc(doc(firestore, 'outlook_integrations', 'active_config'));
      const activeConfig = configSnap.exists() ? configSnap.data() : null;

      let accessToken = '';
      if (activeConfig && activeConfig.type === 'graph') {
        const { clientId, tenantId, clientSecret } = activeConfig;
        if (clientId && tenantId && clientSecret && clientSecret !== 'invalid' && clientSecret !== 'test') {
          try {
            const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
            const tokenBody = new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret,
              scope: 'https://graph.microsoft.com/.default'
            });

            const tokenRes = await fetch(tokenUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenBody.toString()
            });

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              accessToken = tokenData.access_token;
            } else {
              const errText = await tokenRes.text();
              console.error('[Mailbox Webhook Token Error]:', errText);
            }
          } catch (tokenErr: any) {
            console.error('[Mailbox Webhook Token Exception]:', tokenErr);
          }
        }
      }

      for (const notification of payload.value) {
        if (notification.resource && accessToken) {
          try {
            // notification.resource is usually Users/{userId}/Messages/{messageId} or similar
            const messageUrl = `https://graph.microsoft.com/v1.0/${notification.resource}`;
            const messageRes = await fetch(messageUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
              }
            });

            if (messageRes.ok) {
              const message = await messageRes.json();
              senderEmail = message.sender?.emailAddress?.address || message.from?.emailAddress?.address || '';
              subject = message.subject || '';
              emailBody = message.body?.content || message.bodyPreview || '';
              const messageId = message.id || notification.resourceData?.id || notification.subscriptionId;
              recipientEmail = activeConfig?.senderEmail || 'campaigns@mailplus.com.au';

              if (senderEmail) {
                const result = await processEmail({
                  senderEmail,
                  recipientEmail,
                  subject,
                  body: emailBody,
                  messageId,
                });
                logs.push(result);
              }
            } else {
              const errText = await messageRes.text();
              console.error(`[Mailbox Webhook Fetch Error]: Failed to fetch message details for ${notification.resource}. Response: ${errText}`);
              await addDoc(collection(firestore, 'mailbox_automation_logs'), {
                timestamp: now,
                senderEmail: 'system',
                subject: 'Failed fetching message details',
                status: 'error',
                error: `HTTP error fetching from MS Graph: ${errText}`,
              });
            }
          } catch (notifErr: any) {
            console.error('[Mailbox Webhook Notification Exception]:', notifErr);
            await addDoc(collection(firestore, 'mailbox_automation_logs'), {
              timestamp: now,
              senderEmail: 'system',
              subject: 'Exception fetching message details',
              status: 'error',
              error: notifErr.message || String(notifErr),
            });
          }
        } else if (!accessToken && activeConfig?.type === 'graph') {
          // Token is missing but graph is configured
          await addDoc(collection(firestore, 'mailbox_automation_logs'), {
            timestamp: now,
            senderEmail: 'system',
            subject: 'Authorization Failed',
            status: 'error',
            error: 'Unable to authenticate with Microsoft Graph API using stored Entra ID credentials.',
          });
        }
      }
      return NextResponse.json({ success: true, processed: logs.length });
    }

    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('[Mailbox Webhook Error]:', error);

    // Store error log in Firestore for transparency
    await addDoc(collection(firestore, 'mailbox_automation_logs'), {
      timestamp: now,
      senderEmail: senderEmail || 'unknown',
      subject: subject || 'unknown',
      status: 'error',
      error: error.message || String(error),
    });

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

interface ProcessEmailParams {
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
}

async function processEmail({ senderEmail, recipientEmail, subject, body, messageId }: ProcessEmailParams) {
  const now = new Date().toISOString();
  const searchEmail = senderEmail.toLowerCase().trim();

  // 1. Locate Lead Contact by Email using collectionGroup query
  const contactsQuery = query(
    collectionGroup(firestore, 'contacts'),
    where('email', '==', searchEmail)
  );
  const contactsSnap = await getDocs(contactsQuery);

  if (contactsSnap.empty) {
    // If no lead contact matches, log and return early (Spam/Unrelated mail filter)
    await addDoc(collection(firestore, 'mailbox_automation_logs'), {
      timestamp: now,
      senderEmail,
      subject,
      status: 'ignored',
      reason: 'No matching lead contact email address in CRM.',
    });
    return { status: 'ignored', reason: 'Email does not match any CRM lead contacts' };
  }

  // 2. Fetch Lead parent document
  const contactDoc = contactsSnap.docs[0];
  const contactData = contactDoc.data();
  const leadRef = contactDoc.ref.parent.parent;
  if (!leadRef) {
    throw new Error('Lead reference not found for contact.');
  }

  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) {
    throw new Error('Lead document does not exist.');
  }
  const leadData = leadSnap.data();
  const leadId = leadSnap.id;

  // 3. Save email to lead's emails subcollection
  const leadEmailRef = collection(firestore, 'leads', leadId, 'emails');
  const addedDocRef = await addDoc(leadEmailRef, {
    id: messageId,
    subject,
    bodyHtml: body,
    sentAt: now,
    sender: senderEmail,
    recipient: recipientEmail,
    status: 'received',
  });

  // 4. Save email to company's emails subcollection (if linked)
  let companyDocRef = null;
  if (leadData.companyId) {
    const companyEmailRef = collection(firestore, 'companies', leadData.companyId, 'emails');
    companyDocRef = await addDoc(companyEmailRef, {
      id: messageId,
      subject,
      bodyHtml: body,
      sentAt: now,
      sender: senderEmail,
      recipient: recipientEmail,
      status: 'received',
    });
  }

  let parentDocRef = null;
  if (leadData.parentLeadId) {
    const parentEmailRef = collection(firestore, 'leads', leadData.parentLeadId, 'emails');
    parentDocRef = await addDoc(parentEmailRef, {
      id: messageId,
      subject,
      bodyHtml: body,
      sentAt: now,
      sender: senderEmail,
      recipient: recipientEmail,
      status: 'received',
    });
  }

  // 5. Run Genkit AI intent classification
  const classification = await classifyEmailIntent({
    senderEmail,
    subject,
    body,
  });

  const { intent, reasoning, suggestedStatus } = classification;

  // Update classification metadata directly on the email documents
  await updateDoc(addedDocRef, {
    intent,
    reasoning,
    suggestedStatus
  });

  if (companyDocRef) {
    await updateDoc(companyDocRef, {
      intent,
      reasoning,
      suggestedStatus
    });
  }

  if (parentDocRef) {
    await updateDoc(parentDocRef, {
      intent,
      reasoning,
      suggestedStatus
    });
  }

  // 6. Perform transitions based on intent
  if (intent === 'Unsubscribe Request') {
    // A. Add to Suppression List
    await setDoc(doc(firestore, 'marketing_suppression_list', searchEmail), {
      email: searchEmail,
      unsubscribedAt: now,
      campaignId: 'incoming-webhook-auto',
      leadId: leadId,
      companyName: leadData.companyName || 'Unknown Company',
      leadName: contactData.name || 'Unknown Contact',
    });

    // B. Opt-out all matching contacts under this lead
    const childContactsSnap = await getDocs(collection(firestore, 'leads', leadId, 'contacts'));
    for (const cDoc of childContactsSnap.docs) {
      if (cDoc.data().email?.toLowerCase() === searchEmail) {
        await updateDoc(cDoc.ref, {
          sendEmail: 'no',
          optedOut: true,
        });
      }
    }

    // C. Add activity log
    await addDoc(collection(firestore, 'leads', leadId, 'activity'), {
      type: 'Update',
      date: now,
      notes: `AI-detected Unsubscribe Request: Automatically opted out and routed to Suppression List. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });

    // D. Also update lead status to Unqualified
    await updateDoc(leadRef, {
      status: 'Unqualified',
    });
  } else if (intent === 'Objection/Follow-up') {
    // Update Lead Status & log objection
    await updateDoc(leadRef, {
      status: suggestedStatus,
    });

    await addDoc(collection(firestore, 'leads', leadId, 'activity'), {
      type: 'Update',
      date: now,
      notes: `AI-detected Objection/Follow-up: Status set to '${suggestedStatus}'. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });
  } else {
    // Interested, Out of office, or Other
    if (intent === 'Interested') {
      await updateDoc(leadRef, {
        status: suggestedStatus,
      });
    }

    await addDoc(collection(firestore, 'leads', leadId, 'activity'), {
      type: 'Email',
      date: now,
      notes: `Received email with intent [${intent}]. Suggested Status: ${suggestedStatus}. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });
  }

  // 7. Store final success execution log
  await addDoc(collection(firestore, 'mailbox_automation_logs'), {
    timestamp: now,
    senderEmail,
    subject,
    body,
    intent,
    reasoning,
    suggestedStatus,
    leadId,
    status: 'success',
  });

  return {
    status: 'success',
    intent,
    reasoning,
    suggestedStatus,
    leadId,
  };
}
