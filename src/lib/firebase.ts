
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "REDACTED",
    authDomain: "REDACTED",
    projectId: "REDACTED",
    storageBucket: "REDACTED",
    messagingSenderId: "REDACTED",
    appId: "REDACTED",
    measurementId: "REDACTED"
};

let app: FirebaseApp;
let firestore: Firestore | null = null;

// Initialize Firebase
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        firestore = getFirestore(app);
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    app = getApp();
    firestore = getFirestore(app);
}

export { app, firestore };
