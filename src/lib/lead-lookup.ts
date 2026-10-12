import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import { Lead } from '@/lib/types';

const db = getFirestore(adminApp);

/**
 * Robustly searches for a Lead or Company in Firestore by doc ID or NetSuite/ProspectPlus internal IDs.
 * Searches across both 'companies' and 'leads' collections, handling String and Number data types.
 */
export async function findLeadByIdOrInternalId(rawId: string): Promise<{ lead: Lead; leadId: string; collectionName: 'companies' | 'leads' } | null> {
  if (!rawId) return null;
  const cleanId = String(rawId).trim();
  if (!cleanId) return null;

  const collections = ['companies', 'leads'] as const;

  // 1. Direct Document ID match in companies, then leads
  for (const colName of collections) {
    try {
      const docSnap = await db.collection(colName).doc(cleanId).get();
      if (docSnap.exists) {
        return { lead: { id: docSnap.id, ...docSnap.data() } as Lead, leadId: docSnap.id, collectionName: colName };
      }
    } catch (err) {
      // Ignore format errors
    }
  }

  // 2. Candidate fields in Firestore documents
  const searchFields = [
    'internalid',
    'internalId',
    'netsuiteId',
    'prospectPlusId',
    'prospectplusId',
    'prospect_plus_id',
    'salesRecordInternalId',
    'callId',
    'aircallId',
    'aircallCallId',
    'lastCallId',
    'id'
  ];

  const strippedCallId = cleanId.replace(/^(aircall|call)[\s\-_:]*/i, '');
  const isNumeric = !isNaN(Number(cleanId)) && cleanId.length > 0;
  const numVal = isNumeric ? Number(cleanId) : null;
  const isStrippedNumeric = !isNaN(Number(strippedCallId)) && strippedCallId.length > 0;
  const strippedNumVal = isStrippedNumeric ? Number(strippedCallId) : null;

  const candidateQueries: Promise<{ lead: Lead; leadId: string; collectionName: 'companies' | 'leads' } | null>[] = [];

  for (const colName of collections) {
    // Array fields: recentCallIds and searchKeywords
    for (const cId of [cleanId, strippedCallId].filter(Boolean)) {
      candidateQueries.push(
        db.collection(colName).where('recentCallIds', 'array-contains', cId).limit(1).get()
          .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
          .catch(() => null)
      );
      candidateQueries.push(
        db.collection(colName).where('searchKeywords', 'array-contains', cId).limit(1).get()
          .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
          .catch(() => null)
      );
    }

    // Direct scalar fields
    for (const field of searchFields) {
      candidateQueries.push(
        db.collection(colName).where(field, '==', cleanId).limit(1).get()
          .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
          .catch(() => null)
      );

      if (strippedCallId !== cleanId) {
        candidateQueries.push(
          db.collection(colName).where(field, '==', strippedCallId).limit(1).get()
            .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
            .catch(() => null)
        );
      }

      if (numVal !== null) {
        candidateQueries.push(
          db.collection(colName).where(field, '==', numVal).limit(1).get()
            .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
            .catch(() => null)
        );
      }

      if (strippedNumVal !== null && strippedNumVal !== numVal) {
        candidateQueries.push(
          db.collection(colName).where(field, '==', strippedNumVal).limit(1).get()
            .then(snap => snap.empty ? null : { lead: { id: snap.docs[0].id, ...snap.docs[0].data() } as Lead, leadId: snap.docs[0].id, collectionName: colName })
            .catch(() => null)
        );
      }
    }
  }

  // 3. Activity and Transcript collection groups
  const candidateCallIds = [cleanId, strippedCallId].filter(Boolean);
  for (const cId of candidateCallIds) {
    candidateQueries.push(
      db.collectionGroup('activity').where('callId', '==', cId).limit(1).get()
        .then(async snap => {
          if (snap.empty) return null;
          const parentRef = snap.docs[0].ref.parent.parent;
          if (!parentRef) return null;
          const pSnap = await parentRef.get();
          if (!pSnap.exists) return null;
          const colName = parentRef.parent?.id as 'companies' | 'leads';
          return { lead: { id: pSnap.id, ...pSnap.data() } as Lead, leadId: pSnap.id, collectionName: colName };
        })
        .catch(() => null)
    );
    candidateQueries.push(
      db.collectionGroup('transcripts').where('callId', '==', cId).limit(1).get()
        .then(async snap => {
          if (snap.empty) return null;
          const parentRef = snap.docs[0].ref.parent.parent;
          if (!parentRef) return null;
          const pSnap = await parentRef.get();
          if (!pSnap.exists) return null;
          const colName = parentRef.parent?.id as 'companies' | 'leads';
          return { lead: { id: pSnap.id, ...pSnap.data() } as Lead, leadId: pSnap.id, collectionName: colName };
        })
        .catch(() => null)
    );

    if (numVal !== null) {
      candidateQueries.push(
        db.collectionGroup('activity').where('callId', '==', numVal).limit(1).get()
          .then(async snap => {
            if (snap.empty) return null;
            const parentRef = snap.docs[0].ref.parent.parent;
            if (!parentRef) return null;
            const pSnap = await parentRef.get();
            if (!pSnap.exists) return null;
            const colName = parentRef.parent?.id as 'companies' | 'leads';
            return { lead: { id: pSnap.id, ...pSnap.data() } as Lead, leadId: pSnap.id, collectionName: colName };
          })
          .catch(() => null)
      );
      candidateQueries.push(
        db.collectionGroup('transcripts').where('callId', '==', numVal).limit(1).get()
          .then(async snap => {
            if (snap.empty) return null;
            const parentRef = snap.docs[0].ref.parent.parent;
            if (!parentRef) return null;
            const pSnap = await parentRef.get();
            if (!pSnap.exists) return null;
            const colName = parentRef.parent?.id as 'companies' | 'leads';
            return { lead: { id: pSnap.id, ...pSnap.data() } as Lead, leadId: pSnap.id, collectionName: colName };
          })
          .catch(() => null)
      );
    }
  }

  const results = await Promise.all(candidateQueries);
  const found = results.find(r => r !== null);
  if (found) return found;

  return null;
}
