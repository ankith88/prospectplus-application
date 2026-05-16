
import { NextRequest, NextResponse } from 'next/server';
import { 
    findLeadByPhoneNumberServer, 
    logActivityServer, 
    logTranscriptActivityServer,
    createUserNotificationServer 
} from '@/services/firebase-server';

/**
 * API route to handle real-time AirCall webhooks.
 * This is 100% server-side and uses the Firebase Admin SDK via firebase-server.ts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  // Next.js 15: Await asynchronous parameters
  const { secret } = await params;
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    console.warn(`[Webhook] Invalid secret attempt: ${secret}`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const data = await request.json();
    const event = data.event;
    const callData = data.data;
    const callId = callData.id?.toString();
    const userEmail = callData.user?.email;
    const userName = callData.user?.name || 'Unknown User';

    console.log(`[Webhook] Event: ${event} | Call ID: ${callId} | User: ${userEmail}`);

    const phoneNumber = callData.raw_digits || callData.phone_number?.e164;
    if (!phoneNumber) {
        console.log('[Webhook] Skipping event: No phone number in payload.');
        return new NextResponse('OK', { status: 200 });
    }

    // Use server-side matching logic
    const match = await findLeadByPhoneNumberServer(phoneNumber);

    if (event === 'call.transcription.created') {
        const utterances = callData.transcription?.content?.utterances;
        if (match && utterances) {
            await logTranscriptActivityServer(match.id, match.type, {
                content: JSON.stringify(utterances),
                author: userName,
                callId: callId,
                phoneNumber: phoneNumber
            });
            
            if (userEmail) {
                await createUserNotificationServer(userEmail, {
                    title: 'Transcript Synced',
                    message: `Transcript for call ${callId} is now available in the CRM.`,
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

        let notes = `Outcome: ${callData.status}. Duration: ${duration}. Direction: ${callData.direction}.`;
        if (callData.comments?.length) {
            notes += ` Comments: ${callData.comments.map((c: any) => c.content).join(' ')}`;
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
                    message: `AirCall ID: ${callId} successfully linked to ${match.id}.`,
                    type: 'call_sync',
                    callId
                });
            }
        } else {
            console.log(`[Webhook] No record match for ${phoneNumber}.`);
        }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Error]', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
