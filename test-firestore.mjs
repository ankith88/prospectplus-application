import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) envVars[key.trim()] = val.join('=').trim().replace(/"/g, '');
});

const firebaseConfig = {
  apiKey: envVars.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = collection(db, 'franchisees');
  const snap = await getDocs(q);
  const matched = [];
  const allSuburbs = [];
  
  snap.forEach(doc => {
    const data = doc.data();
    if (data.name === 'Waterloo') {
        allSuburbs.push(data.territoryJson?.map(t => t.suburbs));
    }
    if (data.territoryJson) {
      const match = data.territoryJson.find(t => {
         return t.suburbs?.toUpperCase() === 'SYDNEY' && 
         t.state?.toUpperCase() === 'NSW' && 
         String(t.post_code) === '2000'
      });
      if (match) {
        matched.push(data.name);
      }
    }
  });
  console.log("Matched franchisees for SYDNEY NSW 2000:", matched);
}
check().catch(console.error);
