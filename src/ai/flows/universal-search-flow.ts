
'use server';

/**
 * @fileOverview A Genkit flow for universal search across leads and contacts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, collectionGroup, limit, getDoc, or, orderBy } from 'firebase/firestore';
import type { Lead, Contact } from '@/lib/types';


const UniversalSearchInputSchema = z.object({
  query: z.string().describe('The search term.'),
});

const SearchLeadResultSchema = z.object({
  id: z.string(),
  companyName: z.string(),
});

const SearchContactResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  leadId: z.string(),
  leadName: z.string(),
});

const SearchTranscriptResultSchema = z.object({
    id: z.string(),
    callId: z.string(),
    leadId: z.string(),
    leadName: z.string(),
});

const UniversalSearchOutputSchema = z.object({
  leads: z.array(SearchLeadResultSchema),
  contacts: z.array(SearchContactResultSchema),
  transcripts: z.array(SearchTranscriptResultSchema),
});


async function performSearch(searchTerm: string): Promise<z.infer<typeof UniversalSearchOutputSchema>> {
    if (!searchTerm || searchTerm.length < 3) {
        return { leads: [], contacts: [], transcripts: [] };
    }

    const searchTermLower = searchTerm.toLowerCase();
    const leadsRef = collection(firestore, 'leads');
    const snapshot = await getDocs(leadsRef);

    const foundLeads: z.infer<typeof SearchLeadResultSchema>[] = [];
    const foundContacts: z.infer<typeof SearchContactResultSchema>[] = [];

    const leadPromises = snapshot.docs.map(async (leadDoc) => {
        const leadData = leadDoc.data() as Lead;
        let leadAdded = false;

        // Search lead fields
        if (leadData.companyName?.toLowerCase().includes(searchTermLower) ||
            leadData.customerPhone?.replace(/\D/g, '').includes(searchTermLower.replace(/\D/g, '')) ||
            leadData.customerServiceEmail?.toLowerCase().includes(searchTermLower)) {
            
            foundLeads.push({
                id: leadDoc.id,
                companyName: leadData.companyName,
            });
            leadAdded = true;
        }

        // Search contacts subcollection
        const contactsRef = collection(firestore, 'leads', leadDoc.id, 'contacts');
        const contactsSnapshot = await getDocs(contactsRef);
        contactsSnapshot.forEach((contactDoc) => {
            const contactData = contactDoc.data() as Contact;
            if (contactData.name?.toLowerCase().includes(searchTermLower) ||
                contactData.phone?.replace(/\D/g, '').includes(searchTermLower.replace(/\D/g, '')) ||
                contactData.email?.toLowerCase().includes(searchTermLower)) {
                
                foundContacts.push({
                    id: contactDoc.id,
                    name: contactData.name,
                    leadId: leadDoc.id,
                    leadName: leadData.companyName,
                });

                // Also add the parent lead to the results if it wasn't already
                if (!leadAdded && !foundLeads.some(l => l.id === leadDoc.id)) {
                    foundLeads.push({
                        id: leadDoc.id,
                        companyName: leadData.companyName,
                    });
                }
            }
        });
    });

    await Promise.all(leadPromises);

    // Remove duplicate leads that might have been added from contact matches
    const uniqueLeads = Array.from(new Map(foundLeads.map(item => [item['id'], item])).values());
    
    return {
        leads: uniqueLeads.slice(0, 5), // Limit results
        contacts: foundContacts.slice(0, 5),
        transcripts: [], // Transcripts search is disabled
    };
}


export async function universalSearch(input: z.infer<typeof UniversalSearchInputSchema>): Promise<z.infer<typeof UniversalSearchOutputSchema>> {
  return universalSearchFlow(input);
}

const universalSearchFlow = ai.defineFlow(
  {
    name: 'universalSearchFlow',
    inputSchema: UniversalSearchInputSchema,
    outputSchema: UniversalSearchOutputSchema,
  },
  async ({ query: searchTerm }) => {
    return performSearch(searchTerm);
  }
);
