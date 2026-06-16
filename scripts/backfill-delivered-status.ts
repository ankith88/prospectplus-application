import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function backfillDeliveredStatus() {
  console.log('Starting backfill for is_delivered status...');
  const packagesRef = db.collection('packages');
  let count = 0;
  let batchCount = 0;
  let batch = db.batch();

  // Use a stream to avoid OOM in the backfill script itself
  const stream = packagesRef.select('real_time_status', 'is_delivered').stream();

  for await (const chunk of stream) {
    const doc = chunk as unknown as FirebaseFirestore.QueryDocumentSnapshot;
    const data = doc.data();

    // If it already has is_delivered properly set, we could skip it to save writes
    if (typeof data.is_delivered !== 'undefined') {
      continue;
    }

    const isDelivered = data.real_time_status?.delivered === true;

    batch.update(doc.ref, {
      is_delivered: isDelivered
    });

    count++;

    if (count >= 500) {
      await batch.commit();
      batchCount++;
      console.log(`Committed batch ${batchCount} (${count} documents)...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    batchCount++;
    console.log(`Committed final batch ${batchCount} (${count} documents)...`);
  }

  console.log('Backfill completed.');
}

backfillDeliveredStatus().catch(console.error);
