import { adminApp } from '../src/lib/firebase-admin.js';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

async function check() {
  try {
    const snap = await db.collection('leads').limit(5).get();
    console.log('Lead IDs in default DB:', snap.docs.map(d => d.id));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
