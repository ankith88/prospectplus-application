import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, DocumentReference } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Recursively copies a document and all of its subcollections from sourceRef to targetRef.
 */
async function copyDocumentWithSubcollections(
  sourceRef: DocumentReference,
  targetRef: DocumentReference,
  dryRun: boolean
): Promise<number> {
  const sourceSnap = await sourceRef.get();
  if (!sourceSnap.exists) {
    console.log(`Source document ${sourceRef.path} does not exist.`);
    return 0;
  }

  let copiedDocsCount = 1;
  const data = sourceSnap.data() || {};
  console.log(`[DOC] Copying ${sourceRef.path} -> ${targetRef.path}`);

  if (!dryRun) {
    await targetRef.set(data, { merge: true });
  }

  // Discover and copy all subcollections recursively
  const subcollections = await sourceRef.listCollections();
  for (const subcol of subcollections) {
    const subcolSnap = await subcol.get();
    console.log(`  [SUBCOLLECTION] ${subcol.id} (${subcolSnap.size} documents)`);

    for (const doc of subcolSnap.docs) {
      const sourceSubDocRef = doc.ref;
      const targetSubDocRef = targetRef.collection(subcol.id).doc(doc.id);
      copiedDocsCount += await copyDocumentWithSubcollections(sourceSubDocRef, targetSubDocRef, dryRun);
    }
  }

  return copiedDocsCount;
}

async function main() {
  const companyId = '2010337';
  const isExecute = process.argv.includes('--execute');
  const dryRun = !isExecute;

  console.log(`==================================================`);
  console.log(` Copy Company Document to Leads Collection`);
  console.log(` Company ID: ${companyId}`);
  console.log(` Mode: ${dryRun ? 'DRY RUN (Previewing actions, no data written)' : 'EXECUTE (Writing to Firestore)'}`);
  console.log(`==================================================\n`);

  const companyRef = db.collection('companies').doc(companyId);
  const leadRef = db.collection('leads').doc(companyId);

  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    console.error(`Error: Document 'companies/${companyId}' was not found.`);
    process.exit(1);
  }

  const leadSnap = await leadRef.get();
  if (leadSnap.exists) {
    console.log(`Notice: Target document 'leads/${companyId}' already exists. Data will be merged.\n`);
  } else {
    console.log(`Target document 'leads/${companyId}' does not exist yet. It will be created.\n`);
  }

  const totalCopied = await copyDocumentWithSubcollections(companyRef, leadRef, dryRun);

  console.log(`\n==================================================`);
  console.log(` Summary:`);
  console.log(` Total documents processed (main + subcollection docs): ${totalCopied}`);
  if (dryRun) {
    console.log(` STATUS: DRY RUN COMPLETE. No data was modified.`);
    console.log(` To perform actual copy, execute: npx tsx scripts/copy-company-to-lead.ts --execute`);
  } else {
    console.log(` STATUS: EXECUTION COMPLETE. All data copied successfully.`);
  }
  console.log(`==================================================`);
}

main().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
