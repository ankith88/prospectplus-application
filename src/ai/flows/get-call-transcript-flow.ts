
'use server';

/**
 * @fileOverview A Genkit flow for fetching call transcripts from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logTranscriptActivityServer } from '@/services/firebase-server';


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
    const apiId = process.env.AIRCALL_API_ID || process.env.NEXT_PUBLIC_AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN || process.env.NEXT_PUBLIC_AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      return { transcriptFound: false, error: 'AirCall credentials missing.' };
    }

    const url = `https://api.aircall.io/v1/calls/${callId}/transcription`;
    const callUrl = `https://api.aircall.io/v1/calls/${callId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    const headers = { 'Authorization': `Basic ${credentials}` };
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let response = await fetch(url, { headers });

        if (response.status === 404) {
            if (attempt < 3) await sleep(3000);
            continue;
        }

        // If direct /transcription endpoint returns 403 or other error, try fallback to call details endpoint /v1/calls/{id}
        if (!response.ok && (response.status === 403 || response.status === 404)) {
            const fallbackResp = await fetch(callUrl, { headers });
            if (fallbackResp.ok) {
                const fallbackData = await fallbackResp.json() as any;
                const fallbackUtterances = 
                    fallbackData?.call?.transcription?.content?.utterances || 
                    fallbackData?.call?.transcription?.utterances || 
                    fallbackData?.call?.utterances;

                if (fallbackUtterances?.length) {
                    await logTranscriptActivityServer(leadId, 'leads', {
                        content: JSON.stringify(fallbackUtterances),
                        author: leadAuthor,
                        callId: callId
                    });
                    return { transcriptFound: true };
                }
            }
        }
        
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[AirCall API Error] status=${response.status} body=${errText}`);

            if (response.status === 403) {
                return { 
                    transcriptFound: false, 
                    error: 'AirCall AI / Transcriptions is not enabled on your AirCall account plan. Please contact your AirCall administrator to enable AirCall AI.' 
                };
            }
            if (response.status === 401) {
                return { 
                    transcriptFound: false, 
                    error: 'AirCall authentication failed (401). Please check your API ID and Token credentials.' 
                };
            }
            if (response.status === 429) {
                return { 
                    transcriptFound: false, 
                    error: 'AirCall API rate limit exceeded (429). Please try again in a few moments.' 
                };
            }

            return { transcriptFound: false, error: `AirCall API error (status ${response.status}).` };
        }

        const data = await response.json() as any;
        const utterances = data?.transcription?.content?.utterances || data?.transcription?.utterances || data?.utterances;
        
        if (utterances?.length) {
            // Using the Server Service exclusively to prevent environment boundary errors
            await logTranscriptActivityServer(leadId, 'leads', {
                content: JSON.stringify(utterances),
                author: leadAuthor,
                callId: callId
            });
            return { transcriptFound: true };
        } else {
            return { transcriptFound: false, error: 'No transcript content found for this call in AirCall.' };
        }
      } catch (error: any) {
        if (attempt < 3) await sleep(3000);
      }
    }
    
    return { transcriptFound: false, error: 'Transcript not available in AirCall.' };
  }
);


export async function getCallTranscriptByCallId(input: GetTranscriptByCallIdInput): Promise<GetTranscriptByCallIdOutput> {
    try {
        const cleanInput = {
            callId: String(input.callId || ''),
            leadId: String(input.leadId || ''),
            leadAuthor: String(input.leadAuthor || '')
        };
        const result = await getCallTranscriptByCallIdFlow(cleanInput);
        return result ?? { transcriptFound: false, error: 'No response returned from server.' };
    } catch (error: any) {
        console.error("Error in getCallTranscriptByCallId Server Action:", error);
        return {
            transcriptFound: false,
            error: error?.message || 'Failed to fetch transcript from AirCall.'
        };
    }
}

