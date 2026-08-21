import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { addMinutes } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const {
      action = 'create',
      userId,
      userEmail,
      title,
      dueDate,
      durationMinutes = 30,
      leadId,
      leadName,
      outlookEventId,
    } = await req.json();

    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Missing required parameters: userId and userEmail' }, { status: 400 });
    }

    // 1. Check if user email ends with @mailplus.com.au
    const cleanEmail = String(userEmail).trim().toLowerCase();
    if (!cleanEmail.endsWith('@mailplus.com.au')) {
      return NextResponse.json({
        synced: false,
        reason: 'User email is not from domain @mailplus.com.au',
      });
    }

    // 2. Check if user has connected Outlook (has microsoftRefreshToken in Firestore)
    const db = adminApp.firestore();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ synced: false, reason: 'User not found' });
    }

    const userData = userSnap.data();
    if (!userData?.microsoftRefreshToken) {
      return NextResponse.json({
        synced: false,
        reason: 'User has not connected Outlook calendar',
      });
    }

    // 3. Obtain Graph Client
    const client = await getGraphClient(userId);

    if (action === 'delete') {
      if (outlookEventId) {
        try {
          await client.api(`/me/events/${outlookEventId}`).delete();
          console.log(`Deleted Outlook event: ${outlookEventId}`);
        } catch (err: any) {
          console.error(`Failed to delete Outlook event ${outlookEventId}:`, err);
        }
      }
      return NextResponse.json({ success: true, synced: true });
    }

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Missing required parameters: title and dueDate' }, { status: 400 });
    }

    const startDate = new Date(dueDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dueDate format' }, { status: 400 });
    }

    const duration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : 30;
    const endDate = addMinutes(startDate, duration);

    const eventPayload = {
      subject: `Task: ${title}`,
      body: {
        contentType: 'HTML',
        content: `<b>Task Reminder (ProspectPlus)</b><br><br><b>Title:</b> ${title}${
          leadName ? `<br><b>Lead:</b> ${leadName}` : ''
        }${leadId ? `<br><b>Lead ID:</b> ${leadId}` : ''}`,
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC',
      },
      showAs: 'busy', // Blocks out calendar time for task!
    };

    if (action === 'update' && outlookEventId) {
      try {
        await client.api(`/me/events/${outlookEventId}`).patch(eventPayload);
        return NextResponse.json({ success: true, synced: true, outlookEventId });
      } catch (err: any) {
        console.warn(`Failed to update event ${outlookEventId}, creating new event instead:`, err);
        // Fallthrough to create new event if update fails
      }
    }

    // Create new Outlook calendar event
    const createdEvent = await client.api('/me/events').post(eventPayload);
    return NextResponse.json({
      success: true,
      synced: true,
      outlookEventId: createdEvent.id,
    });
  } catch (error: any) {
    console.error('Error in Outlook task sync endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', synced: false },
      { status: 500 }
    );
  }
}
