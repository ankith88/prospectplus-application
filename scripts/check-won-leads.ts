import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function checkWonLeads() {
  console.log("Fetching leads with status 'Won' or 'Signed'...");
  const leadsSnap = await db.collection('leads')
    .where('status', 'in', ['Won', 'Signed'])
    .get();

  const leadsSnap2 = await db.collection('leads')
    .where('customerStatus', 'in', ['Won', 'Signed'])
    .get();

  const leadIds = new Set<string>();
  leadsSnap.docs.forEach(doc => leadIds.add(doc.id));
  leadsSnap2.docs.forEach(doc => leadIds.add(doc.id));

  console.log(`Found ${leadIds.size} unique leads with 'Won' or 'Signed' status.`);

  let missingCount = 0;
  const missingLeads: Array<{id: string, companyName: string, status: string, customerStatus: string}> = [];

  for (const id of Array.from(leadIds)) {
    const companyDoc = await db.collection('companies').doc(id).get();
    if (!companyDoc.exists) {
      missingCount++;
      const leadDoc = await db.collection('leads').doc(id).get();
      const data = leadDoc.data() || {};
      missingLeads.push({
        id,
        companyName: data.companyName || 'Unknown',
        status: data.status || '',
        customerStatus: data.customerStatus || ''
      });
    }
  }

  console.log(`\nResults:`);
  console.log(`Total missing: ${missingCount}`);
  if (missingCount > 0) {
    console.log("\nMissing Leads Details:");
    console.table(missingLeads);
  }
}

checkWonLeads().catch(console.error);
