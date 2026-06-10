import { app, firestore } from '../src/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, arrayUnion } from 'firebase/firestore';

async function fixLead() {
  const leadId = '2005926';
  const journeyName = 'Trial Nudge - Job 1';
  
  // 1. Find the Journey ID
  // For web SDK without complex queries, we can just hardcode the Journey ID we found earlier.
  const journeyId = 'o9MOvDPj2Cf18t4K7rAZ';
  
  const leadRef = doc(firestore, 'leads', leadId);
  const leadDoc = await getDoc(leadRef);
  
  if (!leadDoc.exists()) {
    console.error(`Lead ${leadId} not found`);
    return;
  }
  
  const leadData = leadDoc.data();
  console.log('Current status:', leadData?.status);
  console.log('Current bucket:', leadData?.bucket);
  
  const oldBucket = leadData?.bucket || 'outbound';
  
  await updateDoc(leadRef, {
    status: 'Trialing LocalMile',
    customerStatus: 'Trialing LocalMile',
    bucket: 'account_manager',
    activeJourneys: arrayUnion(journeyId),
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
  });
  
  console.log(`Successfully updated lead ${leadId} and enrolled in journey ${journeyId}`);
  
  const activityRef = collection(firestore, 'leads', leadId, 'activity');
  await addDoc(activityRef, {
    type: 'Update',
    date: new Date().toISOString(),
    notes: `System manually fixed status to Trialing LocalMile, moved to Account Manager bucket, and enrolled in nurture journey: ${journeyName}`,
    author: 'System Fix'
  });
  
  console.log('Activity log added.');
  process.exit(0);
}

fixLead().catch((err) => {
    console.error(err);
    process.exit(1);
});
