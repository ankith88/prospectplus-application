import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function backfillLatestScanDates() {
  console.log("Starting backfill for packages latest_scan_at field...");

  let packagesProcessed = 0;
  let packagesUpdated = 0;
  const BATCH_SIZE = 500;

  try {
    const packagesRef = db.collection('packages');
    const snapshot = await packagesRef.get();
    
    console.log(`Found ${snapshot.size} packages to evaluate.`);

    let batch = db.batch();
    let currentBatchSize = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      packagesProcessed++;

      // Extract the latest scan date from the scans array
      let latestScanAt = null;
      if (data.scans && Array.isArray(data.scans) && data.scans.length > 0) {
        const latestScan = data.scans[data.scans.length - 1];
        if (latestScan && latestScan.updated_at) {
          latestScanAt = latestScan.updated_at;
        }
      }

      // Check if we need to update
      if (latestScanAt && data.latest_scan_at !== latestScanAt) {
        batch.update(doc.ref, {
          latest_scan_at: latestScanAt
        });
        currentBatchSize++;
        packagesUpdated++;

        if (currentBatchSize >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${currentBatchSize}. Total updated so far: ${packagesUpdated}`);
          batch = db.batch();
          currentBatchSize = 0;
        }
      }
    }

    if (currentBatchSize > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${currentBatchSize}. Total updated: ${packagesUpdated}`);
    }

    console.log(`Backfill complete. Processed: ${packagesProcessed}. Updated: ${packagesUpdated}.`);

  } catch (error) {
    console.error("Error during backfill:", error);
  }
}

backfillLatestScanDates().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
