const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function inspect() {
  const doc = await db.collection("leads").doc("2010545").get();
  if (!doc.exists) {
    console.log("Document 2010545 not found in leads collection!");
    return;
  }
  console.log("Lead 2010545 details:", JSON.stringify(doc.data(), null, 2));
}

inspect().catch(console.error);
