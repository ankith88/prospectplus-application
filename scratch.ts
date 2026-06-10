import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/ankithravindran/Development/Antigravity/prospectplus-application/functions/service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const doc = await db.collection('leads').doc('2005926').get();
  console.log(doc.data());
}

run().catch(console.error);
