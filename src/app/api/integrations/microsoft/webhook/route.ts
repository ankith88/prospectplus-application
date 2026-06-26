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
      for (const notification of payload.value) {
        // In a real Microsoft Graph Webhook:
        // We'd parse notification.resource, e.g. "Users/{userId}/Messages/{messageId}"
        // Fetch message details using the valid Graph API token for the user.
        // For the sake of standard deployment and sandbox, if details are provided or fetched:
        if (notification.resourceData) {
          // Process if resourceData details are accessible
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
  await addDoc(leadEmailRef, {
    id: messageId,
    subject,
    bodyHtml: body,
    sentAt: now,
    sender: senderEmail,
    recipient: recipientEmail,
    status: 'received',
  });

  // 4. Save email to company's emails subcollection (if linked)
  if (leadData.companyId) {
    const companyEmailRef = collection(firestore, 'companies', leadData.companyId, 'emails');
    await addDoc(companyEmailRef, {
      id: messageId,
      subject,
      bodyHtml: body,
      sentAt: now,
      sender: senderEmail,
      recipient: recipientEmail,
      status: 'received',
    });
  } else if (leadData.parentLeadId) {
    const parentEmailRef = collection(firestore, 'leads', leadData.parentLeadId, 'emails');
    await addDoc(parentEmailRef, {
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
