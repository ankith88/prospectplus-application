const admin = require('firebase-admin');
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'mailplus-outbound-leads-crm' });
const db = admin.firestore();

async function run() {
  console.log("Checking Firestore emulator packages collection...");
  try {
    const snapshot = await db.collection('packages').get();
    console.log(`Total packages found: ${snapshot.size}`);
    
    const dates = new Set();
    const latestPackages = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.sync_date) {
        dates.add(data.sync_date);
      }
      latestPackages.push({
        id: doc.id,
        sync_date: data.sync_date,
        updated_at: data.updated_at ? (data.updated_at.toDate ? data.updated_at.toDate().toISOString() : data.updated_at) : null,
      });
    });

    console.log("Unique sync_dates in packages collection:", Array.from(dates));
    
    // Sort packages by updated_at descending
    latestPackages.sort((a, b) => {
      if (!a.updated_at) return 1;
      if (!b.updated_at) return -1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    console.log("\nTop 5 recently updated/created packages:");
    console.log(latestPackages.slice(0, 5));
    
    // Check specifically for today's date: '10-07-2026'
    const todayStr = '10-07-2026';
    const todayPackages = latestPackages.filter(p => p.sync_date === todayStr);
    console.log(`\nPackages synced for today (${todayStr}): ${todayPackages.length}`);
  } catch (err) {
    console.error("Error checking packages:", err);
  }
}

run();
