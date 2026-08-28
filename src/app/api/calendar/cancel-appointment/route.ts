import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { getGraphClient } from '@/services/microsoft-graph';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, leadId, reason, cancelledBy, userEmail } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId parameter' }, { status: 400 });
    }

    const db = adminApp.firestore();
    let apptDocRef: FirebaseFirestore.DocumentReference | null = null;
    let apptData: any = null;

    // 1. Search for appointment document in Firestore
    if (leadId) {
      // Check training_sessions collection first
      const parentId = leadId.startsWith('training-') ? leadId.replace('training-', '') : leadId;
      const trainingRef = db.collection('training_sessions').doc(parentId).collection('appointments').doc(appointmentId);
      const trainingSnap = await trainingRef.get();
      if (trainingSnap.exists) {
        apptDocRef = trainingRef;
        apptData = trainingSnap.data();
      } else {
        // Check leads collection
        const leadRef = db.collection('leads').doc(leadId).collection('appointments').doc(appointmentId);
        const leadSnap = await leadRef.get();
        if (leadSnap.exists) {
          apptDocRef = leadRef;
          apptData = leadSnap.data();
        } else {
          // Check companies collection
          const compRef = db.collection('companies').doc(leadId).collection('appointments').doc(appointmentId);
          const compSnap = await compRef.get();
          if (compSnap.exists) {
            apptDocRef = compRef;
            apptData = compSnap.data();
          }
        }
      }
    }

    // Fallback: search collectionGroup('appointments') if not found directly
    if (!apptDocRef) {
      const snap = await db.collectionGroup('appointments').where('id', '==', appointmentId).get();
      if (!snap.empty) {
        apptDocRef = snap.docs[0].ref;
        apptData = snap.docs[0].data();
      }
    }

    if (!apptDocRef || !apptData) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 2. Update appointment status in Firestore
    const cancellationTimestamp = new Date().toISOString();
    const cancelReasonText = reason ? reason.trim() : 'Cancelled by Franchisee User';
    const cancellerName = cancelledBy || apptData.franchiseeUserName || 'Franchisee User';

    await apptDocRef.update({
      appointmentStatus: 'Cancelled',
      cancelledAt: cancellationTimestamp,
      cancelledBy: cancellerName,
      cancelReason: cancelReasonText,
      updatedAt: cancellationTimestamp
    });

    // If appointment is tied to a standard lead document in 'leads'
    const parentDocRef = apptDocRef.parent.parent;
    if (parentDocRef && parentDocRef.parent?.id === 'leads') {
      try {
        const leadSnap = await parentDocRef.get();
        if (leadSnap.exists) {
          const leadData = leadSnap.data() || {};
          const existingAppts = leadData.appointments || [];
          const updatedAppts = existingAppts.map((a: any) =>
            a.id === appointmentId ? { ...a, appointmentStatus: 'Cancelled', cancelReason: cancelReasonText, updatedAt: cancellationTimestamp } : a
          );
          await parentDocRef.update({
            appointments: updatedAppts,
            outcome: 'Appointment Cancelled',
            lastOutcomeAt: cancellationTimestamp
          });
        }
      } catch (err) {
        console.error('Error updating parent lead document on cancellation:', err);
      }
    }

    // 3. Delete from Microsoft Graph Calendar if eventId & amId exist
    if (apptData.eventId && apptData.amId) {
      try {
        const client = await getGraphClient(apptData.amId);
        await client.api(`/me/events/${apptData.eventId}`).delete();
        console.log(`Successfully deleted Microsoft Graph event: ${apptData.eventId}`);
      } catch (err: any) {
        console.error('Failed to delete event from Microsoft Graph:', err);
      }
    }

    // 4. Send Cancellation Email Notification & iCalendar (METHOD:CANCEL) export
    const dateVal = apptData.duedate || apptData.createdAt;
    const startDateTime = dateVal ? new Date(dateVal) : new Date();
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
    const formattedDate = !isNaN(startDateTime.getTime())
      ? new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Sydney',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(startDateTime)
      : 'Scheduled Date';
    const timeSlot = apptData.starttime || apptData.timeSlot || 'Scheduled Time';
    const leadName = apptData.leadName || 'ProspectPlus Session';
    const franchiseeTerritory = apptData.franchisee || apptData.franchiseeName || 'Franchisee Territory';

    const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStartStr = formatIcsDate(startDateTime);
    const dtEndStr = formatIcsDate(endDateTime);
    const dtStampStr = formatIcsDate(new Date());

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MailPlus Australia//ProspectPlus Training//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:CANCEL',
      'BEGIN:VEVENT',
      `UID:${appointmentId}@prospectplus.mailplus.com.au`,
      `DTSTAMP:${dtStampStr}`,
      `DTSTART:${dtStartStr}`,
      `DTEND:${dtEndStr}`,
      `SUMMARY:CANCELLED: ${leadName}`,
      `DESCRIPTION:This appointment has been cancelled by ${cancellerName}.\\n\\nReason: ${cancelReasonText}`,
      'ORGANIZER;CN="Aleyna Harnett":mailto:aleyna.harnett@mailplus.com.au',
      'STATUS:CANCELLED',
      'SEQUENCE:1',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const icsBase64 = Buffer.from(icsContent).toString('base64');
    const icsDataUri = `data:text/calendar;charset=utf-8;base64,${icsBase64}`;

    // Build email notification strictly following Project Email Formatting Rules
    const cancellationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- BRAND BANNER -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding: 30px 25px; color: #2d3748; font-size: 15px; line-height: 1.6;">
              <h2 style="margin: 0 0 16px; color: #c53030; font-size: 20px; font-weight: 700;">
                Appointment Cancelled ❌
              </h2>
              <p style="margin: 0 0 20px; color: #4a5568;">
                Hi <strong>Aleyna & Team</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #4a5568;">
                The following booked appointment has been <strong>cancelled</strong> by <strong>${cancellerName}</strong>.
              </p>

              <!-- APPOINTMENT DETAILS BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff5f5; border-radius: 8px; border: 1px solid #feb2b2; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="32%" style="color: #718096; font-size: 13px; font-weight: 600;">Session / Lead:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${leadName}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Original Date:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Original Time:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${timeSlot}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Territory:</td>
                        <td style="color: #1a202c; font-size: 14px;">${franchiseeTerritory}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Cancelled By:</td>
                        <td style="color: #c53030; font-size: 14px; font-weight: 700;">${cancellerName}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Reason:</td>
                        <td style="color: #4a5568; font-size: 13px; font-style: italic;">${cancelReasonText}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #718096; font-size: 13px;">
                An updated <strong>iCalendar (.ics) cancellation request</strong> is attached to this email so your calendar will automatically remove or mark this event as cancelled.
              </p>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const recipientsList = [
      'aleyna.harnett@mailplus.com.au',
      userEmail || apptData.franchiseeEmail,
      ...(apptData.additionalEmails || [])
    ].filter(Boolean);

    const recipients = Array.from(new Set(recipientsList.map((e: string) => e.toLowerCase())));

    await sendPhysicalEmail({
      to: recipients.join(','),
      subject: `Cancelled: ProspectPlus Appointment - ${leadName} on ${formattedDate}`,
      html: cancellationHtml,
      attachments: [
        {
          name: 'cancel-appointment.ics',
          url: icsDataUri
        }
      ]
    }).catch((err) => console.error('Failed to send cancellation email notification:', err));

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully. Aleyna and participants have been notified.'
    });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
