import { adminApp } from '../src/lib/firebase-admin';

async function checkDetails() {
  const db = adminApp.firestore();
  
  // Check user by email
  const userSnap = await db.collection('users').where('email', '==', 'alexandria@mailplus.com.au').get();
  console.log('User by email count:', userSnap.size);
  userSnap.forEach(doc => {
    console.log('User ID:', doc.id);
    console.log('User Data:', JSON.stringify(doc.data(), null, 2));
  });

  // Check franchisee doc 1818654
  const franDoc = await db.collection('franchisees').doc('1818654').get();
  console.log('Franchisee 1818654 exists?:', franDoc.exists);
  if (franDoc.exists) {
    console.log('Franchisee 1818654 Data:', JSON.stringify(franDoc.data(), null, 2));
  } else {
    // Check if internalId field or another doc matches
    const franQuery = await db.collection('franchisees').where('internalId', '==', '1818654').get();
    console.log('Franchisee by internalId query count:', franQuery.size);
    franQuery.forEach(doc => {
      console.log('Franchisee Doc ID:', doc.id);
      console.log('Franchisee Data:', JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkDetails().catch(console.error);
