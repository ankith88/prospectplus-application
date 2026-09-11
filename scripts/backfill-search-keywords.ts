import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateSearchKeywords } from '../src/lib/search/search-utils';

async function backfillCollection(collectionName: string) {
  const db = getFirestore(adminApp);
  console.log(`Starting backfill for collection: ${collectionName}...`);

  const PAGE_SIZE = 500;
  let lastDoc: any = null;
  let totalProcessed = 0;
  let updatedTotal = 0;

  while (true) {
    let q = db.collection(collectionName).orderBy('__name__').limit(PAGE_SIZE);
    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }

    const snapshot = await q.get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const keywords = generateSearchKeywords({ ...data, id: doc.id });

      batch.update(doc.ref, { searchKeywords: keywords });
      batchCount++;
      updatedTotal++;
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    totalProcessed += snapshot.docs.length;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`[${collectionName}] Processed ${totalProcessed} documents (Updated: ${updatedTotal})...`);

    if (snapshot.docs.length < PAGE_SIZE) {
      break;
    }
  }

  console.log(`\nFinished backfill for ${collectionName}! Total processed: ${totalProcessed}, Total updated: ${updatedTotal}\n`);
}

async function main() {
  console.log('=== Backfilling searchKeywords for Universal Lookup ===\n');
  await backfillCollection('companies');
  await backfillCollection('leads');
  console.log('=== Backfill completed successfully ===');
}

main().catch(console.error);
