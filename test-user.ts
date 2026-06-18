import { firestore } from './src/lib/firebase.js';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

async function main() {
  const usersRef = collection(firestore, 'users');
  const amQuery = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'), limit(5));
  const snap = await getDocs(amQuery);
  snap.docs.forEach(doc => {
    console.log(doc.id, doc.data().displayName, doc.data().calendlyLink);
  });
  process.exit(0);
}
main();
