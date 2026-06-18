import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function verify() {
  const db = getFirestore(adminApp);
  const leadId = '2006779';
  const leadDoc = await db.collection('leads').doc(leadId).get();
  console.log('Active Journeys in lead doc:', leadDoc.data()?.activeJourneys);
  
  const statesSnap = await db.collection('leads').doc(leadId).collection('journey_states').get();
  statesSnap.docs.forEach(doc => {
      console.log(`State [${doc.id}]: status=${doc.data().status}`);
  });
}
verify().catch(console.error);
