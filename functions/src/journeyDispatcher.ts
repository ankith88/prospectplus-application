import * as functions from 'firebase-functions/v1';
import fetch = require("node-fetch");

// Runs every 60 minutes to trigger the Next.js lead nurture campaign evaluation route
export const journeyDispatcher = functions
  .region('australia-southeast1')
  .pubsub.schedule('every 60 minutes')
  .onRun(async (context) => {
    try {
      // Targets the production URL or local development emulator
      const domain = process.env.APP_DOMAIN || 'http://localhost:3000';
      const url = `${domain}/api/nurture/process`;

      console.log(`[journeyDispatcher] Invoking lead nurture process API: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[journeyDispatcher] API returned failure status ${response.status}: ${errText}`);
      } else {
        const result = await response.json();
        console.log(`[journeyDispatcher] Processing completed successfully:`, result);
      }
    } catch (error: any) {
      console.error('[journeyDispatcher] Error calling evaluate API:', error.message || error);
    }

    return null;
  });
