import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { bookingUrlId, amId, slot, meetingType } = await req.json();

    if (!bookingUrlId || !amId || !slot || !meetingType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Get Lead Info
    const db = adminApp.firestore();
    const leadsRef = db.collection('leads');
    const snap = await leadsRef.where('bookingUrlId', '==', bookingUrlId).get();
    
    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
    }
    const leadDoc = snap.docs[0];
    const lead = leadDoc.data() as Lead;
    const leadId = leadDoc.id;
    
    let contactName = lead.companyName;
    let contactEmail = '';

    if (lead.bookingContactId) {
      const contactRef = db.collection('leads').doc(leadId).collection('contacts').doc(lead.bookingContactId);
      const contactSnap = await contactRef.get();
      if (contactSnap.exists) {
        const contactData = contactSnap.data();
        contactName = contactData?.name || lead.companyName;
        contactEmail = contactData?.email || '';
      }
    }

    // 2. Get AM Info
    const userRef = db.collection('users').doc(amId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
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
    const amUserDisplayName = amUser.displayName || [amUser.firstName, amUser.lastName].filter(Boolean).join(' ') || 'Account Manager';

    const event = {
      subject: `${lead.companyName} / ${amUserDisplayName}`,
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
            address: contactEmail,
            name: contactName
          },
          type: 'required'
        }
      ],
      isOnlineMeeting: meetingType === 'teams',
      onlineMeetingProvider: meetingType === 'teams' ? 'teamsForBusiness' : 'unknown'
    };

    const createdEvent = await client.api('/me/events').post(event);

    // Explicitly send a confirmation email via ProspectPlus dispatcher
    let emailHtml = '';
    if (contactEmail) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Your Appointment is Confirmed</h2>
          <p>Hi ${contactName},</p>
          <p>This email is to confirm your upcoming appointment with <strong>${amUserDisplayName}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #005A9C; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Date & Time:</strong> ${format(startDate, 'PPp')} (UTC)</p>
            <p style="margin: 0;"><strong>Meeting Type:</strong> ${meetingType === 'teams' ? 'Microsoft Teams' : 'Phone Call'}</p>
          </div>
          ${meetingType === 'teams' && createdEvent.onlineMeeting?.joinUrl ? `<p><a href="${createdEvent.onlineMeeting.joinUrl}" style="background-color: #005A9C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Join Microsoft Teams Meeting</a></p>` : ''}
          
          <h3 style="margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Account Manager Details</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${amUserDisplayName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${amUser.email}</p>
          <p style="margin: 5px 0;"><strong>Mobile:</strong> ${amUser.phoneNumber || 'Not provided'}</p>

          <p style="margin-top: 25px;">We look forward to speaking with you!</p>
          <p>Best regards,<br>${amUserDisplayName}</p>
        </div>
      `;

      await sendPhysicalEmail({
        to: contactEmail,
        subject: `${lead.companyName} / ${amUserDisplayName}`,
        html: emailHtml,
        customFrom: amUser.email,
        cc: amUser.email
      });
    }

    // 4. Update Firestore Lead Document
    const appointmentData = {
      id: `apt-${Date.now()}`,
      date: startDate.toISOString(),
      amId: amId,
      amName: amUserDisplayName,
      type: meetingType,
      eventId: createdEvent.id,
      joinUrl: createdEvent.onlineMeeting?.joinUrl || ''
    };

    const timelineEntry = {
      id: `act-${Date.now()}`,
      type: 'outcome',
      outcome: 'Appointment Booked',
      notes: `Appointment scheduled via ProspectPlus for ${format(startDate, 'PPp')} (${meetingType})`,
      timestamp: new Date().toISOString(),
      userDisplayName: 'ProspectPlus Booking',
    };

    const updates: any = {
      appointments: FieldValue.arrayUnion(appointmentData),
      outcome: 'Appointment Booked',
      status: 'Qualified',
      lastOutcomeAt: new Date().toISOString(),
      timeline: FieldValue.arrayUnion(timelineEntry)
    };

    if (contactEmail && emailHtml) {
      updates.emails = FieldValue.arrayUnion({
        id: `email-${Date.now()}`,
        subject: `${lead.companyName} / ${amUserDisplayName}`,
        bodyHtml: emailHtml,
        sentAt: new Date().toISOString(),
        sender: amUser.email,
        recipient: contactEmail,
        status: 'Sent'
      });
    }

    await db.collection('leads').doc(leadId).update(updates);

    return NextResponse.json({ success: true, appointment: appointmentData });

  } catch (error: any) {
    console.error('API Error (Booking):', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
