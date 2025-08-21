
'use server';

/**
 * @fileOverview A Genkit flow for initiating a call via the AirCall API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Aircall from 'aircall';
import { logActivity } from '@/services/firebase';

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
    const userNumberMappings = process.env.AIRCALL_USER_NUMBERS; // e.g., "Leonie Feata:+61412345678,Luke Forbes:+61487654321,Default:+61400000000"

    if (!apiKey || !userNumberMappings) {
        const errorMsg = "AirCall API key or user number mappings are not configured in environment variables.";
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    // Parse the user-number mappings
    const numberMap = new Map<string, string>();
    userNumberMappings.split(',').forEach(pair => {
        const [name, number] = pair.split(':');
        if (name && number) {
            numberMap.set(name.trim(), number.trim());
        }
    });

    const fromNumber = (userDisplayName && numberMap.get(userDisplayName)) || numberMap.get('Default');

    if (!fromNumber) {
        const errorMsg = `No AirCall number found for user "${userDisplayName}" and no Default number is configured.`;
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
