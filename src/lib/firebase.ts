
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    projectId: "mailplus-outbound-leads-crm",
    appId: "1:683616418101:web:a4cdcb614f438df146747c",
    storageBucket: "mailplus-outbound-leads-crm.firebasestorage.app",
    apiKey: "AIzaSyBjmbHw0qCZeyZLnTC3k7mpd4-wYscNXBc",
    authDomain: "mailplus-outbound-leads-crm.firebaseapp.com",
    messagingSenderId: "683616418101",
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
