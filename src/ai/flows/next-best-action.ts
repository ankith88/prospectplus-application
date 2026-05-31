'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NextBestActionInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead.'),
  leadProfile: z.string().describe('Profile information about the lead.'),
  activities: z.string().describe('Recent activities (calls, emails, updates) for this lead.'),
  notes: z.string().describe('Recent notes for this lead.'),
  transcripts: z.string().describe('Recent call transcripts for this lead.'),
  discoveryData: z.string().describe('Discovery data for this lead.'),
});
export type NextBestActionInput = z.infer<typeof NextBestActionInputSchema>;

const NextBestActionOutputSchema = z.object({
  nextBestAction: z.string().describe('A single short sentence suggesting the best next action for the Account Manager.'),
});
export type NextBestActionOutput = z.infer<typeof NextBestActionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'nextBestActionPrompt',
  input: {schema: NextBestActionInputSchema},
  output: {schema: NextBestActionOutputSchema},
  prompt: `You are an AI sales assistant for ProspectPlus, a CRM for MailPlus (an express parcel delivery service).
Your goal is to suggest the "Next Best Action" for an Account Manager handling a specific lead.
The action should be a single, clear, and actionable sentence.

Base your suggestion on the lead's profile, recent activities, notes, and discovery data.
If they just had a call and need to follow up, suggest sending a specific type of email or scheduling a follow-up.
If they left a voicemail, suggest following up again in 2 days.
If there are no activities, suggest a first touchpoint.

Lead Profile:
{{{leadProfile}}}

Discovery Data:
{{{discoveryData}}}

Recent Activities:
{{{activities}}}

Recent Notes:
{{{notes}}}

Recent Transcripts:
{{{transcripts}}}

Provide a single sentence for the nextBestAction.`,
});

const nextBestActionFlow = ai.defineFlow(
  {
    name: 'nextBestActionFlow',
    inputSchema: NextBestActionInputSchema,
    outputSchema: NextBestActionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a next best action.");
    }
    
    return output;
  }
);

export async function generateNextBestAction(
  input: NextBestActionInput
): Promise<NextBestActionOutput> {
  return nextBestActionFlow(input);
}
