
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
    const apiToken = process.env.AIRCALL_API_KEY;

    if (!apiToken) {
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
        const errorMsg = `No phone number found in database for user "${userDisplayName}". Please check the user's profile.`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }


    try {
      const aircall = new Aircall({
        apiToken: apiToken
      });
      
      const aircallNumbers = await aircall.numbers.list();
      const aircallNumber = aircallNumbers.find((n: any) => n.e164_format === fromNumber);

      if (!aircallNumber) {
        const validNumbers = aircallNumbers.map((n:any) => n.e164_format).join(', ');
        const errorMsg = `The 'from' number ${fromNumber} (for user ${userDisplayName}) is not a valid AirCall number in your account. Valid numbers are: ${validNumbers}`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const users = await aircall.users.list();
      if (!users.length) {
          const errorMsg = "No AirCall users found to initiate the call.";
          console.error(errorMsg);
          return { success: false, error: errorMsg };
      }
      // For this implementation, we'll just use the first available user to dial out from.
      // A more robust solution might map Firebase users to AirCall users.
      const aircallUser = users.find((u:any) => u.available);
       if (!aircallUser) {
           const errorMsg = "No available AirCall users to initiate the call.";
           console.error(errorMsg);
           return { success: false, error: errorMsg };
       }

      await aircall.calls.dial({
        user_id: aircallUser.id,
        to: phoneNumber,
        from: fromNumber,
      });
      
      const note = contactName
                ? `Initiated call with ${contactName} (${phoneNumber}) via AirCall.`
                : `Initiated call to ${phoneNumber} via AirCall.`;
      await logActivity(leadId, { type: 'Call', notes: note });


      console.log(`Successfully initiated call to ${phoneNumber} from ${fromNumber}`);
      return { success: true };

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to initiate call via AirCall API.';
      console.error('AirCall API Error:', errorMsg);
      console.error('Full AirCall Error Response:', error.response?.data);
      return { success: false, error: errorMsg };
    }
  }
);
