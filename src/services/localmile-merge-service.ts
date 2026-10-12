import { getLocalMilePlusDb } from '@/lib/localmile-db';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface LocalMileMergeDetails {
  sourceCompanyId: string;
  hadSourceLmAccount: boolean;
  transferredUsersCount: number;
  transferredJobsCount: number;
  transferredRequestsCount: number;
  transferredScheduledJobsCount: number;
  transferredSubcollectionsCount: number;
}

export interface LocalMileMergeResult {
  success: boolean;
  merged: boolean;
  hadTargetLmAccount: boolean;
  targetCompanyId: string;
  mergedSourceCompanyIds: string[];
  skippedSourceCompanyIds: string[];
  details: LocalMileMergeDetails[];
  message: string;
}

/**
 * Merges duplicate LocalMile Plus account(s) into a master/target account in the localmile-plus database.
 * If both the target and source accounts have an LM account (or if source has an LM account that should be migrated),
 * this function:
 * 1. Merges company document fields (preserving target's primary fields, backfilling missing ones, preserving trial balance).
 * 2. Transfers all company subcollections (address_book, invoices, scheduled_jobs, etc.).
 * 3. Re-associates all users to the target company ID (handling duplicates gracefully).
 * 4. Re-assigns all jobs, requests, and top-level scheduled jobs to the target company ID.
 * 5. Re-associates any communications documents.
 * 6. Deletes the obsolete source company document from localmile-plus.
 * 7. Records an audit activity log on the target lead in ProspectPlus.
 */
export async function mergeLocalMileAccounts(
  targetCompanyId: string,
  sourceCompanyIds: string[] | string
): Promise<LocalMileMergeResult> {
  const targetId = String(targetCompanyId || '').trim();
  const rawSources = Array.isArray(sourceCompanyIds) ? sourceCompanyIds : [sourceCompanyIds];
  const validSourceIds = Array.from(
    new Set(
      rawSources
        .map((id) => String(id || '').trim())
        .filter((id) => Boolean(id) && id !== targetId)
    )
  );

  if (!targetId || validSourceIds.length === 0) {
    return {
      success: true,
      merged: false,
      hadTargetLmAccount: false,
      targetCompanyId: targetId,
      mergedSourceCompanyIds: [],
      skippedSourceCompanyIds: validSourceIds,
      details: [],
      message: 'No valid source company IDs to merge into target.',
    };
  }

  const db = getLocalMilePlusDb();
  const adminDb = getFirestore(adminApp);
  const nowIso = new Date().toISOString();

  // 1. Fetch Target Company in localmile-plus
  const targetRef = db.collection('companies').doc(targetId);
  const targetSnap = await targetRef.get().catch((err) => {
    console.error(`[LocalMile Merge] Error checking target company ${targetId}:`, err);
    return null;
  });

  const hadTargetLmAccount = Boolean(targetSnap && targetSnap.exists);
  let targetData = targetSnap && targetSnap.exists ? targetSnap.data() || {} : {};
  const targetCompanyName = targetData.companyName || targetData.name || '';

  const mergedSourceCompanyIds: string[] = [];
  const skippedSourceCompanyIds: string[] = [];
  const mergeDetailsList: LocalMileMergeDetails[] = [];

  for (const sourceId of validSourceIds) {
    console.log(`[LocalMile Merge] Evaluating source company ${sourceId} for merge into ${targetId}...`);
    const sourceRef = db.collection('companies').doc(sourceId);
    const sourceSnap = await sourceRef.get().catch((err) => {
      console.warn(`[LocalMile Merge] Error checking source company ${sourceId}:`, err);
      return null;
    });

    const hadSourceLmAccount = Boolean(sourceSnap && sourceSnap.exists);

    // If neither target nor source has an LM account, skip this pair
    if (!hadTargetLmAccount && !hadSourceLmAccount) {
      console.log(`[LocalMile Merge] Neither target (${targetId}) nor source (${sourceId}) has an LM account in localmile-plus.`);
      skippedSourceCompanyIds.push(sourceId);
      mergeDetailsList.push({
        sourceCompanyId: sourceId,
        hadSourceLmAccount: false,
        transferredUsersCount: 0,
        transferredJobsCount: 0,
        transferredRequestsCount: 0,
        transferredScheduledJobsCount: 0,
        transferredSubcollectionsCount: 0,
      });
      continue;
    }

    const sourceData = sourceSnap && sourceSnap.exists ? sourceSnap.data() || {} : {};

    // 2. Merge Company Document Fields
    if (hadSourceLmAccount) {
      if (!hadTargetLmAccount) {
        // If target didn't have an LM account yet, provision it using source data
        const newTargetPayload: Record<string, any> = {
          ...sourceData,
          companyId: targetId,
          mergedFromCompanyIds: [sourceId],
          lastMergedAt: nowIso,
          updatedAt: nowIso,
        };
        await targetRef.set(newTargetPayload, { merge: true });
        targetData = newTargetPayload;
      } else {
        // Both target and source have an LM account: merge fields
        const fieldUpdates: Record<string, any> = {};

        // Backfill missing or empty fields from source
        for (const [key, val] of Object.entries(sourceData)) {
          if (key === 'mergedFromCompanyIds' || key === 'lastMergedAt' || key === 'companyId') continue;
          if (targetData[key] === undefined || targetData[key] === null || targetData[key] === '') {
            fieldUpdates[key] = val;
          }
        }

        // Trial balance: preserve minimum remaining trials (prevent resetting consumed trials to 5)
        if (typeof targetData.trial_credits_balance === 'number' && typeof sourceData.trial_credits_balance === 'number') {
          fieldUpdates.trial_credits_balance = Math.min(targetData.trial_credits_balance, sourceData.trial_credits_balance);
        } else if (typeof targetData.trial_credits_balance !== 'number' && typeof sourceData.trial_credits_balance === 'number') {
          fieldUpdates.trial_credits_balance = sourceData.trial_credits_balance;
        }

        // Status: activate if either account was active
        if (targetData.status === 'active' || sourceData.status === 'active') {
          fieldUpdates.status = 'active';
          fieldUpdates.cancelled = false;
        }

        fieldUpdates.mergedFromCompanyIds = FieldValue.arrayUnion(sourceId);
        fieldUpdates.lastMergedAt = nowIso;
        fieldUpdates.updatedAt = nowIso;

        await targetRef.set(fieldUpdates, { merge: true });
      }
    }

    let transferredSubcollectionsCount = 0;

    // 3. Transfer Subcollections from source company doc
    if (hadSourceLmAccount) {
      try {
        const subcollections = await sourceRef.listCollections();
        for (const subcol of subcollections) {
          const subSnap = await subcol.get();
          if (!subSnap.empty) {
            for (const sDoc of subSnap.docs) {
              const targetSubRef = targetRef.collection(subcol.id).doc(sDoc.id);
              const targetSubSnap = await targetSubRef.get().catch(() => null);
              const destRef = targetSubSnap && targetSubSnap.exists
                ? targetRef.collection(subcol.id).doc(`${sDoc.id}-${sourceId}`)
                : targetSubRef;

              const docData = { ...sDoc.data() };
              if (docData.companyId !== undefined) docData.companyId = targetId;
              if (docData.company_id !== undefined) docData.company_id = targetId;
              if (docData.customer_id !== undefined) docData.customer_id = targetId;
              if (docData.netsuiteCustomerId !== undefined) docData.netsuiteCustomerId = targetId;
              if (docData.leadId !== undefined) docData.leadId = targetId;
              docData.mergedFromCompanyId = sourceId;
              docData.updatedAt = nowIso;

              await destRef.set(docData, { merge: true });
              await sDoc.ref.delete().catch(() => {});
              transferredSubcollectionsCount++;
            }
          }
        }
      } catch (subErr) {
        console.warn(`[LocalMile Merge] Warning transferring subcollections for source ${sourceId}:`, subErr);
      }
    }

    // 4. Transfer / Re-assign Users in localmile-plus
    let transferredUsersCount = 0;
    try {
      const [uSnap1, uSnap2] = await Promise.all([
        db.collection('users').where('companyId', '==', sourceId).get().catch(() => null),
        db.collection('users').where('customer_id', '==', sourceId).get().catch(() => null),
      ]);

      const userDocsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      (uSnap1?.docs || []).forEach((d) => userDocsMap.set(d.id, d));
      (uSnap2?.docs || []).forEach((d) => userDocsMap.set(d.id, d));

      for (const userDoc of userDocsMap.values()) {
        const uData = userDoc.data() || {};
        const email = String(uData.email || '').trim().toLowerCase();

        if (email) {
          // Check if an existing distinct user with this email already belongs to the target company
          const targetUsersSnap = await db.collection('users')
            .where('companyId', '==', targetId)
            .where('email', '==', email)
            .get()
            .catch(() => null);

          if (targetUsersSnap && !targetUsersSnap.empty && targetUsersSnap.docs.some((d) => d.id !== userDoc.id)) {
            // Already exists under target; mark duplicate source user as merged
            await userDoc.ref.update({
              status: 'merged',
              disabled: true,
              mergedIntoCompanyId: targetId,
              updatedAt: nowIso,
            }).catch(() => {});
            transferredUsersCount++;
            continue;
          }
        }

        // Re-assign user doc to target
        await userDoc.ref.update({
          companyId: targetId,
          customer_id: targetId,
          mergedFromCompanyId: sourceId,
          updatedAt: nowIso,
        }).catch((err) => {
          console.warn(`[LocalMile Merge] Warning updating user ${userDoc.id}:`, err);
        });
        transferredUsersCount++;
      }
    } catch (userErr) {
      console.warn(`[LocalMile Merge] Warning updating users for source ${sourceId}:`, userErr);
    }

    // 5. Transfer / Re-assign Jobs in localmile-plus
    let transferredJobsCount = 0;
    try {
      const [jSnap1, jSnap2, jSnap3, jSnap4] = await Promise.all([
        db.collection('jobs').where('customer_id', '==', sourceId).get().catch(() => null),
        db.collection('jobs').where('netsuiteCustomerId', '==', sourceId).get().catch(() => null),
        db.collection('jobs').where('customer.netsuiteId', '==', sourceId).get().catch(() => null),
        db.collection('jobs').where('companyId', '==', sourceId).get().catch(() => null),
      ]);

      const jobsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      (jSnap1?.docs || []).forEach((d) => jobsMap.set(d.id, d));
      (jSnap2?.docs || []).forEach((d) => jobsMap.set(d.id, d));
      (jSnap3?.docs || []).forEach((d) => jobsMap.set(d.id, d));
      (jSnap4?.docs || []).forEach((d) => jobsMap.set(d.id, d));

      for (const jobDoc of jobsMap.values()) {
        const jData = jobDoc.data() || {};
        const updates: Record<string, any> = {
          customer_id: targetId,
          netsuiteCustomerId: targetId,
          updatedAt: nowIso,
          mergedFromCompanyId: sourceId,
        };
        if (jData.companyId !== undefined) updates.companyId = targetId;
        if (jData.company_id !== undefined) updates.company_id = targetId;
        if (jData.customer && typeof jData.customer === 'object') {
          updates['customer.netsuiteId'] = targetId;
          if (targetCompanyName) updates['customer.company'] = targetCompanyName;
        }

        await jobDoc.ref.update(updates).catch((err) => {
          console.warn(`[LocalMile Merge] Warning updating job ${jobDoc.id}:`, err);
        });
        transferredJobsCount++;
      }
    } catch (jobErr) {
      console.warn(`[LocalMile Merge] Warning updating jobs for source ${sourceId}:`, jobErr);
    }

    // 6. Transfer / Re-assign Requests in localmile-plus
    let transferredRequestsCount = 0;
    try {
      const [rSnap1, rSnap2, rSnap3, rSnap4] = await Promise.all([
        db.collection('requests').where('customer_id', '==', sourceId).get().catch(() => null),
        db.collection('requests').where('netsuiteCustomerId', '==', sourceId).get().catch(() => null),
        db.collection('requests').where('customer.netsuiteId', '==', sourceId).get().catch(() => null),
        db.collection('requests').where('companyId', '==', sourceId).get().catch(() => null),
      ]);

      const reqsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      (rSnap1?.docs || []).forEach((d) => reqsMap.set(d.id, d));
      (rSnap2?.docs || []).forEach((d) => reqsMap.set(d.id, d));
      (rSnap3?.docs || []).forEach((d) => reqsMap.set(d.id, d));
      (rSnap4?.docs || []).forEach((d) => reqsMap.set(d.id, d));

      for (const reqDoc of reqsMap.values()) {
        const rData = reqDoc.data() || {};
        const updates: Record<string, any> = {
          customer_id: targetId,
          netsuiteCustomerId: targetId,
          updatedAt: nowIso,
          mergedFromCompanyId: sourceId,
        };
        if (rData.companyId !== undefined) updates.companyId = targetId;
        if (rData.company_id !== undefined) updates.company_id = targetId;
        if (rData.customer && typeof rData.customer === 'object') {
          updates['customer.netsuiteId'] = targetId;
          if (targetCompanyName) updates['customer.company'] = targetCompanyName;
        }

        await reqDoc.ref.update(updates).catch((err) => {
          console.warn(`[LocalMile Merge] Warning updating request ${reqDoc.id}:`, err);
        });
        transferredRequestsCount++;
      }
    } catch (reqErr) {
      console.warn(`[LocalMile Merge] Warning updating requests for source ${sourceId}:`, reqErr);
    }

    // 7. Transfer / Re-assign Scheduled Jobs in localmile-plus
    let transferredScheduledJobsCount = 0;
    try {
      const [sSnap1, sSnap2, sSnap3, sSnap4, sSnap5] = await Promise.all([
        db.collection('scheduled_jobs').where('customer_id', '==', sourceId).get().catch(() => null),
        db.collection('scheduled_jobs').where('netsuiteCustomerId', '==', sourceId).get().catch(() => null),
        db.collection('scheduled_jobs').where('companyId', '==', sourceId).get().catch(() => null),
        db.collection('scheduled_jobs').where('company_id', '==', sourceId).get().catch(() => null),
        db.collection('scheduled_jobs').where('leadId', '==', sourceId).get().catch(() => null),
      ]);

      const schedMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      (sSnap1?.docs || []).forEach((d) => schedMap.set(d.id, d));
      (sSnap2?.docs || []).forEach((d) => schedMap.set(d.id, d));
      (sSnap3?.docs || []).forEach((d) => schedMap.set(d.id, d));
      (sSnap4?.docs || []).forEach((d) => schedMap.set(d.id, d));
      (sSnap5?.docs || []).forEach((d) => schedMap.set(d.id, d));

      for (const sDoc of schedMap.values()) {
        const sData = sDoc.data() || {};
        const updates: Record<string, any> = {
          customer_id: targetId,
          netsuiteCustomerId: targetId,
          companyId: targetId,
          company_id: targetId,
          leadId: targetId,
          updatedAt: nowIso,
          mergedFromCompanyId: sourceId,
        };
        if (sData.customer && typeof sData.customer === 'object') {
          updates['customer.netsuiteId'] = targetId;
          if (targetCompanyName) updates['customer.company'] = targetCompanyName;
        }

        await sDoc.ref.update(updates).catch((err) => {
          console.warn(`[LocalMile Merge] Warning updating scheduled job ${sDoc.id}:`, err);
        });
        transferredScheduledJobsCount++;
      }
    } catch (schedErr) {
      console.warn(`[LocalMile Merge] Warning updating scheduled jobs for source ${sourceId}:`, schedErr);
    }

    // 8. Re-associate Communications
    try {
      const [cSnap1, cSnap2] = await Promise.all([
        db.collection('communications').where('customer_id', '==', sourceId).get().catch(() => null),
        db.collection('communications').where('companyId', '==', sourceId).get().catch(() => null),
      ]);
      const commMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      (cSnap1?.docs || []).forEach((d) => commMap.set(d.id, d));
      (cSnap2?.docs || []).forEach((d) => commMap.set(d.id, d));

      for (const commDoc of commMap.values()) {
        await commDoc.ref.update({
          customer_id: targetId,
          companyId: targetId,
          updatedAt: nowIso,
        }).catch(() => {});
      }
    } catch (commErr) {
      console.warn(`[LocalMile Merge] Warning updating communications for source ${sourceId}:`, commErr);
    }

    // 9. Delete Source Company Doc from localmile-plus
    if (hadSourceLmAccount) {
      try {
        await sourceRef.delete();
        console.log(`[LocalMile Merge] Deleted source company document ${sourceId} from localmile-plus.`);
      } catch (delErr) {
        console.warn(`[LocalMile Merge] Warning deleting source company ${sourceId}:`, delErr);
      }
    }

    // 10. Record Activity Log on target in ProspectPlus
    try {
      const targetLeadRef = adminDb.collection('leads').doc(targetId);
      const targetCompRef = adminDb.collection('companies').doc(targetId);
      const [leadSnap, compSnap] = await Promise.all([
        targetLeadRef.get().catch(() => null),
        targetCompRef.get().catch(() => null),
      ]);

      const logPayload = {
        type: 'Update',
        date: nowIso,
        notes: `LocalMile Plus account merged: Merged LM account #${sourceId} into #${targetId}. Transferred ${transferredUsersCount} user(s), ${transferredJobsCount} job(s), ${transferredScheduledJobsCount} scheduled job(s), and ${transferredSubcollectionsCount} subcollection records.`,
        author: 'LocalMile Merge Service',
        source: 'localmile_account_merge',
      };

      if (leadSnap && leadSnap.exists) {
        await targetLeadRef.collection('activity').add(logPayload).catch(() => {});
      }
      if (compSnap && compSnap.exists) {
        await targetCompRef.collection('activity').add(logPayload).catch(() => {});
      }
    } catch (logErr) {
      console.warn(`[LocalMile Merge] Warning recording merge activity log in ProspectPlus:`, logErr);
    }

    mergedSourceCompanyIds.push(sourceId);
    mergeDetailsList.push({
      sourceCompanyId: sourceId,
      hadSourceLmAccount,
      transferredUsersCount,
      transferredJobsCount,
      transferredRequestsCount,
      transferredScheduledJobsCount,
      transferredSubcollectionsCount,
    });
  }

  const merged = mergedSourceCompanyIds.length > 0;
  return {
    success: true,
    merged,
    hadTargetLmAccount,
    targetCompanyId: targetId,
    mergedSourceCompanyIds,
    skippedSourceCompanyIds,
    details: mergeDetailsList,
    message: merged
      ? `Successfully merged ${mergedSourceCompanyIds.length} LocalMile Plus account(s) into company #${targetId}.`
      : 'No matching LocalMile Plus accounts found to merge.',
  };
}
