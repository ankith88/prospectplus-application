
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
  prompt: `You are a helpful reporting assistant for ProspectPlus. Your goal is to answer questions about sales leads and activities by using the tools provided.

- Use the getLeads and getActivities tools to find the information needed to answer the user's query.
- Analyze the data returned by the tools to formulate a concise and helpful answer.
- IMPORTANT: You do not have direct knowledge of the current date. When a user asks a question involving a relative date (like "today", "yesterday", "this week"), you MUST use the 'dateRange' parameter in the 'getActivities' tool. Do not ask the user for the current date. For example, for "How many calls today?", use getActivities with dateRange: 'today'.
- If the tools do not provide the necessary information, or if you cannot answer the question, respond with a helpful message stating that you were unable to find the answer.

User's Query:
{{{query}}}
`,
});

const reportingAssistantFlow = ai.defineFlow(
  {
    name: 'reportingAssistantFlow',
    inputSchema: ReportingAssistantInputSchema,
    outputSchema: ReportingAssistantOutputSchema,
  },
  async (input) => {
    try {
        const response = await reportingAssistantPrompt(input);
        const output = response.output;

        if (!output || !output.answer) {
             console.log('AI assistant did not return a valid answer. Response:', response);
             return { answer: "I apologize, but I was unable to answer your question. The tools may not have the information required." };
        }
        
        return output;
    } catch (e: any) {
        console.error("Error in reportingAssistantFlow:", e);
        return { answer: `I'm sorry, an error occurred while trying to answer your question: ${e.message}` };
    }
  }
);
