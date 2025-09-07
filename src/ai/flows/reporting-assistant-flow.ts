
'use server';

/**
 * @fileOverview A Genkit flow that acts as a reporting assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getLeadsTool } from './get-leads-tool';
import { getActivitiesTool } from './get-activities-tool';

const ReportingAssistantInputSchema = z.object({
  query: z.string().describe('The user\'s natural language question about leads or activities.'),
});
export type ReportingAssistantInput = z.infer<typeof ReportingAssistantInputSchema>;

const ReportingAssistantOutputSchema = z.object({
  answer: z.string().describe('A conversational answer to the user\'s query.'),
});
export type ReportingAssistantOutput = z.infer<typeof ReportingAssistantOutputSchema>;


export async function askReportingAssistant(input: ReportingAssistantInput): Promise<ReportingAssistantOutput> {
  return reportingAssistantFlow(input);
}


const reportingAssistantPrompt = ai.definePrompt({
  name: 'reportingAssistantPrompt',
  input: { schema: ReportingAssistantInputSchema },
  output: { schema: ReportingAssistantOutputSchema },
  tools: [getLeadsTool, getActivitiesTool],
  prompt: `You are a reporting assistant for ProspectPlus. Your goal is to answer questions about sales leads and activities based on the data available in the CRM.

Use the provided tools (getLeads, getActivities) to fetch the necessary information.
Analyze the data returned from the tools to formulate a concise and helpful answer to the user's query.

IMPORTANT: You do not have direct knowledge of the current date. When a user asks a question involving a relative date (like "today", "yesterday", "this week"), you MUST use the 'dateRange' parameter in the 'getActivities' tool. Do not ask the user for the current date. For example, for "How many calls today?", use getActivities with dateRange: 'today'.

For example, if the user asks "How many leads did we qualify last month?", you should use the getLeads tool, filter them by the 'Qualified' status, and then respond with the count.
If the user asks "Show me call stats for Leonie Feata", use the getActivities tool with the 'dialerAssigned' filter.

User's Query:
{{{query}}}

Based on the data from your tools, provide a clear and direct answer.
`,
});

const reportingAssistantFlow = ai.defineFlow(
  {
    name: 'reportingAssistantFlow',
    inputSchema: ReportingAssistantInputSchema,
    outputSchema: ReportingAssistantOutputSchema,
  },
  async (input) => {
    const response = await reportingAssistantPrompt(input);
    const output = response.output;

    if (!output) {
      throw new Error("The AI reporting assistant failed to generate a response.");
    }
    
    return output;
  }
);
