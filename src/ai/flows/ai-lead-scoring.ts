'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-powered lead scoring.
 *
 * - aiLeadScoring - A function that scores leads based on their profile data.
 * - AiLeadScoringInput - The input type for the aiLeadScoring function.
 * - AiLeadScoringOutput - The return type for the aiLeadScoring function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getLeadsTool } from './get-leads-tool';
import { prospectWebsiteTool } from './prospect-website-tool';
import type { Contact } from '@/lib/types';

const AiLeadScoringInputSchema = z.object({
  leadId: z.string().describe('The ID of the lead.'),
  leadProfile: z
    .string()
    .describe('Detailed information about the lead, including company, job title, industry, and past interactions.'),
  websiteUrl: z.string().optional().describe("The company's website URL."),
});
export type AiLeadScoringInput = z.infer<typeof AiLeadScoringInputSchema>;

const AiLeadScoringOutputSchema = z.object({
  score: z.number().describe('A numerical score (0-100) representing the lead quality, with higher scores indicating higher potential value.'),
  reason: z
    .string()
    .describe('Explanation of why the lead received the given score, highlighting key factors from their profile.'),
  prospectedContacts: z.array(z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
  })).optional().describe('Contacts found by prospecting the website.'),
});
export type AiLeadScoringOutput = z.infer<typeof AiLeadScoringOutputSchema>;

export async function aiLeadScoring(input: AiLeadScoringInput): Promise<AiLeadScoringOutput> {
  return aiLeadScoringFlow(input);
}

const aiLeadScoringPrompt = ai.definePrompt({
  name: 'aiLeadScoringPrompt',
  input: {schema: AiLeadScoringInputSchema},
  output: {schema: AiLeadScoringOutputSchema},
  tools: [getLeadsTool, prospectWebsiteTool],
  prompt: `You are an AI assistant designed to score sales leads for a parcel delivery service.

  Analyze the following lead profile and website to determine how likely they are to send parcels.
  
  - Give a higher score (75-100) to companies whose business model likely involves shipping parcels (e.g., e-commerce, retail, logistics, manufacturing).
  - Give a lower score to companies that are less likely to ship parcels (e.g., digital services, consulting).
  - Use the information in the lead profile and from the website to make your determination. If a website is provided, use the prospectWebsite tool to gather additional information about social media presence and contacts.

  If a lead profile is not provided, use the getLeads tool to fetch the leads first and score them individually.

  Provide a reason for the assigned score, highlighting the key factors that influenced your assessment.

  Lead Profile:
  {{{leadProfile}}}

  Website:
  {{{websiteUrl}}}

  Your response must be in the format specified by the output schema.
  Provide a 'score' (number) and a 'reason' (string).`,
});

const aiLeadScoringFlow = ai.defineFlow(
  {
    name: 'aiLeadScoringFlow',
    inputSchema: AiLeadScoringInputSchema,
    outputSchema: AiLeadScoringOutputSchema,
  },
  async (input) => {
    const { output } = await aiLeadScoringPrompt(input);
    const result = output!;

    if (input.websiteUrl) {
      const prospectResult = await prospectWebsiteTool({ leadId: input.leadId, websiteUrl: input.websiteUrl });
      result.prospectedContacts = prospectResult?.contacts || [];
    }
    
    return result;
  }
);
