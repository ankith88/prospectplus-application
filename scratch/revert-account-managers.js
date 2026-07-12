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
  const logFilePath = path.join(__dirname, 'am-assignment-log.json');
  if (!fs.existsSync(logFilePath)) {
    console.error(`Log file not found at: ${logFilePath}`);
    process.exit(1);
  }

  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
  console.log(`Loaded ${logData.length} records to revert.`);

  const leadsRef = db.collection('leads');

  const batchSize = 500;
  for (let i = 0; i < logData.length; i += batchSize) {
    const chunk = logData.slice(i, i + batchSize);
    const batch = db.batch();
    
    for (const record of chunk) {
      const docRef = leadsRef.doc(record.leadId);
      const updates = {};
      
      if (record.originalAccountManager === null) {
        updates.accountManagerAssigned = admin.firestore.FieldValue.delete();
      } else {
        updates.accountManagerAssigned = record.originalAccountManager;
      }

      if (record.originalSalesRep === null) {
        updates.salesRepAssigned = admin.firestore.FieldValue.delete();
      } else {
        updates.salesRepAssigned = record.originalSalesRep;
      }
      
      batch.update(docRef, updates);
    }
    
    await batch.commit();
    console.log(`Reverted batch for leads ${i + 1} to ${Math.min(i + batchSize, logData.length)}...`);
  }

  console.log("Revert complete!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
