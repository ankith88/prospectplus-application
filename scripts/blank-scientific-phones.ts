import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateSearchKeywords } from '../src/lib/search/search-utils';

const db = getFirestore(adminApp);

/**
 * Checks if a value is a scientific notation string or number (e.g. "1.30E+09", "1.80E+09", "4.39E+08").
 */
export function isScientificNotationPhone(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  
  const str = String(val).trim();
  if (!str) return false;

  // Patterns:
  // 1. Standard exponential notation: 1.30E+09, 1.3E+9, 3.53E+08, 1e10
  // 2. Contains E+ or e+ or E- or e- with surrounding digits: e.g. 1.30E+09
  // 3. Compact scientific: 1.30E9, 1.30e9
  return (
    /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/i.test(str) ||
    /^\d+(\.\d+)?[eE]\d+$/i.test(str) ||
    /\d+[eE][+-]\d+/.test(str)
  );
}

interface UpdateItem {
  type: 'lead' | 'company' | 'contact';
  docRef: FirebaseFirestore.DocumentReference;
  leadId?: string;
  name: string;
  field: string;
  originalValue: string;
  allLeadData?: any;
}

async function run() {
  const isApply = process.argv.includes('--apply') || process.argv.includes('--execute');
  console.log(`\n======================================================`);
  console.log(`🔍 Scanning for corrupted scientific phone numbers...`);
  console.log(`Mode: ${isApply ? '🚀 APPLY CHANGES (LIVE WRITE)' : '🛡️ DRY RUN (No writes will be made. Pass --apply to execute.)'}`);
  console.log(`======================================================\n`);

  const updates: UpdateItem[] = [];

  // 1. Scan Leads collection
  console.log(`[1/4] Scanning 'leads' collection...`);
  const leadsSnap = await db.collection('leads').get();
  console.log(`Scanned ${leadsSnap.size} leads.`);

  const phoneFields = ['customerPhone', 'phone', 'contactPhone', 'mobile', 'customerServicePhone'];

  for (const doc of leadsSnap.docs) {
    const data = doc.data();
    for (const field of phoneFields) {
      const val = data[field];
      if (isScientificNotationPhone(val)) {
        updates.push({
          type: 'lead',
          docRef: doc.ref,
          leadId: doc.id,
          name: `${data.companyName || 'Unknown Lead'} (${data.prospectPlusId || doc.id})`,
          field,
          originalValue: String(val),
          allLeadData: data,
        });
      }
    }
  }

  // 2. Scan Leads Contacts Subcollection
  console.log(`[2/4] Scanning 'contacts' subcollections across all leads...`);
  const contactsSnap = await db.collectionGroup('contacts').get();
  console.log(`Scanned ${contactsSnap.size} contacts.`);

  const contactPhoneFields = ['phone', 'mobile', 'workPhone', 'contactPhone'];

  for (const doc of contactsSnap.docs) {
    const data = doc.data();
    for (const field of contactPhoneFields) {
      const val = data[field];
      if (isScientificNotationPhone(val)) {
        const parentLeadId = doc.ref.parent.parent?.id;
        updates.push({
          type: 'contact',
          docRef: doc.ref,
          leadId: parentLeadId,
          name: `${data.name || data.firstName || 'Unknown Contact'} (Path: ${doc.ref.path})`,
          field,
          originalValue: String(val),
        });
      }
    }
  }

  // 3. Scan Companies collection
  console.log(`[3/4] Scanning 'companies' collection...`);
  const companiesSnap = await db.collection('companies').get();
  console.log(`Scanned ${companiesSnap.size} companies.`);

  for (const doc of companiesSnap.docs) {
    const data = doc.data();
    for (const field of phoneFields) {
      const val = data[field];
      if (isScientificNotationPhone(val)) {
        updates.push({
          type: 'company',
          docRef: doc.ref,
          name: `${data.companyName || 'Unknown Company'} (${doc.id})`,
          field,
          originalValue: String(val),
          allLeadData: data,
        });
      }
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 Scan Results: Found ${updates.length} corrupted phone fields across database.`);
  console.log(`------------------------------------------------------\n`);

  if (updates.length === 0) {
    console.log(`✅ No corrupted phone numbers found. Everything is clean!`);
    return;
  }

  // Print all targets
  updates.forEach((item, index) => {
    console.log(`${index + 1}. [${item.type.toUpperCase()}] ${item.name}`);
    console.log(`   Field: ${item.field} = "${item.originalValue}" -> will be blanked to ""`);
  });

  if (!isApply) {
    console.log(`\n🛡️ DRY RUN COMPLETE. 0 documents modified.`);
    console.log(`👉 To blank out these phone numbers, run:`);
    console.log(`   npx tsx scripts/blank-scientific-phones.ts --apply\n`);
    return;
  }

  console.log(`\n🚀 Applying updates in Firestore...`);

  // Group updates by document to avoid duplicate batch writes to the same doc
  const docUpdateMap = new Map<string, { docRef: FirebaseFirestore.DocumentReference; type: string; leadId?: string; name: string; fieldsToBlank: Record<string, string>; allData?: any }>();

  for (const item of updates) {
    const docId = item.docRef.path;
    if (!docUpdateMap.has(docId)) {
      docUpdateMap.set(docId, {
        docRef: item.docRef,
        type: item.type,
        leadId: item.leadId,
        name: item.name,
        fieldsToBlank: {},
        allData: item.allLeadData,
      });
    }
    docUpdateMap.get(docId)!.fieldsToBlank[item.field] = '';
  }

  // Batch writes in chunks of 400
  const docEntries = Array.from(docUpdateMap.values());
  const CHUNK_SIZE = 400;
  let modifiedCount = 0;

  for (let i = 0; i < docEntries.length; i += CHUNK_SIZE) {
    const chunk = docEntries.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();

    for (const entry of chunk) {
      const updatePayload: Record<string, any> = {
        ...entry.fieldsToBlank,
        updatedAt: new Date().toISOString(),
      };

      // If this is a lead or company, recompute searchKeywords so the bad phone is removed from search
      if ((entry.type === 'lead' || entry.type === 'company') && entry.allData) {
        const updatedData = { ...entry.allData, ...entry.fieldsToBlank, id: entry.docRef.id };
        const newKeywords = generateSearchKeywords(updatedData);
        updatePayload.searchKeywords = newKeywords;
      }

      batch.update(entry.docRef, updatePayload);

      // If lead, also log an activity entry
      if (entry.type === 'lead' && entry.leadId) {
        const activityRef = db.collection('leads').doc(entry.leadId).collection('activity').doc();
        const clearedFieldsList = Object.keys(entry.fieldsToBlank).join(', ');
        batch.set(activityRef, {
          type: 'Update',
          date: new Date().toISOString(),
          notes: `Cleared corrupted phone number field(s) (${clearedFieldsList}) containing scientific notation.`,
          author: 'System Data Clean Script',
        });
      }

      modifiedCount++;
    }

    await batch.commit();
    console.log(`Committed batch of ${chunk.length} document updates.`);
  }

  console.log(`\n✅ Successfully updated ${modifiedCount} documents! All corrupted scientific phones have been blanked out.`);
}

run().catch((err) => {
  console.error('❌ Script failed with error:', err);
  process.exit(1);
});
