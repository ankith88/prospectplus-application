import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: "mailplus-outbound-leads-crm",
});

const db = admin.firestore();

async function check() {
  console.log("Fetching all localMileJobs to check for 7lOZRAV56jdGNPsUGpMp...");
  const snapshot = await db.collectionGroup('localMileJobs').get();
  
  let found = false;
  snapshot.forEach(doc => {
    if (doc.id === '7lOZRAV56jdGNPsUGpMp' || doc.data().jobId === '7lOZRAV56jdGNPsUGpMp') {
      console.log(`Found job at ${doc.ref.path}`);
      console.log(doc.data());
      found = true;
    }
  });
  
  if (!found) {
    console.log("No job found with ID '7lOZRAV56jdGNPsUGpMp'.");
  }
  
  console.log("Done.");
}

check().catch(console.error);
