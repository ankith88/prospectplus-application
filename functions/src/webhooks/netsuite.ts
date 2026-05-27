import { PipelineEngine } from '../services/PipelineEngine';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const netsuiteWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const payload = req.body;
    
    // Example: sync milestone 'Quote Created'
    if (payload.action === 'milestone_reached' && payload.milestone === 'Quote Created') {
      const leadId = payload.leadId;
      
      if (leadId) {
        const pipelineEngine = new PipelineEngine();
        await pipelineEngine.evaluateThresholds(leadId, {
          type: 'milestone',
          name: payload.milestone,
        });
      }
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error processing NetSuite webhook:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});
