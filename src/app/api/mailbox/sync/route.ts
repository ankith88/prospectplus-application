import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { classifyEmailIntent } from '@/ai/flows/classify-email-intent';
import fetch from 'node-fetch';

const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId parameter' }, { status: 400 });
    }

    // 1. Get access token
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(userId);
    } catch (tokenErr: any) {
      // User hasn't connected or token expired
      console.warn(`[Mailbox Sync] Token not available for user ${userId}:`, tokenErr.message);
      return NextResponse.json({ success: true, message: 'Calendar/Mail not connected or authorized.', synced: 0 });
    }

    // 2. Fetch recent received emails from MS Graph
    // Fetch last 50 emails from Inbox received in the last 7 days
    const minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const mailUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${minDate}&$top=50&$select=id,subject,body,bodyPreview,from,toRecipients,receivedDateTime`;

    const mailRes = await fetch(mailUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!mailRes.ok) {
      const errText = await mailRes.text();
      throw new Error(`Graph API returned error: ${errText}`);
    }

    const mailData: any = await mailRes.json();
    const messages = mailData.value || [];
    let syncCount = 0;

    for (const msg of messages) {
      const senderEmail = msg.from?.emailAddress?.address || '';
      if (!senderEmail) continue;

      const searchEmail = senderEmail.toLowerCase().trim();

      // Check if we have this contact in leads
      const contactsQuery = db.collectionGroup('contacts').where('email', '==', searchEmail);
      const contactsSnap = await contactsQuery.get();

      if (contactsSnap.empty) {
        continue; // Unregistered sender, skip personal sync
      }

      // Check if already saved
      const leadRef = contactsSnap.docs[0].ref.parent.parent;
      if (!leadRef) continue;

      const leadId = leadRef.id;
      const emailsRef = leadRef.collection('emails');
      const existingQuery = await emailsRef.where('id', '==', msg.id).limit(1).get();

      if (existingQuery.empty) {
        // Save incoming email
        const now = new Date().toISOString();
        const sentAt = msg.receivedDateTime || now;
        const emailBody = msg.body?.content || msg.bodyPreview || '';

        const addedDocRef = await emailsRef.add({
          id: msg.id,
          subject: msg.subject || '(No Subject)',
          bodyHtml: emailBody,
          sentAt,
          sender: senderEmail,
          recipient: msg.toRecipients?.[0]?.emailAddress?.address || '',
          status: 'received'
        });

        // Run Genkit intent classification
        try {
          const classification = await classifyEmailIntent({
            senderEmail,
            subject: msg.subject || '',
            body: emailBody
          });

          const { intent, reasoning, suggestedStatus } = classification;

          await addedDocRef.update({
            intent,
            reasoning,
            suggestedStatus
          });

          // Save activity log
          await leadRef.collection('activity').add({
            type: 'Email',
            date: now,
            notes: `Synced incoming email [${intent}]. Reasoning: ${reasoning}`,
            author: 'AI Mailbox Assistant'
          });

          if (intent === 'Interested') {
            await leadRef.update({ status: suggestedStatus });
          }
        } catch (aiErr) {
          console.error('[Mailbox Sync AI Error]:', aiErr);
        }

        syncCount++;
      }
    }

    return NextResponse.json({ success: true, synced: syncCount });
  } catch (error: any) {
    console.error('[Mailbox Sync Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
