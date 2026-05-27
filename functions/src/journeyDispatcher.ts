import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Runs every hour to check active journeys
export const journeyDispatcher = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
    // 1. Fetch all leads with activeJourneys
    const leadsSnapshot = await db.collection('leads')
                                  .where('activeJourneys', '!=', [])
                                  .get();
                                  
    for (const doc of leadsSnapshot.docs) {
        const lead = doc.data();
        const activeJourneys = lead.activeJourneys || [];
        
        for (const journeyId of activeJourneys) {
            // 2. Fetch the journey definition
            const journeySnap = await db.collection('Journeys').doc(journeyId).get();
            if (!journeySnap.exists) continue;
            
            const journey = journeySnap.data();
            if (journey?.status !== 'active') continue;

            // 3. Determine current node state for this lead
            // In a real system, you'd track the lead's state within the journey in a subcollection
            // e.g., 'JourneyStates/{leadId}_{journeyId}'
            
            console.log(`Evaluating journey ${journeyId} for lead ${doc.id}`);
            
            // Mock: Send next email or SMS based on journey edges
            // Here we would use an email provider like SendGrid, or log an internal task
            
            // Example task generation:
            // await db.collection('tasks').add({
            //   leadId: doc.id,
            //   title: 'Follow up from drip campaign',
            //   isCompleted: false,
            //   dueDate: new Date().toISOString()
            // });
        }
    }
    
    return null;
});
