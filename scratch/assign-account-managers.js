const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

  const unassigned = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.accountManagerAssigned === undefined || data.accountManagerAssigned === null) {
      unassigned.push({ id: doc.id, data });
    }
  });

  console.log(`Found ${unassigned.length} leads without accountManagerAssigned.`);
  if (unassigned.length === 0) {
    console.log("No leads to assign.");
    process.exit(0);
  }

  // Shuffle unassigned leads randomly
  for (let i = unassigned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unassigned[i], unassigned[j]] = [unassigned[j], unassigned[i]];
  }

  const half = Math.ceil(unassigned.length / 2);
  const logData = [];
  let leeCount = 0;
  let kerinaCount = 0;

  for (let i = 0; i < unassigned.length; i++) {
    const lead = unassigned[i];
    const am = i < half ? 'Lee Russell' : 'Kerina Helliwell';
    
    if (am === 'Lee Russell') leeCount++;
    else kerinaCount++;

    logData.push({
      leadId: lead.id,
      companyName: lead.data.companyName || '',
      originalAccountManager: lead.data.accountManagerAssigned || null,
      originalSalesRep: lead.data.salesRepAssigned || null,
      assignedAccountManager: am,
      assignedSalesRep: am
    });
  }

  // Write log before committing to be absolutely sure we keep track
  const logFilePath = path.join(__dirname, 'am-assignment-log.json');
  fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
  console.log(`Saved assignment log to ${logFilePath}`);

  if (!isDryRun) {
    console.log("Committing updates to Firestore in batches of 500...");
    const batchSize = 500;
    for (let i = 0; i < logData.length; i += batchSize) {
      const chunk = logData.slice(i, i + batchSize);
      const batch = db.batch();
      
      for (const record of chunk) {
        batch.update(leadsRef.doc(record.leadId), {
          accountManagerAssigned: record.assignedAccountManager,
          salesRepAssigned: record.assignedSalesRep
        });
      }
      
      await batch.commit();
      console.log(`Committed batch for leads ${i + 1} to ${Math.min(i + batchSize, logData.length)}...`);
    }
  }

  console.log(`Assigned ${leeCount} leads to Lee Russell.`);
  console.log(`Assigned ${kerinaCount} leads to Kerina Helliwell.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
