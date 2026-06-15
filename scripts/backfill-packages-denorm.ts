import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (assuming default credentials or service account is set)
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function backfillPackages() {
  console.log("Starting backfill for packages denormalization...");

  let packagesProcessed = 0;
  let packagesUpdated = 0;
  const BATCH_SIZE = 500;

  try {
    const packagesRef = db.collection('packages');
    const snapshot = await packagesRef.get();
    
    console.log(`Found ${snapshot.size} packages to evaluate.`);

    let batch = db.batch();
    let currentBatchSize = 0;
    
    // To minimize company lookups, let's cache them in memory
    const companyCache: Record<string, {name: string, franchisee: string}> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      packagesProcessed++;

      // Skip if already denormalized
      if (data.customer_name && data.franchisee_name) {
        continue;
      }

      let customerNsId = null;
      if (data.scans && Array.isArray(data.scans)) {
        const scanWithNsId = data.scans.find((s: any) => s.customer_ns_id);
        if (scanWithNsId) {
          customerNsId = scanWithNsId.customer_ns_id;
        }
      }

      if (customerNsId) {
        let customerName = 'Unknown Company';
        let franchiseeName = 'Unassigned';
        
        const cacheKey = String(customerNsId);
        if (companyCache[cacheKey]) {
           customerName = companyCache[cacheKey].name;
           franchiseeName = companyCache[cacheKey].franchisee;
        } else {
           // Lookup in DB
           let found = false;
           
           // Check companies
           const compQuery = await db.collection("companies").where("internalid", "==", Number(customerNsId)).limit(1).get();
           if (!compQuery.empty) {
               const cData = compQuery.docs[0].data();
               customerName = cData.companyName || 'Unknown Company';
               franchiseeName = cData.franchisee || 'Unassigned';
               found = true;
           }
           if (!found) {
               const compQueryStr = await db.collection("companies").where("internalid", "==", String(customerNsId)).limit(1).get();
               if (!compQueryStr.empty) {
                   const cData = compQueryStr.docs[0].data();
                   customerName = cData.companyName || 'Unknown Company';
                   franchiseeName = cData.franchisee || 'Unassigned';
                   found = true;
               }
           }

           // Check leads
           if (!found) {
               const leadQuery = await db.collection("leads").where("internalid", "==", Number(customerNsId)).limit(1).get();
               if (!leadQuery.empty) {
                   const lData = leadQuery.docs[0].data();
                   customerName = lData.companyName || 'Unknown Company';
                   franchiseeName = lData.franchisee || 'Unassigned';
                   found = true;
               }
           }
           if (!found) {
               const leadQueryStr = await db.collection("leads").where("internalid", "==", String(customerNsId)).limit(1).get();
               if (!leadQueryStr.empty) {
                   const lData = leadQueryStr.docs[0].data();
                   customerName = lData.companyName || 'Unknown Company';
                   franchiseeName = lData.franchisee || 'Unassigned';
                   found = true;
               }
           }

           // Save to cache
           companyCache[cacheKey] = { name: customerName, franchisee: franchiseeName };
        }

        // Add to batch
        batch.update(doc.ref, {
          customer_name: customerName,
          franchisee_name: franchiseeName
        });
        currentBatchSize++;
        packagesUpdated++;

        if (currentBatchSize >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${currentBatchSize}. Total updated so far: ${packagesUpdated}`);
          batch = db.batch();
          currentBatchSize = 0;
        }
      }
    }

    if (currentBatchSize > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${currentBatchSize}. Total updated: ${packagesUpdated}`);
    }

    console.log(`Backfill complete. Processed: ${packagesProcessed}. Updated: ${packagesUpdated}.`);

  } catch (error) {
    console.error("Error during backfill:", error);
  }
}

backfillPackages().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
