/**
 * @fileoverview Cloud Functions for task reminders and integrations.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import fetch from "node-fetch";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure nodemailer to use Gmail with an App Password
const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

/**
 * Sends a notification to a Microsoft Teams channel when a new visit note is created.
 */
export const onVisitNoteCreated = functions
  .region("australia-southeast1")
  .firestore.document("visitnotes/{noteId}")
  .onCreate(async (snap, context) => {
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

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: JSON.stringify(card),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        functions.logger.error("Failed to send Teams notification:", response.status, response.statusText, errorText);
      } else {
        functions.logger.info("Successfully sent Teams notification for new visit note.");
      }
    } catch (error) {
      functions.logger.error("Error sending POST request to Teams webhook:", error);
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
