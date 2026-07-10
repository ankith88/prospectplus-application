import { adminApp } from '../src/lib/firebase-admin';

async function run() {
  const db = adminApp.firestore();
  const idToCheck = "2010443";
  const leadDoc = await db.collection('leads').doc(idToCheck).get();
  console.log(`Lead ${idToCheck} exists:`, leadDoc.exists);
  if (leadDoc.exists) {
    console.log("Lead data:", JSON.stringify(leadDoc.data(), null, 2));
  }
}

run().catch(console.error);
