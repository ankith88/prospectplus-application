const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "mailplus-outbound-leads-crm"
  });
}
const db = admin.firestore();

async function run() {
  console.log("Fetching leads from Firestore...");
  const snapshot = await db.collection('leads').get();
  console.log(`Fetched ${snapshot.size} total leads.`);

  let noAmCount = 0;
  let noBookingUrlCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Check accountManagerAssigned
    const am = data.accountManagerAssigned;
    if (am === undefined || am === null) {
      noAmCount++;
    }

    // Check generalBookingUrlId
    const bookingId = data.generalBookingUrlId;
    if (bookingId === undefined || bookingId === null || bookingId === '') {
      noBookingUrlCount++;
    }
  });

  console.log("\n--- Query Results ---");
  console.log(`Leads with no "accountManagerAssigned" (or null): ${noAmCount}`);
  console.log(`Leads with no "generalBookingUrlId" (or null/empty): ${noBookingUrlCount}`);
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
