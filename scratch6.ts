import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function runProcess() {
  const targetLeadId = "2005972";
  const leadDoc = await db.collection('leads').doc(targetLeadId).get();
  const leadData = leadDoc.data();
  const activeJourneys = leadData?.activeJourneys || [];
  console.log("Active Journeys for lead:", activeJourneys);
  
  for (const journeyId of activeJourneys) {
    const stateRef = leadDoc.ref.collection('journey_states').doc(journeyId);
    const stateDoc = await stateRef.get();
    console.log("State doc exists before:", stateDoc.exists);
    if (!stateDoc.exists) {
        console.log("Process Engine would create state here.");
    }
  }
}

runProcess().catch(console.error);
