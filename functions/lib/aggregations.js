"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillReportingStats = exports.nightlySyncReports = exports.onAppointmentCreated = exports.onActivityCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Triggered on any new activity creation.
 * Increments the global and per-user call counts if the activity is a 'Call'.
 */
exports.onActivityCreated = functions
    .region("australia-southeast1")
    .firestore.document("leads/{leadId}/activity/{activityId}")
    .onCreate(async (snap, context) => {
    const activity = snap.data();
    if (activity.type !== "Call")
        return;
    const leadRef = snap.ref.parent.parent;
    const leadSnap = await leadRef.get();
    const leadData = leadSnap.data() || {};
    const dialer = leadData.dialerAssigned || "Unassigned";
    const franchisee = leadData.franchisee || "Unassigned";
    const batch = db.batch();
    // 1. Global Summary
    const summaryRef = db.collection("reports_metadata").doc("summary");
    batch.set(summaryRef, {
        totalCalls: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    // 2. Dialer Summary
    const dialerRef = db.collection("reports_metadata").doc("byDialer").collection("stats").doc(dialer);
    batch.set(dialerRef, {
        totalCalls: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // 3. Franchisee Summary
    const franchiseeRef = db.collection("reports_metadata").doc("byFranchisee").collection("stats").doc(franchisee);
    batch.set(franchiseeRef, {
        totalCalls: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return batch.commit();
});
/**
 * Triggered on any new appointment creation.
 * Increments the global and per-user appointment counts.
 */
exports.onAppointmentCreated = functions
    .region("australia-southeast1")
    .firestore.document("leads/{leadId}/appointments/{apptId}")
    .onCreate(async (snap, context) => {
    const leadRef = snap.ref.parent.parent;
    const leadSnap = await leadRef.get();
    const leadData = leadSnap.data() || {};
    const dialer = leadData.dialerAssigned || "Unassigned";
    const franchisee = leadData.franchisee || "Unassigned";
    const batch = db.batch();
    // 1. Global Summary
    const summaryRef = db.collection("reports_metadata").doc("summary");
    batch.set(summaryRef, {
        totalAppointments: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    // 2. Dialer Summary
    const dialerRef = db.collection("reports_metadata").doc("byDialer").collection("stats").doc(dialer);
    batch.set(dialerRef, {
        totalAppointments: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // 3. Franchisee Summary (Fixed unused variable lint)
    const franchiseeRef = db.collection("reports_metadata").doc("byFranchisee").collection("stats").doc(franchisee);
    batch.set(franchiseeRef, {
        totalAppointments: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return batch.commit();
});
/**
 * A scheduled function to re-calculate all-time stats to ensure consistency.
 * Best run during off-peak hours.
 */
exports.nightlySyncReports = functions
    .region("australia-southeast1")
    .pubsub.schedule("0 2 * * *") // 2 AM Sydney time
    .timeZone("Australia/Sydney")
    .onRun(async (context) => {
    functions.logger.info("Starting nightly reports sync...");
    // This is a heavy operation, we would typically query BigQuery or 
    // stream through all records if BigQuery isn't available.
    // For now, we will implement the logic to query the collections.
    // In a real multi-thousand lead environment, we would use a Query Partition or BQ scan.
    // Logic: 
    // 1. Scan all activity docs where type == 'Call'
    // 2. Scan all appointment docs
    // 3. Update reports_metadata/summary
    return null;
});
/**
 * One-off backfill function to populate the reports_metadata/summary document.
 * This iterates through all activities and appointments.
 */
exports.backfillReportingStats = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onRequest(async (req, res) => {
    const db = admin.firestore();
    try {
        console.log("Starting backfill...");
        // Use collections directly if possible for better performance but collectionGroup for subcollections
        const activitiesSnap = await db.collectionGroup('activity').where('type', '==', 'Call').get();
        const apptsSnap = await db.collectionGroup('appointments').get();
        const wonLeadsSnap = await db.collection('companies').get(); // Companies are "Won" leads
        const leadsSnap = await db.collection('leads').get();
        const totalCalls = activitiesSnap.size;
        const totalAppointments = apptsSnap.size;
        const wonCount = wonLeadsSnap.size;
        const queueCount = leadsSnap.docs.filter(doc => ['New', 'Priority Lead', 'Priority Field Lead'].includes(doc.data().customerStatus)).length;
        const inProgressCount = leadsSnap.docs.filter(doc => doc.data().customerStatus === 'In Progress' || doc.data().customerStatus === 'Quote Sent').length;
        const processedCount = leadsSnap.docs.filter(doc => doc.data().customerStatus === 'Lost' || doc.data().customerStatus === 'Won').length;
        const summaryData = {
            totalCalls,
            totalAppointments,
            wonCount,
            queueCount,
            inProgressCount,
            processedCount,
            callToApptRatio: totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0,
            apptToWonRatio: totalAppointments > 0 ? (wonCount / totalAppointments) * 100 : 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            backfilledAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('reports_metadata').doc('summary').set(summaryData, { merge: true });
        res.status(200).send({
            success: true,
            ...summaryData,
            message: "Backfill completed successfully."
        });
    }
    catch (error) {
        console.error("Backfill failed:", error);
        res.status(500).send({ success: false, error: error.message });
    }
});
//# sourceMappingURL=aggregations.js.map