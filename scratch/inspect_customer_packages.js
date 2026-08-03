const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function inspectCustomerPackages() {
  console.log("Searching for packages for customer 1994703 (Trax Distribution)...");
  
  const snap = await db.collection('packages').get();
  console.log(`Total packages in DB: ${snap.size}`);

  const customerPackages = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    let nsId = null;
    if (data.scans && Array.isArray(data.scans)) {
      const s = data.scans.find(scan => scan.customer_ns_id);
      if (s) nsId = String(s.customer_ns_id);
    }
    if (nsId === '1994703' || doc.id.includes('MPMPYLJ9')) {
      customerPackages.push({ id: doc.id, ...data });
    }
  });

  console.log(`Found ${customerPackages.length} packages for 1994703.`);
  
  if (customerPackages.length > 0) {
    const sample = customerPackages.slice(0, 10);
    sample.forEach(p => {
      console.log(`Package ${p.id}:`);
      console.log(`  sync_date: ${p.sync_date}`);
      console.log(`  latest_scan_at: ${p.latest_scan_at}`);
      console.log(`  updated_at: ${p.updated_at ? (p.updated_at.toDate ? p.updated_at.toDate().toISOString() : p.updated_at) : 'N/A'}`);
      if (p.scans) {
        console.log(`  scans count: ${p.scans.length}`);
        console.log(`  scan dates:`, p.scans.map(s => s.updated_at));
      }
    });
  }
}

inspectCustomerPackages();
