import * as functions from "firebase-functions/v1";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import fetch = require("node-fetch");
import { sendAutomatedEmail } from "./services/emailDispatcher";

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

        const packageRef = db.collection('packages').doc(item.code);

        const scans = item.scans;
        let latest_scan_at = null;
        if (scans && Array.isArray(scans) && scans.length > 0) {
          const maxScan = scans.reduce((max, current) => {
            if (!max.updated_at) return current;
            if (!current.updated_at) return max;
            return new Date(current.updated_at) > new Date(max.updated_at) ? current : max;
          }, scans[0]);
          if (maxScan && maxScan.updated_at) {
            latest_scan_at = maxScan.updated_at;
          }
        }

        const updatePayload: any = {
          ...item,
          sync_date: dateString,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        if (latest_scan_at) {
          updatePayload.latest_scan_at = latest_scan_at;
        }

        // Use merge: true so we don't accidentally overwrite data we might add later,
        // while updating the latest fields and completely replacing the scans array.
        batch.set(packageRef, updatePayload, { merge: true });

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
 * Scheduled function that runs hourly between 7 AM and 7 PM Sydney time.
 * It checks active packages and updates their real-time status
 * by querying our tracking endpoint logic.
 */
export const trackActivePackages = onSchedule({
  schedule: "0 7-19 * * *",
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

/**
 * Core logic to generate daily report data, build a compliant email template,
 * and dispatch it via the automated email service.
 */
export async function runBarcodeReport(dateString: string, recipients: string[]): Promise<any> {
  const db = admin.firestore();

  functions.logger.info(`Generating barcode report for date: ${dateString}`);

  // Fetch all packages synced on this date
  const snapshot = await db.collection("packages")
    .where("sync_date", "==", dateString)
    .get();

  const packages = snapshot.docs.map(doc => doc.data());
  functions.logger.info(`Found ${packages.length} raw packages for date ${dateString}`);

  // Filter packages: must have at least one scan with type "Lodgement" or "Pickup" (case-insensitive)
  const filteredPackages = packages.filter(pkg => {
    return pkg.scans?.some((scan: any) => {
      const type = scan.scan_type?.toLowerCase() || "";
      return type === "lodgement" || type === "pickup";
    });
  });

  functions.logger.info(`Filtered down to ${filteredPackages.length} packages containing Lodgement or Pickup scans`);

  // Report 1: Unique package count based on delivery speed
  const speedCounts: Record<string, number> = {};

  // Report 2: Unique Package count per customer / per franchisee / per delivery speed
  // Key format: franchisee_name||customer_name||delivery_speed
  const groupCounts: Record<string, number> = {};

  filteredPackages.forEach(pkg => {
    // Determine delivery speed from Lodgement/Pickup scans first, fallback to others
    let speed = "Unknown";
    const targetScan = pkg.scans?.find((s: any) => {
      const type = s.scan_type?.toLowerCase() || "";
      return (type === "lodgement" || type === "pickup") && s.delivery_speed;
    });

    if (targetScan) {
      speed = targetScan.delivery_speed;
    } else {
      const anySpeed = pkg.scans?.find((s: any) => s.delivery_speed);
      if (anySpeed) {
        speed = anySpeed.delivery_speed;
      }
    }

    // Normalize speed string
    if (speed && typeof speed === "string") {
      speed = speed.trim();
      speed = speed.charAt(0).toUpperCase() + speed.slice(1).toLowerCase();
    } else {
      speed = "Unknown";
    }

    // Increment speed counts
    speedCounts[speed] = (speedCounts[speed] || 0) + 1;

    // Increment grouped counts
    const customer = pkg.customer_name || "Unlinked Customer";
    const franchisee = pkg.franchisee_name || "Unassigned Franchisee";
    const groupKey = `${franchisee}||${customer}||${speed}`;
    groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
  });

  // Calculate total count per customer to sort by highest customer volume
  const customerTotals: Record<string, number> = {};
  Object.entries(groupCounts).forEach(([key, count]) => {
    const [, customer] = key.split("||");
    customerTotals[customer] = (customerTotals[customer] || 0) + count;
  });

  const speedReport = Object.entries(speedCounts).map(([speed, count]) => ({
    speed,
    count
  })).sort((a, b) => b.count - a.count);

  const groupReport = Object.entries(groupCounts).map(([key, count]) => {
    const [franchisee, customer, speed] = key.split("||");
    return { franchisee, customer, speed, count };
  }).sort((a, b) => {
    const totalA = customerTotals[a.customer] || 0;
    const totalB = customerTotals[b.customer] || 0;

    // 1. Sort by customer's total barcode count descending
    if (totalB !== totalA) {
      return totalB - totalA;
    }
    // 2. Sort by customer name alphabetically to keep same customer grouped
    const cComp = a.customer.localeCompare(b.customer);
    if (cComp !== 0) return cComp;

    // 3. Sort by delivery speed
    return a.speed.localeCompare(b.speed);
  });

  // Construct Email HTML template adhering to outbound email templates rules
  const speedRowsHtml = speedReport.length > 0
    ? speedReport.map(r => `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.speed}</strong></td>
          <td align="right" style="padding: 10px 12px; font-size: 14px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding: 15px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No speed data recorded.</td></tr>`;

  const groupRowsHtml = groupReport.length > 0
    ? groupReport.map(r => `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${r.franchisee}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${r.customer}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.speed}</strong></td>
          <td align="right" style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
        </tr>`).join("")
    : `<tr><td colspan="4" style="padding: 15px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No detailed barcode data recorded.</td></tr>`;

  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily Barcodes Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
          <!-- Banner Logo -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 25px; background-color: #ffffff;">
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Barcodes Sync Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Here is the consolidated daily summary of package barcodes synced yesterday (<strong>${dateString}</strong>) that contain <strong>Lodgement</strong> or <strong>Pickup</strong> scans.
              </p>
              
              <div style="margin-bottom: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #475569; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  Total Synced Packages with Lodgement/Pickup: <strong style="color: #095c7b; font-size: 15px;">${filteredPackages.length}</strong>
                </p>
              </div>

              <!-- Report 1: Unique count based on delivery speed -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Unique Packages by Delivery Speed</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Delivery Speed</th>
                    <th align="right" style="padding: 8px 12px; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Package Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${speedRowsHtml}
                </tbody>
              </table>

              <!-- Report 2: Unique count per customer / franchisee / delivery speed -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Detailed Breakdown</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Customer</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Speed</th>
                    <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${groupRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>
          <!-- Standardized Legal Brand Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br />
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Dispatch email
  const toStr = recipients.join(", ");
  const dispatchResult = await sendAutomatedEmail({
    to: toStr,
    subject: `Daily Barcodes Report - ${dateString}`,
    html: emailHtml
  });

  functions.logger.info(`Barcode report email dispatch response: ${JSON.stringify(dispatchResult)}`);
  return {
    success: dispatchResult.success,
    simulated: dispatchResult.simulated,
    totalPackages: filteredPackages.length,
    speedReport,
    groupReport,
    emailHtml
  };
}

/**
 * Scheduled Cloud Function that runs daily at 6:00 AM Sydney time.
 * Exposes a report showing unique package counts by delivery speed
 * and per franchisee/customer/delivery speed.
 */
export const sendDailyBarcodeReport = functions
  .region("australia-southeast1")
  .pubsub.schedule("0 * * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing scheduled sendDailyBarcodeReport function...");

    const db = admin.firestore();
    let recipients = ["ankith.ravindran@mailplus.com.au"];
    let frequency = "06:00"; // Default to 6 AM Sydney Time

    try {
      const configDoc = await db.collection("settings").doc("daily_barcodes_report").get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data) {
          if (Array.isArray(data.recipients) && data.recipients.length > 0) {
            recipients = data.recipients;
          }
          if (data.frequency) {
            frequency = data.frequency;
          }
        }
      }
    } catch (err) {
      functions.logger.error("Failed to load recipients list", err);
    }

    if (frequency === "disabled") {
      functions.logger.info("Daily barcode report is disabled. Skipping execution.");
      return;
    }

    // Check current hour in Sydney
    const sydneyHourStr = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hour12: false
    }).format(new Date());

    const currentHour = parseInt(sydneyHourStr, 10);
    const targetHour = parseInt(frequency.split(":")[0], 10);

    if (currentHour !== targetHour) {
      functions.logger.info(`Current Sydney hour is ${currentHour}, target hour is ${targetHour}. Skipping execution.`);
      return;
    }

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

    const dateString = `${day}-${month}-${year}`;

    try {
      await runBarcodeReport(dateString, recipients);
    } catch (err) {
      functions.logger.error("Error generating or sending daily barcode report:", err);
    }
  });
