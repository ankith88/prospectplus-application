
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a phone number from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { logNoteActivity } from '@/services/firebase';

const GetTranscriptsInputSchema = z.object({
  phoneNumber: z.string().describe('The phone number to fetch call transcripts for.'),
  leadId: z.string().describe('The ID of the lead to associate the transcripts with.'),
  leadAuthor: z.string().describe('The author to associate with the logged note.'),
});
export type GetTranscriptsInput = z.infer<typeof GetTranscriptsInputSchema>;

const GetTranscriptsOutputSchema = z.object({
  transcriptsFound: z.number(),
  error: z.string().optional(),
});
export type GetTranscriptsOutput = z.infer<typeof GetTranscriptsOutputSchema>;


export async function getCallTranscriptsForPhoneNumber(input: GetTranscriptsInput): Promise<GetTranscriptsOutput> {
    return getCallTranscriptsFlow(input);
}

const getCallTranscriptsFlow = ai.defineFlow(
  {
    name: 'getCallTranscriptsFlow',
    inputSchema: GetTranscriptsInputSchema,
    outputSchema: GetTranscriptsOutputSchema,
  },
  async ({ phoneNumber, leadId, leadAuthor }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(errorMsg);
      return { transcriptsFound: 0, error: errorMsg };
    }

    // This endpoint fetches calls for a given phone number
    const url = `https://api.aircall.io/v1/calls?order=desc&per_page=50&phone_number=${encodeURIComponent(phoneNumber)}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching calls for phone number: ${phoneNumber}`);

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
        return { transcriptsFound: 0, error: errorMsg };
      }

      const responseData = await response.json() as any;
      const calls = responseData?.calls || [];
      let transcriptsFound = 0;

      if (calls.length === 0) {
        console.log(`No calls found for phone number: ${phoneNumber}`);
        return { transcriptsFound: 0, error: 'No calls found for this phone number.' };
      }

      for (const call of calls) {
        if (call?.transcription?.content) {
          transcriptsFound++;
          const noteContent = `Transcript for call with ${call.direction} direction on ${new Date(call.started_at).toLocaleString()}:\n\n${call.transcription.content}`;
          await logNoteActivity(leadId, {
            content: noteContent,
            author: leadAuthor,
          });
          console.log(`Transcript found and logged for call ID: ${call.id}`);
        }
      }
      
      console.log(`Found and processed ${transcriptsFound} transcripts for phone number: ${phoneNumber}`);
      return { transcriptsFound };

    } catch (error: any) {
      console.error('Error fetching call transcripts from AirCall:', error);
      return { transcriptsFound: 0, error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
