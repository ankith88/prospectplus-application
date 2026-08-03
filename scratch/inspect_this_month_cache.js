const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspectThisMonthCache() {
  const doc = await db.collection('reports')
    .doc('top_users')
    .collection('ranges')
    .doc('this_month')
    .get();

  if (!doc.exists) {
    console.log("No this_month doc found!");
    return;
  }

  const data = doc.data();
  console.log("this_month cachedAt:", data.cachedAt);
  console.log("Total customers in this_month cache:", data.customers ? data.customers.length : 0);
  if (data.customers && data.customers.length > 0) {
    const top3 = data.customers.slice(0, 5);
    top3.forEach((c, idx) => {
      console.log(`Rank #${idx + 1}: ${c.name} (${c.id})`);
      console.log(`  allTimeBarcodes: ${c.allTimeBarcodes}`);
      console.log(`  lastScanDate: ${c.lastScanDate}`);
      console.log(`  currentWeekScans: ${c.currentWeekScans}`);
      console.log(`  currentMonthScans: ${c.currentMonthScans}`);
      console.log(`  weeklyAverage: ${c.weeklyAverage}`);
      console.log(`  monthlyAverage: ${c.monthlyAverage}`);
    });
  }
}

inspectThisMonthCache();
