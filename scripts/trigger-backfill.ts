import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const jobRef = db.collection('backfill_jobs').doc('realtime_status_backfill');
  
  await jobRef.set({
    status: 'processing',
    batchSize: 500,
    lastDocId: null,
    processedCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  console.log('Successfully kicked off the real-time status backfill job!');
  console.log('You can now close your machine. The Firebase Cloud Function will run in the background recursively until finished.');
}

main().catch(console.error);
