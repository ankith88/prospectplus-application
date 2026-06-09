import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

export const onLeadUpdated = functions
  .region('australia-southeast1')
  .firestore.document('leads/{leadId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const db = admin.firestore();

    try {
      // Fetch all active nurture journeys
      const journeysSnapshot = await db.collection('Journeys').where('status', '==', 'active').get();
      let enrolled = false;

      for (const journeyDoc of journeysSnapshot.docs) {
        if (enrolled) break; // Only enroll in one journey at a time

        const journeyData = journeyDoc.data();
        const triggerNode = journeyData.nodes?.find((n: any) => n.type === 'trigger');
        
        if (triggerNode?.config?.autoEnroll) {
          const field = triggerNode.config.enrollField;
          const value = triggerNode.config.enrollValue;
          
          if (field && value && afterData[field] === value && beforeData[field] !== value) {
            const journeyName = journeyData.name || 'Unnamed Journey';
            const journeyId = journeyDoc.id;

            await change.after.ref.update({
              nurtureJourneyId: journeyId,
              nurtureJourneyName: journeyName,
              nurtureStatus: 'active',
              nurtureCurrentStep: 0,
              nurtureEnrolledAt: new Date().toISOString(),
              nurtureLastActionAt: null,
              nurtureNextActionAt: new Date().toISOString(),
              bucket: 'nurture', // Move the lead to nurture bucket
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log activity
            await db.collection('leads').doc(context.params.leadId).collection('activity').add({
              type: 'Update',
              date: new Date().toISOString(),
              notes: `Lead automatically moved to Nurture bucket and enrolled in journey: ${journeyName} due to ${field} changing to ${value}.`,
              author: 'System Automation'
            });

            functions.logger.info(`Lead ${context.params.leadId} enrolled in Nurture Journey: ${journeyName}`);
            enrolled = true;
          }
        }
      }
    } catch (error) {
      functions.logger.error(`Error processing dynamic auto-enrollment for lead ${context.params.leadId}:`, error);
    }
    
    return null;
  });
