const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function run() {
  console.log("Checking activity date format...");
  const snapshot = await db.collectionGroup('activity').limit(5).get();
  snapshot.forEach(doc => {
    console.log(`Activity ID: ${doc.id}`);
    console.log(`  date: ${doc.data().date} (type: ${typeof doc.data().date})`);
  });
}
run().catch(console.error);
