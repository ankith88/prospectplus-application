
'use server';

/**
 * @fileOverview A Genkit flow for initiating a call via the AirCall API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Aircall from 'aircall';
import { logActivity } from '@/services/firebase';

const InitiateCallInputSchema = z.string().describe('The phone number to call.');
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
  async (phoneNumber) => {
    const apiKey = process.env.AIRCALL_API_KEY;
    const fromNumber = process.env.AIRCALL_FROM_NUMBER;

    if (!apiKey || !fromNumber) {
        const errorMsg = "AirCall API key or 'from' number is not configured in environment variables.";
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
        const errorMsg = `The 'from' number ${fromNumber} is not a valid AirCall number in your account.`
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const users = await aircall.users.list();
      if (!users.length) {
          return { success: false, error: "No AirCall users found to initiate the call." };
      }
      const userId = users[0].id;

      await aircall.calls.transfer({
        to_user_id: userId,
        digits: phoneNumber,
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
