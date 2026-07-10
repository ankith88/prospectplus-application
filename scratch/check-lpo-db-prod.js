const admin = require('firebase-admin');

async function run() {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  console.log("--- Checking Production Firestore ---");
  try {
    const app = admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
    const db = app.firestore();
    const snap = await db.collection('lpo_leads').get();
    console.log(`Found ${snap.size} documents in lpo_leads`);
    snap.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err) {
    console.error(err);
  }
}

run();
