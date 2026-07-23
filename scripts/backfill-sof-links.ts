import { firestore } from '../src/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { encryptLeadId } from '../src/lib/localmile-security';

function checkHasAmpo(data: any): boolean {
  if (!data) return false;
  const services = Array.isArray(data.services) ? data.services : [];
  return services.some((s: any) => {
    const name = typeof s === 'string' ? s : (s?.name || s?.serviceName || '');
    const n = String(name).toLowerCase();
    return n.includes('ampo') || n.includes('pmpo') || n.includes('amstreet') || n.includes('mail processing') || n.includes('redirection');
  });
}

function checkHasPostalAddress(data: any): boolean {
  if (!data || !data.postalAddress) return false;
  const p = data.postalAddress;
  return !!(p.street || p.address1 || p.city || p.zip);
}

async function main() {
  console.log('Starting SOF links backfill...');
  
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

  // Backfill leads missing sofLink but having AMPO service + postal address
  for (const docSnap of leadsSnap.docs) {
    const data = docSnap.data();
    if (!data.sofLink && checkHasAmpo(data) && checkHasPostalAddress(data)) {
      const token = encryptLeadId(docSnap.id);
      const link = `https://prospectplus.com.au/sof/${token}`;
      queueUpdate(doc(firestore, 'leads', docSnap.id), { sofLink: link });
    }
  }

  // Backfill companies missing sofLink but having AMPO service + postal address
  for (const docSnap of companiesSnap.docs) {
    const data = docSnap.data();
    if (!data.sofLink && checkHasAmpo(data) && checkHasPostalAddress(data)) {
      const token = encryptLeadId(docSnap.id);
      const link = `https://prospectplus.com.au/sof/${token}`;
      queueUpdate(doc(firestore, 'companies', docSnap.id), { sofLink: link });
    }
  }

  console.log(`Queued ${updateCount} updates for SOF links.`);

  if (updateCount > 0) {
    for (let i = 0; i < batches.length; i++) {
      console.log(`Committing batch ${i + 1}/${batches.length}...`);
      await batches[i].commit();
    }
    console.log('All batches committed successfully.');
  } else {
    console.log('No documents required SOF link updates.');
  }

  console.log('Backfill complete!');
}

main().catch(err => {
  console.error('Backfill failed:', err);
});
