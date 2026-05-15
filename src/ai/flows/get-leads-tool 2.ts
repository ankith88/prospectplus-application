
'use server'
/**
 * @fileOverview A Genkit tool for fetching leads from Firebase.
 */

import { ai } from '@/ai/genkit'
import { getLeadsFromFirebase } from '@/services/firebase'
import { z } from 'genkit'

const GetLeadsInputSchema = z.object({
  leadId: z.string().optional().describe('The ID of a specific lead to fetch.'),
  summary: z.boolean().optional().describe('If true, returns a lightweight summary of leads. If false or omitted, returns full lead details including all contacts and activities.'),
});

export const getLeadsTool = ai.defineTool(
  {
    name: 'getLeads',
    description: 'Returns a list of leads from the CRM system (Firebase). Can fetch a single lead by ID or all leads. Provides full details including all sub-collections like contacts and activities unless a summary is explicitly requested.',
    inputSchema: GetLeadsInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    // Default to a full, non-summary fetch unless summary is explicitly true.
    const summary = input?.summary ?? false;
    const leadId = input?.leadId;
    
    // Pass summary: false to get all sub-collection data by default.
    return await getLeadsFromFirebase({ leadId, summary });
  }
);

