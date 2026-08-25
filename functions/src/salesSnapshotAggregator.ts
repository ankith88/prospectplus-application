import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * Scheduled Cloud Function to pre-compute and store daily Sales Snapshot summaries.
 * Runs daily at 23:55 (Sydney time).
 */
export const aggregateDailySalesSnapshot = functions
  .region('australia-southeast1')
  .pubsub.schedule('55 23 * * *')
  .timeZone('Australia/Sydney')
  .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const docId = `${yyyy}-${mm}-${dd}`;

    const targetStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const targetEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    functions.logger.info(`Starting daily sales snapshot aggregation for ${docId}`);

    try {
      // 1. Fetch activities for today
      const activitiesSnap = await db
        .collectionGroup('activity')
        .where('date', '>=', targetStart.toISOString())
        .where('date', '<=', targetEnd.toISOString())
        .get();

      // 2. Fetch appointments for today
      const apptsSnap = await db
        .collectionGroup('appointments')
        .where('duedate', '>=', targetStart.toISOString())
        .where('duedate', '<=', targetEnd.toISOString())
        .get();

      // 3. Count leads created today
      const leadsSnap = await db
        .collection('leads')
        .where('dateLeadEntered', '>=', targetStart.toISOString())
        .where('dateLeadEntered', '<=', targetEnd.toISOString())
        .get();

      const snapshotDoc = {
        date: docId,
        totalActivities: activitiesSnap.size,
        totalAppointments: apptsSnap.size,
        leadsCreated: leadsSnap.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('daily_sales_snapshots').doc(docId).set(snapshotDoc, { merge: true });
      functions.logger.info(`Daily sales snapshot aggregated successfully for ${docId}`);
      return null;
    } catch (error) {
      functions.logger.error(`Error aggregating daily sales snapshot for ${docId}:`, error);
      throw error;
    }
  });
