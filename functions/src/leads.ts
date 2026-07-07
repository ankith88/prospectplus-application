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
      // If a lead is marked as 'Lost', stop all active nurture journeys
      if ((afterData.status === 'Lost' || afterData.status === 'Lost Customer') && beforeData.status !== afterData.status) {
        const currentActive: string[] = afterData.activeJourneys || [];
        if (currentActive.length > 0) {
          for (const oldJourneyId of currentActive) {
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
              // Document might not exist
            }
          }
          
          await change.after.ref.update({
            activeJourneys: [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          await db.collection('leads').doc(context.params.leadId).collection('activity').add({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `All active nurture journeys were stopped because the lead was marked as ${afterData.status}.`,
            author: 'System Automation'
          });
          
          functions.logger.info(`Stopped all nurture journeys for lead ${context.params.leadId} as it was marked as ${afterData.status}`);
        }
        
        return null; // Stop further processing for enrollment
      }

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

function generateRandomAlphanumeric(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getUniqueProspectPlusId(db: admin.firestore.Firestore): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `MP${generateRandomAlphanumeric(6)}`;
    const leadsSnap = await db.collection('leads').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!leadsSnap.empty) continue;
    const companiesSnap = await db.collection('companies').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!companiesSnap.empty) continue;
    unique = true;
  }
  return candidate;
}

export const onLeadCreated = functions
  .region('australia-southeast1')
  .firestore.document('leads/{leadId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.prospectPlusId) return null;
    
    const db = admin.firestore();
    const uniqueId = await getUniqueProspectPlusId(db);
    await snap.ref.update({ prospectPlusId: uniqueId });
    functions.logger.info(`Assigned Prospect+ ID ${uniqueId} to lead ${context.params.leadId}`);
    return null;
  });

export const onCompanyCreated = functions
  .region('australia-southeast1')
  .firestore.document('companies/{companyId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.prospectPlusId) return null;
    
    const db = admin.firestore();
    // Check if there is an existing lead with the same document ID that already has a Prospect+ ID
    const leadDoc = await db.collection('leads').doc(context.params.companyId).get();
    let uniqueId = '';
    if (leadDoc.exists && leadDoc.data()?.prospectPlusId) {
      uniqueId = leadDoc.data()?.prospectPlusId;
    } else {
      uniqueId = await getUniqueProspectPlusId(db);
    }
    
    await snap.ref.update({ prospectPlusId: uniqueId });
    functions.logger.info(`Assigned Prospect+ ID ${uniqueId} to company ${context.params.companyId}`);
    return null;
  });

export const assignProspectPlusIdsFallback = functions
  .region('australia-southeast1')
  .pubsub.schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Check leads
    try {
      const leadsSnap = await db.collection('leads').orderBy('createdAt', 'desc').limit(100).get();
      for (const doc of leadsSnap.docs) {
        const data = doc.data();
        if (!data.prospectPlusId) {
          const uniqueId = await getUniqueProspectPlusId(db);
          await doc.ref.update({ prospectPlusId: uniqueId });
          functions.logger.info(`Fallback: Assigned Prospect+ ID ${uniqueId} to lead ${doc.id}`);
        }
      }
    } catch (e) {
      functions.logger.error('Fallback sync failed for leads:', e);
    }
    
    // Check companies
    try {
      const companiesSnap = await db.collection('companies').orderBy('createdAt', 'desc').limit(100).get();
      for (const doc of companiesSnap.docs) {
        const data = doc.data();
        if (!data.prospectPlusId) {
          const leadDoc = await db.collection('leads').doc(doc.id).get();
          let uniqueId = '';
          if (leadDoc.exists && leadDoc.data()?.prospectPlusId) {
            uniqueId = leadDoc.data()?.prospectPlusId;
          } else {
            uniqueId = await getUniqueProspectPlusId(db);
          }
          await doc.ref.update({ prospectPlusId: uniqueId });
          functions.logger.info(`Fallback: Assigned Prospect+ ID ${uniqueId} to company ${doc.id}`);
        }
      }
    } catch (e) {
      functions.logger.error('Fallback sync failed for companies:', e);
    }
    return null;
  });

