import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function findWebsiteLeadsWithoutBucketHistory() {
  const leadsSnap = await db.collection('leads')
    .where('customerSource', '==', 'Website')
    .get();

  console.log(`Total leads with customerSource === 'Website': ${leadsSnap.size}`);

  const amLeads = leadsSnap.docs.filter(doc => doc.data().bucket === 'account_manager');
  console.log(`Website leads in account_manager bucket: ${amLeads.length}`);

  const checks = amLeads.map(async (doc) => {
    const data = doc.data();
    const bhSnap = await doc.ref.collection('bucket_history').get();
    const hasHistoryDoc = !bhSnap.empty;
    const hasHistoryArray = Array.isArray(data.bucketHistory) && data.bucketHistory.length > 0;
    return {
      id: doc.id,
      companyName: data.companyName,
      dateLeadEntered: data.dateLeadEntered || data.createdAt,
      missingHistory: !hasHistoryDoc && !hasHistoryArray
    };
  });

  const results = await Promise.all(checks);
  const missing = results.filter(r => r.missingHistory);

  console.log(`Website leads in account_manager missing bucket history: ${missing.length}`);
  console.log("First 5 leads needing backfill:", missing.slice(0, 5));
}

findWebsiteLeadsWithoutBucketHistory().catch(console.error);
