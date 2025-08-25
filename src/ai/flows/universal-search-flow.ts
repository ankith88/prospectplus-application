
'use server';

/**
 * @fileOverview A Genkit flow for universal search across leads, contacts, and calls.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, collectionGroup, limit, getDoc, or, orderBy } from 'firebase/firestore';

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

async function searchLeads(searchTerm: string): Promise<z.infer<typeof SearchLeadResultSchema>[]> {
  if (!searchTerm) return [];
  const leadsRef = collection(firestore, 'leads');
  const searchTermLower = searchTerm.toLowerCase();

  // Basic prefix query. This is more reliable with Firestore indexing.
  const q = query(
    leadsRef,
    orderBy('companyName'),
    where('companyName', '>=', searchTerm),
    where('companyName', '<=', searchTerm + '\uf8ff'),
    limit(20)
  );

  const snapshot = await getDocs(q);

  // Manual client-side filtering for case-insensitivity
  const filteredDocs = snapshot.docs.filter(doc => 
    doc.data().companyName.toLowerCase().includes(searchTermLower)
  );

  return filteredDocs.slice(0, 5).map(doc => ({
    id: doc.id,
    companyName: doc.data().companyName,
  }));
}


async function searchContacts(searchTerm: string): Promise<z.infer<typeof SearchContactResultSchema>[]> {
  if (!searchTerm) return [];
  const contactsRef = collectionGroup(firestore, 'contacts');
  
  // This is a simplified search. For production, you might need a more complex solution
  // like a dedicated search service (e.g., Algolia/Elasticsearch) for full-text search.
  // The query on 'phone' has been removed to prevent indexing errors.
  const emailQuery = query(contactsRef, where('email', '==', searchTerm), limit(5));

  const [emailSnapshot] = await Promise.all([
    getDocs(emailQuery),
  ]);

  const results = new Map<string, z.infer<typeof SearchContactResultSchema>>();

  const processSnapshot = async (snapshot: any) => {
    for (const doc of snapshot.docs) {
      if (results.has(doc.id)) continue;
      
      const leadRef = doc.ref.parent.parent;
      if (leadRef) {
        const leadDoc = await getDoc(leadRef);
        if (leadDoc.exists()) {
          results.set(doc.id, {
            id: doc.id,
            name: doc.data().name,
            leadId: leadDoc.id,
            leadName: leadDoc.data().companyName,
          });
        }
      }
    }
  }

  await processSnapshot(emailSnapshot);

  return Array.from(results.values());
}


async function searchTranscripts(searchTerm: string): Promise<z.infer<typeof SearchTranscriptResultSchema>[]> {
    // This query requires a composite index. Disabling for now to prevent app crashes.
    // The user can create the required index in their Firebase console to re-enable this.
    // The required index is on the 'transcripts' collection group, for the 'callId' field.
    return [];
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
    const [leadResults, contactResults, transcriptResults] = await Promise.all([
      searchLeads(searchTerm),
      searchContacts(searchTerm),
      searchTranscripts(searchTerm),
    ]);

    return {
      leads: leadResults,
      contacts: contactResults,
      transcripts: transcriptResults,
    };
  }
);
