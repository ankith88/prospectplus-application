
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { 
    findLeadByPhoneNumberServer, 
    logActivityServer, 
    logTranscriptActivityServer,
    createUserNotificationServer 
} from '@/services/firebase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    console.warn(`[Webhook] Invalid secret: ${secret}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    const event = data.event;
    const callData = data.data;
    const callId = callData.id?.toString();
    const userEmail = callData.user?.email;
    const userName = callData.user?.name || 'Unknown User';

    console.log(`[Webhook] Processing event: ${event} for Call ID: ${callId}`);

    // Common Logic: Find the Lead/Company
    const phoneNumber = callData.raw_digits || callData.phone_number?.e164;
    if (!phoneNumber) {
        return new NextResponse('OK - No phone number', { status: 200 });
    }

    const match = await findLeadByPhoneNumberServer(phoneNumber);

    if (event === 'call.transcription.created') {
        const transcriptContent = callData.transcription?.content?.utterances;
        if (match && transcriptContent) {
            await logTranscriptActivityServer(match.id, match.type, {
                content: JSON.stringify(transcriptContent),
                author: userName,
                callId: callId,
                phoneNumber: phoneNumber
            });
            
            if (userEmail) {
                await createUserNotificationServer(userEmail, {
                    title: 'Transcript Synced',
                    message: `Transcript for call ${callId} is now available.`,
                    type: 'transcript_sync',
                    callId
                });
            }
        }
        return new NextResponse('OK', { status: 200 });
    }

    if (['call.ended', 'call.commented', 'call.tagged'].includes(event)) {
        const durationSec = callData.duration || 0;
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const duration = `${minutes}m ${seconds}s`;

        let notes = `Call with ${callData.direction} direction. Outcome: ${callData.status}. Duration: ${duration}.`;
        if (callData.comments?.length) {
            notes += ` Notes: ${callData.comments.map((c: any) => c.content).join(' ')}`;
        }
        if (callData.tags?.length) {
            notes += ` Tags: ${callData.tags.map((t: any) => t.name).join(', ')}`;
        }

        if (match) {
            await logActivityServer(match.id, match.type, {
                type: 'Call',
                notes,
                duration,
                callId,
                author: userName,
                date: callData.started_at ? new Date(callData.started_at * 1000).toISOString() : new Date().toISOString()
            });

            if (userEmail && event === 'call.ended') {
                await createUserNotificationServer(userEmail, {
                    title: 'Call Logged',
                    message: `Call ${callId} successfully linked to ${match.id}.`,
                    type: 'call_sync',
                    callId
                });
            }
        } else {
            console.log(`[Webhook] No match for ${phoneNumber}. Event: ${event}`);
        }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Error]', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
