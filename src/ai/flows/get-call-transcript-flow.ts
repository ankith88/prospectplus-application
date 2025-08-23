
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

    const url = `https://api.aircall.io/v1/calls/${callId}/transcription`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching call transcript from AirCall for call ID: ${callId}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No transcript found for call ID: ${callId}`);
          return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
        }
        const errorBody = await response.text();
        const errorMsg = `AirCall API request failed with status: ${response.status}. Body: ${errorBody}`;
        console.error(errorMsg);
        return { transcriptFound: false, error: errorMsg };
      }

      const transcriptionData = await response.json() as any;
      
      if (transcriptionData?.transcription?.content) {
        const transcript = transcriptionData.transcription.content;
        
        await logTranscriptActivity(leadId, {
            content: transcript,
            author: leadAuthor,
            callId: callId,
        });

        console.log(`Transcript found and logged for call ID: ${callId}`);
        return { transcriptFound: true };
      } else {
        console.log(`No transcript content found for call ID: ${callId}`);
        return { transcriptFound: false, error: 'NO_TRANSCRIPT_FOUND' };
      }

    } catch (error: any) {
      console.error('Error fetching call transcript from AirCall:', error);
      return { transcriptFound: false, error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
