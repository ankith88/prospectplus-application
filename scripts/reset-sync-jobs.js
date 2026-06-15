const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('sync_jobs').where('status', 'in', ['pending', 'processing']).get();
  console.log(`Found ${snapshot.size} stuck jobs.`);
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'failed' });
  });
  
  if (snapshot.size > 0) {
    await batch.commit();
    console.log('Successfully reset stuck jobs.');
  }
}

main().catch(console.error);
