import { adminApp } from '../src/lib/firebase-admin';

/**
 * One-off script to copy main territory (`territoryJson`) to TGE territory (`tgeSuburbsJSON`)
 * for all documents in the `franchisees` collection.
 * 
 * Usage:
 *   Dry run (default):  npx tsx scripts/copy-main-territory-to-tge.ts
 *   Execute mode:       npx tsx scripts/copy-main-territory-to-tge.ts --execute
 *   Force overwrite:    npx tsx scripts/copy-main-territory-to-tge.ts --execute --overwrite
 */

async function main() {
  const isExecute = process.argv.includes('--execute');
  const forceOverwrite = process.argv.includes('--overwrite');
  const dryRun = !isExecute;

  console.log(`==================================================`);
  console.log(` Copy Main Territory to TGE Territory`);
  console.log(` Collection: franchisees`);
  console.log(` Mode: ${dryRun ? 'DRY RUN (Previewing changes, no data written)' : 'EXECUTE (Writing updates to Firestore)'}`);
  console.log(` Overwrite existing TGE territory: ${forceOverwrite ? 'YES' : 'NO (Skip if tgeSuburbsJSON is non-empty)'}`);
  console.log(`==================================================\n`);

  const db = adminApp.firestore();
  const snapshot = await db.collection('franchisees').get();

  if (snapshot.empty) {
    console.log('No franchisee documents found.');
    return;
  }

  let totalDocs = snapshot.size;
  let updatedDocsCount = 0;
  let skippedDocsCount = 0;
  let totalSuburbsCopied = 0;

  const batchSize = 500;
  let currentBatch = db.batch();
  let currentBatchOpCount = 0;

  for (const doc of snapshot.docs) {
    const franchiseeId = doc.id;
    const data = doc.data();
    const franchiseeName = data.name || data.franchiseeName || franchiseeId;

    const mainTerritory = Array.isArray(data.territoryJson) ? data.territoryJson : [];
    const tgeTerritory = Array.isArray(data.tgeSuburbsJSON) ? data.tgeSuburbsJSON : [];

    // Skip if main territory is empty
    if (mainTerritory.length === 0) {
      console.log(`[SKIP] ${franchiseeName} (${franchiseeId}): Main territory (territoryJson) is empty or missing.`);
      skippedDocsCount++;
      continue;
    }

    // Skip if TGE territory already exists and overwrite flag is not passed
    if (tgeTerritory.length > 0 && !forceOverwrite) {
      console.log(`[SKIP] ${franchiseeName} (${franchiseeId}): TGE territory already has ${tgeTerritory.length} suburbs (use --overwrite to force update).`);
      skippedDocsCount++;
      continue;
    }

    // Deep clone main territory to avoid reference issues
    const copiedTgeTerritory = JSON.parse(JSON.stringify(mainTerritory));

    console.log(`[UPDATE] ${franchiseeName} (${franchiseeId}): Copying ${mainTerritory.length} suburbs from territoryJson to tgeSuburbsJSON.`);

    if (!dryRun) {
      const docRef = db.collection('franchisees').doc(franchiseeId);
      currentBatch.update(docRef, {
        tgeSuburbsJSON: copiedTgeTerritory,
        updatedAt: new Date().toISOString(),
      });

      currentBatchOpCount++;

      if (currentBatchOpCount >= batchSize) {
        await currentBatch.commit();
        currentBatch = db.batch();
        currentBatchOpCount = 0;
      }
    }

    updatedDocsCount++;
    totalSuburbsCopied += mainTerritory.length;
  }

  // Commit remaining batch updates if any
  if (!dryRun && currentBatchOpCount > 0) {
    await currentBatch.commit();
  }

  console.log(`\n==================================================`);
  console.log(` Summary:`);
  console.log(` Total Franchisees Evaluated: ${totalDocs}`);
  console.log(` Franchisees Updated:          ${updatedDocsCount}`);
  console.log(` Franchisees Skipped:          ${skippedDocsCount}`);
  console.log(` Total Suburbs Copied:         ${totalSuburbsCopied}`);
  console.log(`--------------------------------------------------`);
  if (dryRun) {
    console.log(` STATUS: DRY RUN COMPLETE. No data was modified in Firestore.`);
    console.log(` To execute the updates, run:`);
    console.log(`   npx tsx scripts/copy-main-territory-to-tge.ts --execute`);
  } else {
    console.log(` STATUS: EXECUTION COMPLETE. TGE territories successfully updated in Firestore.`);
  }
  console.log(`==================================================`);
}

main().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
