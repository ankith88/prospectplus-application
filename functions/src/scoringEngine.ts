import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const scoringEngine = functions.firestore
  .document('InteractionLogs/{logId}')
  .onCreate(async (snap, context) => {
    const logData = snap.data();
    const leadId = logData.leadId;

    if (!leadId) return null;

    const leadRef = db.collection('leads').doc(leadId);
    
    await db.runTransaction(async (transaction) => {
      const leadDoc = await transaction.get(leadRef);
      if (!leadDoc.exists) return;

      const lead = leadDoc.data();
      let behavioralScore = lead?.behavioralScore || 0;
      let demographicScore = lead?.demographicScore || 0;

      // Update behavioral score based on interaction
      if (logData.type === 'email-open') {
        behavioralScore += 2;
      } else if (logData.type === 'email-click') {
        behavioralScore += 5;
      } else if (logData.type === 'website-visit') {
        behavioralScore += 1;
      }

      // Demographic score calculation (mocked: usually based on industry, company size, etc.)
      if (lead?.industryCategory === 'Retail' || lead?.abn) {
          demographicScore = 15;
      }

      const totalScore = behavioralScore + demographicScore;

      transaction.update(leadRef, {
        behavioralScore,
        demographicScore,
        totalScore
      });
    });

    console.log(`Updated scoring for lead ${leadId}`);
    return null;
  });
