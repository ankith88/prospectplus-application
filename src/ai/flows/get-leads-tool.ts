
'use server'
/**
 * @fileOverview A Genkit tool for fetching leads from Firebase.
 */

import { ai } from '@/ai/genkit'
import { getLeadsFromFirebase } from '@/services/firebase'
import { z } from 'genkit'

const GetLeadsInputSchema = z.object({
  leadId: z.string().optional(),
  summary: z.boolean().optional(),
});

export const getLeadsTool = ai.defineTool(
  {
    name: 'getLeads',
    description: 'Returns a list of leads from the CRM system (Firebase).',
    inputSchema: GetLeadsInputSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    const summary = input?.summary ?? false;
    const leadId = input?.leadId;
    // By passing summary directly, we ensure a full data fetch when needed.
    return await getLeadsFromFirebase({ leadId, summary });
  }
);
