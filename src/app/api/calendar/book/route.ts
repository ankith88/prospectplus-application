import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { firestore as db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { addMinutes, format } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { bookingUrlId, amId, slot, meetingType } = await req.json();

    if (!bookingUrlId || !amId || !slot || !meetingType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Get Lead Info
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('bookingUrlId', '==', bookingUrlId));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
    }
    
    const leadDoc = snap.docs[0];
    const lead = leadDoc.data() as Lead;
    const leadId = leadDoc.id;

    // 2. Get AM Info
    const userRef = doc(db, 'users', amId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'Account Manager not found' }, { status: 404 });
    }
    const amUser = userSnap.data() as UserProfile;

    if (!amUser.microsoftRefreshToken) {
      return NextResponse.json({ error: 'Account Manager has not connected their calendar' }, { status: 400 });
    }

    // 3. Create Event in Microsoft Graph
    const client = await getGraphClient(amId);
    const startDate = new Date(slot);
    const endDate = addMinutes(startDate, 30);

    const event = {
      subject: `Discussion: ${lead.companyName} / ${amUser.displayName}`,
      body: {
        contentType: 'HTML',
        content: `Booking scheduled via ProspectPlus.<br>Lead: ${lead.companyName}<br>Meeting Type: ${meetingType === 'teams' ? 'Microsoft Teams' : 'Phone Call'}`
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC'
      },
      attendees: [
        {
          emailAddress: {
            address: lead.contacts?.[0]?.email || '',
            name: lead.companyName || ''
          },
          type: 'required'
        }
      ],
      isOnlineMeeting: meetingType === 'teams',
      onlineMeetingProvider: meetingType === 'teams' ? 'teamsForBusiness' : 'unknown'
    };

    const createdEvent = await client.api('/me/events').post(event);

    // 4. Update Firestore Lead Document
    const appointmentData = {
      id: `apt-${Date.now()}`,
      date: startDate.toISOString(),
      amId: amId,
      amName: amUser.displayName,
      type: meetingType,
      eventId: createdEvent.id,
      joinUrl: createdEvent.onlineMeeting?.joinUrl || ''
    };

    await updateDoc(doc(db, 'leads', leadId), {
      appointments: arrayUnion(appointmentData)
    });

    return NextResponse.json({ success: true, appointment: appointmentData });

  } catch (error: any) {
    console.error('API Error (Booking):', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
