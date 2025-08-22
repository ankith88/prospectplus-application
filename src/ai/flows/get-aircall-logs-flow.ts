
'use server';

/**
 * @fileOverview A Genkit flow for fetching call logs from AirCall.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logActivity } from '@/services/firebase';
import type { Activity } from '@/lib/types';
import fetch from 'node-fetch';

const GetAircallLogsInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead to fetch logs for.'),
  phoneNumbers: z.array(z.string()).describe('An array of phone numbers associated with the lead.'),
});
export type GetAircallLogsInput = z.infer<typeof GetAircallLogsInputSchema>;

const GetAircallLogsOutputSchema = z.object({
  success: z.boolean(),
  logsFound: z.number(),
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
  async ({ leadId, phoneNumbers }) => {
    const apiId = process.env.AIRCALL_API_ID;
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiId || !apiToken) {
      console.error('AirCall API ID or Token is not set in environment variables.');
      throw new Error('AirCall API credentials are not configured.');
    }

    if (phoneNumbers.length === 0) {
        return { success: true, logsFound: 0 };
    }

    const auth = 'Basic ' + Buffer.from(apiId + ':' + apiToken).toString('base64');
    
    let totalLogsFound = 0;

    for (const number of phoneNumbers) {
        // Aircall API expects E.164 format, but let's try a simple search first
        const endpoint = `https://api.aircall.io/v1/calls/search?phone_number=${encodeURIComponent(number)}`;
        
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
                console.error(`AirCall API error for number ${number}: ${response.status} ${response.statusText}`, errorBody);
                // Continue to next number if one fails
                continue;
            }

            const data: any = await response.json();
            
            if (data.calls && data.calls.length > 0) {
                totalLogsFound += data.calls.length;
                for (const call of data.calls) {
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
            console.error(`Failed to fetch or process logs for number ${number}:`, error);
        }
    }

    return { success: true, logsFound: totalLogsFound };
  }
);
