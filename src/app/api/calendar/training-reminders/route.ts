import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = adminApp.firestore();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

    // Query collectionGroup for appointments
    const snapshot = await db.collectionGroup('appointments').get();
    let sentCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!data) continue;

      const isAleynaAppt =
        data.assignedTo === 'Aleyna Harnett' ||
        data.type === 'Teams Training Session' ||
        data.isTeams === true;

      if (!isAleynaAppt) continue;
      if (data.reminderEmailSent === true) continue;
      if (data.appointmentStatus === 'Cancelled' || data.appointmentStatus === 'Completed') continue;

      // Check date
      const apptDateStr = data.duedate
        ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(data.duedate))
        : '';
      const isToday = apptDateStr === todayStr;

      if (isToday && (data.franchiseeEmail || data.customerServiceEmail)) {
        const recipientEmail = data.franchiseeEmail || data.customerServiceEmail;
        const recipientName = data.franchiseeUserName || 'Franchisee';
        const formattedDate = data.duedate
          ? new Intl.DateTimeFormat('en-AU', {
              timeZone: 'Australia/Sydney',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(new Date(data.duedate))
          : 'Today';
        const timeSlot = data.starttime || 'Scheduled Time';
        const joinUrl = data.joinUrl || 'https://teams.microsoft.com';

        const reminderHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Session Today</title>
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
                Reminder: Your Training Session is Today! ⏰
              </h2>
              <p style="margin: 0 0 20px; color: #4a5568;">
                Hi <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #4a5568;">
                This is a friendly reminder that your 1-on-1 ProspectPlus training session with <strong>Aleyna Harnett</strong> is scheduled for <strong>today</strong> via <strong>Microsoft Teams</strong>.
              </p>

              <!-- APPOINTMENT DETAILS BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="30%" style="color: #718096; font-size: 13px; font-weight: 600;">Date:</td>
                        <td style="color: #1a202c; font-size: 14px; font-weight: 700;">${formattedDate} (Today)</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Time:</td>
                        <td style="color: #095c7b; font-size: 14px; font-weight: 700;">${timeSlot}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Meeting Link:</td>
                        <td style="color: #095c7b; font-size: 14px; font-weight: 700;">Microsoft Teams Video Call</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Host:</td>
                        <td style="color: #1a202c; font-size: 14px;">Aleyna Harnett (aleyna.harnett@mailplus.com.au)</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-size: 13px; font-weight: 600;">Territory:</td>
                        <td style="color: #1a202c; font-size: 14px;">${data.franchisee || 'Franchisee Territory'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TEAMS JOIN BUTTON -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${joinUrl}" target="_blank" style="display: inline-block; background-color: #095c7b; color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(9, 92, 123, 0.2);">
                      Join Teams Meeting Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #718096; font-size: 13px;">
                If you need to reschedule or have any urgent questions, please reply directly to this email or reach out to Aleyna Harnett.
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

        await sendPhysicalEmail({
          to: [recipientEmail, 'aleyna.harnett@mailplus.com.au'].join(','),
          subject: `Reminder: ProspectPlus Training Session with Aleyna Today at ${timeSlot}`,
          html: reminderHtml
        });

        await docSnap.ref.update({ reminderEmailSent: true });
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, reminderEmailsSent: sentCount });
  } catch (error: any) {
    console.error('Error sending training reminders:', error);
    return NextResponse.json({ error: error.message || 'Failed to process reminders' }, { status: 500 });
  }
}
