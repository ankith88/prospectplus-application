const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "mailplus-outbound-leads-crm"
  });
}
const db = admin.firestore();

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  console.log(`Running in ${isDryRun ? 'DRY-RUN' : 'LIVE'} mode...`);
  
  const leadsRef = db.collection('leads');
  const snapshot = await leadsRef.get();
  console.log(`Fetched ${snapshot.size} total leads.`);

  const targets = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const val = data.generalBookingUrlId;
    if (val === undefined || val === null || val === '') {
      targets.push({ id: doc.id, data });
    }
  });

  console.log(`Found ${targets.length} leads without generalBookingUrlId.`);
  if (targets.length === 0) {
    console.log("No leads to update booking URLs for.");
    process.exit(0);
  }

  const logData = [];
  for (let i = 0; i < targets.length; i++) {
    const lead = targets[i];
    const newUuid = uuidv4();

    logData.push({
      leadId: lead.id,
      companyName: lead.data.companyName || '',
      originalGeneralBookingUrlId: lead.data.generalBookingUrlId || null,
      generatedGeneralBookingUrlId: newUuid
    });
  }

  // Write log before committing to be absolutely sure we keep track
  const logFilePath = path.join(__dirname, 'booking-url-log.json');
  fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
  console.log(`Saved booking URL log to ${logFilePath}`);

  if (!isDryRun) {
    console.log("Committing updates to Firestore in batches of 500...");
    const batchSize = 500;
    for (let i = 0; i < logData.length; i += batchSize) {
      const chunk = logData.slice(i, i + batchSize);
      const batch = db.batch();
      
      for (const record of chunk) {
        batch.update(leadsRef.doc(record.leadId), {
          generalBookingUrlId: record.generatedGeneralBookingUrlId
        });
      }
      
      await batch.commit();
      console.log(`Committed batch for booking URLs ${i + 1} to ${Math.min(i + batchSize, logData.length)}...`);
    }
  }

  console.log(`Successfully processed ${targets.length} booking URLs.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
