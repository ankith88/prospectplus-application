import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

export type CanonicalAccountType = 'Secure Cash' | 'NeoPost' | 'Corporate / Multisite' | 'J2' | 'BAU';

function resolveAccountType(data: any): CanonicalAccountType {
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

/**
 * Scheduled Cloud Function that runs daily at 2:00 AM Sydney Time
 * to ensure all leads and companies have their canonical accountType persisted.
 */
export const syncAccountTypesDaily = functions
  .region('australia-southeast1')
  .runWith({ memory: '1GB', timeoutSeconds: 540 })
  .pubsub.schedule('0 2 * * *')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    functions.logger.info('Starting daily scheduled syncAccountTypesDaily run...');

    const db = admin.firestore();
    const collections = ['leads', 'companies'];

    for (const colName of collections) {
      try {
        const snapshot = await db.collection(colName).get();
        const docsToUpdate: Array<{ ref: FirebaseFirestore.DocumentReference; newType: CanonicalAccountType }> = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const currentAccountType = data.accountType;
          const resolvedType = resolveAccountType(data);

          if (currentAccountType !== resolvedType) {
            docsToUpdate.push({
              ref: docSnap.ref,
              newType: resolvedType,
            });
          }
        });

        functions.logger.info(`[${colName}] Scanned ${snapshot.size} docs. Found ${docsToUpdate.length} requiring update.`);

        const CHUNK_SIZE = 450;
        let updatedCount = 0;
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

        functions.logger.info(`[${colName}] Successfully updated ${updatedCount} documents.`);
      } catch (err: any) {
        functions.logger.error(`[${colName}] Error syncing account types:`, err);
      }
    }

    functions.logger.info('Finished daily syncAccountTypesDaily run.');
    return null;
  });
