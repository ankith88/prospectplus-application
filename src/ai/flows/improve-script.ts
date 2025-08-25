
'use server';

/**
 * @fileOverview A flow for improving a user-provided sales script.
 *
 * - improveScript - A function that enhances a sales script using AI.
 * - ImproveScriptInput - The input type for the improveScript function.
 * - ImproveScriptOutput - The return type for the improveScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveScriptInputSchema = z.object({
  leadProfile: z
    .string()
    .describe('The profile information of the lead, including their background, interests, and recent activities.'),
  userScript: z
    .string()
    .describe('The user-provided sales script to be improved.'),
});
export type ImproveScriptInput = z.infer<typeof ImproveScriptInputSchema>;

const ImproveScriptOutputSchema = z.object({
  improvedScript: z
    .string()
    .describe('The AI-enhanced version of the sales script.'),
});
export type ImproveScriptOutput = z.infer<typeof ImproveScriptOutputSchema>;

export async function improveScript(
  input: ImproveScriptInput
): Promise<ImproveScriptOutput> {
  return improveScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveScriptPrompt',
  input: {schema: ImproveScriptInputSchema},
  output: {schema: ImproveScriptOutputSchema},
  prompt: `You are an expert sales coach for ProspectPlus, an application powered by MailPlus, an express parcel delivery service. Your goal is to improve and personalize a sales representative's script for a cold call.

  The target service is **next-day delivery for parcels from 1kg to 20kg within Australia.**

  Review the provided user script and the lead's profile. Rewrite the script to be more engaging, persuasive, and tailored specifically to the lead. Incorporate details from the lead's profile to make the script more personal and relevant.

  Lead Profile: {{{leadProfile}}}

  User's Script:
  """
  {{{userScript}}}
  """

  Now, provide an improved version of the script. Focus on highlighting the value proposition of MailPlus in a way that resonates with this specific lead.
  `,
});

const improveScriptFlow = ai.defineFlow(
  {
    name: 'improveScriptFlow',
    inputSchema: ImproveScriptInputSchema,
    outputSchema: ImproveScriptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    
