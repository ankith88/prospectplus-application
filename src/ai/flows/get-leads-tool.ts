'use server'
/**
 * @fileOverview A Genkit tool for fetching leads from Firebase.
 */

import { ai } from '@/ai/genkit'
import { getLeadsFromFirebase } from '@/services/firebase'
import { z } from 'genkit'

const LeadSchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    company: z.string(),
    email: z.string(),
    phone: z.string(),
    status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified', 'Lost', 'Won']),
    avatarUrl: z.string(),
    profile: z.string(),
    activity: z.array(z.object({
        id: z.string(),
        type: z.enum(['Call', 'Email', 'Meeting']),
        date: z.string(),
        duration: z.string().optional(),
        notes: z.string(),
    })),
});

export const getLeadsTool = ai.defineTool(
  {
    name: 'getLeads',
    description: 'Returns a list of leads from the CRM system (Firebase).',
    inputSchema: z.object({}),
    outputSchema: z.array(LeadSchema),
  },
  async () => {
    return await getLeadsFromFirebase();
  }
);
