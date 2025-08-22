
'use server';

/**
 * @fileOverview A Genkit flow for fetching a call transcript from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';

const GetTranscriptInputSchema = z.object({
  callId: z.string().describe('The ID of the call to fetch the transcript for.'),
});
export type GetTranscriptInput = z.infer<typeof GetTranscriptInputSchema>;

const GetTranscriptOutputSchema = z.object({
  transcript: z.string().optional(),
  error: z.string().optional(),
});
export type GetTranscriptOutput = z.infer<typeof GetTranscriptOutputSchema>;


export async function getCallTranscript(input: GetTranscriptInput): Promise<GetTranscriptOutput> {
    return getCallTranscriptFlow(input);
}

const getCallTranscriptFlow = ai.defineFlow(
  {
    name: 'getCallTranscriptFlow',
    inputSchema: GetTranscriptInputSchema,
    outputSchema: GetTranscriptOutputSchema,
  },
  async ({ callId }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(errorMsg);
      return { error: errorMsg };
    }

    const url = `https://api.aircall.io/v1/calls/${callId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching transcript for call ID: ${callId}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMsg = `AirCall API request failed with status: ${response.status}. Body: ${errorBody}`;
        console.error(errorMsg);
        return { error: errorMsg };
      }

      const callData = await response.json() as any;

      if (callData?.call?.transcription?.content) {
        console.log(`Transcript found for call ID: ${callId}`);
        return { transcript: callData.call.transcription.content };
      } else {
        console.log(`No transcript available for call ID: ${callId}`);
        return { error: 'No transcript available for this call.' };
      }

    } catch (error: any) {
      console.error('Error fetching call transcript from AirCall:', error);
      return { error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
