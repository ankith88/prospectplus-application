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
      
      let newJourneyId: string | null = null;
      let newJourneyName: string | null = null;
      let cancelOtherJourneys = false;
      let matchedGroupDetails: any = null;

      const evaluateCondition = (cond: any, leadData: any) => {
        if (!cond.field || cond.value === undefined) return false;
        
        if (cond.field === 'localMileJobCount') {
          return Number(cond.value) === Number(leadData.jobCount || 0);
        }

        if (cond.field === 'localMileTermsAccepted') {
          const isAccepted = leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
          const targetValue = cond.value === true || String(cond.value).toLowerCase() === 'true';
          return isAccepted === targetValue;
        }
        
        return String(cond.value).toLowerCase().trim() === String(leadData[cond.field] || '').toLowerCase().trim();
      };

      for (const journeyDoc of journeysSnapshot.docs) {
        if (newJourneyId) break; // Only trigger one new journey enrollment per update

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
            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              if (!group.conditions || group.conditions.length === 0) continue;

              let allConditionsMetNow = true;
              let wasMetBefore = true;
              let hasChangedCondition = false;
              
              for (const cond of group.conditions) {
                const metNow = evaluateCondition(cond, afterData);
                const metBefore = evaluateCondition(cond, beforeData);
                
                if (!metNow) {
                  allConditionsMetNow = false;
                }
                if (!metBefore) {
                  wasMetBefore = false;
                }
                
                // Did the field value change in this update?
                if (String(beforeData[cond.field] || '') !== String(afterData[cond.field] || '')) {
                  hasChangedCondition = true;
                }
              }
              
              // Only enroll if conditions are met now, and they either weren't met before,
              // OR one of the condition fields just changed (triggering the enrollment rule).
              if (allConditionsMetNow && (!wasMetBefore || hasChangedCondition)) {
                newJourneyId = journeyDoc.id;
                newJourneyName = journeyData.name || 'Unnamed Journey';
                cancelOtherJourneys = !!triggerNode.config.cancelOtherJourneys;
                matchedGroupDetails = group;
                break; // Found a matching group
              }
            }
          }
        }
      }
      
      if (newJourneyId) {
        const currentActive: string[] = afterData.activeJourneys || [];
        
        // Prevent re-enrolling if already actively enrolled in this exact journey
        if (!currentActive.includes(newJourneyId)) {
          let journeysToKeep = [...currentActive];
          
          if (cancelOtherJourneys) {
            journeysToKeep = [newJourneyId];
            
            // Mark previously active journey states as stopped
            for (const oldJourneyId of currentActive) {
              if (oldJourneyId !== newJourneyId) {
                try {
                  await db.collection('leads')
                    .doc(context.params.leadId)
                    .collection('journey_states')
                    .doc(oldJourneyId)
                    .update({
                      status: 'stopped',
                      lastExecutionTime: new Date().toISOString()
                    });
                } catch (e) {
                  // Document might not exist if it was just pending
                }
              }
            }
          } else {
            journeysToKeep.push(newJourneyId);
          }
          
          await change.after.ref.update({
            activeJourneys: journeysToKeep,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Log activity
          const conditionNotes = matchedGroupDetails.conditions.map((c: any) => `${c.field} = ${c.value}`).join(' AND ');

          await db.collection('leads').doc(context.params.leadId).collection('activity').add({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `Lead automatically enrolled in journey: ${newJourneyName} due to matching conditions: [${conditionNotes}].${cancelOtherJourneys ? ' Other active journeys were cancelled.' : ''}`,
            author: 'System Automation'
          });

          functions.logger.info(`Lead ${context.params.leadId} enrolled in Nurture Journey: ${newJourneyName}`);
        }
      }
    } catch (error) {
      functions.logger.error(`Error processing dynamic auto-enrollment for lead ${context.params.leadId}:`, error);
    }
    
    return null;
  });
