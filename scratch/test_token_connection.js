const { Firestore } = require('@google-cloud/firestore');
const { execSync } = require('child_process');

async function testConnection() {
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
    console.log("Got access token from gcloud.");

    const db = new Firestore({
      projectId: 'mailplus-outbound-leads-crm',
      token: token
    });

    console.log("Querying collectionGroup('invoices')...");
    const snap = await db.collectionGroup('invoices').get();
    console.log(`SUCCESS! Found ${snap.size} total invoice documents in collectionGroup('invoices').`);
    process.exit(0);
  } catch (err) {
    console.error("Error in testConnection:", err);
    process.exit(1);
  }
}

testConnection();
