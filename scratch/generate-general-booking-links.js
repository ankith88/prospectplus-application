const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
admin.initializeApp();
const db = admin.firestore();

async function run() {
  console.log("Starting script to backfill generalBookingUrlId for leads...");
  const snapshot = await db.collection('leads').get();
  console.log(`Retrieved ${snapshot.size} leads.`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let noAmCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.generalBookingUrlId) {
      skippedCount++;
      continue;
    }

    const amName = data.accountManagerAssigned || data.salesRepAssigned;
    if (amName) {
      const updates = {
        generalBookingUrlId: uuidv4()
      };
      if (!data.accountManagerAssigned && data.salesRepAssigned) {
        updates.accountManagerAssigned = data.salesRepAssigned;
        updates.bucket = 'account_manager';
      }
      await doc.ref.update(updates);
      updatedCount++;
      console.log(`Updated Lead: ${data.companyName || doc.id} with AM: ${updates.accountManagerAssigned || amName}`);
    } else {
      noAmCount++;
    }
  }

  console.log("--- Summary ---");
  console.log(`Leads updated with general booking links: ${updatedCount}`);
  console.log(`Leads skipped (already had links): ${skippedCount}`);
  console.log(`Leads skipped (no AM/Sales Rep assigned): ${noAmCount}`);
  process.exit(0);
}
run();
