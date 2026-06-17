import { firestore } from './src/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function main() {
  const franchiseesRef = collection(firestore, 'franchisees');
  const franchiseesSnapshot = await getDocs(query(franchiseesRef, limit(1)));
  franchiseesSnapshot.docs.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
  process.exit(0);
}
main();
