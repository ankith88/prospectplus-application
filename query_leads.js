const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('leads').limit(500).get();
  let found = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.appointments && data.appointments.length > 0) {
      console.log(data.companyName, "Appointments:", data.appointments.map(a => Object.keys(a)));
      found++;
    }
  });
  console.log("Total found", found);
}
run();
