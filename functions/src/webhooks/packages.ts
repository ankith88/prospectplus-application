import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to update packages collection from an external application.
 * Supports adding new fields dynamically.
 */
export const updatePackageExternal = functions
  .region("australia-southeast1")
  .https.onRequest(async (req, res) => {
    // 1. Verify Request Method
    if (req.method !== "POST" && req.method !== "PATCH") {
      res.status(405).json({ error: "Method Not Allowed. Use POST or PATCH." });
      return;
    }

    try {
      // 2. Validate API Key
      const apiKeyHeader = req.headers["x-api-key"] || req.headers["X-API-Key"];
      const configuredApiKey = process.env.EXTERNAL_API_KEY;
      
      // Fallback key for local/development use if not configured
      const defaultApiKey = "dev-package-sync-key-123456";
      const validApiKey = configuredApiKey || defaultApiKey;

      if (!apiKeyHeader || apiKeyHeader !== validApiKey) {
        functions.logger.warn("Unauthorized API call attempt to updatePackageExternal.");
        res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header." });
        return;
      }

      // 3. Parse and Validate Body
      const { code, fields } = req.body;

      if (!code || typeof code !== "string") {
        res.status(400).json({ error: "Invalid Request: 'code' is required and must be a string." });
        return;
      }

      if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        res.status(400).json({ error: "Invalid Request: 'fields' must be a valid JSON object." });
        return;
      }

      functions.logger.info(`Updating package: ${code} with fields:`, fields);

      const packageRef = db.collection("packages").doc(code);

      // 4. Update the package document using merge: true
      // This will update existing fields, add new fields, and create the document if it doesn't exist.
      const updatePayload = {
        ...fields,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      await packageRef.set(updatePayload, { merge: true });

      // Fetch the updated document to return to the client
      const updatedDoc = await packageRef.get();
      const updatedData = updatedDoc.data();

      res.status(200).json({
        success: true,
        message: `Package ${code} updated successfully.`,
        data: updatedData,
      });
    } catch (error: any) {
      functions.logger.error("Error updating package via external API:", error);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  });
