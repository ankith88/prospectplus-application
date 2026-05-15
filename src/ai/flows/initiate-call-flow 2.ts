
'use server';

/**
 * @fileOverview A Genkit flow for initiating a call via the AirCall API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
  // This flow is now deprecated in favor of client-side aircall: protocol handling.
  // This is a placeholder to prevent build errors from missing exports.
  console.warn("initiateCall flow is deprecated and should not be used.");
  return { success: false, error: "This function is deprecated." };
}
