
'use server';

/**
 * @fileoverview API route to handle webhooks from AirCall.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { logActivity } from '@/services/firebase';
import type { Lead } from '@/lib/types';

/**
 * Verifies the signature of the incoming webhook request.
 * @param {string} signature The signature from the X-Aircall-Signature header.
 * @param {string} requestBody The raw request body.
 * @returns {boolean} Whether the signature is valid.
 */
function verifySignature(signature: string, requestBody: string): boolean {
  const token = process.env.AIRCALL_WEBHOOK_TOKEN;
  if (!token) {
    console.error('AIRCALL_WEBHOOK_TOKEN is not set.');
    return false;
  }
  const hash = crypto.createHmac('sha1', token).update(requestBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

/**
 * Finds a lead in Firestore by a given phone number.
 * @param {string} phoneNumber The phone number to search for.
 * @returns {Promise<Lead | null>} The found lead or null.
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
  const leadsRef = collection(firestore, 'leads');
  // First, check the main customerPhone field for a direct match.
  const q = query(
    leadsRef,
    where('customerPhone', '==', phoneNumber),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Lead;
  }

  // If no direct match, search within the contacts subcollection of each lead.
  // This is less efficient but necessary if calls are made to secondary contacts.
  const allLeadsSnapshot = await getDocs(leadsRef);
  for (const leadDoc of allLeadsSnapshot.docs) {
      const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
      const contactsQuery = query(contactsRef, where('phone', '==', phoneNumber), limit(1));
      const contactsSnapshot = await getDocs(contactsQuery);
      if (!contactsSnapshot.empty) {
          return { id: leadDoc.id, ...leadDoc.data() } as Lead;
      }
  }

  return null;
}


/**
 * Handles POST requests from AirCall webhooks.
 * @param {NextRequest} request The incoming Next.js request.
 * @returns {NextResponse} The response to send back.
 */
export async function POST(request: NextRequest) {
  const headersList = headers();
  const signature = headersList.get('X-Aircall-Signature');
  const rawBody = await request.text();

  if (!signature) {
    console.warn('Received webhook without signature.');
    return new NextResponse('Signature missing', { status: 401 });
  }

  // AirCall's test webhook sends a different signature format
  if (rawBody.includes('"event": "ping"')) {
     console.log('Received ping from AirCall. Responding with 200 OK.');
     return new NextResponse('OK', { status: 200 });
  }

  // Bypassing signature verification if a specific header is present (for testing)
  if (headersList.get('X-Bypass-Signature-Verification') !== 'true') {
      if (!verifySignature(signature, rawBody)) {
        console.warn('Received webhook with invalid signature.');
        return new NextResponse('Invalid signature', { status: 401 });
      }
  } else {
      console.log('Bypassing signature verification for testing.');
  }

  try {
    const data = JSON.parse(rawBody);
    console.log(`Received webhook for event: ${data.event}`);
    console.log(`Raw body: ${rawBody}`);
    console.log(`Parsed data:`, data);


    // We only care about when a call is finished and notes are added.
    if (data.event === 'call.ended' || data.event === 'call.commented') {
      const callData = data.data;
      const leadPhoneNumber = callData.raw_digits;

      if (!leadPhoneNumber) {
        console.log('Webhook payload did not contain a phone number to match.');
        return new NextResponse('No phone number in payload', { status: 200 });
      }

      const lead = await findLeadByPhoneNumber(leadPhoneNumber);

      if (!lead) {
        console.log(`No lead found for phone number: ${leadPhoneNumber}`);
        return new NextResponse('Lead not found', { status: 200 });
      }

      const minutes = Math.floor(callData.duration / 60);
      const seconds = callData.duration % 60;
      const duration = `${minutes}m ${seconds}s`;

      const notes = `Call with ${callData.direction} direction. Outcome: ${callData.status}. Duration: ${duration}. Notes: ${callData.comments?.map((c: any) => c.content).join(' ') || 'N/A'}`;
      
      await logActivity(lead.id, {
        type: 'Call',
        notes: notes,
        duration: duration,
      });

      console.log(`Successfully logged activity for lead ${lead.id}`);
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
