const admin = require('firebase-admin');

async function run() {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  try {
    const app = admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' }, 'queryApp');
    const db = app.firestore();
    
    // Mimic the query
    console.log("Running getSubCollection query...");
    const ref = db.collection('leads').doc('1931805').collection('activity');
    
    // Let's try without orderBy first
    const snapNoOrder = await ref.get();
    console.log(`Documents count without order: ${snapNoOrder.size}`);
    
    // Now try with orderBy
    try {
      const snapOrdered = await ref.orderBy('date', 'desc').get();
      console.log(`Documents count with order by date: ${snapOrdered.size}`);
    } catch (err) {
      console.error("Order by date failed:", err.message);
    }
  } catch (err) {
    console.error("General error:", err);
  }
  process.exit(0);
}

run();
