import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

export const syncLeadToCompany = functions
  .region('australia-southeast1')
  .firestore.document('leads/{leadId}')
  .onWrite(async (change, context) => {
    const leadId = context.params.leadId;
    const afterData = change.after.data();

    if (!afterData) {
      // Lead was deleted, nothing to sync
      return null;
    }

    if (afterData.isDuplicate) {
      // Already marked as duplicate, prevent infinite loops if we update it here
      return null;
    }

    const db = admin.firestore();
    const companyRef = db.collection('companies').doc(leadId);
    
    try {
      const companyDoc = await companyRef.get();
      
      if (companyDoc.exists) {
        console.log(`Overlapping Lead and Company found for ID: ${leadId}. Syncing data...`);
        const companyData = companyDoc.data() || {};
        
        // Merge data (Company data takes precedence)
        const mergedData = { ...companyData };
        for (const key in afterData) {
            if (mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === '') {
                mergedData[key] = afterData[key];
            }
        }
        
        await companyRef.set(mergedData, { merge: true });

        // Mark the lead as duplicate so it's filtered from reporting
        await change.after.ref.update({ isDuplicate: true });
        console.log(`Successfully synced and marked Lead ${leadId} as duplicate.`);
      }
    } catch (error) {
      console.error(`Error syncing lead to company for ID ${leadId}:`, error);
    }
    
    return null;
  });
