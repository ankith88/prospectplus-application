'use server';

/**
 * @fileOverview A flow for generating talking points based on a lead's profile.
 *
 * - generateTalkingPoints - A function that generates talking points for a lead.
 * - TalkingPointSuggestionsInput - The input type for the generateTalkingPoints function.
 * - TalkingPointSuggestionsOutput - The return type for the generateTalkingPoints function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TalkingPointSuggestionsInputSchema = z.object({
  leadProfile: z
    .string()
    .describe('The profile information of the lead, including their background, interests, and recent activities.'),
});
export type TalkingPointSuggestionsInput = z.infer<typeof TalkingPointSuggestionsInputSchema>;

const TalkingPointSuggestionsOutputSchema = z.object({
  talkingPoints: z
    .array(z.string())
    .describe('A list of suggested talking points for the lead.'),
});
export type TalkingPointSuggestionsOutput = z.infer<typeof TalkingPointSuggestionsOutputSchema>;

export async function generateTalkingPoints(
  input: TalkingPointSuggestionsInput
): Promise<TalkingPointSuggestionsOutput> {
  return talkingPointSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'talkingPointSuggestionsPrompt',
  input: {schema: TalkingPointSuggestionsInputSchema},
  output: {schema: TalkingPointSuggestionsOutputSchema},
  prompt: `You are a sales expert. Generate a list of talking points for a sales representative to use when speaking with a lead.

  The talking points should be personalized and relevant to the lead's profile.

  Lead Profile: {{{leadProfile}}}

  Talking Points:`,
});

const talkingPointSuggestionsFlow = ai.defineFlow(
  {
    name: 'talkingPointSuggestionsFlow',
    inputSchema: TalkingPointSuggestionsInputSchema,
    outputSchema: TalkingPointSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
