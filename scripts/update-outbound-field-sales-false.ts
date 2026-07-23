import { firestore } from '../src/lib/firebase.js';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

async function updateOutboundFieldSalesToFalse() {
  console.log("=== Updating 'fieldSales: false' for all 'outbound' bucket leads ===");

  const qLeads = query(collection(firestore, 'leads'), where('bucket', '==', 'outbound'));
  const qCompanies = query(collection(firestore, 'companies'), where('bucket', '==', 'outbound'));

  const [snapLeads, snapCompanies] = await Promise.all([
    getDocs(qLeads),
    getDocs(qCompanies)
  ]);

  const docsToUpdate: { ref: any; id: string; col: string; currentFs: any }[] = [];

  const checkDoc = (docSnap: any, col: string) => {
    const data = docSnap.data();
    if (data.fieldSales !== false) {
      docsToUpdate.push({
        ref: docSnap.ref,
        id: docSnap.id,
        col,
        currentFs: data.fieldSales
      });
    }
  };

  snapLeads.docs.forEach(d => checkDoc(d, 'leads'));
  snapCompanies.docs.forEach(d => checkDoc(d, 'companies'));

  console.log(`Total documents found in 'outbound' bucket needing update (fieldSales !== false): ${docsToUpdate.length}`);

  if (docsToUpdate.length === 0) {
    console.log("All 'outbound' bucket leads already have fieldSales: false!");
    process.exit(0);
  }

  // Perform Firestore Batched Writes (500 per batch)
  const BATCH_SIZE = 450;
  let updatedCount = 0;

  for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
    const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);

    chunk.forEach(item => {
      batch.update(item.ref, { fieldSales: false });
    });

    await batch.commit();
    updatedCount += chunk.length;
    console.log(`Updated ${updatedCount} / ${docsToUpdate.length} documents...`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} documents to fieldSales: false.`);
  process.exit(0);
}

updateOutboundFieldSalesToFalse().catch(err => {
  console.error("Error executing update script:", err);
  process.exit(1);
});
