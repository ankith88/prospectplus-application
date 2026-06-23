import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { adminApp } from '@/lib/firebase-admin';
import { addMinutes, format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bookingUrlId = searchParams.get('bookingUrlId');
  const amId = searchParams.get('amId');
  const dateStr = searchParams.get('date');

  try {
    // 1. Initial Load: Get Lead and AM Info from bookingUrlId
    if (bookingUrlId && !amId && !dateStr) {
      const db = adminApp.firestore();
      const leadsRef = db.collection('leads');
      const snap = await leadsRef.where('bookingUrlId', '==', bookingUrlId).get();
      
      if (snap.empty) {
        return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
      }
      const lead = snap.docs[0].data() as Lead;
      const amAssigned = lead.accountManagerAssigned;
      
      let contactName = lead.companyName;
      let contactEmail = '';

      if (lead.bookingContactId) {
        const contactRef = db.collection('leads').doc(snap.docs[0].id).collection('contacts').doc(lead.bookingContactId);
        const contactSnap = await contactRef.get();
        if (contactSnap.exists) {
          const contactData = contactSnap.data();
          contactName = contactData?.name || lead.companyName;
          contactEmail = contactData?.email || '';
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
         'Ankith Ravindran': 'ankith.ravindran@mailplus.com.au'
      };

      const amEmail = amEmailMap[amAssigned]?.toLowerCase();

      const matchedUserDoc = allUsersSnap.docs.find(doc => {
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

      if (!amUser.microsoftRefreshToken) {
        return NextResponse.json({ error: 'Account Manager has not connected their calendar' }, { status: 400 });
      }

      return NextResponse.json({ 
        leadName: lead.companyName, 
        contactName,
        contactEmail,
        amName: amUser.displayName || amAssigned, 
        amId: amUserId,
        defaultMeetingType: amUser.defaultMeetingType || 'phone'
      });
    }

    // 2. Fetch Availability Slots
    if (amId && dateStr) {
      const db = adminApp.firestore();
      const userRef = db.collection('users').doc(amId);
      const userSnap = await userRef.get();
      
      if (!userSnap.exists) {
        return NextResponse.json({ error: 'Account Manager not found' }, { status: 404 });
      }
      const amUser = userSnap.data() as UserProfile;

      const date = new Date(dateStr);
      const dayOfWeek = format(date, 'EEEE');
      
      const defaultWorkingHours = {
        'Monday': { start: '09:00', end: '17:00', enabled: true },
        'Tuesday': { start: '09:00', end: '17:00', enabled: true },
        'Wednesday': { start: '09:00', end: '17:00', enabled: true },
        'Thursday': { start: '09:00', end: '17:00', enabled: true },
        'Friday': { start: '09:00', end: '17:00', enabled: true },
        'Saturday': { start: '09:00', end: '17:00', enabled: false },
        'Sunday': { start: '09:00', end: '17:00', enabled: false },
      } as Record<string, { start: string; end: string; enabled: boolean }>;

      const workingHours = (amUser.workingHours || defaultWorkingHours)[dayOfWeek];
      
      console.log(`Checking availability for ${amId} on ${dateStr} (${dayOfWeek}). Working hours defined:`, workingHours);

      if (!workingHours || !workingHours.enabled) {
        console.log(`No working hours or disabled for ${dayOfWeek}`);
        return NextResponse.json({ slots: [] }); // Not working this day
      }

      const amTz = amUser.timezone || 'Australia/Sydney';
      const IANA_TO_MS_GRAPH: Record<string, string> = {
        'Australia/Sydney': 'AUS Eastern Standard Time',
        'Australia/Melbourne': 'AUS Eastern Standard Time',
        'Australia/Canberra': 'AUS Eastern Standard Time',
        'Australia/Brisbane': 'E. Australia Standard Time',
        'Australia/Adelaide': 'Cen. Australia Standard Time',
        'Australia/Darwin': 'AUS Central Standard Time',
        'Australia/Perth': 'W. Australia Standard Time',
        'Australia/Hobart': 'Tasmania Standard Time',
      };
      const msGraphTz = IANA_TO_MS_GRAPH[amTz] || 'AUS Eastern Standard Time';

      const client = await getGraphClient(amId);
      
      const startDateTime = `${dateStr}T00:00:00`;
      const endDateTime = `${dateStr}T23:59:59`;

      const scheduleResponse = await client
        .api(`/me/calendar/getSchedule`)
        .post({
          schedules: [amUser.email],
          startTime: { dateTime: startDateTime, timeZone: msGraphTz },
          endTime: { dateTime: endDateTime, timeZone: msGraphTz },
          availabilityViewInterval: 30
        });

      const schedule = scheduleResponse.value[0];
      const busyBlocks = schedule.scheduleItems.map((item: any) => ({
        start: new Date(item.start.dateTime),
        end: new Date(item.end.dateTime)
      }));

      // Helper to get offset dynamically
      const getTzOffset = (tz: string, d: Date): string => {
        try {
          const formatted = d.toLocaleString("en-US", { timeZone: tz, timeZoneName: "longOffset" });
          const match = formatted.match(/GMT([+-]\d+):?(\d+)?/);
          if (!match) return "+10:00";
          const [_, sign, hours, minutes = "00"] = match;
          return `${sign}${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } catch (e) {
          console.error('Error computing offset:', e);
          return "+10:00";
        }
      };

      // Generate 30 min slots
      const slots = [];
      const tzOffset = getTzOffset(amTz, date);
      
      const [startH, startM] = workingHours.start.split(':');
      const [endH, endM] = workingHours.end.split(':');
      
      const startStr = `${startH.padStart(2, '0')}:${startM.padStart(2, '0')}`;
      const endStr = `${endH.padStart(2, '0')}:${endM.padStart(2, '0')}`;
      
      let currentSlot = new Date(`${dateStr}T${startStr}:00${tzOffset}`);
      const endLimit = new Date(`${dateStr}T${endStr}:00${tzOffset}`);

      const bufferMinutes = amUser.meetingBufferMinutes || 0;
      const durationMinutes = amUser.defaultMeetingDurationMinutes || 30;
      const noticeHours = amUser.minimumBookingNoticeHours || 0;
      
      const now = new Date();
      const minBookingTime = addMinutes(now, noticeHours * 60);

      while (isBefore(currentSlot, endLimit)) {
        const slotEnd = addMinutes(currentSlot, durationMinutes);
        
        if (isAfter(slotEnd, endLimit)) break;
        if (isBefore(currentSlot, minBookingTime)) {
            // Skip past slots and slots that violate advance notice
            currentSlot = slotEnd;
            continue;
        }

        // Check if slot conflicts with busy blocks
        const isBusy = busyBlocks.some((block: any) => {
          // Check for overlap considering buffer
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
            end: slotEnd.toISOString()
          });
        }

        currentSlot = slotEnd;
      }
      
      console.log(`Found ${slots.length} available slots.`);

      return NextResponse.json({ slots });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
