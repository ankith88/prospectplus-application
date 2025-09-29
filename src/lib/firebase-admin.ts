
import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

if (!admin.apps.length) {
    // Ensure you have your service account key file in your project
    // and the GOOGLE_APPLICATION_CREDENTIALS environment variable is set.
    // For local development, you can use a serviceAccount.json file.
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        adminApp = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else {
        // Fallback for local development or when service account env var isn't set.
        // Make sure you have a serviceAccountKey.json file in your root directory.
        try {
            const serviceAccount = require('../../serviceAccountKey.json');
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error("Firebase Admin SDK initialization failed. For local development, please ensure 'serviceAccountKey.json' exists in the root directory. For production, set GOOGLE_APPLICATION_CREDENTIALS.", error);
            // This will likely cause a crash, which is appropriate if admin functionality is required.
        }
    }
} else {
    adminApp = admin.app();
}

export { adminApp };
