import * as functions from "firebase-functions/v1";
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
