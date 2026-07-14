const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  try {
    const app = admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' }, 'queryApp');
    const db = app.firestore();
    const doc = await db.collection('leads').doc('2010976').get();
    if (doc.exists) {
      fs.writeFileSync('scratch/lead_output.json', JSON.stringify(doc.data(), null, 2));
      console.log("Success: wrote scratch/lead_output.json");
    } else {
      fs.writeFileSync('scratch/lead_output.json', '{"error": "lead document 2010976 not found"}');
      console.log("Not found");
    }
  } catch (err) {
    fs.writeFileSync('scratch/lead_output.json', JSON.stringify({error: err.message, stack: err.stack}));
    console.error("Error occurred:", err);
  }
  process.exit(0);
}

run();
