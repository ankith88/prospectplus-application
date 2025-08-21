
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate that all required environment variables are present
const requiredConfig = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 
    'messagingSenderId', 'appId'
];

const missingConfig = requiredConfig.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

let app: FirebaseApp;
let firestore: Firestore | null = null;

if (missingConfig.length > 0) {
    const errorMsg = `ERROR: Missing Firebase config. Please add the following to your .env file: ${missingConfig.join(', ')}`;
    console.error(errorMsg);
    if (typeof window !== 'undefined') {
      // To avoid crashing the client-side, we don't throw an error here,
      // but we ensure `app` is not initialized.
      // A user-friendly message could be displayed elsewhere in the UI.
    }
} else {
    // Initialize Firebase
    if (!getApps().length) {
        try {
            app = initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    } else {
        app = getApp();
    }
}

if (app!) {
    firestore = getFirestore(app);
}


export { app, firestore };
