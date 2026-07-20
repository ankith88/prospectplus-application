import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function checkIds() {
  const idToCheck = "2011827";
  const leadDoc = await db.collection('leads').doc(idToCheck).get();
  const companyDoc = await db.collection('companies').doc(idToCheck).get();

  console.log(`Checking ID: ${idToCheck}`);
  console.log(`Lead exists: ${leadDoc.exists}`);
  if (leadDoc.exists) {
      const data = leadDoc.data() || {};
      console.log(`Lead isDuplicate: ${data.isDuplicate}`);
  }
  if (leadDoc.exists) console.log(`Lead data keys: ${Object.keys(leadDoc.data() || {})}`);
  
  console.log(`Company exists: ${companyDoc.exists}`);
  if (companyDoc.exists) console.log(`Company data keys: ${Object.keys(companyDoc.data() || {})}`);
}

checkIds().catch(console.error);
