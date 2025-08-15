'use server'
/**
 * @fileOverview A Genkit tool for fetching leads from Firebase.
 */

import { ai } from '@/ai/genkit'
import { getLeadsFromFirebase } from '@/services/firebase'
import { z } from 'genkit'

const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
});

const AddressSchema = z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
});

const LeadSchema = z.object({
    id: z.string(),
    entityId: z.string(),
    companyName: z.string(),
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
    contacts: z.array(ContactSchema),
    address: AddressSchema.optional(),
    franchisee: z.string().optional(),
    websiteUrl: z.string().optional(),
    industryCategory: z.string().optional(),
    industrySubCategory: z.string().optional(),
    salesRepAssigned: z.string().nullable().optional(),
    campaign: z.string().optional(),
    customerServiceEmail: z.string().optional(),
    customerPhone: z.string().optional(),
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
