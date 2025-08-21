
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
    description: 'Returns a list of leads from the CRM system (Firebase).',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (input) => {
    // Ensure we fetch the full lead data, not just the summary,
    // so that fields like 'dialerAssigned' are available for filtering.
    const summary = input?.summary ?? false;
    const leadId = input?.leadId;
    return await getLeadsFromFirebase({ leadId, summary });
  }
);
