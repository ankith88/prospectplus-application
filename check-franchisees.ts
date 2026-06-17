import { firestore } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
  const snap = await getDocs(collection(firestore, 'franchisees'));
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (!data.name && !data.franchiseeName) {
      console.log(`Franchisee missing name: doc.id=${doc.id}, data keys=${Object.keys(data).join(',')}`);
    }
  });
  process.exit(0);
}
main();
