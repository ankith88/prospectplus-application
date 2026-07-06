
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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
let storage: FirebaseStorage;

// Initialize Firebase
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// In Next.js / Hot Module Replacement environments, modules can be re-evaluated,
// causing multiple Firestore instances to initialize and fail to obtain the IndexedDb lease.
// We cache the Firestore instance on globalThis to prevent this.
const globalWithFirebase = globalThis as typeof globalThis & {
    _firestoreInstance?: Firestore;
};

if (globalWithFirebase._firestoreInstance) {
    firestore = globalWithFirebase._firestoreInstance;
} else {
    firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
        }),
    });
    globalWithFirebase._firestoreInstance = firestore;
}
storage = getStorage(app);

export { app, firestore, storage };
