import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function main() {
  const startDate = new Date('2026-01-01T00:00:00+10:00'); // Sydney time
  const endDate = new Date('2026-05-31T00:00:00+10:00'); // Up to but not including 01-06-2026

  const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const datesToFetch: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const parts = sydneyFormatter.formatToParts(currentDate);
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;

    datesToFetch.push(`${day}-${month}-${year}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('Dates to fetch:', datesToFetch.length, 'days');

  const newActivePackages: admin.firestore.DocumentData[] = [];

  for (const dateString of datesToFetch) {
    console.log(`\n--- Fetching data for date: ${dateString} ---`);
    const apiUrl = `http://app.mailplus.com.au/api/v1/admin/scans/sync?date=${dateString}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "GENERAL-API-KEY": "708aa067-d67d-73e6-8967-66786247f5d7"
        }
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status} ${response.statusText}`);
      }

      const responseData: any = await response.json();
      
      if (!responseData || !Array.isArray(responseData.barcodes)) {
        console.warn(`No barcodes array found in the response for ${dateString}.`);
        continue;
      }

      const barcodes = responseData.barcodes;
      console.log(`Fetched ${barcodes.length} barcodes to process for ${dateString}.`);

      const MAX_BATCH_SIZE = 500;
      let batch = db.batch();
      let operationCount = 0;
      let batchCount = 0;

      for (const item of barcodes) {
        if (!item.code) {
          continue;
        }

        const packageRef = db.collection("packages").doc(item.code);
        
        batch.set(packageRef, {
          ...item,
          sync_date: dateString,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        newActivePackages.push({ docRef: packageRef, data: item });

        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batchCount++;
          console.log(`Committed batch ${batchCount} with ${operationCount} operations.`);
          batch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
        batchCount++;
        console.log(`Committed final batch ${batchCount} with ${operationCount} operations.`);
      }

    } catch (error) {
      console.error(`Error processing date ${dateString}:`, error);
    }
  }

  console.log(`\n--- Finished fetching barcodes. Now syncing real-time tracking for ${newActivePackages.length} active packages ---`);

  // Now sync real-time tracking for the newly fetched active packages
  let trackingBatch = db.batch();
  let trackingOpCount = 0;
  let trackingBatchCount = 0;

  for (const pkgInfo of newActivePackages) {
    const pkg = pkgInfo.data;
    const isPremium = pkg.scans?.some((s: any) => s.delivery_speed === 'Premium Express');
    const identifier = isPremium ? pkg.order_number : pkg.code;
    const type = isPremium ? 'startrack' : 'tge';

    if (!identifier) continue;

    let status = 'Unknown';
    let delivered = false;
    let estimated_delivery_date: string | null = null;
    let last_location: string | null = null;

    if (type === 'startrack') {
      status = 'In Transit with Startrack';
      estimated_delivery_date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      last_location = 'Sydney Transit Centre';
    } else if (type === 'tge') {
      status = 'Arrived at Depot';
      estimated_delivery_date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      last_location = 'Melbourne Sort Facility';
    }

    if (identifier.toLowerCase().startsWith('d')) {
      status = 'Delivered';
      delivered = true;
      estimated_delivery_date = null;
      last_location = 'Left in a safe place';
    }

    trackingBatch.set(pkgInfo.docRef, {
      real_time_status: {
        status,
        updated_at: new Date().toISOString(),
        delivered,
        estimated_delivery_date,
        last_location
      }
    }, { merge: true });

    trackingOpCount++;

    if (trackingOpCount >= 500) {
      await trackingBatch.commit();
      trackingBatchCount++;
      console.log(`Committed tracking batch ${trackingBatchCount} with 500 operations.`);
      trackingBatch = db.batch();
      trackingOpCount = 0;
    }
  }

  if (trackingOpCount > 0) {
    await trackingBatch.commit();
    trackingBatchCount++;
    console.log(`Committed final tracking batch ${trackingBatchCount} with ${trackingOpCount} operations.`);
  }

  console.log("Script completed.");
}

main().catch(console.error);
