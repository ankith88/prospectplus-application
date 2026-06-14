import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('packages').get();
  const activePackages = snapshot.docs.filter(doc => !doc.data().real_time_status?.delivered);

  let batch = db.batch();
  let operationCount = 0;
  let batchCount = 0;

  for (const doc of activePackages) {
    const pkg = doc.data();
    const orderDate = pkg.order_date ? new Date(pkg.order_date) : null;
    const isOld = orderDate ? (Date.now() - orderDate.getTime() > 3 * 24 * 60 * 60 * 1000) : false;

    if (isOld) {
      batch.set(doc.ref, {
        real_time_status: {
          status: 'Delivered',
          delivered: true,
          estimated_delivery_date: null,
          last_location: 'Left in a safe place',
          updated_at: new Date().toISOString()
        }
      }, { merge: true });

      operationCount++;

      if (operationCount >= 500) {
        await batch.commit();
        batchCount++;
        console.log(`Committed batch ${batchCount} with 500 operations.`);
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
    batchCount++;
    console.log(`Committed final batch ${batchCount} with ${operationCount} operations.`);
  }

  console.log("Finished updating old active packages to Delivered.");
}

run().catch(console.error);
