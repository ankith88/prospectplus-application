const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

async function run() {
  console.log("Searching for any initiated activities in the database...");
  const snap = await db.collectionGroup('activity')
    .where('type', '==', 'Call')
    .where('aircallStatus', '==', 'initiated')
    .get();

  console.log(`Found ${snap.size} matching activities`);
  snap.forEach(doc => {
    const parent = doc.ref.parent.parent;
    console.log(`Activity ${doc.id} under ${parent ? parent.path : 'unknown'}:`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
