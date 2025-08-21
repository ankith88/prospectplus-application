
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let firestore: Firestore;

// Initialize Firebase
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

firestore = getFirestore(app);

export { app, firestore };
