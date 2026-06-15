import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch = require("node-fetch");

const db = admin.firestore();

export const processSyncJob = functions
  .region("australia-southeast1")
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .firestore.document("sync_jobs/{jobId}")
  .onCreate(async (snapshot, context) => {
    const jobData = snapshot.data();
    const jobId = context.params.jobId;

    if (!jobData || !Array.isArray(jobData.barcodes) || jobData.barcodes.length === 0) {
      functions.logger.warn(`Job ${jobId} has no barcodes. Marking as completed.`);
      await snapshot.ref.update({ status: "completed", completed: 0, total: 0 });
      return;
    }

    functions.logger.info(`Starting sync job ${jobId} with ${jobData.barcodes.length} barcodes.`);

    // Update status to processing
    await snapshot.ref.update({ status: "processing" });

    let completed = 0;
    const total = jobData.barcodes.length;
    let batch = db.batch();
    let operationCount = 0;
    const MAX_BATCH_SIZE = 400; // Keep under 500

    const CONCURRENCY_LIMIT = 20;

    for (let i = 0; i < total; i += CONCURRENCY_LIMIT) {
      const chunk = jobData.barcodes.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(chunk.map(async (identifier: string) => {
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
              status = event.charAt(0).toUpperCase() + event.slice(1);
              delivered = event.toLowerCase() === 'delivered';
              last_location = responseData.last_status.note || null;
              if (responseData.last_status.time) {
                updated_at = new Date(responseData.last_status.time).toISOString();
              }
            }
          }

          const packageRef = db.collection("packages").doc(identifier);
          batch.set(packageRef, {
            real_time_status: {
              status,
              updated_at,
              delivered,
              estimated_delivery_date,
              last_location
            }
          }, { merge: true });

          operationCount++;
          completed++;
        } catch (err) {
          functions.logger.warn(`Failed tracking fetch for ${identifier}`, err);
          completed++; // Count as processed even if failed
        }
      }));

      // Commit batch and update job progress periodically
      if (operationCount >= MAX_BATCH_SIZE || completed % 100 < CONCURRENCY_LIMIT) {
        if (operationCount > 0) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
        await snapshot.ref.update({ completed });
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }

    // Mark as completed
    await snapshot.ref.update({ status: "completed", completed });
    functions.logger.info(`Completed sync job ${jobId}. Processed ${completed}/${total} barcodes.`);
  });
