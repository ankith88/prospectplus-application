
'use server';

/**
 * @fileoverview API route to handle webhooks from AirCall.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { logActivity, logUnmatchedActivity } from '@/services/firebase';
import type { Lead } from '@/lib/types';


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

  if (!signature) {
    console.warn('Received webhook without signature.');
    return new NextResponse('Signature missing', { status: 401 });
  }

  const token = process.env.AIRCALL_WEBHOOK_TOKEN;
  if (!token) {
    console.error('AIRCALL_WEBHOOK_TOKEN is not set.');
    return new NextResponse('Webhook token not configured', { status: 500 });
  }

  try {
    const data = await request.json();
    const rawBody = JSON.stringify(data); // Use the JSON parsed body
    const hash = crypto.createHmac('sha1', token).update(rawBody).digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'))) {
        console.warn('Received webhook with invalid signature. Check AIRCALL_WEBHOOK_TOKEN.');
        return new NextResponse('Invalid signature', { status: 401 });
    }

    console.log(`Received webhook for event: ${data.event}`);

    // We only care about when a call is finished and notes are added.
    if (data.event === 'call.ended' || data.event === 'call.commented') {
      const callData = data.data;
      const leadPhoneNumber = callData.raw_digits;

      if (!leadPhoneNumber) {
        console.log('Webhook payload did not contain a phone number to match.');
        return new NextResponse('No phone number in payload', { status: 200 });
      }

      const lead = await findLeadByPhoneNumber(leadPhoneNumber);

      const minutes = Math.floor(callData.duration / 60);
      const seconds = callData.duration % 60;
      const duration = `${minutes}m ${seconds}s`;

      const notes = `Call with ${callData.direction} direction. Outcome: ${callData.status}. Duration: ${duration}. Notes: ${callData.comments?.map((c: any) => c.content).join(' ') || 'N/A'}`;

      if (lead) {
        await logActivity(lead.id, {
            type: 'Call',
            notes: notes,
            duration: duration,
            callId: callData.id,
        });
        console.log(`Successfully logged activity for lead ${lead.id}`);
      } else {
        console.log(`No lead found for phone number: ${leadPhoneNumber}. Logging to unmatched activities.`);
        await logUnmatchedActivity({
            type: 'Call',
            notes: `Unmatched call from ${leadPhoneNumber}. ${notes}`,
            date: new Date(callData.started_at).toISOString(),
            duration: duration,
            callId: callData.id,
        });
      }
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
