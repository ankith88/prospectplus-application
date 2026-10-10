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

  for (const colName of collections) {
    for (const field of searchFields) {
      // Query string value
      const snapString = await db.collection(colName).where(field, '==', cleanId).limit(1).get();
      if (!snapString.empty) {
        const doc = snapString.docs[0];
        return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
      }

      if (strippedCallId !== cleanId) {
        const snapStripped = await db.collection(colName).where(field, '==', strippedCallId).limit(1).get();
        if (!snapStripped.empty) {
          const doc = snapStripped.docs[0];
          return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
        }
      }

      // Query numeric value if numeric
      if (numVal !== null) {
        const snapNum = await db.collection(colName).where(field, '==', numVal).limit(1).get();
        if (!snapNum.empty) {
          const doc = snapNum.docs[0];
          return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
        }
      }

      if (strippedNumVal !== null && strippedNumVal !== numVal) {
        const snapStrippedNum = await db.collection(colName).where(field, '==', strippedNumVal).limit(1).get();
        if (!snapStrippedNum.empty) {
          const doc = snapStrippedNum.docs[0];
          return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
        }
      }
    }
  }

  // 3. Check activity / transcript collection groups for AirCall Call ID
  try {
    const candidateCallIds = [cleanId, strippedCallId].filter(Boolean);
    for (const cId of candidateCallIds) {
      const actSnap = await db.collectionGroup('activity').where('callId', '==', cId).limit(1).get();
      if (!actSnap.empty) {
        const parentRef = actSnap.docs[0].ref.parent.parent;
        if (parentRef) {
          const parentSnap = await parentRef.get();
          if (parentSnap.exists) {
            const colName = parentRef.parent?.id as 'companies' | 'leads';
            return { lead: { id: parentSnap.id, ...parentSnap.data() } as Lead, leadId: parentSnap.id, collectionName: colName };
          }
        }
      }
      if (numVal !== null) {
        const actNumSnap = await db.collectionGroup('activity').where('callId', '==', numVal).limit(1).get();
        if (!actNumSnap.empty) {
          const parentRef = actNumSnap.docs[0].ref.parent.parent;
          if (parentRef) {
            const parentSnap = await parentRef.get();
            if (parentSnap.exists) {
              const colName = parentRef.parent?.id as 'companies' | 'leads';
              return { lead: { id: parentSnap.id, ...parentSnap.data() } as Lead, leadId: parentSnap.id, collectionName: colName };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Activity collection group lookup in lead-lookup error:', err);
  }

  return null;
}
