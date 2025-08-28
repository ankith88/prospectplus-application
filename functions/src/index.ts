/**
 * @fileoverview Cloud Functions for task reminders.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure nodemailer to use Gmail with an App Password
// IMPORTANT: Do not hardcode credentials. Use environment variables.
// To set env vars, run in your terminal:
// firebase functions:config:set gmail.email="your-email@gmail.com"
// firebase functions:config:set gmail.password="your-gmail-app-password"
const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

/**
 * A scheduled function that runs every hour to check for due tasks.
 */
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
