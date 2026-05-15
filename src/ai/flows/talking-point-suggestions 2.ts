
'use server';

/**
 * @fileOverview This file is now deprecated. The functionality has been replaced by improve-script.ts.
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
  prompt: `You are a sales expert for ProspectPlus, an application powered by MailPlus, an express parcel delivery service. Your goal is to generate personalized talking points for a sales representative to use on a cold call.

  The target service is **next-day delivery for parcels from 1kg to 20kg within Australia.**

  Generate a list of talking points based on the lead's profile. The points should help the sales rep quickly determine if the lead is a good fit and highlight the benefits of MailPlus.

  Lead Profile: {{{leadProfile}}}

  Example Talking Points:
  - "I see you're in the [Industry] sector. We work with many similar businesses to handle their express deliveries."
  - "What are your current challenges with sending parcels across Australia?"
  - "Mention our reliable next-day service for parcels up to 20kg, which could be a great fit for your products."

  Now, generate new talking points based on the provided lead profile.`,
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

    
