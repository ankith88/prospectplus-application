
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a phone number from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { logTranscriptActivity, getLeadFromFirebase } from '@/services/firebase';

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

const getCallTranscriptByCallIdFlow = ai.defineFlow(
  {
    name: 'getCallTranscriptByCallIdFlow',
    inputSchema: GetTranscriptByCallIdInputSchema,
    outputSchema: GetTranscriptByCallIdOutputSchema,
  },
  async ({ callId, leadId, leadAuthor }) => {
    console.log(`[Flow Start] Executing getCallTranscriptByCallIdFlow with input:`, { callId, leadId, leadAuthor });

    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(`[Flow Error] ${errorMsg}`);
      return { transcriptFound: false, error: errorMsg };
    }

    const url = `https://api.aircall.io/v1/calls/${callId}/transcription`;
    console.log(`[Flow] Fetching transcript from AirCall URL: ${url}`);
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    const maxRetries = 5;
    const retryDelay = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Flow] Attempt ${attempt} to fetch transcript for call ID: ${callId}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
          },
        });

        console.log(`[Flow] AirCall API response status: ${response.status}`);
        
        if (response.status === 404) {
            console.log(`[Flow] Transcript not yet available for call ID: ${callId}.`);
            if (attempt < maxRetries) {
              console.log(`[Flow] Will retry in ${retryDelay / 1000} seconds...`);
              await sleep(retryDelay);
              continue;
            } else {
              console.log(`[Flow] Max retries reached for call ID: ${callId}. No transcript found.`);
              return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            const errorMsg = `AirCall API request failed with status ${response.status}: ${errorText}`;
            console.error(`[Flow Error] ${errorMsg}`);
            return { transcriptFound: false, error: errorMsg };
        }

        const transcriptionData = await response.json() as any;
        console.log('[Flow] Raw AirCall transcription data:', JSON.stringify(transcriptionData, null, 2));

        const utterances = transcriptionData?.transcription?.content?.utterances;
        
        if (utterances && Array.isArray(utterances) && utterances.length > 0) {
            console.log(`[Flow Success] Transcript content found for call ID: ${callId}.`);
            const lead = await getLeadFromFirebase(leadId, false);
            if (!lead) {
              const errorMsg = `Could not find lead with ID ${leadId} to associate transcript with.`;
              console.error(`[Flow Error] ${errorMsg}`);
              return { transcriptFound: false, error: errorMsg };
            }

            console.log('[Flow] Logging transcript to Firebase...');
            await logTranscriptActivity(leadId, {
                content: JSON.stringify(utterances),
                author: leadAuthor,
                callId: callId,
                phoneNumber: lead.customerPhone || 'Unknown'
            });
            console.log('[Flow Success] Transcript logged to Firebase successfully.');
            return { transcriptFound: true };
        } else {
            console.log(`[Flow Info] Transcript content is empty or invalid for call ID: ${callId}.`);
             if (attempt < maxRetries) {
                console.log(`[Flow] Will retry in ${retryDelay / 1000} seconds...`);
                await sleep(retryDelay);
              } else {
                console.log(`[Flow] Max retries reached for call ID: ${callId}. Content not available.`);
                return { transcriptFound: false, error: 'TRANSCRIPT_CONTENT_EMPTY' };
              }
        }

      } catch (error: any) {
        console.error(`[Flow Exception] Error during fetch for call ID ${callId} (Attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await sleep(retryDelay);
        } else {
          return { transcriptFound: false, error: `An unexpected error occurred: ${error.message}` };
        }
      }
    }
    
    console.log(`[Flow Fallback] Reached end of function for call ID: ${callId}. This should not happen.`);
    return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
  }
);


export async function getCallTranscriptByCallId(input: GetTranscriptByCallIdInput): Promise<GetTranscriptByCallIdOutput> {
    console.log("[Client] Calling getCallTranscriptByCallId server action with:", input);
    return getCallTranscriptByCallIdFlow(input);
}
