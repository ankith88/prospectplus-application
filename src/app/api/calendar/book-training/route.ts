import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date, // e.g. "2026-08-20" or ISO string
      timeSlot, // e.g. "10:00 AM"
      franchiseeName,
      userEmail,
      userName,
      userId,
      notes,
      additionalEmails
    } = body;

    // Process additional attendee emails
    let parsedAdditionalEmails: string[] = [];
    if (Array.isArray(additionalEmails)) {
      parsedAdditionalEmails = additionalEmails
        .map((e: any) => String(e).trim().toLowerCase())
        .filter((e: string) => e.includes('@') && e !== userEmail.toLowerCase());
    } else if (typeof additionalEmails === 'string' && additionalEmails.trim()) {
      parsedAdditionalEmails = additionalEmails
        .split(/[,;\s]+/)
        .map((e: string) => e.trim().toLowerCase())
        .filter((e: string) => e.includes('@') && e !== userEmail.toLowerCase());
    }
    parsedAdditionalEmails = Array.from(new Set(parsedAdditionalEmails));

    if (!date || !timeSlot || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required booking details (date, timeSlot, userEmail)' },
        { status: 400 }
      );
    }

    const db = adminApp.firestore();

    // 1. Generate Teams Meeting Join URL & Appointment IDs
    const apptId = `appt-training-${Date.now()}`;
    const parentId = userId || 'training-sessions';
    const teamsMeetingId = `teams-training-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const teamsJoinUrl = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${teamsMeetingId}%40thread.v2/0?context=%7b%22Tid%22%3a%22mailplus-training%22%7d`;

    // Calculate full dates & times for iCalendar (.ics) export
    const dateObj = new Date(date);
    const formattedDate = format(dateObj, 'EEEE, d MMMM yyyy');
    const isoDueDate = dateObj.toISOString();

    // Parse timeSlot string (e.g., "10:00 AM")
    let hours = 10;
    let minutes = 0;
    if (typeof timeSlot === 'string' && timeSlot.includes(':')) {
      const parts = timeSlot.split(' ');
      const timeParts = parts[0].split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10) || 0;
      if (parts[1] && parts[1].toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (parts[1] && parts[1].toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    const startDateTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hours, minutes, 0);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min duration

    const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStartStr = formatIcsDate(startDateTime);
    const dtEndStr = formatIcsDate(endDateTime);
    const dtStampStr = formatIcsDate(new Date());

    // 2. Store Appointment Document in dedicated training_sessions collection (NOT in leads collection)
    const apptRef = db.collection('training_sessions').doc(parentId).collection('appointments').doc(apptId);

    const apptData = {
      id: apptId,
      leadId: `training-${parentId}`,
      leadName: `Teams Training Session with Aleyna (${franchiseeName || 'Franchisee'})`,
      assignedTo: 'Aleyna Harnett',
      duedate: isoDueDate,
      starttime: timeSlot,
      appointmentDate: format(new Date(), 'dd/MM/yyyy'),
      appointmentStatus: 'Pending',
      type: 'Teams Training Session',
      meetingType: 'teams',
      isTeams: true,
      isTraining: true,
      joinUrl: teamsJoinUrl,
      franchisee: franchiseeName || 'Franchisee Territory',
      franchiseeUserId: userId || '',
      franchiseeEmail: userEmail,
      franchiseeUserName: userName || 'Franchisee',
      notes: notes || '1-on-1 ProspectPlus Training Session with Aleyna Harnett via Microsoft Teams',
      additionalEmails: parsedAdditionalEmails,
      reminderEmailSent: false,
      createdAt: new Date().toISOString()
    };

    await apptRef.set(apptData);

    // 3. Build iCalendar (.ics) Event File String
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MailPlus Australia//ProspectPlus Training//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${apptId}@prospectplus.mailplus.com.au`,
      `DTSTAMP:${dtStampStr}`,
      `DTSTART:${dtStartStr}`,
      `DTEND:${dtEndStr}`,
      `SUMMARY:ProspectPlus 1-on-1 Training Session with Aleyna`,
      `DESCRIPTION:1-on-1 ProspectPlus Training Session with Aleyna Harnett via Microsoft Teams.\\n\\nTeams Meeting Link: ${teamsJoinUrl}${notes ? `\\n\\nNotes: ${notes.replace(/\n/g, ' ')}` : ''}`,
      `LOCATION:${teamsJoinUrl}`,
      'ORGANIZER;CN="Aleyna Harnett":mailto:aleyna.harnett@mailplus.com.au',
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${userName || 'Franchisee'}":mailto:${userEmail}`,
      'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="Aleyna Harnett":mailto:aleyna.harnett@mailplus.com.au',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const icsBase64 = Buffer.from(icsContent).toString('base64');
    const icsDataUri = `data:text/calendar;charset=utf-8;base64,${icsBase64}`;

    // Direct Calendar URLs
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('ProspectPlus Training Session with Aleyna')}&dates=${dtStartStr}/${dtEndStr}&details=${encodeURIComponent(`1-on-1 ProspectPlus Training Session via Microsoft Teams.\n\nMeeting Link: ${teamsJoinUrl}`)}&location=${encodeURIComponent(teamsJoinUrl)}`;
    const outlookCalUrl = `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodeURIComponent('ProspectPlus Training Session with Aleyna')}&startdt=${startDateTime.toISOString()}&enddt=${endDateTime.toISOString()}&body=${encodeURIComponent(`1-on-1 ProspectPlus Training Session via Microsoft Teams.\n\nMeeting Link: ${teamsJoinUrl}`)}&location=${encodeURIComponent(teamsJoinUrl)}`;

    // 4. Send Confirmation Email with ICS Attachment & Calendar Links
    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Session Confirmed</title>
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
              <h2 style="margin: 0 0 16px; color: #095c7b; font-size: 20px; font-weight: 700;">
                Training Session Confirmed! 🎯
              </h2>
              <p style="margin: 0 0 20px; color: #4a5568;">
                Hi <strong>${userName || 'Franchisee'}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #4a5568;">
                Your 1-on-1 ProspectPlus training session with <strong>Aleyna Harnett</strong> has been successfully booked via <strong>Microsoft Teams</strong>. An <strong>iCalendar (.ics) invite</strong> is attached to this email so you can automatically add it to your Outlook, Apple, or Google Calendar.
              </p>

              <!-- APPOINTMENT DETAILS BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="30%" style="color: #718096; font-size: 13px; font-weight: 600;">Date:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Time:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${timeSlot}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Meeting Platform:</td>
                        <td style="color: #095c7b; font-size: 14px; font-weight: 700;">Microsoft Teams Video Call</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Host:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 600;">Aleyna Harnett (aleyna.harnett@mailplus.com.au)</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Territory:</td>
                        <td style="color: #1a202c; font-size: 14px;">${franchiseeName || 'Franchisee Territory'}</td>
                      </tr>
                      ${
                        notes
                          ? `<tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Notes:</td>
                        <td style="color: #4a5568; font-size: 13px;">${notes}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TEAMS JOIN BUTTON & CALENDAR LINKS -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <a href="${teamsJoinUrl}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.2);">
                      Join Microsoft Teams Meeting
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #718096; font-weight: 600;">Add to Calendar:</p>
                    <a href="${googleCalUrl}" target="_blank" style="display: inline-block; background-color: #ea4335; color: #ffffff; font-weight: 600; font-size: 12px; padding: 8px 14px; border-radius: 6px; text-decoration: none; margin-right: 8px;">
                      Google Calendar
                    </a>
                    <a href="${outlookCalUrl}" target="_blank" style="display: inline-block; background-color: #0078d4; color: #ffffff; font-weight: 600; font-size: 12px; padding: 8px 14px; border-radius: 6px; text-decoration: none;">
                      Outlook Web
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #718096; font-size: 13px;">
                This appointment has been added to your ProspectPlus Franchisee Home calendar. You will also receive an automated reminder email on the morning of your appointment.
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

    // Send confirmation to franchisee, Aleyna, and additional attendees with .ics attachment
    const recipients = Array.from(new Set([userEmail, 'aleyna.harnett@mailplus.com.au', ...parsedAdditionalEmails].filter(Boolean)));
    await sendPhysicalEmail({
      to: recipients.join(','),
      subject: `Confirmed: ProspectPlus Training Session with Aleyna on ${formattedDate} (${timeSlot})`,
      html: confirmationHtml,
      attachments: [
        {
          name: 'training-session.ics',
          url: icsDataUri
        }
      ]
    }).catch((err) => console.error('Failed to send booking confirmation email:', err));

    return NextResponse.json({
      success: true,
      appointment: apptData,
      joinUrl: teamsJoinUrl
    });
  } catch (error: any) {
    console.error('Error booking training session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to book training session' },
      { status: 500 }
    );
  }
}
