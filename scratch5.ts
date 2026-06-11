import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function investigate() {
  const leadId = "2005972";
  const journeyId = "ifN7P7n0Bq3uNYflT8YP";
  
  const leadDoc = await db.collection('leads').doc(leadId).get();
  const stateRef = leadDoc.ref.collection('journey_states').doc(journeyId);
  const stateDoc = await stateRef.get();
  
  console.log("State Doc Exists:", stateDoc.exists);
  
  const journeySnap = await db.collection('Journeys').doc(journeyId).get();
  const journey = journeySnap.data();
  console.log("Journey Exists:", journeySnap.exists);
  console.log("Journey Status:", journey?.status);
  
  const startNode = journey?.nodes?.find((n: any) => n.type === 'trigger');
  console.log("Has Trigger Node:", !!startNode);
}

investigate().catch(console.error);
