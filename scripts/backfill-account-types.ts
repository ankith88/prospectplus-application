import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export type CanonicalAccountType = 'Secure Cash' | 'NeoPost' | 'Corporate / Multisite' | 'J2' | 'BAU';

export function resolveAccountType(data: any): CanonicalAccountType {
  const rawType = String(data.accountType || '').trim();
  const source = String(data.source || data.leadSource || data.customerSource || data.marketingSource || '').toLowerCase().trim();
  const name = String(data.companyName || data.name || '').toLowerCase().trim();
  const scfNumber = String(data.scfNumber || data.signedScfNumber || '').toLowerCase().trim();
  const leadType = String(data.leadType || '').toLowerCase().trim();
  const bucket = String(data.bucket || data.leadBucket || '').toLowerCase().trim();

  // 1. Secure Cash Check
  if (
    rawType.toLowerCase() === 'secure cash' ||
    source.includes('secure cash') ||
    source.includes('securecash') ||
    source === 'secure_cash' ||
    name.startsWith('sc -') ||
    name.startsWith('sc-') ||
    name.startsWith('[sc]') ||
    name.includes('secure cash') ||
    scfNumber.startsWith('sc-') ||
    scfNumber.includes('sc-') ||
    bucket === 'secure_cash' ||
    bucket === 'securecash'
  ) {
    return 'Secure Cash';
  }

  // 2. NeoPost Check
  if (
    rawType.toLowerCase() === 'neopost' ||
    source.includes('neopost') ||
    source === 'neopost' ||
    name.startsWith('neo -') ||
    name.startsWith('neo-') ||
    name.startsWith('[neo]') ||
    name.includes('neopost') ||
    scfNumber.startsWith('neo-') ||
    scfNumber.startsWith('np-') ||
    bucket === 'neopost'
  ) {
    return 'NeoPost';
  }

  // 3. Corporate / Multisite Check
  if (
    rawType === 'Corporate / Multisite' ||
    rawType === 'Corporate' ||
    rawType === 'Multisite' ||
    data.isMultiSiteParent === true ||
    data.isCorporateAccount === true ||
    data.isParent === true ||
    leadType === 'parent' ||
    leadType === 'corporate' ||
    leadType === 'multisite' ||
    bucket === 'multisite' ||
    Boolean(data.parentLeadId)
  ) {
    return 'Corporate / Multisite';
  }

  // 4. J2 Check
  if (
    rawType === 'J2' ||
    leadType === 'j2' ||
    source.includes('j2') ||
    (bucket === 'outbound' && (data.originBucket === 'j2' || source === 'j2' || leadType === 'j2'))
  ) {
    return 'J2';
  }

  // 5. Default: BAU
  return 'BAU';
}

async function backfillCollection(collectionName: 'leads' | 'companies') {
  console.log(`\n======================================================`);
  console.log(`  Processing Firestore collection: '${collectionName}'`);
  console.log(`======================================================`);

  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`No documents found in '${collectionName}'.`);
    return { total: 0, updated: 0, skipped: 0, breakdown: {} };
  }

  console.log(`Total documents to inspect: ${snapshot.size}`);

  let updatedCount = 0;
  let skippedCount = 0;
  const breakdown: Record<CanonicalAccountType, number> = {
    'Secure Cash': 0,
    'NeoPost': 0,
    'Corporate / Multisite': 0,
    'J2': 0,
    'BAU': 0,
  };

  const docsToUpdate: Array<{ ref: FirebaseFirestore.DocumentReference; currentType: string; newType: CanonicalAccountType }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const currentAccountType = data.accountType;
    const resolvedType = resolveAccountType(data);

    breakdown[resolvedType]++;

    if (currentAccountType !== resolvedType) {
      docsToUpdate.push({
        ref: docSnap.ref,
        currentType: currentAccountType ?? '(undefined)',
        newType: resolvedType,
      });
    } else {
      skippedCount++;
    }
  }

  console.log(`Identified ${docsToUpdate.length} documents requiring 'accountType' update (${skippedCount} already match).`);

  // Batch updates in chunks of 450
  const CHUNK_SIZE = 450;
  for (let i = 0; i < docsToUpdate.length; i += CHUNK_SIZE) {
    const chunk = docsToUpdate.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      batch.update(item.ref, {
        accountType: item.newType,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
    updatedCount += chunk.length;
    console.log(`[${collectionName}] Committed batch: ${updatedCount} / ${docsToUpdate.length} updated...`);
  }

  console.log(`\nSummary for '${collectionName}':`);
  console.log(`  - Total scanned: ${snapshot.size}`);
  console.log(`  - Successfully updated: ${updatedCount}`);
  console.log(`  - Already up-to-date: ${skippedCount}`);
  console.log(`  - Breakdown by Account Type:`, breakdown);

  return { total: snapshot.size, updated: updatedCount, skipped: skippedCount, breakdown };
}

async function run() {
  console.log('Starting Backfill: Account Type Classification in Firestore...');
  const startTime = Date.now();

  try {
    const leadsResult = await backfillCollection('leads');
    const companiesResult = await backfillCollection('companies');

    const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n======================================================`);
    console.log(`  BACKFILL COMPLETE IN ${totalDurationSec}s`);
    console.log(`======================================================`);
    console.log(`Leads: ${leadsResult.updated} updated (${leadsResult.skipped} already matched)`);
    console.log(`Companies: ${companiesResult.updated} updated (${companiesResult.skipped} already matched)`);
  } catch (error) {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  }

  process.exit(0);
}

run();
