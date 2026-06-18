import { firestore } from './src/lib/firebase.js';
import { collection, query, limit, getDocs } from 'firebase/firestore';

async function main() {
  const leadsRef = collection(firestore, 'leads');
  const q = query(leadsRef, limit(5));
  const snap = await getDocs(q);
  snap.docs.forEach(doc => {
    console.log(doc.id, Object.keys(doc.data()));
    console.log("internalId:", doc.data().internalId);
    console.log("customerEntityId:", doc.data().customerEntityId);
  });
  process.exit(0);
}
main();
