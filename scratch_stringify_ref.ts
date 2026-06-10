import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'test' });
const db = admin.firestore();

const ref = db.collection('customers').doc('12345');
console.log("Stringified DocumentReference:", JSON.stringify({ leadId: ref }));

