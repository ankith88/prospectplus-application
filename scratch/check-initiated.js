const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

async function run() {
  const matches = ["1938360", "2008245", "2008247", "2009025"];
  for (const id of matches) {
    console.log(`\nChecking lead: ${id}`);
    const doc = await db.collection('leads').doc(id).get();
    if (doc.exists) {
      console.log(`Company: ${doc.data().companyName}`);
    }
    const activities = await db.collection('leads').doc(id).collection('activity').get();
    activities.forEach(act => {
      const data = act.data();
      if (data.type === 'Call') {
        console.log(`  Activity ${act.id}: type=${data.type}, aircallStatus=${data.aircallStatus}, author=${data.author}, date=${data.date}, notes="${data.notes}"`);
      }
    });
  }
}

run().catch(console.error);
