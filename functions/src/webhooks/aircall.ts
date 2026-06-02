import { PipelineEngine } from '../services/PipelineEngine';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const aircallWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const event = req.body;
    
    // Example: process a call.ended event
    if (event.event === 'call.ended') {
      const callData = event.data;
      const phoneNumber = callData.contact?.phone_number || callData.raw_digits;
      const duration = callData.duration; // in seconds

      if (duration > 300) { // e.g., > 5 minutes
        // We would map the phoneNumber to a leadId in Firestore
        // For demonstration, let's assume we extract leadId from a custom field or query
        // Normally you might look up the leadId based on the phoneNumber
        console.log('Processing call for phone number:', phoneNumber);
        // const query = await admin.firestore().collection('leads').where('phoneNumber', '==', phoneNumber).get();
        const leadId = callData.tags?.[0]?.name; // Mocking leadId extraction
        
        if (leadId) {
          const pipelineEngine = new PipelineEngine();
          await pipelineEngine.evaluateThresholds(leadId, {
            type: 'call',
            duration,
          });
        }
      }
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error processing Aircall webhook:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});
