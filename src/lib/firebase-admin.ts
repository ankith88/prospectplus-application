
import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

if (!admin.apps.length) {
    // For App Hosting / Production environments, use applicationDefault.
    // This removes the need for local serviceAccountKey.json files which break cloud builds.
    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "mailplus-outbound-leads-crm",
        });
    } catch (error) {
        console.error("Firebase Admin SDK initialization failed. Using fallback.", error);
        // Fallback for local dev if needed, though applicationDefault is preferred.
        adminApp = admin.initializeApp({
            projectId: "mailplus-outbound-leads-crm",
        });
    }
} else {
    adminApp = admin.app();
}

export { adminApp };
