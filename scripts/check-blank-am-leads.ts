import { firestore } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkBlankAccountManagerLeads() {
  console.log('Checking leads collection for blank or missing accountManagerAssigned...');
  const colRef = collection(firestore, 'leads');
  const snapshot = await getDocs(colRef);

  let missingFieldCount = 0;
  let emptyStringCount = 0;
  let nullOrUndefinedCount = 0;
  let validAMCount = 0;
  let sampleBlankLeads: Array<{ id: string; companyName?: string; accountManagerAssigned?: any; salesRepAssigned?: any }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const val = data.accountManagerAssigned;

    if (!('accountManagerAssigned' in data)) {
      missingFieldCount++;
      if (sampleBlankLeads.length < 5) {
        sampleBlankLeads.push({ id: docSnap.id, companyName: data.companyName, accountManagerAssigned: '<FIELD_MISSING>', salesRepAssigned: data.salesRepAssigned });
      }
    } else if (val === null || val === undefined) {
      nullOrUndefinedCount++;
      if (sampleBlankLeads.length < 5) {
        sampleBlankLeads.push({ id: docSnap.id, companyName: data.companyName, accountManagerAssigned: String(val), salesRepAssigned: data.salesRepAssigned });
      }
    } else if (typeof val === 'string' && val.trim() === '') {
      emptyStringCount++;
      if (sampleBlankLeads.length < 5) {
        sampleBlankLeads.push({ id: docSnap.id, companyName: data.companyName, accountManagerAssigned: '"" (empty string)', salesRepAssigned: data.salesRepAssigned });
      }
    } else {
      validAMCount++;
    }
  }

  const totalBlankOrMissing = missingFieldCount + nullOrUndefinedCount + emptyStringCount;

  console.log('\n--- LEADS CHECK RESULTS ---');
  console.log(`Total leads inspected: ${snapshot.size}`);
  console.log(`Leads with missing 'accountManagerAssigned' field: ${missingFieldCount}`);
  console.log(`Leads with null/undefined 'accountManagerAssigned': ${nullOrUndefinedCount}`);
  console.log(`Leads with empty string 'accountManagerAssigned': ${emptyStringCount}`);
  console.log(`TOTAL LEADS WITH BLANK OR MISSING AM: ${totalBlankOrMissing}`);
  console.log(`Leads with existing valid AM: ${validAMCount}`);

  if (sampleBlankLeads.length > 0) {
    console.log('\nSample leads needing update:');
    console.log(JSON.stringify(sampleBlankLeads, null, 2));
  }
}

checkBlankAccountManagerLeads().catch((err) => {
  console.error('Error checking leads:', err);
  process.exit(1);
});
