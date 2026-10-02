import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export type CanonicalAccountType = 'Secure Cash' | 'NeoPost' | 'Corporate / Multisite' | 'J2' | 'BAU';

/**
 * Resolves the canonical accountType for any lead or company object.
 */
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

  // 5. Default: BAU (Business As Usual)
  return 'BAU';
}

/**
 * Synchronizes and persists the canonical accountType field directly in Firestore.
 */
export async function syncAccountTypes(options: { collectionLimit?: number } = {}) {
  const db = getFirestore(adminApp);
  const collections: Array<'leads' | 'companies'> = ['leads', 'companies'];
  const summary: Record<string, { total: number; updated: number; skipped: number; breakdown: Record<string, number> }> = {};

  for (const colName of collections) {
    let queryRef = db.collection(colName) as FirebaseFirestore.Query;
    if (options.collectionLimit) {
      queryRef = queryRef.limit(options.collectionLimit);
    }

    const snapshot = await queryRef.get();
    let updatedCount = 0;
    let skippedCount = 0;
    const breakdown: Record<CanonicalAccountType, number> = {
      'Secure Cash': 0,
      'NeoPost': 0,
      'Corporate / Multisite': 0,
      'J2': 0,
      'BAU': 0,
    };

    const docsToUpdate: Array<{ ref: FirebaseFirestore.DocumentReference; newType: CanonicalAccountType }> = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const currentAccountType = data.accountType;
      const resolvedType = resolveAccountType(data);

      breakdown[resolvedType] = (breakdown[resolvedType] || 0) + 1;

      if (currentAccountType !== resolvedType) {
        docsToUpdate.push({
          ref: docSnap.ref,
          newType: resolvedType,
        });
      } else {
        skippedCount++;
      }
    }

    // Commit in batches of 450
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
    }

    summary[colName] = {
      total: snapshot.size,
      updated: updatedCount,
      skipped: skippedCount,
      breakdown,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    summary,
  };
}
