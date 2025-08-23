
'use server';

/**
 * @fileoverview API route to handle webhooks from AirCall using a secret URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { logActivity, logUnmatchedActivity, findActivityByCallId, updateActivity } from '@/services/firebase';
import type { Lead, Activity } from '@/lib/types';

/**
 * Finds a lead in Firestore by a given phone number.
 * @param {string} phoneNumber The phone number to search for.
 * @returns {Promise<Lead | null>} The found lead or null.
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string } | null> {
  if (!phoneNumber) return null;

  const leadsRef = collection(firestore, 'leads');
  
  // Normalize phone number for broader matching
  const variations = new Set<string>();
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.startsWith('61')) {
    variations.add(`+${digits}`);
    variations.add(`0${digits.substring(2)}`);
  } else if (digits.startsWith('0')) {
    variations.add(`+61${digits.substring(1)}`);
    variations.add(digits);
  } else {
     variations.add(`+61${digits}`);
     variations.add(`0${digits}`);
  }
   variations.add(phoneNumber);


  for (const num of Array.from(variations)) {
      const q = query(leadsRef, where('customerPhone', '==', num), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id };
      }

      // Fallback search in contacts subcollection
      const allLeadsSnapshot = await getDocs(leadsRef);
      for (const leadDoc of allLeadsSnapshot.docs) {
          const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
          const contactsQuery = query(contactsRef, where('phone', '==', num), limit(1));
          const contactsSnapshot = await getDocs(contactsQuery);
          if (!contactsSnapshot.empty) {
              return { id: leadDoc.id };
          }
      }
  }

  return null;
}

/**
 * Handles POST requests from AirCall webhooks.
 * @param {NextRequest} request The incoming Next.js request.
 * @returns {NextResponse} The response to send back.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { secret: string } }
) {
  const { secret } = params;
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    console.warn(`Invalid webhook secret provided: ${secret}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    console.log(`Received valid webhook for event: ${data.event}`);

    if (data.event === 'call.ended' || data.event === 'call.commented' || data.event === 'call.tagged') {
      const callData = data.data;
      const leadPhoneNumber = callData.raw_digits;
      const callId = callData.id;

      if (!leadPhoneNumber) {
        console.log('Webhook payload did not contain a phone number to match.');
        return new NextResponse('OK - No phone number to process', { status: 200 });
      }

      const lead = await findLeadByPhoneNumber(leadPhoneNumber);
      const callDate = callData.started_at ? new Date(callData.started_at).toISOString() : new Date().toISOString();
      const minutes = Math.floor(callData.duration / 60);
      const seconds = callData.duration % 60;
      const duration = `${minutes}m ${seconds}s`;
      
      if (!lead) {
          console.log(`No lead found for phone number: ${leadPhoneNumber}. Logging to unmatched activities.`);

          let notes = `Unmatched call from ${leadPhoneNumber}. Call with ${callData.direction} direction. Outcome: ${callData.status}. Duration: ${duration}.`;
          if (callData.transcription?.content) {
            const transcriptContent = callData.transcription.content;
            if (typeof transcriptContent === 'string') {
              notes += `\n\nTranscript:\n${transcriptContent}`;
            } else if (typeof transcriptContent === 'object' && Array.isArray(transcriptContent.utterances)) {
              notes += `\n\nTranscript:\n${transcriptContent.utterances.map((u: any) => `${u.speaker}: ${u.text}`).join('\n')}`;
            }
          }

          await logUnmatchedActivity({
              type: 'Call',
              notes: notes,
              date: callDate,
              duration: duration,
              callId: callId.toString(),
          });
          return new NextResponse('Webhook processed for unmatched activity', { status: 200 });
      }

      // Find existing activity for this call
      const existingActivity = await findActivityByCallId(lead.id, callId.toString());


      let notes = `Call with ${callData.direction} direction. Outcome: ${callData.status}. Duration: ${duration}.`;
      if (callData.comments && callData.comments.length > 0) {
          notes += ` Notes: ${callData.comments.map((c: any) => c.content).join(' ') || 'N/A'}`;
      }
      if (callData.tags && callData.tags.length > 0) {
         notes += ` Tags: ${callData.tags.map((t: any) => t.name).join(', ')}`;
      }
      if (callData.transcription?.content) {
        const transcriptContent = callData.transcription.content;
        if (typeof transcriptContent === 'string') {
          notes += `\n\nTranscript:\n${transcriptContent}`;
        } else if (typeof transcriptContent === 'object' && Array.isArray(transcriptContent.utterances)) {
          notes += `\n\nTranscript:\n${transcriptContent.utterances.map((u: any) => `${u.speaker}: ${u.text}`).join('\n')}`;
        }
      }

      if (existingActivity) {
          // Update the existing activity
          await updateActivity(lead.id, existingActivity.id, { notes });
          console.log(`Successfully updated activity for lead ${lead.id} and call ${callId}`);
      } else {
          // Create a new activity
          await logActivity(lead.id, {
              type: 'Call',
              notes: notes,
              duration: duration,
              callId: callId.toString(),
              date: callDate,
          });
          console.log(`Successfully logged new activity for lead ${lead.id} and call ${callId}`);
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
