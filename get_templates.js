const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    projectId: "demo-project",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use the local emulator or actual project, wait, we are in NextJS. We can just use curl to hit a quick API or write a script using firebase-admin.
