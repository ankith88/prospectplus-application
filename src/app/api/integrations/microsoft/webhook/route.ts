import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { classifyEmailIntent } from '@/ai/flows/classify-email-intent';

const db = getFirestore(adminApp);

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
      const configSnap = await db.collection('outlook_integrations').doc('active_config').get();
      const activeConfig = configSnap.exists ? configSnap.data() : null;

      // 1. Resolve tenant details for client credentials auth
      let tenantAccessToken = '';
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
              tenantAccessToken = tokenData.access_token;
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
        if (notification.resource) {
          try {
            // Determine dynamic access token: Personal vs Tenant Shared Mailbox
            let activeToken = tenantAccessToken;
            const clientState = notification.clientState || '';
            
            if (clientState.startsWith('user-mailbox-sync-')) {
              const targetUserId = clientState.replace('user-mailbox-sync-', '');
              try {
                const { getValidAccessToken } = await import('@/services/microsoft-graph');
                activeToken = await getValidAccessToken(targetUserId);
              } catch (tokenErr: any) {
                console.error(`[Webhook Route] Failed to get personal token for user ${targetUserId}:`, tokenErr.message);
                continue;
              }
            }

            if (!activeToken) {
              console.warn('[Webhook Route] No authorization token available for notification:', notification);
              continue;
            }

            // notification.resource is usually Users/{userId}/Messages/{messageId} or similar
            const messageUrl = `https://graph.microsoft.com/v1.0/${notification.resource}`;
            const messageRes = await fetch(messageUrl, {
              headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Accept': 'application/json'
              }
            });

            if (messageRes.ok) {
              const message = await messageRes.json();
              senderEmail = message.sender?.emailAddress?.address || message.from?.emailAddress?.address || '';
              subject = message.subject || '';
              emailBody = message.body?.content || message.bodyPreview || '';
              const messageId = message.id || notification.resourceData?.id || notification.subscriptionId;
              recipientEmail = message.toRecipients?.[0]?.emailAddress?.address || activeConfig?.senderEmail || 'campaigns@mailplus.com.au';

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
              await db.collection('mailbox_automation_logs').add({
                timestamp: now,
                senderEmail: 'system',
                subject: 'Failed fetching message details',
                status: 'error',
                error: `HTTP error fetching from MS Graph: ${errText}`,
              });
            }
          } catch (notifErr: any) {
            console.error('[Mailbox Webhook Notification Exception]:', notifErr);
            await db.collection('mailbox_automation_logs').add({
              timestamp: now,
              senderEmail: 'system',
              subject: 'Exception fetching message details',
              status: 'error',
              error: notifErr.message || String(notifErr),
            });
          }
        }
      }
      return NextResponse.json({ success: true, processed: logs.length });
    }

    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('[Mailbox Webhook Error]:', error);

    // Store error log in Firestore for transparency
    await db.collection('mailbox_automation_logs').add({
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

  // A. Thread check: Does the subject contain an active ticket ID?
  const ticketIdMatch = subject.match(/MP-[A-Z0-9]{6}/);
  if (ticketIdMatch) {
    const matchedTicketId = ticketIdMatch[0];
    const ticketsSnap = await db.collection('tickets').where('ticketNumber', '==', matchedTicketId).limit(1).get();
    if (!ticketsSnap.empty) {
      const ticketRef = ticketsSnap.docs[0].ref;
      await ticketRef.collection('timeline').add({
        type: 'Email Received',
        date: now,
        sender: senderEmail,
        recipient: recipientEmail,
        subject,
        bodyHtml: body,
        author: 'System Webhook'
      });
      await ticketRef.update({
        updatedAt: now,
        status: 'In Progress'
      });
      await db.collection('mailbox_automation_logs').add({
        timestamp: now,
        senderEmail,
        subject,
        status: 'success',
        reason: `Appended email to existing ticket ${matchedTicketId}`,
      });
      return { status: 'success', reason: `Appended email to existing ticket ${matchedTicketId}` };
    }
  }

  // B. Check if contact exists
  const contactsQuery = db.collectionGroup('contacts').where('email', '==', searchEmail);
  const contactsSnap = await contactsQuery.get();

  if (contactsSnap.empty) {
    // If no lead contact matches, instead of ignoring, auto-create a support ticket.
    const cleanBody = body.replace(/<[^>]*>/g, ' ').substring(0, 1000);
    const ticketRef = await db.collection('tickets').add({
      trackingIdentifier: 'N/A',
      isMasterCase: false,
      parentTicketId: '',
      customerName: 'External Sender',
      customerCompany: 'Unregistered Contact',
      customerAccountNumber: 'N/A',
      customerTier: 'Standard',
      customerEmail: senderEmail,
      receiverName: 'Unknown Recipient',
      receiverAddress: 'No delivery address provided',
      enquiryType: 'General Enquiry',
      raisedBy: 'Other',
      priority: 'Standard',
      assignedUser: 'Kaley Drummond',
      description: cleanBody,
      issueCategory: ['General Enquiry'],
      source: 'Email',
      enquirerName: senderEmail.split('@')[0],
      enquirerEmail: senderEmail,
      notes: 'Auto-created ticket from unregistered shared mailbox incoming query.',
      status: 'New',
      createdAt: now,
      updatedAt: now,
      ticketNumber: 'MP-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    });

    await db.collection('mailbox_automation_logs').add({
      timestamp: now,
      senderEmail,
      subject,
      status: 'success',
      reason: `Auto-created new support ticket for unregistered sender. Ticket document: ${ticketRef.id}`,
    });

    return { status: 'success', reason: `Auto-created new support ticket for unregistered sender` };
  }

  // 2. Fetch Lead parent document
  const contactDoc = contactsSnap.docs[0];
  const contactData = contactDoc.data();
  const leadRef = contactDoc.ref.parent.parent;
  if (!leadRef) {
    throw new Error('Lead reference not found for contact.');
  }

  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    throw new Error('Lead document does not exist.');
  }
  const leadData = leadSnap.data()!;
  const leadId = leadSnap.id;

  // 3. Save email to lead's emails subcollection
  const leadEmailRef = db.collection('leads').doc(leadId).collection('emails');
  const addedDocRef = await leadEmailRef.add({
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
    const companyEmailRef = db.collection('companies').doc(leadData.companyId).collection('emails');
    companyDocRef = await companyEmailRef.add({
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
    const parentEmailRef = db.collection('leads').doc(leadData.parentLeadId).collection('emails');
    parentDocRef = await parentEmailRef.add({
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
  await addedDocRef.update({
    intent,
    reasoning,
    suggestedStatus
  });

  if (companyDocRef) {
    await companyDocRef.update({
      intent,
      reasoning,
      suggestedStatus
    });
  }

  if (parentDocRef) {
    await parentDocRef.update({
      intent,
      reasoning,
      suggestedStatus
    });
  }

  // 6. Perform transitions based on intent
  if (intent === 'Unsubscribe Request') {
    // A. Add to Suppression List
    await db.collection('marketing_suppression_list').doc(searchEmail).set({
      email: searchEmail,
      unsubscribedAt: now,
      campaignId: 'incoming-webhook-auto',
      leadId: leadId,
      companyName: leadData.companyName || 'Unknown Company',
      leadName: contactData.name || 'Unknown Contact',
    });

    // B. Opt-out all matching contacts under this lead
    const childContactsSnap = await db.collection('leads').doc(leadId).collection('contacts').get();
    for (const cDoc of childContactsSnap.docs) {
      if (cDoc.data().email?.toLowerCase() === searchEmail) {
        await cDoc.ref.update({
          sendEmail: 'no',
          optedOut: true,
        });
      }
    }

    // C. Add activity log
    await db.collection('leads').doc(leadId).collection('activity').add({
      type: 'Update',
      date: now,
      notes: `AI-detected Unsubscribe Request: Automatically opted out and routed to Suppression List. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });

    // D. Also update lead status to Unqualified
    await leadRef.update({
      status: 'Unqualified',
    });
  } else if (intent === 'Objection/Follow-up') {
    // Update Lead Status & log objection
    await leadRef.update({
      status: suggestedStatus,
    });

    await db.collection('leads').doc(leadId).collection('activity').add({
      type: 'Update',
      date: now,
      notes: `AI-detected Objection/Follow-up: Status set to '${suggestedStatus}'. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });
  } else {
    // Interested, Out of office, or Other
    if (intent === 'Interested') {
      await leadRef.update({
        status: suggestedStatus,
      });
    }

    await db.collection('leads').doc(leadId).collection('activity').add({
      type: 'Email',
      date: now,
      notes: `Received email with intent [${intent}]. Suggested Status: ${suggestedStatus}. Reasoning: ${reasoning}`,
      author: 'AI Mailbox Assistant',
    });
  }

  // 7. Store final success execution log
  await db.collection('mailbox_automation_logs').add({
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
