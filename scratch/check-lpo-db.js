const admin = require('firebase-admin');

async function check(useProd) {
  if (useProd) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    console.log("--- Checking Production Firestore ---");
  } else {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    console.log("--- Checking Emulator Firestore ---");
  }

  try {
    const app = admin.apps.length > 0 ? admin.apps[0] : admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
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

async function run() {
  await check(false);
  await check(true);
}

run();
