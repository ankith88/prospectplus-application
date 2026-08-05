import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

/**
 * Helper to strip previous email thread quotes from raw email text.
 */
function cleanEmailBody(text: string): string {
  if (!text) return '';

  const splitLines = text.split(/\r?\n/);
  const cleaned: string[] = [];

  for (const line of splitLines) {
    // Stop parsing if we hit standard email reply headers
    if (
      /^>/.test(line.trim()) ||
      /^On .* wrote:$/i.test(line.trim()) ||
      /^From:\s/i.test(line.trim()) ||
      /^Subject:\s/i.test(line.trim()) ||
      /^---\s*Original Message\s*---/i.test(line.trim()) ||
      /^_+\s*$/i.test(line.trim())
    ) {
      break;
    }
    cleaned.push(line);
  }

  const result = cleaned.join('\n').trim();
  return result || text.trim();
}

/**
 * Extract ticket reference ID/number from subject or to address.
 * Matches: [Ticket #MP-10492], [Ticket #10492], or ticket+MP-10492@...
 */
function extractTicketIdentifier(subject: string, toAddress: string): string | null {
  // 1. Check To address tag (e.g. ticket+MP-1234@domain.com)
  const toMatch = toAddress.match(/ticket\+([a-zA-Z0-9\-]+)@/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1];
  }

  // 2. Check Subject bracket format: [Ticket #MP-1234] or [Ticket #1234]
  const bracketMatch = subject.match(/\[Ticket\s*#?\s*([a-zA-Z0-9\-]+)\]/i);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }

  // 3. Fallback Subject regex match: Ticket #MP-1234 or Ticket #1234
  const plainMatch = subject.match(/Ticket\s*#?\s*([a-zA-Z0-9\-]+)/i);
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1];
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let fromEmail = '';
    let toEmail = '';
    let subject = '';
    let rawBody = '';
    let attachments: Array<{ name: string; url: string }> = [];

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      fromEmail = (formData.get('from') as string) || (formData.get('sender') as string) || '';
      toEmail = (formData.get('to') as string) || (formData.get('recipient') as string) || '';
      subject = (formData.get('subject') as string) || '';
      rawBody = (formData.get('text') as string) || (formData.get('html') as string) || '';
    } else {
      const json = await request.json();
      fromEmail = json.from || json.sender || '';
      toEmail = json.to || json.recipient || '';
      subject = json.subject || '';
      rawBody = json.text || json.html || json.body || '';
      if (Array.isArray(json.attachments)) {
        attachments = json.attachments;
      }
    }

    if (!rawBody && !subject) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: Empty body and subject.' },
        { status: 400 }
      );
    }

    const ticketIdentifier = extractTicketIdentifier(subject, toEmail);
    if (!ticketIdentifier) {
      console.warn(`[Inbound Email] Could not match ticket identifier from subject "${subject}" or recipient "${toEmail}".`);
      return NextResponse.json(
        { success: false, message: 'No valid Ticket ID found in email headers.' },
        { status: 422 }
      );
    }

    // Lookup matching ticket in Firestore
    let ticketDocId: string | null = null;
    let ticketData: any = null;

    // Search by document ID first
    const directSnap = await db.collection('tickets').doc(ticketIdentifier).get();
    if (directSnap.exists) {
      ticketDocId = directSnap.id;
      ticketData = directSnap.data();
    } else {
      // Search by ticketNumber field
      const querySnap = await db.collection('tickets')
        .where('ticketNumber', '==', ticketIdentifier)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        ticketDocId = querySnap.docs[0].id;
        ticketData = querySnap.docs[0].data();
      }
    }

    if (!ticketDocId || !ticketData) {
      console.warn(`[Inbound Email] Ticket "${ticketIdentifier}" not found in Firestore.`);
      return NextResponse.json(
        { success: false, message: `Ticket ${ticketIdentifier} not found.` },
        { status: 404 }
      );
    }

    const cleanedBody = cleanEmailBody(rawBody);
    const nowIso = new Date().toISOString();

    // Log in communications subcollection
    const commRef = db.collection('tickets').doc(ticketDocId).collection('communications');
    await commRef.add({
      timestamp: nowIso,
      type: 'RECEIVED',
      direction: 'Inbound',
      visibility: 'Public',
      source: 'Email',
      from: fromEmail,
      to: toEmail,
      subject: subject,
      content: cleanedBody,
      body: cleanedBody,
      author: fromEmail,
      attachments: attachments,
    });

    // Update parent ticket status & timestamp
    const ticketUpdate: Record<string, any> = {
      updatedAt: nowIso,
    };

    if (ticketData.currentStatus === 'Awaiting User Feedback' || ticketData.currentStatus === 'Pending Client') {
      ticketUpdate.currentStatus = 'In Progress';
    }

    await db.collection('tickets').doc(ticketDocId).update(ticketUpdate);

    // Log action in history
    await db.collection('tickets').doc(ticketDocId).collection('actions').add({
      action: 'Inbound Email Reply Received',
      user: fromEmail,
      timestamp: nowIso,
      notes: `Received email reply from ${fromEmail}`,
    });

    return NextResponse.json({
      success: true,
      ticketId: ticketDocId,
      message: 'Inbound email reply processed and attached to ticket successfully.',
    });
  } catch (error: any) {
    console.error('[Inbound Email Webhook Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error processing inbound email.' },
      { status: 500 }
    );
  }
}
