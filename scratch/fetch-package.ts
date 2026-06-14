import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const doc = await db.collection('packages').doc('00593529787604934302').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}

run().catch(console.error);
