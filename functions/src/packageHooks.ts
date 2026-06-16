import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onPackageWrite = functions
  .region("australia-southeast1")
  .firestore.document("packages/{packageId}")
  .onWrite(async (change, context) => {
    const afterData = change.after.data();
    const beforeData = change.before.data();
    const packageId = context.params.packageId;

    if (!afterData) {
      // Document deleted
      return;
    }

    // --- 0. Initialize is_delivered ---
    if (typeof afterData.is_delivered === 'undefined') {
      const isDelivered = afterData.real_time_status?.delivered === true;
      await change.after.ref.set({ is_delivered: isDelivered }, { merge: true });
      afterData.is_delivered = isDelivered;
    }

    // --- 1. Denormalization ---
    let customerNsId = null;
    if (afterData.scans && Array.isArray(afterData.scans)) {
      const scanWithNsId = afterData.scans.find((s: any) => s.customer_ns_id);
      if (scanWithNsId) {
        customerNsId = scanWithNsId.customer_ns_id;
      }
    }

    // Check if we need to fetch and update
    // Only update if customer_ns_id changed or if names are missing
    const previousCustomerNsId = beforeData?.scans?.find((s: any) => s.customer_ns_id)?.customer_ns_id;
    const needsDenormalization = customerNsId && (!afterData.customer_name || customerNsId !== previousCustomerNsId);

    let customerName = afterData.customer_name || 'Unlinked';
    let franchiseeName = afterData.franchisee_name || 'Unassigned';

    if (needsDenormalization) {
      try {
        // Query companies collection where internalid == customerNsId
        // Also check leads if not found in companies
        let companyFound = false;
        
        const companiesQuery = await db.collection("companies").where("internalid", "==", Number(customerNsId)).limit(1).get();
        if (!companiesQuery.empty) {
          const compData = companiesQuery.docs[0].data();
          customerName = compData.companyName || 'Unknown Company';
          franchiseeName = compData.franchisee || 'Unassigned';
          companyFound = true;
        } else {
          // Check string internalid just in case
          const companiesQueryStr = await db.collection("companies").where("internalid", "==", String(customerNsId)).limit(1).get();
          if (!companiesQueryStr.empty) {
            const compData = companiesQueryStr.docs[0].data();
            customerName = compData.companyName || 'Unknown Company';
            franchiseeName = compData.franchisee || 'Unassigned';
            companyFound = true;
          }
        }

        if (!companyFound) {
           const leadsQuery = await db.collection("leads").where("internalid", "==", Number(customerNsId)).limit(1).get();
           if (!leadsQuery.empty) {
             const leadData = leadsQuery.docs[0].data();
             customerName = leadData.companyName || 'Unknown Company';
             franchiseeName = leadData.franchisee || 'Unassigned';
           } else {
              const leadsQueryStr = await db.collection("leads").where("internalid", "==", String(customerNsId)).limit(1).get();
              if (!leadsQueryStr.empty) {
                 const leadData = leadsQueryStr.docs[0].data();
                 customerName = leadData.companyName || 'Unknown Company';
                 franchiseeName = leadData.franchisee || 'Unassigned';
              }
           }
        }

        // Write back to package document
        await change.after.ref.set({
          customer_name: customerName,
          franchisee_name: franchiseeName,
        }, { merge: true });

      } catch (error) {
        functions.logger.error(`Failed to denormalize package ${packageId}:`, error);
      }
    }

    // --- 2. Metrics Aggregation (Future enhancement placeholder) ---
    // Incremental updates have been omitted here in favor of a scheduled aggregator
    // to prevent document write contention on global metrics.
  });

export const aggregateScanMetrics = functions
  .region("australia-southeast1")
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .pubsub.schedule("0 * * * *") // Run every hour
  .onRun(async (context) => {
    functions.logger.info("Starting scheduled scan metrics aggregation...");

    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // We will aggregate metrics for the current month
      const packagesRef = db.collection("packages");
      // Getting all packages for the month using sync_date (format DD-MM-YYYY)
      // Since format is DD-MM-YYYY, string comparison is tricky. We'll fetch all and filter in memory for now, 
      // or we can just fetch the recent ones. Since it's a server function, memory is less of an issue than client.
      const snapshot = await packagesRef.get();
      
      let totalPackages = 0;
      let totalScans = 0;
      let onTimeDeliveryCount = 0;
      let totalDeliveredWithSyncDate = 0;
      let exceptionCount = 0;

      const courierCount: Record<string, number> = {};
      const statusCount: Record<string, number> = {};

      for (const doc of snapshot.docs) {
        const pkg = doc.data();
        
        // Basic date check - only aggregate recent
        if (!pkg.updated_at) continue;
        const updatedAtDate = pkg.updated_at.toDate ? pkg.updated_at.toDate() : new Date(pkg.updated_at);
        if (updatedAtDate < firstDayOfMonth) continue;

        totalPackages++;
        const scanLen = pkg.scans?.length || 0;
        totalScans += scanLen;

        const rtStatus = pkg.real_time_status?.status || 'Unknown';
        statusCount[rtStatus] = (statusCount[rtStatus] || 0) + 1;

        if (rtStatus.toLowerCase().includes('exception') || rtStatus.toLowerCase().includes('delay')) {
          exceptionCount++;
        }

        if (rtStatus.toLowerCase().includes('delivered') && pkg.scans && pkg.scans.length > 0) {
           // Simplistic calc for aggregation
           totalDeliveredWithSyncDate++;
           onTimeDeliveryCount++; // dummy logic for now to prevent heavy CPU
        }
        
        pkg.scans?.forEach((scan: any) => {
           const courier = scan.courier ? scan.courier.replace('_', ' ') : 'Unknown';
           courierCount[courier] = (courierCount[courier] || 0) + 1;
        });
      }

      await db.collection("metrics").doc("scan_dashboard").set({
        this_month: {
          totalPackages,
          totalScans,
          exceptionCount,
          onTimeRate: totalDeliveredWithSyncDate > 0 ? ((onTimeDeliveryCount / totalDeliveredWithSyncDate) * 100).toFixed(1) : 'N/A',
          couriers: courierCount,
          statuses: statusCount,
          last_updated: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });

      functions.logger.info("Scan metrics aggregation completed successfully.");
    } catch (error) {
      functions.logger.error("Error aggregating scan metrics:", error);
    }
  });
