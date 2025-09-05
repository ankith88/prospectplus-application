
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a phone number from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { logTranscriptActivity } from '@/services/firebase';

const GetTranscriptByCallIdInputSchema = z.object({
  callId: z.string().describe('The AirCall call ID to fetch the transcript for.'),
  leadId: z.string().describe('The ID of the lead to associate the transcript with.'),
  leadAuthor: z.string().describe('The author to associate with the logged note.'),
});
export type GetTranscriptByCallIdInput = z.infer<typeof GetTranscriptByCallIdInputSchema>;

const GetTranscriptByCallIdOutputSchema = z.object({
  transcriptFound: z.boolean(),
  error: z.string().optional(),
});
export type GetTranscriptByCallIdOutput = z.infer<typeof GetTranscriptByCallIdOutputSchema>;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getCallTranscriptByCallId(input: GetTranscriptByCallIdInput): Promise<GetTranscriptByCallIdOutput> {
    return getCallTranscriptByCallIdFlow(input);
}

const getCallTranscriptByCallIdFlow = ai.defineFlow(
  {
    name: 'getCallTranscriptByCallIdFlow',
    inputSchema: GetTranscriptByCallIdInputSchema,
    outputSchema: GetTranscriptByCallIdOutputSchema,
  },
  async ({ callId, leadId, leadAuthor }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(errorMsg);
      return { transcriptFound: false, error: errorMsg };
    }

    const url = `https://api.aircall.io/v1/calls/${callId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Fetching call data from AirCall for call ID: ${callId} (Attempt ${attempt})`);

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
           if (response.status === 404) {
             console.log(`No call record found for call ID: ${callId}.`);
             if (attempt < maxRetries) {
                console.log(`Will retry in ${retryDelay / 1000} seconds...`);
                await sleep(retryDelay);
                continue; // Go to the next attempt
             } else {
                console.log(`Max retries reached for call ID: ${callId}. No call found.`);
                return { transcriptFound: false, error: 'NO_CALL_FOUND' };
             }
           }
           const errorBody = await response.text();
           const errorMsg = `AirCall API request failed with status: ${response.status}. Body: ${errorBody}`;
           console.error(errorMsg);
           // Don't retry on other server errors.
           return { transcriptFound: false, error: errorMsg };
        }

        const callData = await response.json() as any;
        
        const transcriptContent = callData?.call?.transcription?.content?.utterances;
        if (transcriptContent && Array.isArray(transcriptContent)) {
          console.log(`Transcript found for call ID: ${callId}. Logging to Firebase...`);
           await logTranscriptActivity(leadId, {
                content: JSON.stringify({ utterances: transcriptContent }), // Save the utterances object
                author: callData.call.user.name || leadAuthor,
                callId: callId,
                phoneNumber: callData.call.raw_digits || 'Unknown',
            });
          return { transcriptFound: true };
        } else {
          console.log(`Transcript content not yet available for call ID: ${callId}.`);
          if (attempt < maxRetries) {
            console.log(`Will retry in ${retryDelay / 1000} seconds...`);
            await sleep(retryDelay);
          } else {
            console.log(`Max retries reached for call ID: ${callId}. No transcript found.`);
            return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
          }
        }
      } catch (error: any) {
        console.error(`Error fetching call data from AirCall (Attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await sleep(retryDelay);
        } else {
          return { transcriptFound: false, error: `An unexpected error occurred: ${error.message}` };
        }
      }
    }

    // This part should not be reached, but as a fallback:
    return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
  }
);
