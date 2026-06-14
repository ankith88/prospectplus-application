import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('packages').limit(500).get();
  const scanTypes = new Set();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.scans && Array.isArray(data.scans)) {
      data.scans.forEach((s: any) => scanTypes.add(s.scan_type));
    }
  });
  console.log('Unique scan types:', Array.from(scanTypes));
}

run().catch(console.error);
