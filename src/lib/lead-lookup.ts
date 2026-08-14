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
    'id'
  ];

  const isNumeric = !isNaN(Number(cleanId)) && cleanId.length > 0;
  const numVal = isNumeric ? Number(cleanId) : null;

  for (const colName of collections) {
    for (const field of searchFields) {
      // Query string value
      const snapString = await db.collection(colName).where(field, '==', cleanId).limit(1).get();
      if (!snapString.empty) {
        const doc = snapString.docs[0];
        return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
      }

      // Query numeric value if numeric
      if (numVal !== null) {
        const snapNum = await db.collection(colName).where(field, '==', numVal).limit(1).get();
        if (!snapNum.empty) {
          const doc = snapNum.docs[0];
          return { lead: { id: doc.id, ...doc.data() } as Lead, leadId: doc.id, collectionName: colName };
        }
      }
    }
  }

  return null;
}
