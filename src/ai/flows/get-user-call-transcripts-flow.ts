
'use server';

/**
 * @fileOverview A Genkit flow for fetching all call transcripts for a given AirCall user ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { getUserAircallId, logUnmatchedActivity } from '@/services/firebase';
import type { Activity } from '@/lib/types';


const GetUserTranscriptsInputSchema = z.object({
  userDisplayName: z.string().describe('The display name of the user to fetch transcripts for.'),
});
export type GetUserTranscriptsInput = z.infer<typeof GetUserTranscriptsInputSchema>;

const UnmatchedActivitySchema = z.object({
    id: z.string(),
    type: z.enum(['Call', 'Email', 'Meeting', 'Update']),
    date: z.string(),
    duration: z.string().optional(),
    notes: z.string(),
    callId: z.string().optional(),
    phoneNumber: z.string(),
});

const GetUserTranscriptsOutputSchema = z.object({
  newActivities: z.array(UnmatchedActivitySchema),
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
      return { newActivities: [], error: errorMsg };
    }

    const aircallUserId = await getUserAircallId(userDisplayName);

    if (!aircallUserId) {
        const errorMsg = `Could not find AirCall User ID for ${userDisplayName}.`;
        console.error(errorMsg);
        return { newActivities: [], error: errorMsg };
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
        return { newActivities: [], error: errorMsg };
      }

      const responseData = await response.json() as any;
      const allCalls = responseData?.calls || [];
      const newActivities: (Activity & { phoneNumber: string })[] = [];

      if (allCalls.length === 0) {
        console.log(`No calls found for user: ${userDisplayName}`);
        return { newActivities: [] };
      }

      for (const call of allCalls) {
        if (call?.transcription?.content) {
          const phoneNumber = call.raw_digits || call.phone_number?.e164 || 'Unknown';
          const minutes = Math.floor(call.duration / 60);
          const seconds = call.duration % 60;
          const duration = `${minutes}m ${seconds}s`;
          const date = new Date(call.started_at).toISOString();
          const noteContent = `Transcript synced for call with ${phoneNumber} on ${new Date(date).toLocaleString()}:\n\n${call.transcription.content}`;
          
          const activityData: Omit<Activity, 'id'> = {
              type: 'Call',
              notes: noteContent,
              date: date,
              duration: duration,
              callId: call.id,
          };
          
          const newActivityId = await logUnmatchedActivity(activityData);

          newActivities.push({
            ...activityData,
            id: newActivityId,
            phoneNumber: phoneNumber
          });

          console.log(`Transcript for call ID ${call.id} logged to unmatched activities.`);
        }
      }
      
      console.log(`Found and processed ${newActivities.length} transcripts for user: ${userDisplayName}`);
      return { newActivities };

    } catch (error: any) {
      console.error('Error fetching call transcripts from AirCall:', error);
      return { newActivities: [], error: `An unexpected error occurred: ${error.message}` };
    }
  }
);
