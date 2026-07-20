import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function duplicateLeadToCompanies(leadId: string) {
  const leadRef = db.collection('leads').doc(leadId);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    console.log(`Lead ${leadId} not found.`);
    return;
  }

  const leadData = leadSnap.data();
  const companyRef = db.collection('companies').doc(leadId);
  await companyRef.set(leadData || {});

  const subcollections = [
    'contacts',
    'activity',
    'emails',
    'notes',
    'transcripts',
    'tasks',
    'appointments',
    'invoices',
    'addresses',
    'scfs'
  ];

  for (const subName of subcollections) {
    const sourceColRef = leadRef.collection(subName);
    const sourceSnap = await sourceColRef.get();
    if (!sourceSnap.empty) {
      const destColRef = companyRef.collection(subName);
      const batch = db.batch();
      sourceSnap.docs.forEach(docSnap => {
        batch.set(destColRef.doc(docSnap.id), docSnap.data() || {});
      });
      await batch.commit();
    }
  }
  console.log(`Duplicated lead ${leadId} (${leadData?.companyName}) to companies.`);
}

async function main() {
  const ids = ["2011827", "2010649"];
  for (const id of ids) {
    await duplicateLeadToCompanies(id);
  }
}

main().catch(console.error);
