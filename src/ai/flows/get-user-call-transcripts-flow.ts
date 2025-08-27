

'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a given AirCall user ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { getUserAircallId, logActivity, findLeadByPhoneNumber } from '@/services/firebase';
import type { Activity, Transcript } from '@/lib/types';


const GetUserTranscriptsInputSchema = z.object({
  userDisplayName: z.string().describe('The display name of the user to fetch transcripts for.'),
});
export type GetUserTranscriptsInput = z.infer<typeof GetUserTranscriptsInputSchema>;

const GetUserTranscriptsOutputSchema = z.object({
  newTranscripts: z.array(z.custom<Transcript>()),
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
  async ({ userDisplayName }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMsg = 'AirCall API credentials are not configured.';
      console.error(errorMsg);
      return { newTranscripts: [], error: errorMsg };
    }

    const aircallUserId = await getUserAircallId(userDisplayName);

    if (!aircallUserId) {
        const errorMsg = `Could not find AirCall User ID for ${userDisplayName}. Make sure it is set in your user profile.`;
        console.error(errorMsg);
        return { newTranscripts: [], error: errorMsg };
    }
    
    const url = `https://api.aircall.io/v1/calls?order=desc&per_page=50&user_id=${aircallUserId}`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching all recent calls from AirCall for user: ${userDisplayName} (ID: ${aircallUserId})`);

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
        return { newTranscripts: [], error: errorMsg };
      }

      const responseData = await response.json() as any;
      const allCalls = responseData?.calls || [];
      const newTranscripts: Transcript[] = [];

      if (allCalls.length === 0) {
        console.log(`No calls found for user: ${userDisplayName}`);
        return { newTranscripts: [] };
      }

      for (const call of allCalls) {
        if (call?.transcription?.content) {
          const phoneNumber = call.raw_digits || call.phone_number?.e164 || 'Unknown';
          
          const lead = await findLeadByPhoneNumber(phoneNumber);
          if (lead) {
             // The webhook now handles logging the transcript itself.
             // We just log an activity to show the sync happened.
             await logActivity(lead.id, {
                type: 'Update',
                notes: `Transcript for call ID ${call.id} synced.`
             });
             console.log(`Transcript for call ID ${call.id} synced to lead ${lead.id}.`);
             // We don't have the full transcript object here to return,
             // so we will return an empty array and the UI will refetch.
          } else {
            console.log(`No lead found for number ${phoneNumber}, skipping transcript for call ID ${call.id}.`);
          }
        }
      }
      
      console.log(`Found and processed transcripts for user: ${userDisplayName}`);
      return { newTranscripts }; // The UI will refetch all transcripts after sync

    } catch (error: any) {
      console.error('Error fetching call transcripts from AirCall:', error);
      return { newTranscripts: [], error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
