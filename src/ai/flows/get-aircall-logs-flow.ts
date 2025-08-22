
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

/**
 * Normalizes an Australian phone number to E.164 format without the '+'.
 * e.g., '0412345678' -> '61412345678'
 * e.g., '412345678' -> '61412345678'
 * e.g., '+61412345678' -> '61412345678'
 * @param phoneNumber The phone number to normalize.
 * @returns The normalized phone number string.
 */
function normalizeToE164AU(phoneNumber: string): string {
    let digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        digits = '61' + digits.substring(1);
    } else if (digits.length === 9 && !digits.startsWith('61')) {
        // Assumes mobile number without leading 0
        digits = '61' + digits;
    } else if (digits.startsWith('61')) {
        // Already in correct format (or close enough)
    }
    return digits;
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
            const normalizedLeadNumbers = new Set(phoneNumbers.map(normalizeToE164AU));
            console.log("Normalized Lead Numbers to check:", Array.from(normalizedLeadNumbers));

            const relevantCalls = data.calls.filter((call: any) => {
                const callNumber = call.raw_digits || call.direct_link?.split(':').pop();
                if (!callNumber) return false;
                // AirCall numbers are often already in E.164, so we just strip non-digits.
                const normalizedCallNumber = callNumber.replace(/\D/g, '');
                
                // Check if the normalized call number exists in our set of lead numbers
                return normalizedLeadNumbers.has(normalizedCallNumber);
            });

            totalLogsFound = relevantCalls.length;
            console.log(`Found ${totalLogsFound} relevant calls for lead ${leadId}.`);

            const loggingPromises = relevantCalls.map((call: any) => {
                const minutes = Math.floor(call.duration / 60);
                const seconds = call.duration % 60;
                const duration = `${minutes}m ${seconds}s`;

                const callComments = call.comments?.map((c: any) => c.content).join(' ') || 'N/A';
                const notes = `Call direction: ${call.direction}. Status: ${call.status}. Comments: ${callComments}`;
                
                return logActivity(leadId, {
                    type: 'Call',
                    notes: notes,
                    duration: duration,
                    date: new Date(call.started_at).toISOString(),
                });
            });

            await Promise.all(loggingPromises);
            if (totalLogsFound > 0) {
              console.log(`Successfully processed and logged ${totalLogsFound} activities for lead ${leadId}`);
            }
        }
    } catch (error) {
        console.error(`Failed to fetch or process logs for user ${aircallUserId}:`, error);
        return { success: false, logsFound: 0, error: 'FETCH_FAILED' };
    }


    return { success: true, logsFound: totalLogsFound };
  }
);
