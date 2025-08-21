
'use server';

/**
 * @fileOverview A Genkit flow for initiating a call via the AirCall API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Aircall from 'aircall';
import { logActivity, getUserPhoneNumber } from '@/services/firebase';

const InitiateCallInputSchema = z.object({
  phoneNumber: z.string().describe('The phone number to call.'),
  userDisplayName: z.string().optional().describe("The display name of the user initiating the call."),
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
  async ({ phoneNumber, userDisplayName }) => {
    const apiKey = process.env.AIRCALL_API_KEY;

    if (!apiKey) {
        const errorMsg = "AirCall API key is not configured in environment variables.";
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
        const errorMsg = `No phone number found in database for user "${userDisplayName}".`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }


    try {
      const aircall = new Aircall({
        apiToken: apiKey
      });
      
      const aircallNumbers = await aircall.numbers.list();
      const aircallNumber = aircallNumbers.find((n: any) => n.e164_format === fromNumber);

      if (!aircallNumber) {
        const errorMsg = `The 'from' number ${fromNumber} (for user ${userDisplayName}) is not a valid AirCall number in your account.`
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const users = await aircall.users.list();
      if (!users.length) {
          return { success: false, error: "No AirCall users found to initiate the call." };
      }
      // For this implementation, we'll just use the first available user to dial out from.
      // A more robust solution might map Firebase users to AirCall users.
      const userId = users[0].id;

      await aircall.calls.dial({
        user_id: userId,
        to: phoneNumber,
        from: fromNumber,
      });

      console.log(`Successfully initiated call to ${phoneNumber} from ${fromNumber}`);
      return { success: true };

    } catch (error: any) {
      console.error('AirCall API Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.error || 'Failed to initiate call via AirCall API.';
      return { success: false, error: errorMsg };
    }
  }
);
