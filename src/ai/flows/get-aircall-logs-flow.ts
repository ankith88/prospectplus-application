
'use server';

/**
 * @fileOverview A Genkit flow for fetching call logs from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { logActivity, getUserAircallId } from '@/services/firebase';
import type { Activity } from '@/lib/types';
import fetch from 'node-fetch';
import { useAuth } from '@/hooks/use-auth';

const GetAircallLogsInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead to fetch logs for.'),
  phoneNumbers: z.array(z.string()).describe('An array of phone numbers associated with the lead.'),
  userDisplayName: z.string().describe('The display name of the user fetching the logs.')
});
export type GetAircallLogsInput = z.infer<typeof GetAircallLogsInputSchema>;

const GetAircallLogsOutputSchema = z.object({
  success: z.boolean(),
  logsFound: z.number(),
  error: z.string().optional(),
});
export type GetAircallLogsOutput = z.infer<typeof GetAircallLogsOutputSchema>;

export async function getAircallLogs(input: GetAircallLogsInput): Promise<GetAircallLogsOutput> {
  return getAircallLogsFlow(input);
}

const getAircallLogsFlow = ai.defineFlow(
  {
    name: 'getAircallLogsFlow',
    inputSchema: GetAircallLogsInputSchema,
    outputSchema: GetAircallLogsOutputSchema,
  },
  async ({ leadId, phoneNumbers, userDisplayName }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      const errorMessage = 'AirCall API ID or Token is not set in environment variables.';
      console.error(errorMessage);
      return { success: false, logsFound: 0, error: "CREDENTIALS_MISSING" };
    }

    if (phoneNumbers.length === 0) {
        return { success: true, logsFound: 0 };
    }

    const aircallUserId = await getUserAircallId(userDisplayName);
    if (!aircallUserId) {
      return { success: false, logsFound: 0, error: "AIRCALL_USER_ID_MISSING" };
    }

    const auth = 'Basic ' + Buffer.from(apiId + ':' + apiToken).toString('base64');
    const endpoint = `https://api.aircall.io/v1/calls?user_id=${aircallUserId}`;
    
    let totalLogsFound = 0;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`AirCall API error fetching calls for user ${aircallUserId}: ${response.status} ${response.statusText}`, errorBody);
            return { success: false, logsFound: 0, error: `API_ERROR: ${response.status}` };
        }

        const data: any = await response.json();
        
        if (data.calls && data.calls.length > 0) {
            // Normalize phone numbers from the lead to match against call data
            const normalizedLeadNumbers = new Set(phoneNumbers.map(num => num.replace(/\D/g, '').slice(-10)));

            const relevantCalls = data.calls.filter((call: any) => {
                const callNumber = call.raw_digits || call.direct_link?.split(':').pop();
                if (!callNumber) return false;
                const normalizedCallNumber = callNumber.replace(/\D/g, '').slice(-10);
                return normalizedLeadNumbers.has(normalizedCallNumber);
            });

            totalLogsFound = relevantCalls.length;

            for (const call of relevantCalls) {
                const minutes = Math.floor(call.duration / 60);
                const seconds = call.duration % 60;
                const duration = `${minutes}m ${seconds}s`;

                const notes = `Call with ${call.direction} direction. Answered: ${call.status}. ${call.comments?.map((c: any) => c.content).join(' ') || 'N/A'}`;
                
                await logActivity(leadId, {
                    type: 'Call',
                    notes: notes,
                    duration: duration,
                    date: new Date(call.started_at).toISOString(),
                });
            }
        }
    } catch (error) {
        console.error(`Failed to fetch or process logs for user ${aircallUserId}:`, error);
        return { success: false, logsFound: 0, error: 'FETCH_FAILED' };
    }


    return { success: true, logsFound: totalLogsFound };
  }
);
