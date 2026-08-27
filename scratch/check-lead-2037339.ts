import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function inspectLead() {
  const leadId = "2037339";
  const leadDoc = await db.collection('leads').doc(leadId).get();
  console.log(`Checking Lead: ${leadId}`);
  if (!leadDoc.exists) {
    console.log("Lead not found in 'leads' collection.");
    return;
  }
  const data = leadDoc.data() || {};
  console.log("Lead basic info:", {
    id: leadDoc.id,
    companyName: data.companyName,
    source: data.source,
    customerSource: data.customerSource,
    leadSource: data.leadSource,
    bucket: data.bucket,
    originalBucket: data.originalBucket,
    accountManagerAssigned: data.accountManagerAssigned,
    dateLeadEntered: data.dateLeadEntered,
    createdAt: data.createdAt,
  });

  const bhSnap = await db.collection('leads').doc(leadId).collection('bucket_history').get();
  console.log(`bucket_history docs count: ${bhSnap.size}`);
  bhSnap.forEach(d => {
    console.log("BH doc:", d.id, d.data());
  });

  if (data.bucketHistory) {
    console.log("bucketHistory array on doc:", data.bucketHistory);
  }
}

inspectLead().catch(console.error);
