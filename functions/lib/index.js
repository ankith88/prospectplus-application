"use strict";
/**
 * @fileoverview Cloud Functions for task reminders and integrations.
 */
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
exports.backfillReportingStats = exports.onAppointmentCreated = exports.onActivityCreated = exports.onVisitNoteCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// @ts-ignore
const fetch = require("node-fetch");
// Initialize Firebase Admin SDK
admin.initializeApp();
// const db = admin.firestore(); // Unused here
// nodemailer configuration removed because it was unused at the global level.
// If needed for future email features, define it within the specific cloud function.
/**
 * Sends a notification to a Microsoft Teams channel when a new visit note is created.
 */
exports.onVisitNoteCreated = functions.region("australia-southeast1").firestore.document('visitnotes/{noteId}').onCreate(async (snap, context) => {
    const noteData = snap.data();
    const webhookUrl = functions.config().teams?.webhook_url;
    if (!webhookUrl) {
        functions.logger.error("Microsoft Teams webhook URL is not configured. Set it in Firebase config: teams.webhook_url");
        return;
    }
    functions.logger.info("Teams webhook URL is present. Preparing to send notification.");
    const { companyName, capturedBy, outcome, content } = noteData;
    const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "0076D7",
        "summary": `New Visit Note by ${capturedBy}`,
        "sections": [{
                "activityTitle": `**${capturedBy}** captured a new visit note`,
                "activitySubtitle": `For: **${companyName || 'Unknown Company'}**`,
                "facts": [{
                        "name": "Outcome",
                        "value": outcome?.type || "N/A"
                    }, {
                        "name": "Captured At",
                        "value": new Date(noteData.createdAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
                    }],
                "markdown": true
            }, {
                "text": `> ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`
            }]
    };
    functions.logger.info("Sending card to Teams:", JSON.stringify(card, null, 2));
    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            body: JSON.stringify(card),
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            const errorText = await response.text();
            functions.logger.error("Failed to send Teams notification:", response.status, response.statusText, errorText);
        }
        else {
            const responseText = await response.text();
            functions.logger.info("Successfully sent Teams notification for new visit note. Response from Teams:", responseText);
        }
    }
    catch (error) {
        functions.logger.error("Error sending POST request to Teams webhook:", error.message, error.stack);
    }
});
/**
 * A scheduled function that runs every hour to check for due tasks.
 */
/*
export const taskReminder = functions
  .runWith({ memory: "512MB", timeoutSeconds: 300 })
  .pubsub.schedule("every 60 minutes")
  .onRun(async (context) => {
    functions.logger.info("Executing taskReminder function.", {
      structuredData: true,
    });

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get all leads
    const leadsSnapshot = await db.collection("leads").get();

    for (const leadDoc of leadsSnapshot.docs) {
      const leadId = leadDoc.id;
      const leadData = leadDoc.data();

      // Query for tasks that are due within the next hour and not completed
      const tasksSnapshot = await db
        .collection("leads")
        .doc(leadId)
        .collection("tasks")
        .where("isCompleted", "==", false)
        .where("dueDate", "<=", oneHourFromNow.toISOString())
        .get();

      if (tasksSnapshot.empty) {
        continue;
      }

      functions.logger.info(
        `Found ${tasksSnapshot.size} due tasks for lead ${leadId}.`
      );

      // Get user assigned to the lead
      const dialerAssigned = leadData.dialerAssigned;
      if (!dialerAssigned) {
        functions.logger.warn(`Lead ${leadId} has due tasks but no assigned dialer.`);
        continue;
      }
      
      const usersQuery = await db.collection('users').where('displayName', '==', dialerAssigned).limit(1).get();
      if (usersQuery.empty) {
        functions.logger.warn(`Could not find user with displayName: ${dialerAssigned}`);
        continue;
      }

      const user = usersQuery.docs[0].data();

      if (!user.email) {
         functions.logger.warn(`User ${dialerAssigned} does not have an email address.`);
         continue;
      }

      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        const dueDate = new Date(task.dueDate);

        const mailOptions = {
          from: `"ProspectPlus" <${functions.config().gmail.email}>`,
          to: user.email,
          subject: `Reminder: Task due for lead "${leadData.companyName}"`,
          html: `
            <h1>Task Reminder</h1>
            <p>Hi ${user.firstName},</p>
            <p>This is a reminder for your task for the lead: <strong>${leadData.companyName}</strong>.</p>
            <p><strong>Task:</strong> ${task.title}</p>
            <p><strong>Due Date:</strong> ${dueDate.toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</p>
            <p>Please log in to ProspectPlus to take action.</p>
          `,
        };

        try {
          await mailTransport.sendMail(mailOptions);
          functions.logger.info(`Reminder email sent to ${user.email} for task ${taskDoc.id}.`);
        } catch (error) {
          functions.logger.error(
            `Failed to send email for task ${taskDoc.id}:`,
            error
          );
        }
      }
    }

    return null;
  });
*/
// Export Aggregation Functions
var aggregations_1 = require("./aggregations");
Object.defineProperty(exports, "onActivityCreated", { enumerable: true, get: function () { return aggregations_1.onActivityCreated; } });
Object.defineProperty(exports, "onAppointmentCreated", { enumerable: true, get: function () { return aggregations_1.onAppointmentCreated; } });
Object.defineProperty(exports, "backfillReportingStats", { enumerable: true, get: function () { return aggregations_1.backfillReportingStats; } });
//# sourceMappingURL=index.js.map