

'use server';

/**
 * @fileoverview API route to handle webhooks from AirCall using a secret URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { logActivity, findActivityByCallId, updateActivity, logTranscriptActivity } from '@/services/firebase';
import type { Lead, Activity } from '@/lib/types';

/**
 * Finds a lead in Firestore by a given phone number.
 * @param {string} phoneNumber The phone number to search for.
 * @returns {Promise<Lead | null>} The found lead or null.
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<{ id: string, data: Lead } | null> {
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
        return { id: doc.id, data: doc.data() as Lead };
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

    const callData = data.data;
    const callId = callData.id?.toString();
    const author = callData.user?.name || 'Unknown User';

    // Event: transcription.created
    if (data.event === 'call.transcription.created') {
        const phoneNumber = callData.raw_digits;
        const transcriptContent = callData.transcription?.content?.utterances;

        if (!phoneNumber || !transcriptContent) {
            console.log('Webhook for transcription.created missing phone number or content.');
            return new NextResponse('OK - Missing data', { status: 200 });
        }
        
        const leadInfo = await findLeadByPhoneNumber(phoneNumber);

        if (leadInfo) {
            await logTranscriptActivity(leadInfo.id, {
                content: JSON.stringify(transcriptContent),
                author: author,
                callId: callId,
                phoneNumber: phoneNumber
            });
            console.log(`Transcript for call ID ${callId} logged to lead ${leadInfo.id}.`);
        } else {
            console.log(`No lead found for number ${phoneNumber}, skipping transcript for call ID ${callId}.`);
            // Optionally, log to a collection for unmatched transcripts
        }

        return new NextResponse('Webhook processed for transcription.created', { status: 200 });
    }

    // Events: call.ended, call.commented, call.tagged
    if (data.event === 'call.ended' || data.event === 'call.commented' || data.event === 'call.tagged') {
      const leadPhoneNumber = callData.raw_digits;

      if (!leadPhoneNumber) {
        console.log('Webhook payload did not contain a phone number to match.');
        return new NextResponse('OK - No phone number to process', { status: 200 });
      }

      const leadInfo = await findLeadByPhoneNumber(leadPhoneNumber);
      const callDate = callData.started_at ? new Date(callData.started_at * 1000).toISOString() : new Date().toISOString();
      const minutes = Math.floor(callData.duration / 60);
      const seconds = callData.duration % 60;
      const duration = `${minutes}m ${seconds}s`;
      
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
          const formattedTranscript = transcriptContent.utterances.map((u: any) => `${u.speaker}: ${u.text}`).join('\n');
          notes += `\n\nTranscript:\n${formattedTranscript}`;
        }
      }
      
      const activityData: Partial<Activity> = {
        type: 'Call',
        notes: notes,
        duration: duration,
        callId: callId.toString(),
        date: callDate,
        author: author, // Ensure author is always included
      };

      if (!leadInfo) {
          console.log(`No lead found for phone number: ${leadPhoneNumber}. Ignoring activity.`);
          return new NextResponse('OK - No matching lead found', { status: 200 });
      }

      // Find existing activity for this call
      const existingActivity = await findActivityByCallId(leadInfo.id, callId.toString());

      if (existingActivity) {
          // Update the existing activity
          await updateActivity(leadInfo.id, existingActivity.id, activityData);
          console.log(`Successfully updated activity for lead ${leadInfo.id} and call ${callId}`);
      } else {
          // Create a new activity
          await logActivity(leadInfo.id, activityData);
          console.log(`Successfully logged new activity for lead ${leadInfo.id} and call ${callId}`);
      }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
