import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function enrollLead() {
  const db = getFirestore(adminApp);
  const leadId = '2005926';
  const journeyName = 'Trial Nudge - Job 1';
  
  // 1. Find the Journey ID
  const journeysSnapshot = await db.collection('Journeys').where('name', '==', journeyName).get();
  
  if (journeysSnapshot.empty) {
    console.error(`Could not find a journey named "${journeyName}"`);
    return;
  }
  
  const journeyId = journeysSnapshot.docs[0].id;
  console.log(`Found Journey: ${journeyId} (${journeyName})`);
  
  // 2. Update the Lead
  const leadRef = db.collection('leads').doc(leadId);
  const leadDoc = await leadRef.get();
  
  if (!leadDoc.exists) {
    console.error(`Lead ${leadId} not found`);
    return;
  }
  
  await leadRef.update({
    activeJourneys: FieldValue.arrayUnion(journeyId)
  });
  
  console.log(`Successfully enrolled lead ${leadId} into journey ${journeyName} (${journeyId})`);
  
  // 3. Log activity
  await leadRef.collection('activity').add({
    type: 'Update',
    date: new Date().toISOString(),
    notes: `System manually enrolled lead into nurture journey: ${journeyName}`,
    author: 'System Fix'
  });
  
  console.log('Activity log added.');
}

enrollLead().catch(console.error);
