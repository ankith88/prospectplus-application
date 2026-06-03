import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

/**
 * Categorizes a service based on its name or code.
 */
function categorizeService(code: string, name: string): string {
  const c = code.toLowerCase();
  const n = name.toLowerCase();

  // Mail & PO
  if (
    c.includes("ampo") ||
    c.includes("pmpo") ||
    c.includes("amstreet") ||
    n.includes("mail processing") ||
    n.includes("redirection")
  ) {
    return "Mail & PO";
  }

  // Banking
  if (
    c === "cb" ||
    c === "eb" ||
    c.includes("billpay") ||
    c === "mb"
  ) {
    return "Banking";
  }

  // Hand to Hand & Delivery
  if (
    c.includes("h2h") ||
    n.includes("goods delivery") ||
    n.includes("on demand")
  ) {
    return "Hand to Hand & Delivery";
  }

  // Bundled Packages
  if (n.startsWith("package:") || n.startsWith("neopost package:")) {
    return "Bundled Packages";
  }

  return "Other";
}

export const bulkImportServices = functions
  .region("australia-southeast1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();

      if (!userDoc.exists || userDoc.data()?.role !== "admin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only admins can import services."
        );
      }
    } catch (error) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Error verifying admin status."
      );
    }

    const services = data.services;
    if (!services || !Array.isArray(services)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a list of 'services'."
      );
    }

    const db = admin.firestore();
    const batchSize = 400; // Safe limit under the 500 max
    const batches = [];
    let currentBatch = db.batch();
    let currentBatchCount = 0;
    const errors: any[] = [];

    // Track the IDs we are importing to figure out which ones to soft-delete
    const importedIds = new Set<string>();

    for (const service of services) {
      if (!service.id || !service.code || !service.netsuiteItemName) {
        errors.push({ service, error: "Missing required fields (id, code, or netsuiteItemName)" });
        continue;
      }

      importedIds.add(String(service.id));

      const docRef = db.collection("services").doc(String(service.id));
      const category = categorizeService(service.code, service.netsuiteItemName);

      currentBatch.set(docRef, {
        id: String(service.id),
        code: service.code,
        netsuiteItemName: service.netsuiteItemName,
        category,
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Use set with merge: true so createdAt is only set if doc doesn't exist. We handle createdAt separately or just rely on updatedAt for existing ones. 
        // Actually, set with merge will overwrite fields but leave others intact.
        // We'll set createdAt using a trick or just updating the document.
      }, { merge: true });

      currentBatchCount++;

      if (currentBatchCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentBatchCount = 0;
      }
    }

    if (currentBatchCount > 0) {
      batches.push(currentBatch);
    }

    try {
      for (const batch of batches) {
        await batch.commit();
      }
    } catch (error: any) {
      functions.logger.error("Error committing import batches", error);
      return { success: false, message: "Error committing batches", errors: [error.message] };
    }

    // Now soft delete any existing services not in the imported list
    try {
      const existingServicesSnapshot = await db.collection("services").where("isActive", "==", true).get();
      let deleteBatch = db.batch();
      let deleteBatchCount = 0;
      const deleteBatches = [];

      for (const doc of existingServicesSnapshot.docs) {
        if (!importedIds.has(doc.id)) {
          deleteBatch.update(doc.ref, { 
            isActive: false, 
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
          });
          deleteBatchCount++;

          if (deleteBatchCount === batchSize) {
            deleteBatches.push(deleteBatch);
            deleteBatch = db.batch();
            deleteBatchCount = 0;
          }
        }
      }

      if (deleteBatchCount > 0) {
        deleteBatches.push(deleteBatch);
      }

      for (const batch of deleteBatches) {
        await batch.commit();
      }

    } catch (error: any) {
      functions.logger.error("Error soft-deleting missing services", error);
      // Not a fatal error for the import, but good to log
    }

    return {
      success: true,
      message: `Successfully processed ${importedIds.size} services.`,
      errors
    };
  });
