const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'demo-project' }); // Or rely on FIRESTORE_EMULATOR_HOST / GOOGLE_APPLICATION_CREDENTIALS
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const db = admin.firestore();
async function run() {
  const doc = await db.collection('leads').doc('2006940').get();
  console.log(doc.data());
}
run();
