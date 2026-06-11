import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function investigate() {
  const leadId = "2005972";
  const journeyId = "ifN7P7n0Bq3uNYflT8YP";
  const stateDoc = await db.collection('leads').doc(leadId).collection('journey_states').doc(journeyId).get();
  if (stateDoc.exists) {
    console.log("Journey State:");
    console.log(JSON.stringify(stateDoc.data(), null, 2));
  } else {
    console.log("No journey state document found!");
  }
}

investigate().catch(console.error);
