import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);

if (!serviceAccount) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is missing');
    process.exit(1);
}

const app = initializeApp({
    credential: cert(serviceAccount)
});

const firestore = getFirestore(app);

async function check() {
    const doc = await firestore.collection('leads').doc('2003924').get();
    console.log('Lead exists:', doc.exists);
    if (doc.exists) {
        console.log('isDuplicate:', doc.data()?.isDuplicate);
    }
    const cDoc = await firestore.collection('companies').doc('2003924').get();
    console.log('Company exists:', cDoc.exists);
}

check().then(() => process.exit(0)).catch(console.error);
