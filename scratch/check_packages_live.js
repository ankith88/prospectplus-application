const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try parent directory or current directory
const credentialPaths = [
  path.join(__dirname, '../../prospectplus-dev-firebase-adminsdk.json'),
  path.join(__dirname, '../prospectplus-dev-firebase-adminsdk.json'),
  path.join(__dirname, '../serviceAccountKey.json'),
  path.join(__dirname, '../../serviceAccountKey.json')
];

let serviceAccount = null;
for (const p of credentialPaths) {
  if (fs.existsSync(p)) {
    console.log("Found service account key at:", p);
    serviceAccount = require(p);
    break;
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.log("No service account key found, initializing with default credential / environment variables...");
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  console.log("Querying packages collection...");
  try {
    const snapshot = await db.collection('packages')
      .orderBy('updated_at', 'desc')
      .limit(5)
      .get();
      
    console.log(`Fetched ${snapshot.size} latest packages.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Package Code: ${doc.id}`);
      console.log(`  sync_date: ${data.sync_date}`);
      console.log(`  updated_at: ${data.updated_at ? (data.updated_at.toDate ? data.updated_at.toDate().toISOString() : data.updated_at) : 'N/A'}`);
      console.log(`  latest_scan_at: ${data.latest_scan_at}`);
      console.log(`  scans count: ${data.scans ? data.scans.length : 0}`);
    });

    // Let's also check for today's packages specifically
    // Today's date string format: DD-MM-YYYY -> e.g. 10-07-2026
    const todayStr = '10-07-2026';
    const todayQuery = await db.collection('packages')
      .where('sync_date', '==', todayStr)
      .limit(5)
      .get();
    
    console.log(`\nFound ${todayQuery.size} packages synced with sync_date = ${todayStr}`);
    if (todayQuery.size > 0) {
      console.log("Example package synced today:");
      const example = todayQuery.docs[0].data();
      console.log(`  Code: ${todayQuery.docs[0].id}`);
      console.log(`  updated_at: ${example.updated_at ? (example.updated_at.toDate ? example.updated_at.toDate().toISOString() : example.updated_at) : 'N/A'}`);
    }
  } catch (err) {
    console.error("Error querying packages:", err);
  }
}

run();
