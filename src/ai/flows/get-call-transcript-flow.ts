
'use server';

/**
 * @fileOverview A Genkit flow for fetching call transcripts from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { logTranscriptActivityServer, findLeadIdByPhoneServer } from '@/services/firebase-server';

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
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      return { transcriptFound: false, error: 'AirCall credentials missing.' };
    }

    const url = `https://api.aircall.io/v1/calls/${callId}/transcription`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Basic ${credentials}` }
        });

        if (response.status === 404) {
            await sleep(5000);
            continue;
        }
        
        if (!response.ok) return { transcriptFound: false, error: 'AirCall API error.' };

        const data = await response.json() as any;
        const utterances = data?.transcription?.content?.utterances;
        
        if (utterances?.length) {
            // Default to 'leads' collection for this manual trigger flow
            await logTranscriptActivityServer(leadId, 'leads', {
                content: JSON.stringify(utterances),
                author: leadAuthor,
                callId: callId
            });
            return { transcriptFound: true };
        }
      } catch (error: any) {
        await sleep(5000);
      }
    }
    
    return { transcriptFound: false, error: 'NO_TRANSCRIPT_AVAILABLE' };
  }
);

export async function getCallTranscriptByCallId(input: GetTranscriptByCallIdInput): Promise<GetTranscriptByCallIdOutput> {
    return getCallTranscriptByCallIdFlow(input);
}
