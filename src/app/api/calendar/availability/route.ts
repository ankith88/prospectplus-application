import { NextRequest, NextResponse } from 'next/server';
import { getGraphClient } from '@/services/microsoft-graph';
import { firestore as db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { addMinutes, format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Lead, UserProfile } from '@/lib/types';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const bookingUrlId = searchParams.get('bookingUrlId');
  const amId = searchParams.get('amId');
  const dateStr = searchParams.get('date');

  try {
    // 1. Initial Load: Get Lead and AM Info from bookingUrlId
    if (bookingUrlId && !amId && !dateStr) {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef, where('bookingUrlId', '==', bookingUrlId));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return NextResponse.json({ error: 'Invalid booking link' }, { status: 404 });
      }
      
      const lead = snap.docs[0].data() as Lead;
      const amAssigned = lead.accountManagerAssigned;
      
      if (!amAssigned) {
        return NextResponse.json({ error: 'No Account Manager assigned to this lead' }, { status: 400 });
      }

      // Robust AM User Lookup
      const usersRef = collection(db, 'users');
      const allUsersSnap = await getDocs(usersRef);
      
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
        amName: amUser.displayName || amAssigned,
        amId: amUserId
      });
    }

    // 2. Fetch Availability Slots
    if (amId && dateStr) {
      const userRef = doc(db, 'users', amId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return NextResponse.json({ error: 'Account Manager not found' }, { status: 404 });
      }
      const amUser = userSnap.data() as UserProfile;

      const date = new Date(dateStr);
      const dayOfWeek = format(date, 'EEEE');
      const workingHours = amUser.workingHours?.[dayOfWeek];

      if (!workingHours || !workingHours.enabled) {
        return NextResponse.json({ slots: [] }); // Not working this day
      }

      const client = await getGraphClient(amId);
      
      // Graph API expects ISO strings
      const startDateTime = `${dateStr}T00:00:00`;
      const endDateTime = `${dateStr}T23:59:59`;

      const scheduleResponse = await client
        .api(`/me/calendar/getSchedule`)
        .post({
          schedules: [amUser.email],
          startTime: { dateTime: startDateTime, timeZone: 'UTC' }, // Note: Proper timezone handling is needed for production
          endTime: { dateTime: endDateTime, timeZone: 'UTC' },
          availabilityViewInterval: 30
        });

      const schedule = scheduleResponse.value[0];
      const busyBlocks = schedule.scheduleItems.map((item: any) => ({
        start: new Date(item.start.dateTime),
        end: new Date(item.end.dateTime)
      }));

      // Generate 30 min slots
      const slots = [];
      const [startHour, startMin] = workingHours.start.split(':').map(Number);
      const [endHour, endMin] = workingHours.end.split(':').map(Number);
      
      let currentSlot = new Date(date);
      currentSlot.setHours(startHour, startMin, 0, 0);
      
      const endLimit = new Date(date);
      endLimit.setHours(endHour, endMin, 0, 0);

      const bufferMinutes = amUser.meetingBufferMinutes || 0;
      const now = new Date();

      while (isBefore(currentSlot, endLimit)) {
        const slotEnd = addMinutes(currentSlot, 30);
        
        if (isAfter(slotEnd, endLimit)) break;
        if (isBefore(currentSlot, now)) {
            // Skip past slots
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

      return NextResponse.json({ slots });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
