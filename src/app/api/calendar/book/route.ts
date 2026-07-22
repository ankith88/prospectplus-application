import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { formatInTimezone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { bookingUrlId, amId, slot, meetingType, rescheduleAppointmentId, firstName, lastName, phone, email } = await req.json();

    if (!bookingUrlId || !amId || !slot || !meetingType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Get Lead Info
    const db = adminApp.firestore();
    const leadsRef = db.collection('leads');
    let snap = await leadsRef.where('bookingUrlId', '==', bookingUrlId).get();
    let isGeneralBooking = false;
    
    if (snap.empty) {
      snap = await leadsRef.where('generalBookingUrlId', '==', bookingUrlId).get();
      if (snap.empty) {
        return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
      }
      isGeneralBooking = true;
    }
    const leadDoc = snap.docs[0];
    const lead = leadDoc.data() as Lead;
    const leadId = leadDoc.id;
    
    let contactName = lead.companyName;
    let contactEmail = lead.customerServiceEmail || '';

    if (isGeneralBooking) {
      if (!firstName || !lastName || !email) {
        return NextResponse.json({ error: 'Missing required contact fields: first name, last name, and email' }, { status: 400 });
      }
      const contactsRef = db.collection('leads').doc(leadId).collection('contacts');
      const cleanEmail = email.trim().toLowerCase();
      const existingContactSnap = await contactsRef.where('email', '==', cleanEmail).limit(1).get();
      
      if (!existingContactSnap.empty) {
        const contactData = existingContactSnap.docs[0].data();
        contactName = contactData.name || `${firstName} ${lastName}`.trim();
        contactEmail = contactData.email || cleanEmail;
      } else {
        const newContactRef = contactsRef.doc();
        contactName = `${firstName} ${lastName}`.trim();
        contactEmail = cleanEmail;
        await newContactRef.set({
          id: newContactRef.id,
          name: contactName,
          email: contactEmail,
          phone: phone || '',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      if (lead.bookingContactId) {
        const contactRef = db.collection('leads').doc(leadId).collection('contacts').doc(lead.bookingContactId);
        const contactSnap = await contactRef.get();
        if (contactSnap.exists) {
          const contactData = contactSnap.data();
          contactName = contactData?.name || lead.companyName;
          contactEmail = contactData?.email || contactEmail;
        }
      }

      if (!contactEmail) {
        const contactsSnap = await db.collection('leads').doc(leadId).collection('contacts').limit(1).get();
        if (!contactsSnap.empty) {
          const contactData = contactsSnap.docs[0].data();
          contactName = contactData.name || lead.companyName;
          contactEmail = contactData.email || '';
        }
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
    const durationMinutes = amUser.defaultMeetingDurationMinutes || 30;
    const endDate = addMinutes(startDate, durationMinutes);
    const amUserDisplayName = amUser.displayName || [amUser.firstName, amUser.lastName].filter(Boolean).join(' ') || 'Account Manager';

    const meetingSubject = `${lead.companyName} x ${amUserDisplayName}`;

    const event = {
      subject: meetingSubject,
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

    const amTz = amUser.timezone || 'Australia/Sydney';
    const formattedDate = formatInTimezone(startDate, amTz, { dateStyle: 'long', timeStyle: 'short' });
    const tzName = new Intl.DateTimeFormat('en-AU', {
      timeZone: amTz,
      timeZoneName: 'short'
    }).formatToParts(startDate).find(p => p.type === 'timeZoneName')?.value || '';
    const formattedDateTimeStr = `${formattedDate} ${tzName}`.trim();

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.com.au';
    const newAppointmentId = `apt-${Date.now()}`;
    const rescheduleUrl = `${origin}/book/${bookingUrlId}?reschedule=${newAppointmentId}`;

    // Explicitly send a confirmation email via ProspectPlus dispatcher
    let emailHtml = '';
    const customerEntityId = (lead as any).customerEntityId || lead.entityId || '';
    if (contactEmail) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <h2 style="margin: 0;">Your Appointment is Confirmed</h2>
              </td>
              <td align="right" valign="top">
                ${customerEntityId ? `<span style="font-size: 12px; color: #888; font-weight: bold; background-color: #f0f4f8; padding: 4px 8px; border-radius: 4px; display: inline-block;">ID: ${customerEntityId}</span>` : ''}
              </td>
            </tr>
          </table>
          <p style="margin-top: 20px;">Hi ${contactName},</p>
          <p>This email is to confirm your upcoming appointment with <strong>${amUserDisplayName}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #005A9C; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Date & Time:</strong> ${formattedDateTimeStr}</p>
            <p style="margin: 0;"><strong>Meeting Type:</strong> ${meetingType === 'teams' ? 'Microsoft Teams' : 'Phone Call'}</p>
          </div>
          ${meetingType === 'teams' && createdEvent.onlineMeeting?.joinUrl ? `<p><a href="${createdEvent.onlineMeeting.joinUrl}" style="background-color: #005A9C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Join Microsoft Teams Meeting</a></p>` : ''}
          
          <h3 style="margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Account Manager Details</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${amUserDisplayName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${amUser.email}</p>
          <p style="margin: 5px 0;"><strong>Mobile:</strong> ${amUser.phoneNumber || 'Not provided'}</p>

          <p style="margin-top: 25px;">We look forward to speaking with you!</p>
          <p>Best regards,<br>${amUserDisplayName}</p>
          
          <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
            <p>Need to change your appointment?</p>
            <p><a href="${rescheduleUrl}" style="color: #005A9C; text-decoration: underline;">Reschedule or Cancel</a></p>
          </div>
        </div>
      `;

      await sendPhysicalEmail({
        to: contactEmail,
        subject: meetingSubject,
        html: emailHtml,
        customFrom: amUser.email,
        cc: amUser.email
      });
    }

    // 4. Update Firestore Lead Document and Subcollection
    const appointmentData = {
      id: newAppointmentId,
      date: startDate.toISOString(),
      amId: amId,
      amName: amUserDisplayName,
      type: meetingType,
      eventId: createdEvent.id,
      joinUrl: createdEvent.onlineMeeting?.joinUrl || '',
      appointmentStatus: 'Pending',
      createdAt: new Date().toISOString(),
      timezone: amTz,
      notes: ''
    };

    if (rescheduleAppointmentId) {
      try {
        const oldApptRef = db.collection('leads').doc(leadId).collection('appointments').doc(rescheduleAppointmentId);
        const oldApptSnap = await oldApptRef.get();
        if (oldApptSnap.exists) {
          const oldApptData = oldApptSnap.data();
          if (oldApptData?.eventId) {
            const oldEventClient = await getGraphClient(oldApptData.amId || amId);
            await oldEventClient.api(`/me/events/${oldApptData.eventId}`).delete();
            console.log(`Successfully deleted old calendar event: ${oldApptData.eventId}`);
          }
        }
      } catch (err) {
        console.error("Failed to delete old Microsoft Graph event during reschedule:", err);
      }

      // Mark old appointment as rescheduled
      await db.collection('leads').doc(leadId).collection('appointments').doc(rescheduleAppointmentId).update({
        appointmentStatus: 'Rescheduled',
        updatedAt: new Date().toISOString()
      }).catch(e => console.error("Failed to update old appointment", e));
    }

    // Create new appointment in subcollection
    await db.collection('leads').doc(leadId).collection('appointments').doc(newAppointmentId).set(appointmentData);

    const timelineEntry = {
      id: `act-${Date.now()}`,
      type: 'outcome',
      outcome: rescheduleAppointmentId ? 'Appointment Rescheduled' : 'Appointment Booked',
      notes: `Appointment ${rescheduleAppointmentId ? 'rescheduled' : 'scheduled'} via ProspectPlus for ${formattedDateTimeStr} (${meetingType})`,
      timestamp: new Date().toISOString(),
      userDisplayName: 'ProspectPlus Booking',
    };

    const updates: any = {
      appointments: FieldValue.arrayUnion(appointmentData),
      outcome: rescheduleAppointmentId ? 'Appointment Rescheduled' : 'Appointment Booked',
      status: 'Qualified',
      lastOutcomeAt: new Date().toISOString(),
      timeline: FieldValue.arrayUnion(timelineEntry)
    };

    if (contactEmail && emailHtml) {
      updates.emails = FieldValue.arrayUnion({
        id: `email-${Date.now()}`,
        subject: meetingSubject,
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
