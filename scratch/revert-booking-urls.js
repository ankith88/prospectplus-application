const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "mailplus-outbound-leads-crm"
  });
}
const db = admin.firestore();

async function run() {
  const logFilePath = path.join(__dirname, 'booking-url-log.json');
  if (!fs.existsSync(logFilePath)) {
    console.error(`Log file not found at: ${logFilePath}`);
    process.exit(1);
  }

  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
  console.log(`Loaded ${logData.length} records to revert.`);

  const leadsRef = db.collection('leads');

  for (let i = 0; i < logData.length; i++) {
    const record = logData[i];
    const updates = {};

    if (record.originalGeneralBookingUrlId === null) {
      updates.generalBookingUrlId = admin.firestore.FieldValue.delete();
    } else {
      updates.generalBookingUrlId = record.originalGeneralBookingUrlId;
    }

    await leadsRef.doc(record.leadId).update(updates);
    
    if ((i + 1) % 500 === 0) {
      console.log(`Reverted ${i + 1}/${logData.length} booking URLs...`);
    }
  }

  console.log("Revert complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
