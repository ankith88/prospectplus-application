import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = collection(db, 'franchisees');
  const snap = await getDocs(q);
  const matched = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.territoryJson) {
      const match = data.territoryJson.find(t => 
        t.suburbs?.toUpperCase() === 'SYDNEY' && 
        t.state?.toUpperCase() === 'NSW' && 
        t.post_code == '2000'
      );
      if (match) {
        matched.push(data.name);
      }
    }
  });
  console.log("Matched franchisees for SYDNEY NSW 2000:", matched);
}
check().catch(console.error);
