
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

/**
 * Converts an Australian phone number to E.164 format.
 * - Removes non-digit characters.
 * - Handles local, national, and international formats.
 * @param phoneNumber The phone number to format.
 * @returns The formatted phone number.
 */
function toE164(phoneNumber: string): string {
    // 1. Remove all non-digit characters except for a leading '+'
    let digits = phoneNumber.replace(/(?!^)\D/g, '');

    // 2. Handle country code
    if (digits.startsWith('+61')) {
        // Already in international format
        return digits;
    }
    if (digits.startsWith('61')) {
        // Missing plus sign
        return `+${digits}`;
    }
    if (digits.startsWith('0')) {
        // Local number, replace leading 0 with +61
        return `+61${digits.substring(1)}`;
    }
    
    // Assume it's a local number without a leading 0, prepend +61
    // This handles cases like '412345678'
    return `+61${digits}`;
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

    const targetPhoneNumber = toE164(phoneNumber);

    // This endpoint fetches all calls
    const url = `https://api.aircall.io/v1/calls`;
    const credentials = Buffer.from(`${apiId}:${apiToken}`).toString('base64');
    
    console.log(`Fetching all recent calls from AirCall to find match for: ${targetPhoneNumber}`);

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
      const allCalls = responseData?.calls || [];
      
      // Filter calls in code
      const matchedCalls = allCalls.filter((call: any) => {
          // Aircall provides phone numbers in e164 format.
          return call?.raw_digits === targetPhoneNumber || call?.phone_number?.e164 === targetPhoneNumber;
      });

      let transcriptsFound = 0;

      if (matchedCalls.length === 0) {
        console.log(`No calls found matching phone number: ${targetPhoneNumber}`);
        return { transcriptsFound: 0, error: 'No calls found for this phone number.' };
      }

      for (const call of matchedCalls) {
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
