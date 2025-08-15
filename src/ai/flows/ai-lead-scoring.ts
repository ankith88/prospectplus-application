
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
    .describe('Explanation of why the lead received the given score, highlighting key factors from their profile and website analysis.'),
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
  - Use the information in the lead profile and from the website to make your determination. If a website is provided, use the prospectWebsite tool to gather additional information about social media presence, contacts, and site content.
  - Increase the score if the website analysis finds shipping-related keywords or if key contact roles like 'Logistics Manager' or 'Head of Operations' are found.

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
    const response = await aiLeadScoringPrompt(input, {
      config: {
        // @ts-ignore - experimentalToolChoice is not in the type definition
        experimentalToolChoice: true,
      },
    });

    const output = response.output();
    if (!output) {
      throw new Error("AI failed to generate a score.");
    }
    const history = response.history();
    // Check if the prospectWebsiteTool was called by the model
    const toolRequest = history.find(
      (event: any) =>
        event.type === 'toolRequest' &&
        event.request.toolName === 'prospectWebsite'
    );
    
    if (toolRequest) {
      const toolOutput = history.find(
        (event: any) =>
          event.type === 'toolResponse' &&
          event.response.toolRequestId === toolRequest.request.id
      )?.response.output as any;

      if (toolOutput?.contacts) {
         output.prospectedContacts = toolOutput.contacts || [];
      }
    }
    
    return output;
  }
);
