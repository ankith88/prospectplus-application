import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import fetch = require("node-fetch");

const db = admin.firestore();

/**
 * Scheduled Cloud Function running daily to sync all franchisee documents
 * to the MailPlus API endpoint.
 */
export const dailyFranchiseeSync = functions
  .region("australia-southeast1")
  .runWith({ memory: "512MB", timeoutSeconds: 300 })
  .pubsub.schedule("0 2 * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing dailyFranchiseeSync function.");

    try {
      const snapshot = await db.collection("franchisees").get();

      if (snapshot.empty) {
        functions.logger.info("No franchisee records found in Firestore.");
        return null;
      }

      const syncedData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const numericDocId = /^\d+$/.test(docId) ? parseInt(docId, 10) : docId;

        return {
          document_id: numericDocId,
          ...data,
        };
      });

      const apiKey = process.env.RTA_GENERAL_API_KEY || "708aa067-d67d-73e6-8967-66786247f5d7";

      functions.logger.info(`Sending ${syncedData.length} franchisee document(s) to MailPlus API...`);

      const response = await fetch("https://app.mailplus.com.au/api/v2/franchisees", {
        method: "POST",
        headers: {
          "RTA_GENERAL_API_KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(syncedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        functions.logger.error(`MailPlus Franchisee Sync API returned status ${response.status}: ${errorText}`);
        throw new Error(`MailPlus API status ${response.status}: ${errorText}`);
      }

      const responseBody = await response.text();
      functions.logger.info(`Daily Franchisee Sync completed successfully for ${syncedData.length} record(s). Response: ${responseBody}`);

      return null;
    } catch (error: any) {
      functions.logger.error("Error executing dailyFranchiseeSync:", error);
      throw error;
    }
  });
