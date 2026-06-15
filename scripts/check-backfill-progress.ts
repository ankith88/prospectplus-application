import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const jobRef = db.collection('backfill_jobs').doc('realtime_status_backfill');
  const doc = await jobRef.get();
  
  if (doc.exists) {
    const data = doc.data();
    console.log(`\n--- Backfill Progress ---`);
    console.log(`Status: ${data?.status}`);
    console.log(`Processed Count: ${data?.processedCount} packages updated`);
    console.log(`Last Updated: ${data?.updatedAt?.toDate()?.toLocaleString()}`);
    console.log(`-------------------------\n`);
  } else {
    console.log('No backfill job found.');
  }
}

main().catch(console.error);
