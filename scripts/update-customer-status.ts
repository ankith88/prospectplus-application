import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';
import type { Activity, LeadStatus } from '../src/lib/types';

// Matching the outcome to status map used by logCallActivity
const outcomeStatusMap: Record<string, { status: LeadStatus; reason?: string }> = {
  'Appointment Booked': { status: 'Qualified' },
  'Busy': { status: 'In Progress' },
  'Call Back/Follow-up': { status: 'High Touch' },
  'Disconnected': { status: 'Lost', reason: 'Wrong Contact Details' },
  'DNC - Stop List': { status: 'Lost', reason: 'Not Interested' },
  'Email Interested': { status: 'Pre Qualified' },
  'Empty / Closed': { status: 'Lost', reason: 'Closed Business' },
  'Gatekeeper': { status: 'Connected' },
  'LOST - No Contact': { status: 'Lost', reason: 'No Contact' },
  'No Answer': { status: 'In Progress' },
  'Not a Fit': { status: 'Lost', reason: 'Not a Fit' },
  'Not Interested': { status: 'Lost', reason: 'Not Interested' },
  'Prospect - No Access/No Contact': { status: 'New' },
  'Qualified - Call Back/Send Info': { status: 'In Qualification' },
  'Reschedule': { status: 'Reschedule' },
  'Unqualified Opportunity': { status: 'Priority Field Lead' },
  'Upsell': { status: 'Won' },
  'Voicemail': { status: 'In Progress' },
  'Wrong Number': { status: 'Lost', reason: 'Wrong Contact Details' },
};

async function main() {
  console.log('Starting customerStatus update script...');
  
  try {
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);
    
    if (snapshot.empty) {
      console.log('No leads found.');
      return;
    }

    console.log(`Found ${snapshot.size} documents in 'leads'.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Condition: ONLY update if customerStatus is missing or is "New"
      if (data.customerStatus && data.customerStatus !== 'New') {
        skippedCount++;
        continue;
      }

      const leadId = docSnapshot.id;
      
      // Fetch activity subcollection, sorted by date descending
      const activityRef = collection(firestore, 'leads', leadId, 'activity');
      const activityQuery = query(activityRef, orderBy('date', 'desc'));
      const activitySnapshot = await getDocs(activityQuery);
      
      let newStatus = 'New'; // default if no matching activity is found
      let foundOutcomeStatus = false;

      // First pass: Prioritize "Outcome: "
      for (const activityDoc of activitySnapshot.docs) {
        const activityData = activityDoc.data() as Activity;
        if (activityData.notes && activityData.notes.startsWith('Outcome: ')) {
           // We extract the outcome. Notes look like "Outcome: Unqualified Opportunity. Notes: ..."
           // Or "Outcome: Disconnected (Wrong Contact Details). Notes: ..."
           const match = activityData.notes.match(/^Outcome:\s*(.*?)(?:\s*\(|\.\s*Notes:|$)/);
           if (match && match[1]) {
              const outcomeString = match[1].trim();
              if (outcomeStatusMap[outcomeString]) {
                 newStatus = outcomeStatusMap[outcomeString].status;
                 foundOutcomeStatus = true;
                 break;
              }
           }
        }
      }

      // Second pass: Fallback to "Status changed to " if no Outcome was mapped
      if (!foundOutcomeStatus) {
        for (const activityDoc of activitySnapshot.docs) {
          const activityData = activityDoc.data() as Activity;
          if (activityData.notes && activityData.notes.includes('Status changed to ')) {
            const match = activityData.notes.match(/Status changed to (.*)/);
            if (match && match[1]) {
              newStatus = match[1].trim();
              break; 
            }
          }
        }
      }

      // If it's already "New" and we determined it should be "New", we skip an unnecessary write
      if (data.customerStatus === newStatus) {
         skippedCount++;
         continue;
      }

      // Update the lead document
      await updateDoc(docSnapshot.ref, {
        customerStatus: newStatus
      });
      
      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log(`Updated ${updatedCount} leads...`);
      }
    }

    console.log(`Finished processing leads.`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error('Error updating leads:', error);
  }

  console.log('\nAll done!');
  process.exit(0);
}

main().catch(console.error);
