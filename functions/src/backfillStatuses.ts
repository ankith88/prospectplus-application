import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch = require("node-fetch");

const db = admin.firestore();

export const processBackfillJob = functions
  .region("australia-southeast1")
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .firestore.document("backfill_jobs/{jobId}")
  .onWrite(async (change, context) => {
    // Exit if the document is deleted
    if (!change.after.exists) return null;

    const jobData = change.after.data();
    if (!jobData) return null;

    // Only process if status is 'processing'
    if (jobData.status !== "processing") {
      functions.logger.info(`Job ${context.params.jobId} is not in processing state. Status: ${jobData.status}`);
      return null;
    }

    const beforeData = change.before.data();
    
    // Prevent infinite loop if we already processed this exact state
    // We check if lastDocId changed or if it's newly created
    if (beforeData && beforeData.lastDocId === jobData.lastDocId && beforeData.status === "processing") {
      functions.logger.info(`Job ${context.params.jobId} has same lastDocId. Waiting for next update.`);
      return null;
    }

    const batchSize = jobData.batchSize || 500;
    const lastDocId = jobData.lastDocId || null;
    
    functions.logger.info(`Starting backfill batch. lastDocId: ${lastDocId}, limit: ${batchSize}`);

    let query = db.collection("packages").orderBy(admin.firestore.FieldPath.documentId()).limit(batchSize);
    
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      functions.logger.info(`No more packages to process. Marking job as completed.`);
      return change.after.ref.update({ 
        status: "completed", 
        completedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    }

    let processedCount = jobData.processedCount || 0;
    const CONCURRENCY_LIMIT = 20;
    let batch = db.batch();
    let writeCount = 0;

    const docs = snapshot.docs;
    const newLastDocId = docs[docs.length - 1].id;

    for (let i = 0; i < docs.length; i += CONCURRENCY_LIMIT) {
      const chunk = docs.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(chunk.map(async (doc) => {
        const identifier = doc.id;
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

          batch.set(doc.ref, {
            real_time_status: {
              status,
              updated_at,
              delivered,
              estimated_delivery_date,
              last_location
            }
          }, { merge: true });

          writeCount++;
          processedCount++;
        } catch (err) {
          functions.logger.warn(`Failed tracking fetch for ${identifier}`, err);
          processedCount++; // count anyway to progress
        }
      }));

      if (writeCount >= 400) {
        await batch.commit();
        batch = db.batch();
        writeCount = 0;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }

    functions.logger.info(`Finished batch. Total processed so far: ${processedCount}. Updating job to trigger next batch.`);

    // Update the job document to trigger the next recursive execution
    // The delay helps prevent hitting Firestore rate limits for rapid writes to the same document
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return change.after.ref.update({
      lastDocId: newLastDocId,
      processedCount: processedCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
