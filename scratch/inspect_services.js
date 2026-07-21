const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./serviceAccountKey.json'); // wait, let's see if we have access or if we can run it client-side/using another script

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
db.collection('services').where('isActive', '==', true).limit(5).get().then(snap => {
  snap.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}).catch(console.error);
