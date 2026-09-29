import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const isDryRun = !process.argv.includes('--apply');
const BATCH_SIZE = 400;

async function main() {
  console.log('================================================================');
  console.log(`🧹 INVOICE ITEMS CLEANUP: Delete 'items' field from company invoices`);
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (No changes will be written)' : '⚡ LIVE APPLY (Modifying Firestore)'}`);
  console.log('================================================================\n');

  console.log('Streaming documents from collectionGroup("invoices")...');
  const stream = db.collectionGroup('invoices').select('items').stream();

  let totalCompanyInvoices = 0;
  let targetCompanyDocs: FirebaseFirestore.DocumentReference[] = [];
  let totalCompanyWithItems = 0;
  let samplePaths: string[] = [];

  let batch = db.batch();
  let currentBatchCount = 0;
  let totalUpdated = 0;
  let batchIndex = 0;
  const startTime = Date.now();

  for await (const chunk of stream) {
    const doc = chunk as unknown as FirebaseFirestore.QueryDocumentSnapshot;
    const path = doc.ref.path;
    const data = doc.data();
    const hasItems = data && Object.prototype.hasOwnProperty.call(data, 'items') && data.items !== undefined;

    if (path.startsWith('companies/')) {
      totalCompanyInvoices++;

      if (hasItems) {
        totalCompanyWithItems++;

        if (samplePaths.length < 5) {
          samplePaths.push(path);
        }

        if (!isDryRun) {
          batch.update(doc.ref, {
            items: FieldValue.delete(),
          });
          currentBatchCount++;

          if (currentBatchCount >= BATCH_SIZE) {
            batchIndex++;
            await batch.commit();
            totalUpdated += currentBatchCount;
            const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`  ✓ Committed batch #${batchIndex} (${totalUpdated} documents updated so far, ${elapsedSec}s)...`);
            batch = db.batch();
            currentBatchCount = 0;
          }
        }
      }
    }
  }

  // Commit any remaining writes in the last batch if applying
  if (!isDryRun && currentBatchCount > 0) {
    batchIndex++;
    await batch.commit();
    totalUpdated += currentBatchCount;
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ Committed final batch #${batchIndex} (${totalUpdated} total documents updated, ${elapsedSec}s).`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n📊 Summary Report:');
  console.log(`- Total company invoices scanned: ${totalCompanyInvoices.toLocaleString()}`);
  console.log(`- Company invoices with 'items' field: ${totalCompanyWithItems.toLocaleString()}`);
  console.log(`- Duration: ${durationSec}s`);

  if (samplePaths.length > 0) {
    console.log('\nSample target paths:');
    samplePaths.forEach((p, idx) => console.log(`  ${idx + 1}. ${p}`));
  }

  if (isDryRun) {
    console.log('\n----------------------------------------------------------------');
    console.log(`ℹ️ DRY RUN COMPLETE: ${totalCompanyWithItems.toLocaleString()} company invoice documents will be modified.`);
    console.log(`👉 To execute the deletion in Firestore, run:`);
    console.log(`   npx tsx scripts/delete-company-invoice-items.ts --apply`);
    console.log('----------------------------------------------------------------\n');
    return;
  }

  console.log('\n🔎 Running post-cleanup verification scan...');
  let remainingWithItems = 0;
  const verifyStream = db.collectionGroup('invoices').select('items').stream();

  for await (const chunk of verifyStream) {
    const doc = chunk as unknown as FirebaseFirestore.QueryDocumentSnapshot;
    if (doc.ref.path.startsWith('companies/')) {
      const data = doc.data();
      if (data && Object.prototype.hasOwnProperty.call(data, 'items') && data.items !== undefined) {
        remainingWithItems++;
      }
    }
  }

  console.log('\n================================================================');
  if (remainingWithItems === 0) {
    console.log(`🎉 SUCCESS: Successfully removed 'items' field from all ${totalUpdated.toLocaleString()} company invoices.`);
    console.log(`   Verification confirmed 0 company invoices retain the 'items' field.`);
  } else {
    console.warn(`⚠️ Warning: ${remainingWithItems.toLocaleString()} company invoices still have the 'items' field.`);
  }
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during invoice cleanup:', err);
  process.exit(1);
});
