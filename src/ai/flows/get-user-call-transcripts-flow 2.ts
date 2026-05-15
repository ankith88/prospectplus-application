
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a given AirCall user ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findLeadByPhoneNumberServer, logTranscriptActivityServer } from '@/services/firebase-server';


const GetUserTranscriptsInputSchema = z.object({
  userDisplayName: z.string().describe('The display name of the user to fetch transcripts for.'),
  aircallUserId: z.string().describe('The ID of the user in AirCall'),
});
export type GetUserTranscriptsInput = z.infer<typeof GetUserTranscriptsInputSchema>;

const GetUserTranscriptsOutputSchema = z.object({
  newTranscriptsCount: z.number(),
  error: z.string().optional(),
});
export type GetUserTranscriptsOutput = z.infer<typeof GetUserTranscriptsOutputSchema>;

export async function getUserCallTranscripts(input: GetUserTranscriptsInput): Promise<GetUserTranscriptsOutput> {
    return getUserCallTranscriptsFlow(input);
}

const getUserCallTranscriptsFlow = ai.defineFlow(
  {
    name: 'getUserCallTranscriptsFlow',
    inputSchema: GetUserTranscriptsInputSchema,
    outputSchema: GetUserTranscriptsOutputSchema,
  },
  async ({ userDisplayName, aircallUserId }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) return { newTranscriptsCount: 0, error: 'API credentials missing.' };

    const url = `https://api.aircall.io/v1/calls?order=desc&per_page=20&user_id=${aircallUserId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${credentials}` }
      });

      if (!response.ok) return { newTranscriptsCount: 0, error: `AirCall API error: ${response.status}` };

      const responseData = await response.json() as any;
      const allCalls = responseData?.calls || [];
      let count = 0;

      for (const call of allCalls) {
        if (call?.transcription?.content?.utterances) {
          const phoneNumber = call.raw_digits || call.phone_number?.e164;
          // Match lead using robust server-side phone algorithm
          const match = await findLeadByPhoneNumberServer(phoneNumber);
          
          if (match) {
             await logTranscriptActivityServer(match.id, match.type, {
                content: JSON.stringify(call.transcription.content.utterances),
                author: userDisplayName,
                callId: call.id.toString(),
                phoneNumber: phoneNumber
             });
             count++;
          }
        }
      }
      
      return { newTranscriptsCount: count };

    } catch (error: any) {
      return { newTranscriptsCount: 0, error: error.message };
    }
  }
);
