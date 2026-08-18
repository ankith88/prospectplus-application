import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { addDays, addMinutes, format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';
import { isWeekendOrPublicHoliday } from '@/lib/australian-holidays';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bookingUrlId = searchParams.get('bookingUrlId');
  const amIdParam = searchParams.get('amId');
  const emailParam = searchParams.get('email');
  const dateStr = searchParams.get('date');

  try {
    const db = adminApp.firestore();

    // 1. Initial Load: Get Lead and AM Info from bookingUrlId
    if (bookingUrlId && !amIdParam && !dateStr) {
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
      const lead = snap.docs[0].data() as Lead;
      const amAssigned = lead.accountManagerAssigned;

      let contactName = isGeneralBooking ? '' : lead.companyName;
      let contactEmail = isGeneralBooking ? '' : (lead.customerServiceEmail || '');

      const leadId = snap.docs[0].id;
      if (!isGeneralBooking) {
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

      if (!amAssigned) {
        return NextResponse.json({ error: 'No Account Manager assigned to this lead' }, { status: 400 });
      }

      // Robust AM User Lookup
      const usersRef = db.collection('users');
      const allUsersSnap = await usersRef.get();

      const amEmailMap: Record<string, string> = {
        'Lee Russell': 'lee.russell@mailplus.com.au',
        'Kerina Helliwell': 'kerina.helliwell@mailplus.com.au',
        'Luke Forbes': 'luke.forbes@mailplus.com.au',
        'Ankith Ravindran': 'ankith.ravindran@mailplus.com.au',
        'Aleyna Harnett': 'aleyna.harnett@mailplus.com.au'
      };

      const amEmail = amEmailMap[amAssigned]?.toLowerCase();

      const matchedUserDoc = allUsersSnap.docs.find((doc) => {
        const data = doc.data() as UserProfile;
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
        const displayName = (data.displayName || '').toLowerCase();
        const userEmail = (data.email || '').toLowerCase();

        const isNameMatch = fullName === amAssigned.toLowerCase() || displayName === amAssigned.toLowerCase();
        const isEmailMatch = amEmail && userEmail === amEmail;

        return isNameMatch || isEmailMatch;
      });

      if (!matchedUserDoc) {
        return NextResponse.json({ error: 'Account Manager not found' }, { status: 404 });
      }

      const amUser = matchedUserDoc.data() as UserProfile;
      const amUserId = matchedUserDoc.id;

      return NextResponse.json({
        leadName: lead.companyName,
        contactName,
        contactEmail,
        amName: amUser.displayName || amAssigned,
        amId: amUserId,
        defaultMeetingType: amUser.defaultMeetingType || 'phone',
        isGeneralBooking
      });
    }

    // 2. Fetch Availability Slots (by amId or email)
    if ((amIdParam || emailParam) && dateStr) {
      let targetUserDoc: FirebaseFirestore.DocumentSnapshot | null = null;

      if (amIdParam) {
        targetUserDoc = await db.collection('users').doc(amIdParam).get();
      }

      if ((!targetUserDoc || !targetUserDoc.exists) && emailParam) {
        const querySnap = await db
          .collection('users')
          .where('email', '==', emailParam.trim().toLowerCase())
          .limit(1)
          .get();
        if (!querySnap.empty) {
          targetUserDoc = querySnap.docs[0];
        } else {
          // Search by name fallback
          const allSnap = await db.collection('users').get();
          targetUserDoc =
            allSnap.docs.find((d) => {
              const u = d.data() as UserProfile;
              return (
                (u.email && u.email.toLowerCase() === emailParam.toLowerCase()) ||
                (u.displayName && u.displayName.toLowerCase().includes('aleyna'))
              );
            }) || null;
        }
      }

      const date = new Date(dateStr);
      const minBookableDate = startOfDay(addDays(new Date(), 1));

      // Rule: Can't make bookings in the past or for the same day
      if (isBefore(startOfDay(date), minBookableDate)) {
        return NextResponse.json({
          slots: [],
          error: 'Bookings cannot be made for past dates or same day. Please select a future date.'
        });
      }

      // Rule: Can't make bookings on weekends or Sydney, Australia public holidays
      if (isWeekendOrPublicHoliday(date)) {
        return NextResponse.json({
          slots: [],
          error: 'Bookings cannot be made on weekends or Sydney public holidays. Please select another date.'
        });
      }

      const dayOfWeek = format(date, 'EEEE');

      const defaultWorkingHours = {
        Monday: { start: '09:00', end: '17:00', enabled: true },
        Tuesday: { start: '09:00', end: '17:00', enabled: true },
        Wednesday: { start: '09:00', end: '17:00', enabled: true },
        Thursday: { start: '09:00', end: '17:00', enabled: true },
        Friday: { start: '09:00', end: '17:00', enabled: true },
        Saturday: { start: '09:00', end: '17:00', enabled: false },
        Sunday: { start: '09:00', end: '17:00', enabled: false }
      } as Record<string, { start: string; end: string; enabled: boolean }>;

      let amUser: UserProfile | null = targetUserDoc && targetUserDoc.exists ? (targetUserDoc.data() as UserProfile) : null;
      let amUserId = targetUserDoc ? targetUserDoc.id : null;

      const workingHours = (amUser?.workingHours || defaultWorkingHours)[dayOfWeek];

      if (!workingHours || !workingHours.enabled) {
        return NextResponse.json({ slots: [] }); // Weekend / Not working
      }

      const amTz = amUser?.timezone || 'Australia/Sydney';
      const IANA_TO_MS_GRAPH: Record<string, string> = {
        'Australia/Sydney': 'AUS Eastern Standard Time',
        'Australia/Melbourne': 'AUS Eastern Standard Time',
        'Australia/Canberra': 'AUS Eastern Standard Time',
        'Australia/Brisbane': 'E. Australia Standard Time',
        'Australia/Adelaide': 'Cen. Australia Standard Time',
        'Australia/Darwin': 'AUS Central Standard Time',
        'Australia/Perth': 'W. Australia Standard Time',
        'Australia/Hobart': 'Tasmania Standard Time'
      };
      const msGraphTz = IANA_TO_MS_GRAPH[amTz] || 'AUS Eastern Standard Time';

      let busyBlocks: Array<{ start: Date; end: Date }> = [];

      // Query Microsoft Graph Teams/Outlook Calendar if refreshToken is available
      if (amUserId && amUser?.microsoftRefreshToken) {
        try {
          const client = await getGraphClient(amUserId);
          const startDateTime = `${dateStr}T00:00:00`;
          const endDateTime = `${dateStr}T23:59:59`;

          const scheduleResponse = await client.api(`/me/calendar/getSchedule`).post({
            schedules: [amUser.email || 'aleyna.harnett@mailplus.com.au'],
            startTime: { dateTime: startDateTime, timeZone: msGraphTz },
            endTime: { dateTime: endDateTime, timeZone: msGraphTz },
            availabilityViewInterval: 30
          });

          if (scheduleResponse?.value?.[0]?.scheduleItems) {
            // Filter out items marked as 'free' so transparent/informational items do not block availability
            const nonFreeItems = scheduleResponse.value[0].scheduleItems.filter(
              (item: any) => item.status && item.status.toLowerCase() !== 'free'
            );

            busyBlocks = nonFreeItems.map((item: any) => {
              let startStr = item.start.dateTime;
              let endStr = item.end.dateTime;

              if (item.start.timeZone === 'UTC' && !startStr.endsWith('Z')) {
                startStr = `${startStr}Z`;
              }
              if (item.end.timeZone === 'UTC' && !endStr.endsWith('Z')) {
                endStr = `${endStr}Z`;
              }

              return {
                start: new Date(startStr),
                end: new Date(endStr)
              };
            });
          }
        } catch (graphErr) {
          console.warn('Microsoft Graph availability fallback:', graphErr);
        }
      }

      // Also check existing Firestore booked appointments for Aleyna on this date
      try {
        const apptsSnap = await db.collectionGroup('appointments').get();
        apptsSnap.docs.forEach((d) => {
          const data = d.data();
          if (!data || data.appointmentStatus === 'Cancelled') return;
          const isAleyna =
            data.assignedTo === 'Aleyna Harnett' ||
            (emailParam && data.assignedTo && data.assignedTo.toLowerCase().includes('aleyna'));

          if (isAleyna && data.duedate) {
            const apptDateStr = format(new Date(data.duedate), 'yyyy-MM-dd');
            if (apptDateStr === dateStr) {
              const apptStart = new Date(data.duedate);
              const apptEnd = addMinutes(apptStart, 30);
              busyBlocks.push({ start: apptStart, end: apptEnd });
            }
          }
        });
      } catch (dbErr) {
        console.warn('Firestore busy blocks check fallback:', dbErr);
      }

      // Helper to compute timezone offset
      const getTzOffset = (tz: string, d: Date): string => {
        try {
          const formattedStr = d.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
          const match = formattedStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
          if (!match) return '+10:00';
          const [_, sign, hours, minutes = '00'] = match;
          return `${sign}${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } catch (e) {
          return '+10:00';
        }
      };

      const slots = [];
      const tzOffset = getTzOffset(amTz, date);

      const [startH, startM] = workingHours.start.split(':');
      const [endH, endM] = workingHours.end.split(':');

      const startStr = `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`;
      const endStr = `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`;

      let currentSlot = new Date(`${dateStr}T${startStr}:00${tzOffset}`);
      const endLimit = new Date(`${dateStr}T${endStr}:00${tzOffset}`);

      const bufferMinutes = amUser?.meetingBufferMinutes || 0;
      const durationMinutes = amUser?.defaultMeetingDurationMinutes || 30;

      while (isBefore(currentSlot, endLimit)) {
        const slotEnd = addMinutes(currentSlot, durationMinutes);

        if (isAfter(slotEnd, endLimit)) break;

        // Check if slot conflicts with busy blocks
        const isBusy = busyBlocks.some((block: any) => {
          const blockStartWithBuffer = addMinutes(block.start, -bufferMinutes);
          const blockEndWithBuffer = addMinutes(block.end, bufferMinutes);

          return (
            (isAfter(currentSlot, blockStartWithBuffer) || currentSlot.getTime() === blockStartWithBuffer.getTime()) &&
            isBefore(currentSlot, blockEndWithBuffer)
          ) || (
            isAfter(slotEnd, blockStartWithBuffer) &&
            (isBefore(slotEnd, blockEndWithBuffer) || slotEnd.getTime() === blockEndWithBuffer.getTime())
          ) || (
            (isBefore(currentSlot, blockStartWithBuffer) || currentSlot.getTime() === blockStartWithBuffer.getTime()) &&
            (isAfter(slotEnd, blockEndWithBuffer) || slotEnd.getTime() === blockEndWithBuffer.getTime())
          );
        });

        if (!isBusy) {
          slots.push({
            start: currentSlot.toISOString(),
            end: slotEnd.toISOString(),
            formattedTime: format(currentSlot, 'hh:mm a')
          });
        }

        currentSlot = slotEnd;
      }

      return NextResponse.json({ slots });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Availability fetch error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
