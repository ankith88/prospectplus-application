const admin = require('firebase-admin');
const crypto = require('crypto');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function inspect() {
  const docRef = db.collection("leads").doc("2010774");
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log("Document 2010774 not found in leads collection!");
    return;
  }
  
  const data = doc.data();
  if (!data.generalBookingUrlId) {
    const generalBookingUrlId = crypto.randomUUID();
    await docRef.update({ generalBookingUrlId });
    console.log("Updated lead 2010774 with generalBookingUrlId:", generalBookingUrlId);
  } else {
    console.log("Lead 2010774 already has generalBookingUrlId:", data.generalBookingUrlId);
  }
}

inspect().catch(console.error);


