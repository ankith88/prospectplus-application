const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function testQuery() {
  console.time('packagesQuery');
  const now = Date.now();
  const limitDays = 65; // prev_and_this_month
  const limitDate = new Date(now - limitDays * 24 * 60 * 60 * 1000);
  const limitDateStr = limitDate.toISOString();
  console.log('Querying packages with latest_scan_at >=', limitDateStr);

  try {
    const packagesSnap = await db.collection('packages')
      .where('latest_scan_at', '>=', limitDateStr)
      .select('scans', 'sync_date', 'latest_scan_at')
      .get();
    console.timeEnd('packagesQuery');
    console.log(`Fetched ${packagesSnap.docs.length} packages.`);
  } catch (err) {
    console.timeEnd('packagesQuery');
    console.error('Error executing query:', err);
  }
}

testQuery();
