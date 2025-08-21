
'use server'
/**
 * @fileOverview A Genkit tool for fetching leads from Firebase.
 */

import { ai } from '@/ai/genkit'
import { getLeadsFromFirebase } from '@/services/firebase'
import { z } from 'genkit'

export const getLeadsTool = ai.defineTool(
  {
    name: 'getLeads',
    description: 'Returns a list of leads from the CRM system (Firebase). Can fetch all leads or a single lead by ID.',
    inputSchema: z.object({
      leadId: z.string().optional().describe('The ID of a specific lead to fetch.'),
      summary: z.boolean().optional().describe('If true, returns a summary of leads without detailed sub-collections like contacts and activities.'),
    }),
  },
  async ({ leadId, summary }) => {
    return await getLeadsFromFirebase({ leadId, summary });
  }
);
