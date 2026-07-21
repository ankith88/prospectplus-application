import { firestore } from '../src/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { encryptLeadId } from '../src/lib/localmile-security';

async function main() {
  console.log('Starting LocalMile registration links backfill...');
  
  // 1. Fetch all leads
  const leadsRef = collection(firestore, 'leads');
  const leadsSnap = await getDocs(leadsRef);
  console.log(`Fetched ${leadsSnap.size} leads.`);
  
  // 2. Fetch all companies
  const companiesRef = collection(firestore, 'companies');
  const companiesSnap = await getDocs(companiesRef);
  console.log(`Fetched ${companiesSnap.size} companies.`);
  
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

  // Backfill leads missing registration link
  for (const docSnap of leadsSnap.docs) {
    const data = docSnap.data();
    if (!data.localMileRegistrationLink) {
      const token = encryptLeadId(docSnap.id);
      const link = `https://prospectplus.com.au/localmile-registration/${token}`;
      queueUpdate(doc(firestore, 'leads', docSnap.id), { localMileRegistrationLink: link });
    }
  }

  // Backfill companies missing registration link
  for (const docSnap of companiesSnap.docs) {
    const data = docSnap.data();
    if (!data.localMileRegistrationLink) {
      const token = encryptLeadId(docSnap.id);
      const link = `https://prospectplus.com.au/localmile-registration/${token}`;
      queueUpdate(doc(firestore, 'companies', docSnap.id), { localMileRegistrationLink: link });
    }
  }

  // Special Test Case: Lead 2012211
  const testLeadId = '2012211';
  const testToken = encryptLeadId(testLeadId);
  const testLink = `https://prospectplus.com.au/localmile-registration/${testToken}`;
  console.log('\n--- Special Test Lead Details ---');
  console.log(`Lead ID: ${testLeadId}`);
  console.log(`Encrypted Token: ${testToken}`);
  console.log(`Registration URL: ${testLink}`);
  console.log('---------------------------------\n');

  if (updateCount > 0) {
    console.log(`Committing updates for ${updateCount} records in ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
      console.log(`Committing batch ${i + 1}/${batches.length}...`);
      await batches[i].commit();
    }
    console.log('Successfully completed LocalMile links backfill.');
  } else {
    console.log('No updates needed. All records already have registration links.');
  }
  
  process.exit(0);
}

main().catch(console.error);
