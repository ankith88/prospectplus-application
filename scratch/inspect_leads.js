const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function inspect(id) {
  console.log(`\n--- Inspecting ID: ${id} ---`);
  
  const leadDoc = await db.collection('leads').doc(id).get();
  if (leadDoc.exists) {
    const data = leadDoc.data();
    console.log("Found in 'leads' collection:");
    console.log(`- Status: ${data.status}`);
    console.log(`- Customer Status: ${data.customerStatus}`);
    console.log(`- isDuplicate: ${data.isDuplicate}`);
    console.log(`- similarLeads:`, data.similarLeads);
    console.log(`- bucket: ${data.bucket}`);
  } else {
    console.log("Not found in 'leads' collection.");
  }

  const companyDoc = await db.collection('companies').doc(id).get();
  if (companyDoc.exists) {
    const data = companyDoc.get();
    console.log("Found in 'companies' collection.");
  } else {
    console.log("Not found in 'companies' collection.");
  }
}

async function run() {
  await inspect("1931805");
  await inspect("1785264");
}

run().catch(console.error);
