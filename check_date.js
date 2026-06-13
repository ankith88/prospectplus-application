const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // assuming it exists or use default
admin.initializeApp();
const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('packages').limit(1).get();
  snapshot.forEach(doc => {
    console.log(doc.data().scans[0].updated_at);
  });
}
check();
