import { adminApp } from '../src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function fixLead() {
  const db = getFirestore(adminApp);
  const leadId = '2005926';
  
  const leadRef = db.collection('leads').doc(leadId);
  const leadDoc = await leadRef.get();
  
  if (!leadDoc.exists) {
    console.log(`Lead ${leadId} not found.`);
    return;
  }
  
  const leadData = leadDoc.data();
  console.log('Current status:', leadData?.status);
  console.log('Current bucket:', leadData?.bucket);
  
  const oldBucket = leadData?.bucket || 'outbound';
  
  const updates: any = {
    status: 'Trialing LocalMile',
    customerStatus: 'Trialing LocalMile',
    bucket: 'account_manager',
    bucketHistory: [
      {
        id: `bh-${Date.now()}`,
        oldBucket,
        newBucket: 'account_manager',
        date: new Date().toISOString(),
        author: 'System Fix'
      },
      ...(leadData?.bucketHistory || [])
    ]
  };
  
  await leadRef.update(updates);
  console.log(`Successfully updated lead ${leadId}`);
  
  const activityRef = leadRef.collection('activity');
  await activityRef.add({
    type: 'Update',
    date: new Date().toISOString(),
    notes: 'System automatically fixed status to Trialing LocalMile and moved to Account Manager bucket based on first LocalMile job creation.',
    author: 'System Fix'
  });
  console.log('Added activity log.');
}

fixLead().catch(console.error);
