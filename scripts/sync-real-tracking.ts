import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  console.log("Fetching packages that are not marked as delivered...");
  const snapshot = await db.collection('packages').get();
  
  // We'll update packages that either don't have a real_time_status or are not delivered
  const activePackages = snapshot.docs.filter(doc => !doc.data().real_time_status?.delivered);
  console.log(`Found ${activePackages.length} packages to query against Protechly API.`);

  let batch = db.batch();
  let operationCount = 0;
  let batchCount = 0;
  let errorCount = 0;

  for (const doc of activePackages) {
    const pkg = doc.data();
    const identifier = pkg.code;

    if (!identifier) continue;

    let status = 'Unknown';
    let delivered = false;
    let last_location: string | null = null;
    let estimated_delivery_date: string | null = pkg.real_time_status?.estimated_delivery_date || null; // Preserve existing if any
    let updated_at = new Date().toISOString();

    const apiUrl = `https://mpns.protechly.com/track?barcode=${identifier}`;
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj'
        }
      });

      if (!response.ok) {
        console.warn(`[WARNING] API call failed for ${identifier} with status: ${response.status}`);
        errorCount++;
        // If it fails, we just preserve what we have or mark it Unknown if there's no data
        if (pkg.real_time_status) {
            status = pkg.real_time_status.status;
            delivered = pkg.real_time_status.delivered;
            last_location = pkg.real_time_status.last_location;
            updated_at = pkg.real_time_status.updated_at || updated_at;
        }
      } else {
        const responseData: any = await response.json();
        if (responseData && responseData.last_status) {
          const event = responseData.last_status.event || '';
          status = event.charAt(0).toUpperCase() + event.slice(1);
          delivered = event.toLowerCase() === 'delivered';
          last_location = responseData.last_status.note || null;
          if (responseData.last_status.time) {
            updated_at = new Date(responseData.last_status.time).toISOString();
          }
        } else if (pkg.real_time_status) {
          // If the API returns ok but no last_status, keep existing data to be safe
          status = pkg.real_time_status.status;
          delivered = pkg.real_time_status.delivered;
          last_location = pkg.real_time_status.last_location;
          updated_at = pkg.real_time_status.updated_at || updated_at;
        }
      }

      batch.set(doc.ref, {
        real_time_status: {
          status,
          delivered,
          estimated_delivery_date,
          last_location,
          updated_at
        }
      }, { merge: true });

      operationCount++;

      if (operationCount >= 500) {
        await batch.commit();
        batchCount++;
        console.log(`Committed batch ${batchCount} with 500 operations.`);
        batch = db.batch();
        operationCount = 0;
      }
    } catch (err) {
      console.error(`[ERROR] Failed to process ${identifier}:`, err);
      errorCount++;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
    batchCount++;
    console.log(`Committed final batch ${batchCount} with ${operationCount} operations.`);
  }

  console.log(`Finished processing. Total errors/warnings: ${errorCount}`);
}

run().catch(console.error);
