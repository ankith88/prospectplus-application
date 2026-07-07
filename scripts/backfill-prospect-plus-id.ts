import { firestore } from '../src/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { generateRandomAlphanumeric } from '../src/lib/prospect-plus-id';

async function main() {
  console.log('Starting Prospect+ ID backfill...');
  
  // 1. Fetch all leads
  const leadsRef = collection(firestore, 'leads');
  const leadsSnap = await getDocs(leadsRef);
  console.log(`Fetched ${leadsSnap.size} leads.`);
  
  // 2. Fetch all companies
  const companiesRef = collection(firestore, 'companies');
  const companiesSnap = await getDocs(companiesRef);
  console.log(`Fetched ${companiesSnap.size} companies.`);
  
  // Keep track of assigned IDs to avoid duplicates
  const assignedIds = new Set<string>();
  // Keep track of docId -> prospectPlusId mapping so merged leads/companies get the same ID
  const docIdToProspectId = new Map<string, string>();
  
  // Helper to generate a unique ID
  const getUniqueId = (): string => {
    let candidate = '';
    do {
      candidate = `MP${generateRandomAlphanumeric(6)}`;
    } while (assignedIds.has(candidate));
    assignedIds.add(candidate);
    return candidate;
  };
  
  let batches = [writeBatch(firestore)];
  let currentBatchIndex = 0;
  let operationCount = 0;
  let updateCount = 0;

  const queueUpdate = (ref: any, data: any) => {
    if (operationCount >= 400) {
      batches.push(writeBatch(firestore));
      currentBatchIndex++;
      operationCount = 0;
    }
    batches[currentBatchIndex].update(ref, data);
    operationCount++;
    updateCount++;
  };

  // Collect and clean existing lead IDs
  for (const docSnap of leadsSnap.docs) {
    const data = docSnap.data();
    if (data.prospectPlusId) {
      const cleanedId = data.prospectPlusId.replace('+', '');
      docIdToProspectId.set(docSnap.id, cleanedId);
      assignedIds.add(cleanedId);
      if (data.prospectPlusId.includes('+')) {
        queueUpdate(doc(firestore, 'leads', docSnap.id), { prospectPlusId: cleanedId });
      }
    }
  }

  // Collect and clean existing company IDs
  for (const docSnap of companiesSnap.docs) {
    const data = docSnap.data();
    if (data.prospectPlusId) {
      const cleanedId = data.prospectPlusId.replace('+', '');
      if (!docIdToProspectId.has(docSnap.id)) {
        docIdToProspectId.set(docSnap.id, cleanedId);
      }
      assignedIds.add(cleanedId);
      if (data.prospectPlusId.includes('+')) {
        queueUpdate(doc(firestore, 'companies', docSnap.id), { prospectPlusId: cleanedId });
      }
    }
  }

  console.log(`Analyzing database records...`);

  // Assign to leads missing ID
  for (const docSnap of leadsSnap.docs) {
    const data = docSnap.data();
    if (!docIdToProspectId.has(docSnap.id)) {
      const newId = getUniqueId();
      docIdToProspectId.set(docSnap.id, newId);
      queueUpdate(doc(firestore, 'leads', docSnap.id), { prospectPlusId: newId });
    }
  }
  
  // Assign to companies missing ID or sync cleaned IDs
  for (const docSnap of companiesSnap.docs) {
    const data = docSnap.data();
    let assignedId = docIdToProspectId.get(docSnap.id);
    if (!assignedId) {
      assignedId = getUniqueId();
      docIdToProspectId.set(docSnap.id, assignedId);
      queueUpdate(doc(firestore, 'companies', docSnap.id), { prospectPlusId: assignedId });
    } else if (data.prospectPlusId !== assignedId) {
      queueUpdate(doc(firestore, 'companies', docSnap.id), { prospectPlusId: assignedId });
    }
  }
  
  if (updateCount > 0) {
    console.log(`Committing updates for ${updateCount} records in ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
      console.log(`Committing batch ${i + 1}/${batches.length}...`);
      await batches[i].commit();
    }
    console.log('Successfully completed backfill updates.');
  } else {
    console.log('No updates needed. All records already have a Prospect+ ID.');
  }
  
  process.exit(0);
}

main().catch(console.error);
