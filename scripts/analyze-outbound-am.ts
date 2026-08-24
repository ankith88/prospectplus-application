import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getLeadInitialBucket, getAmEntryDate } from '@/lib/lead-stage-analytics';
import { startOfDay, endOfDay } from 'date-fns';

const db = getFirestore(adminApp);

function parseDateString(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try { return val.toDate(); } catch { return null; }
  }
  if (typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function runAnalysis() {
  console.log("Fetching all leads from Firestore...");
  const snap = await db.collection('leads').get();
  console.log(`Total leads in database: ${snap.docs.length}`);

  // Date range filter: Jul 10, 2026 to Aug 24, 2026
  const fromDate = startOfDay(new Date(2026, 6, 10)); // Jul 10 2026 00:00:00
  const toDate = endOfDay(new Date(2026, 7, 24));    // Aug 24 2026 23:59:59.999

  const outboundToAmLeads: any[] = [];

  for (const doc of snap.docs) {
    const lead = { id: doc.id, ...doc.data() } as any;

    const initialBucket = getLeadInitialBucket(lead);
    const currentBucket = (lead.bucket || '').toLowerCase().trim();

    // Check if lead came from outbound
    const comesFromOutbound = initialBucket === 'Outbound' || lead.wasOutbound || !!lead.assignedToDialerAt;

    // Check if lead moved to Account Manager bucket / pipeline
    let movedToAm = false;
    let amMoveReason = '';

    if (currentBucket === 'account_manager' || currentBucket === 'account manager') {
      movedToAm = true;
      amMoveReason = 'Currently in Account Manager bucket';
    }

    if (!movedToAm && lead.bucketHistory && Array.isArray(lead.bucketHistory)) {
      const bhMatch = lead.bucketHistory.find((h: any) => {
        const nb = (h.newBucket || h.toBucket || h.bucket || '').toLowerCase().trim();
        return nb === 'account_manager' || nb === 'account manager';
      });
      if (bhMatch) {
        movedToAm = true;
        amMoveReason = `Moved to AM bucket in bucketHistory on ${bhMatch.date || bhMatch.timestamp}`;
      }
    }

    if (!movedToAm && lead.statusHistory && Array.isArray(lead.statusHistory)) {
      const shMatch = lead.statusHistory.find((s: any) => s.newStatus === 'Appointment Booked' || s.newStatus === 'Account Manager');
      if (shMatch) {
        movedToAm = true;
        amMoveReason = `Status changed to ${shMatch.newStatus} on ${shMatch.date}`;
      }
    }

    if (!movedToAm && lead.initialAppointmentBucket === 'outbound' && lead.appointments && lead.appointments.length > 0) {
      movedToAm = true;
      amMoveReason = 'Appointment booked from Outbound to AM';
    }

    if (comesFromOutbound && movedToAm) {
      const assignedToDialerAtDate = parseDateString(lead.assignedToDialerAt);
      const fallbackDateStr = lead.assignedToDialerAt || lead.cancellationdate || lead.dateLeadEntered || lead.createdAt || lead.dateCreated;
      const fallbackDate = parseDateString(fallbackDateStr);
      const amEntryDate = getAmEntryDate(lead);

      const strictAssignedAtInRange = assignedToDialerAtDate ? (assignedToDialerAtDate >= fromDate && assignedToDialerAtDate <= toDate) : false;
      const fallbackDateInRange = fallbackDate ? (fallbackDate >= fromDate && fallbackDate <= toDate) : false;
      const amEntryInRange = amEntryDate ? (amEntryDate >= fromDate && amEntryDate <= toDate) : false;

      outboundToAmLeads.push({
        id: lead.id,
        companyName: lead.companyName || lead.company || lead.name || 'N/A',
        contactName: lead.contactName || (lead.firstName ? `${lead.firstName} ${lead.lastName || ''}`.trim() : 'N/A'),
        email: lead.email || lead.emailAddress || 'N/A',
        phone: lead.phone || lead.phoneNumber || lead.mobile || 'N/A',
        customerStatus: lead.customerStatus || lead.status || 'N/A',
        currentBucket: lead.bucket || 'N/A',
        initialBucket: initialBucket,
        accountManagerAssigned: lead.accountManagerAssigned || lead.assignedToAm || 'Unassigned',
        assignedToDialerAt: lead.assignedToDialerAt || null,
        dateLeadEntered: lead.dateLeadEntered || lead.createdAt || null,
        amEntryDate: amEntryDate ? amEntryDate.toISOString() : null,
        amMoveReason,
        strictAssignedAtInRange,
        fallbackDateInRange,
        amEntryInRange,
        leadSource: lead.customerSource || lead.leadSource || lead.source || 'N/A'
      });
    }
  }

  console.log(`\n==================================================`);
  console.log(`TOTAL Outbound -> Account Manager leads across ALL time: ${outboundToAmLeads.length}`);

  const strictAssignedFiltered = outboundToAmLeads.filter(l => l.strictAssignedAtInRange);
  const fallbackFiltered = outboundToAmLeads.filter(l => l.fallbackDateInRange);

  console.log(`Matching Dialer Assignment Date Filter (Jul 10, 2026 - Aug 24, 2026) [Strict assignedToDialerAt]: ${strictAssignedFiltered.length}`);
  console.log(`Matching Dialer Assignment Date Filter (Jul 10, 2026 - Aug 24, 2026) [Fallback Date / Entered Date]: ${fallbackFiltered.length}`);
  console.log(`==================================================\n`);

  console.log(`\n--- ALL LEADS MATCHING DIALER ASSIGNMENT DATE FILTER (Jul 10 - Aug 24, 2026) ---`);
  fallbackFiltered.forEach((l, idx) => {
    console.log(`\n${idx + 1}. [ID: ${l.id}] ${l.companyName}`);
    console.log(`   - Contact: ${l.contactName} | Email: ${l.email} | Phone: ${l.phone}`);
    console.log(`   - Status: ${l.customerStatus} | Current Bucket: ${l.currentBucket} | Initial Bucket: ${l.initialBucket}`);
    console.log(`   - Account Manager Assigned: ${l.accountManagerAssigned}`);
    console.log(`   - assignedToDialerAt: ${l.assignedToDialerAt || 'N/A'}`);
    console.log(`   - dateLeadEntered: ${l.dateLeadEntered || 'N/A'}`);
    console.log(`   - AM Entry Date: ${l.amEntryDate || 'N/A'}`);
    console.log(`   - AM Move Reason: ${l.amMoveReason}`);
  });
}

runAnalysis().catch(console.error);
