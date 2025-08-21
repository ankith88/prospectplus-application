
'use server';

/**
 * @fileOverview A Genkit flow for initiating a call via the AirCall API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';
import { logActivity, getUserPhoneNumber } from '@/services/firebase';

const InitiateCallInputSchema = z.object({
  phoneNumber: z.string().describe('The phone number to call.'),
  userDisplayName: z.string().optional().describe("The display name of the user initiating the call."),
  leadId: z.string().describe("The ID of the lead being called."),
  contactName: z.string().optional().describe("The name of the contact being called."),
});
export type InitiateCallInput = z.infer<typeof InitiateCallInputSchema>;

const InitiateCallOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type InitiateCallOutput = z.infer<typeof InitiateCallOutputSchema>;

export async function initiateCall(
  input: InitiateCallInput
): Promise<InitiateCallOutput> {
  return initiateCallFlow(input);
}

const initiateCallFlow = ai.defineFlow(
  {
    name: 'initiateCallFlow',
    inputSchema: InitiateCallInputSchema,
    outputSchema: InitiateCallOutputSchema,
  },
  async ({ phoneNumber, userDisplayName, leadId, contactName }) => {
    const apiToken = process.env.AIRCALL_API_TOKEN;

    if (!apiToken) {
        const errorMsg = "AirCall API token is not configured in environment variables.";
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    if (!userDisplayName) {
        const errorMsg = "User display name is required to find the 'from' number.";
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    const fromNumber = await getUserPhoneNumber(userDisplayName);

    if (!fromNumber) {
        const errorMsg = `No phone number found in database for user "${userDisplayName}". Please check the user's profile.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }
    
    const base64Token = Buffer.from(`${apiToken}:`).toString('base64');
    const headers = {
        'Authorization': `Basic ${base64Token}`,
        'Content-Type': 'application/json'
    };

    try {
      // 1. Get the list of users to find an available user to make the call from
      const usersResponse = await fetch('https://api.aircall.io/v1/users', { headers });
      if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        throw new Error(`Failed to fetch AirCall users: ${JSON.stringify(errorData)}`);
      }
      const { users } = await usersResponse.json() as any;
      const aircallUser = users.find((u:any) => u.available);

      if (!aircallUser) {
           const errorMsg = "No available AirCall users to initiate the call.";
           console.error(errorMsg);
           return { success: false, error: errorMsg };
       }

      // 2. Dial the call
      const dialResponse = await fetch(`https://api.aircall.io/v1/calls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            user_id: aircallUser.id,
            to: phoneNumber,
            from: fromNumber,
        })
      });

      if (!dialResponse.ok) {
         const errorData = await dialResponse.json() as any;
         console.error('AirCall API Error Response:', errorData);
         const errorMessage = errorData?.error || `Failed to initiate call via AirCall API. Status: ${dialResponse.status}`;
         return { success: false, error: errorMessage };
      }

      const note = contactName
                ? `Initiated call with ${contactName} (${phoneNumber}) via AirCall.`
                : `Initiated call to ${phoneNumber} via AirCall.`;
      await logActivity(leadId, { type: 'Call', notes: note });


      console.log(`Successfully initiated call to ${phoneNumber} from ${fromNumber}`);
      return { success: true };

    } catch (error: any) {
      const errorMsg = error.message || 'An unexpected error occurred while initiating call via AirCall API.';
      console.error('AirCall API Error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
);
