import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const aggregateOutboundReporting = functions
  .region("australia-southeast1")
  .pubsub.schedule("every 2 hours")
  .onRun(async (context) => {
    functions.logger.info("Starting aggregateOutboundReporting task...");

    try {
      const todayISO = new Date().toISOString().substring(0, 10);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();

      const [activitiesSnap, apptsSnap] = await Promise.all([
        db.collectionGroup("activity").where("date", ">=", sixtyDaysAgoISO).get(),
        db.collectionGroup("appointments").where("duedate", ">=", sixtyDaysAgoISO).get()
      ]);

      const summary = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        dateRangeStart: sixtyDaysAgoISO,
        totalActivities: activitiesSnap.size,
        totalAppointments: apptsSnap.size,
        date: todayISO
      };

      await db.collection("reports_aggregated").doc("outbound_summary").set(summary, { merge: true });
      functions.logger.info("Successfully updated reports_aggregated/outbound_summary", summary);
    } catch (err: any) {
      functions.logger.error("Error aggregating outbound reporting:", err);
    }

    return null;
  });
