const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp();
const db = admin.firestore();

const logFilePath = '/Users/ankithravindran/.gemini/antigravity-ide/brain/43309341-8df9-417c-a85b-e845768f11a3/.system_generated/tasks/task-269.log';

async function runRevert() {
  console.log("Reading log file to identify updated leads...");
  if (!fs.existsSync(logFilePath)) {
    console.error("Log file not found at:", logFilePath);
    process.exit(1);
  }

  const logContent = fs.readFileSync(logFilePath, 'utf8');
  const lines = logContent.split('\n');
  const updatedCompanies = new Set();

  for (const line of lines) {
    const match = line.match(/Updated Lead:\s*(.*?)\s*with AM:/);
    if (match && match[1]) {
      updatedCompanies.add(match[1].trim());
    }
  }

  console.log(`Identified ${updatedCompanies.size} companies to revert.`);
  if (updatedCompanies.size === 0) {
    console.log("No companies found in log to revert.");
    process.exit(0);
  }

  const leadsRef = db.collection('leads');
  let revertedCount = 0;

  // Process in chunks or individually
  for (const companyName of updatedCompanies) {
    try {
      const snap = await leadsRef.where('companyName', '==', companyName).get();
      if (snap.empty) {
        // Try fallback query by company
        const snap2 = await leadsRef.where('company', '==', companyName).get();
        if (snap2.empty) {
          console.log(`Could not find lead in DB: ${companyName}`);
          continue;
        }
        await revertDocs(snap2.docs);
      } else {
        await revertDocs(snap.docs);
      }
    } catch (err) {
      console.error(`Error reverting lead ${companyName}:`, err);
    }
  }

  console.log(`--- Reversion complete. Reverted ${revertedCount} documents. ---`);
  process.exit(0);

  async function revertDocs(docs) {
    for (const doc of docs) {
      const data = doc.data();
      const updates = {
        generalBookingUrlId: admin.firestore.FieldValue.delete()
      };

      // Check if we fell back from salesRepAssigned
      if (data.salesRepAssigned && data.accountManagerAssigned === data.salesRepAssigned) {
        // Clear AM assignment
        updates.accountManagerAssigned = admin.firestore.FieldValue.delete();
        
        // Find previous bucket
        let originalBucket = 'outbound';
        if (data.fieldSales) {
          originalBucket = 'field_sales';
        }
        if (data.bucketHistory && data.bucketHistory.length > 0) {
          originalBucket = data.bucketHistory[0].newBucket || originalBucket;
        }
        updates.bucket = originalBucket;
        console.log(`Reverting Lead: ${data.companyName || doc.id} -> Cleared AM, Restored Bucket to: ${originalBucket}`);
      } else {
        console.log(`Reverting Lead: ${data.companyName || doc.id} -> Removed generalBookingUrlId`);
      }

      await doc.ref.update(updates);
      revertedCount++;
    }
  }
}

runRevert();
