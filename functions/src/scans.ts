import * as functions from "firebase-functions/v1";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import fetch = require("node-fetch");

// Initialize Firestore (admin SDK is initialized in index.ts)
const db = admin.firestore();

/**
 * Scheduled function that runs daily at 4 AM Sydney time.
 * It fetches the previous day's scan data from the MailPlus API
 * and syncs it to the Firestore `packages` collection.
 */
export const syncScansDaily = functions
  .region("australia-southeast1") // Keep region consistent if needed, or omit to default
  .runWith({ memory: "1GB", timeoutSeconds: 540 }) // Give more memory/timeout for a huge sync
  .pubsub.schedule("0 4 * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Starting daily scans sync job...");

    try {
      // Calculate yesterday's date in Sydney time
      const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Sydney",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const now = new Date();
      now.setDate(now.getDate() - 1); // Yesterday

      const parts = sydneyFormatter.formatToParts(now);
      const day = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const year = parts.find(p => p.type === 'year')?.value;

      // Target format: DD-MM-YYYY
      const dateString = `${day}-${month}-${year}`;
      functions.logger.info(`Fetching data for date: ${dateString}`);

      const apiUrl = `http://app.mailplus.com.au/api/v1/admin/scans/sync?date=${dateString}`;

      const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Access-Control-Allow-Origin": "*",
          "GENERAL-API-KEY": "708aa067-d67d-73e6-8967-66786247f5d7"
        }
      };

      const response = await fetch(apiUrl, options);

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status} ${response.statusText}`);
      }

      const responseData: any = await response.json();

      if (!responseData || !Array.isArray(responseData.barcodes)) {
        functions.logger.warn("No barcodes array found in the response.");
        return;
      }

      const barcodes = responseData.barcodes;
      functions.logger.info(`Fetched ${barcodes.length} barcodes to process.`);

      // Process in batches of 500 (Firestore limit)
      const MAX_BATCH_SIZE = 500;
      let batch = db.batch();
      let operationCount = 0;
      let batchCount = 0;

      for (const item of barcodes) {
        if (!item.code) {
          functions.logger.warn("Skipping item with no barcode code.", item);
          continue;
        }

        const packageRef = db.collection("packages").doc(item.code);

        // Use merge: true so we don't accidentally overwrite data we might add later,
        // while updating the latest fields and completely replacing the scans array.
        batch.set(packageRef, {
          ...item,
          sync_date: dateString,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        operationCount++;

        // Commit batch if it hits the limit
        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batchCount++;
          functions.logger.info(`Committed batch ${batchCount} with ${operationCount} operations.`);

          // Reset batch
          batch = db.batch();
          operationCount = 0;
        }
      }

      // Commit any remaining operations
      if (operationCount > 0) {
        await batch.commit();
        batchCount++;
        functions.logger.info(`Committed final batch ${batchCount} with ${operationCount} operations.`);
      }

      functions.logger.info("Daily scans sync job completed successfully.");
    } catch (error) {
      functions.logger.error("Error during daily scans sync job:", error);
      // Re-throw or handle error based on retry needs. We will let it fail gracefully.
    }
  });

/**
 * Scheduled function that runs daily at 5 AM Sydney time.
 * It checks active packages and updates their real-time status
 * by querying our tracking endpoint logic.
 */
export const trackActivePackages = onSchedule({
  schedule: "0 6 * * *",
  timeZone: "Australia/Sydney",
  region: "australia-southeast1",
  memory: "1GiB",
  timeoutSeconds: 1800,
}, async (event) => {
    functions.logger.info("Starting daily real-time tracking sync...");

    try {
      // Query packages that explicitly have is_delivered == false
      // Select only 'code' to minimize memory usage
      const allPackagesSnapshot = await db.collection("packages")
        .where("is_delivered", "==", false)
        .select("code")
        .get();
      const activePackages = allPackagesSnapshot.docs;

      functions.logger.info(`Found ${activePackages.length} active packages to check tracking for.`);

      let batch = db.batch();
      let operationCount = 0;
      let batchCount = 0;
      const CONCURRENCY_LIMIT = 100;

      for (let i = 0; i < activePackages.length; i += CONCURRENCY_LIMIT) {
        const chunk = activePackages.slice(i, i + CONCURRENCY_LIMIT);
        
        await Promise.all(chunk.map(async (doc) => {
          const pkg = doc.data();
          const identifier = pkg.code;

          if (!identifier) return;

          try {
            let status = 'Unknown';
            let delivered = false;
            let estimated_delivery_date: string | null = null;
            let last_location: string | null = null;
            let updated_at = new Date().toISOString();

            const apiUrl = `https://mpns.protechly.com/track?barcode=${identifier}`;
            const options = {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj'
              }
            };

            const response = await fetch(apiUrl, options);
            if (!response.ok) {
              functions.logger.warn(`Protechly API call failed for ${identifier} with status: ${response.status}`);
            } else {
              const responseData: any = await response.json();
              if (responseData && responseData.last_status) {
                const event = responseData.last_status.event || '';
                // Capitalize the event for the UI
                status = event.charAt(0).toUpperCase() + event.slice(1);
                delivered = event.toLowerCase() === 'delivered';
                last_location = responseData.last_status.note || null;
                if (responseData.last_status.time) {
                  updated_at = new Date(responseData.last_status.time).toISOString();
                }
              }
            }

            batch.set(doc.ref, {
              is_delivered: delivered,
              real_time_status: {
                status,
                updated_at,
                delivered,
                estimated_delivery_date,
                last_location
              }
            }, { merge: true });

            operationCount++;
          } catch (err) {
            functions.logger.warn(`Failed tracking fetch for ${pkg.code}`, err);
          }
        }));

        if (operationCount >= 400) {
          await batch.commit();
          batchCount++;
          functions.logger.info(`Committed tracking batch ${batchCount} with ${operationCount} operations.`);
          batch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
        batchCount++;
        functions.logger.info(`Committed final tracking batch ${batchCount} with ${operationCount} operations.`);
      }

      functions.logger.info("Daily real-time tracking sync completed.");
    } catch (error) {
      functions.logger.error("Error during real-time tracking sync:", error);
    }
  });
