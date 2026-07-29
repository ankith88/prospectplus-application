import { firestore } from '../src/lib/firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

const CANDIDATES = ['Lee Russell', 'Kerina Helliwell'];

function getRandomCandidate(): string {
  const index = Math.floor(Math.random() * CANDIDATES.length);
  return CANDIDATES[index];
}

async function assignBlankAccountManagerLeads() {
  console.log('Starting execution of assignBlankAccountManagerLeads script...');
  const colRef = collection(firestore, 'leads');
  const snapshot = await getDocs(colRef);

  let updatedCount = 0;
  const updatesSummary: Array<{ id: string; companyName?: string; assignedTo: string }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const val = data.accountManagerAssigned;

    const isBlank =
      !('accountManagerAssigned' in data) ||
      val === null ||
      val === undefined ||
      (typeof val === 'string' && val.trim() === '');

    if (isBlank) {
      const assignedPerson = getRandomCandidate();
      
      // Update ONLY accountManagerAssigned and salesRepAssigned
      await updateDoc(docSnap.ref, {
        accountManagerAssigned: assignedPerson,
        salesRepAssigned: assignedPerson,
      });

      updatedCount++;
      updatesSummary.push({
        id: docSnap.id,
        companyName: data.companyName,
        assignedTo: assignedPerson,
      });
      console.log(`Updated Lead ID ${docSnap.id} (${data.companyName || 'No Name'}) -> Assigned: ${assignedPerson}`);
    }
  }

  console.log('\n--- SCRIPT SUMMARY ---');
  console.log(`Successfully updated ${updatedCount} leads.`);
  console.log('Details:', JSON.stringify(updatesSummary, null, 2));
}

assignBlankAccountManagerLeads().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
