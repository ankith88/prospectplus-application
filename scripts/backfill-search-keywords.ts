import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { generateSearchKeywords } from '../src/lib/search/search-utils';

async function backfillCollection(collectionName: string) {
  const db = getFirestore(adminApp);
  console.log(`Starting backfill for collection: ${collectionName}...`);

  const snapshot = await db.collection(collectionName).get();
  console.log(`Found ${snapshot.docs.length} documents in ${collectionName}`);

  let batch = db.batch();
  let count = 0;
  let updatedTotal = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const keywords = generateSearchKeywords({ ...data, id: doc.id });

    batch.update(doc.ref, { searchKeywords: keywords });
    count++;
    updatedTotal++;

    if (count >= 400) {
      await batch.commit();
      console.log(`Committed batch of ${count} for ${collectionName}. Total updated: ${updatedTotal}`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${count} for ${collectionName}. Total updated: ${updatedTotal}`);
  }

  console.log(`Finished backfill for ${collectionName}! Total: ${updatedTotal}\n`);
}

async function main() {
  console.log('=== Backfilling searchKeywords for Universal Lookup ===\n');
  await backfillCollection('companies');
  await backfillCollection('leads');
  console.log('=== Backfill completed successfully ===');
}

main().catch(console.error);
