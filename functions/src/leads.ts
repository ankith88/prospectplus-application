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
          let groups = triggerNode.config.enrollConditionGroups;
          
          // Fallback for older single condition format
          if (!groups && triggerNode.config.enrollField && triggerNode.config.enrollValue) {
            groups = [{
              conditions: [{
                field: triggerNode.config.enrollField,
                value: triggerNode.config.enrollValue
              }]
            }];
          }

          if (groups && groups.length > 0) {
            let matchedGroupIndex = -1;
            
            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              if (!group.conditions || group.conditions.length === 0) continue;

              let allConditionsMet = true;
              let hasChangedCondition = false;
              
              for (const cond of group.conditions) {
                const field = cond.field;
                const value = cond.value;
                
                if (!field || !value) {
                  allConditionsMet = false;
                  break;
                }
                
                // Is the condition currently met?
                if (afterData[field] !== value) {
                  allConditionsMet = false;
                  break;
                }
                
                // Did this specific field change in this update to trigger it?
                if (beforeData[field] !== value) {
                  hasChangedCondition = true;
                }
              }
              
              if (allConditionsMet && hasChangedCondition) {
                matchedGroupIndex = i;
                break; // OR logic met
              }
            }
            
            if (matchedGroupIndex !== -1) {
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
              const matchedGroup = groups[matchedGroupIndex];
              const conditionNotes = matchedGroup.conditions.map((c: any) => `${c.field} = ${c.value}`).join(' AND ');

              await db.collection('leads').doc(context.params.leadId).collection('activity').add({
                type: 'Update',
                date: new Date().toISOString(),
                notes: `Lead automatically moved to Nurture bucket and enrolled in journey: ${journeyName} due to matching conditions: [${conditionNotes}].`,
                author: 'System Automation'
              });

              functions.logger.info(`Lead ${context.params.leadId} enrolled in Nurture Journey: ${journeyName}`);
              enrolled = true;
            }
          }
        }
      }
    } catch (error) {
      functions.logger.error(`Error processing dynamic auto-enrollment for lead ${context.params.leadId}:`, error);
    }
    
    return null;
  });
