import { adminApp } from './src/lib/firebase-admin';
async function test() {
  const snap = await adminApp.firestore().collection('leads').doc('2006940').get();
  console.log(snap.data());
}
test();
