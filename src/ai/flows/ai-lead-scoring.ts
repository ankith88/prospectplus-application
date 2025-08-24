
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
import { updateLeadAiScore } from '@/services/firebase';

const LeadToScoreSchema = z.object({
  leadId: z.string().describe('The ID of the lead.'),
  leadProfile: z
    .string()
    .describe('Detailed information about the lead, including company, job title, industry, and past interactions.'),
  websiteUrl: z.string().optional().describe("The company's website URL."),
  activity: z.array(z.object({
    id: z.string(),
    type: z.enum(['Call', 'Email', 'Meeting', 'Update']),
    date: z.string(),
    duration: z.string().optional(),
    notes: z.string(),
  })).optional().describe('The activity history of the lead.'),
});

const AiLeadScoringInputSchema = z.array(LeadToScoreSchema);
export type AiLeadScoringInput = z.infer<typeof AiLeadScoringInputSchema>;


const ScoredLeadSchema = z.object({
  leadId: z.string().describe("The ID of the lead that was scored."),
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

const AiLeadScoringOutputSchema = z.object({
    scoredLeads: z.array(ScoredLeadSchema)
});
export type AiLeadScoringOutput = z.infer<typeof AiLeadScoringOutputSchema>;

export async function aiLeadScoring(input: AiLeadScoringInput): Promise<AiLeadScoringOutput> {
  if (input.length === 0) {
    return { scoredLeads: [] };
  }
  // If there's only one lead, wrap it in the expected batch format for the flow.
  if (input.length === 1) {
    const result = await aiSingleLeadScoringFlow(input[0]);
    return { scoredLeads: [result] };
  }
  return aiLeadScoringFlow({leads: input});
}

const aiSingleLeadScoringPrompt = ai.definePrompt({
  name: 'aiSingleLeadScoringPrompt',
  input: {schema: LeadToScoreSchema},
  output: {schema: ScoredLeadSchema},
  tools: [prospectWebsiteTool],
  prompt: `You are an AI assistant for MailPlus, an express parcel delivery service. Your goal is to score a sales lead for cold calling. The target service is **next-day delivery for parcels from 1kg to 20kg within Australia.**

  Analyze the lead's website to determine how likely they are to need this specific service.
  
  - Give a higher score (75-100) to companies whose business model clearly involves shipping parcels within our target weight range and exclusively within Australia (e.g., e-commerce stores selling consumer goods, online retailers, parts distributors, specialty food producers).
  - Use the prospectWebsite tool to gather information from the website to make your determination.
  - Increase the score if the website analysis finds keywords like "nationwide shipping", "ships Australia-wide", "express post", "delivery partners", "request a quote", "shipping policy".
  - Decrease the score for companies that likely ship very heavy items (e.g., "freight", "heavy machinery"), ship internationally, or sell digital-only products/services (e.g., "digital downloads", "software as a service", "consulting").

  Provide a reason for the assigned score, highlighting the key factors that influenced your assessment. Your reasoning should be based ONLY on the website analysis.

  Your response must be in the format specified by the output schema.
  You MUST provide a leadId, a 'score' (number) and a 'reason' (string).

  Lead ID: {{{leadId}}}
  Website: {{{websiteUrl}}}
  `,
});

const aiSingleLeadScoringFlow = ai.defineFlow(
  {
    name: 'aiSingleLeadScoringFlow',
    inputSchema: LeadToScoreSchema,
    outputSchema: ScoredLeadSchema,
  },
  async (input) => {
    const response = await aiSingleLeadScoringPrompt(input);
    const output = response.output;
    if (!output) {
      throw new Error("AI failed to generate a score.");
    }
    output.leadId = input.leadId; // Ensure leadId is in the final output.
    
    // Save the score to Firebase
    await updateLeadAiScore(input.leadId, output.score, output.reason);

    return output;
  }
);


const BatchScoringSchema = z.object({
  leads: z.array(LeadToScoreSchema),
});

const aiLeadScoringPrompt = ai.definePrompt({
  name: 'aiLeadScoringPrompt',
  input: {schema: BatchScoringSchema},
  output: {schema: AiLeadScoringOutputSchema},
  tools: [getLeadsTool, prospectWebsiteTool],
  prompt: `You are an AI assistant for MailPlus, an express parcel delivery service. Your goal is to score a batch of sales leads for cold calling. The target service is **next-day delivery for parcels from 1kg to 20kg within Australia.**

  For each lead in the provided list, analyze their website to determine how likely they are to need this specific service.
  
  - Give a higher score (75-100) to companies whose business model clearly involves shipping parcels within our target weight range and exclusively within Australia (e.g., e-commerce stores selling consumer goods, online retailers, parts distributors, specialty food producers).
  - Use the prospectWebsite tool to gather additional information from the website.
  - Increase the score if the website analysis finds keywords like "nationwide shipping", "ships Australia-wide", "express post", "delivery partners", "request a quote", "shipping policy".
  - Decrease the score for companies that likely ship very heavy items (e.g., "freight", "heavy machinery"), ship internationally, or sell digital-only products/services (e.g., "digital downloads", "software as a service", "consulting").

  If a lead profile is not provided, use the getLeads tool to fetch the leads first and score them individually.

  Provide a reason for the assigned score for each lead, highlighting the key factors that influenced your assessment. Your reasoning should be based ONLY on the website analysis.

  Your response must be in the format specified by the output schema, containing a list of scored leads. For each lead, you MUST provide a leadId, a 'score' (number), and a 'reason' (string).
  
  Leads to score:
  {{#each leads}}
  ---
  Lead ID: {{{this.leadId}}}
  Website: {{{this.websiteUrl}}}
  ---
  {{/each}}
  `,
});

const aiLeadScoringFlow = ai.defineFlow(
  {
    name: 'aiLeadScoringFlow',
    inputSchema: BatchScoringSchema,
    outputSchema: AiLeadScoringOutputSchema,
  },
  async (input) => {
    const response = await aiLeadScoringPrompt(input);

    const output = response.output;
    if (!output) {
      throw new Error("AI failed to generate scores.");
    }
    
    // Save scores to Firebase in batch
    for (const lead of output.scoredLeads) {
        await updateLeadAiScore(lead.leadId, lead.score, lead.reason);
    }
    
    return output;
  }
);
