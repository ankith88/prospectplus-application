import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from './src/lib/firebase-admin';

const db = getFirestore(adminApp);

async function investigate() {
  const journeyQuery = await db.collection('Journeys').where('name', '==', "LocalMile - T&C's Not Accepted").get();
  if (journeyQuery.empty) {
    console.log("Journey not found");
  } else {
    journeyQuery.forEach(doc => {
      console.log("Journey ID:", doc.id);
      const journey = doc.data();
      const trigger = journey.nodes?.find((n: any) => n.type === 'trigger');
      console.log("Enrollment Conditions:", JSON.stringify(trigger?.config?.enrollConditionGroups, null, 2));
    });
  }

  const leadId = "2005972";
  const leadDoc = await db.collection('leads').doc(leadId).get();
  if (!leadDoc.exists) {
    console.log("Lead not found");
  } else {
    console.log("Lead Data:");
    const data = leadDoc.data();
    if (data) {
        console.log(JSON.stringify({
        id: leadDoc.id,
        customerStatus: data.customerStatus,
        bucket: data.bucket,
        localMileTermsAccepted: data.localMileTermsAccepted,
        jobCount: data.jobCount,
        activeJourneys: data.activeJourneys,
        status: data.status,
        }, null, 2));
    }
  }
}

investigate().catch(console.error);
