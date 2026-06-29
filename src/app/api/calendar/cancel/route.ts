import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { bookingUrlId, appointmentId } = await req.json();

    if (!bookingUrlId || !appointmentId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const db = adminApp.firestore();
    
    // 1. Find the lead matching bookingUrlId
    const leadsRef = db.collection('leads');
    const snap = await leadsRef.where('bookingUrlId', '==', bookingUrlId).get();
    
    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
    }
    const leadDoc = snap.docs[0];
    const leadId = leadDoc.id;

    // 2. Find the appointment
    const apptRef = db.collection('leads').doc(leadId).collection('appointments').doc(appointmentId);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    const apptData = apptSnap.data();

    const amId = apptData?.amId;
    const eventId = apptData?.eventId;

    // 3. Delete from Microsoft Graph if it exists
    if (amId && eventId) {
      try {
        const client = await getGraphClient(amId);
        await client.api(`/me/events/${eventId}`).delete();
        console.log(`Successfully deleted calendar event: ${eventId}`);
      } catch (err: any) {
        console.error("Failed to delete event from Microsoft Graph:", err);
        // Log the error but still proceed to update Firestore so state remains consistent
      }
    }

    // 4. Update the appointment status to Cancelled in the subcollection
    await apptRef.update({
      appointmentStatus: 'Cancelled',
      updatedAt: new Date().toISOString()
    });

    // 5. Update the main lead document
    const timelineEntry = {
      id: `act-${Date.now()}`,
      type: 'outcome',
      outcome: 'Appointment Cancelled',
      notes: `Appointment for ${apptData?.date || 'unknown date'} has been cancelled.`,
      timestamp: new Date().toISOString(),
      userDisplayName: 'ProspectPlus Booking',
    };

    // Update the appointments array in the lead doc too
    const leadData = leadDoc.data();
    const updatedAppointments = (leadData.appointments || []).map((appt: any) => {
      if (appt.id === appointmentId) {
        return {
          ...appt,
          appointmentStatus: 'Cancelled',
          updatedAt: new Date().toISOString()
        };
      }
      return appt;
    });

    await db.collection('leads').doc(leadId).update({
      appointments: updatedAppointments,
      outcome: 'Appointment Cancelled',
      lastOutcomeAt: new Date().toISOString(),
      timeline: FieldValue.arrayUnion(timelineEntry)
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API Error (Cancellation):', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
