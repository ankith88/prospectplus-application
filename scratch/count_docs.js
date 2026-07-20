const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function run() {
  console.log("Counting documents in collections...");

  const activities = await db.collectionGroup('activity').select().get();
  console.log(`activity (collectionGroup): ${activities.size} docs`);

  const appointments = await db.collectionGroup('appointments').select().get();
  console.log(`appointments (collectionGroup): ${appointments.size} docs`);

  const leads = await db.collection('leads').select().get();
  console.log(`leads: ${leads.size} docs`);

  const companies = await db.collection('companies').select().get();
  console.log(`companies: ${companies.size} docs`);

  const visitnotes = await db.collection('visitnotes').select().get();
  console.log(`visitnotes: ${visitnotes.size} docs`);
}

run().catch(console.error);
