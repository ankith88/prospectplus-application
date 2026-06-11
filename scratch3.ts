import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function investigate() {
  const journeyId = "ifN7P7n0Bq3uNYflT8YP";
  const journeyDoc = await db.collection('Journeys').doc(journeyId).get();
  console.log("Journey status:", journeyDoc.data()?.status);
}

investigate().catch(console.error);
