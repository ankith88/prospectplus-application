import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function investigate() {
  const leadsSnap = await db.collection('leads')
    .where('activeJourneys', '!=', [])
    .get();
  
  const ids = leadsSnap.docs.map(d => d.id);
  console.log("Found leads with activeJourneys:", ids.length);
  console.log("Includes 2005972?", ids.includes("2005972"));
}

investigate().catch(console.error);
