
'use server';

/**
 * @fileOverview A Genkit flow for universal search across leads, contacts, and calls.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { firestore } from '@/lib/firebase';
import { collection, query, where, getDocs, collectionGroup, limit, getDoc } from 'firebase/firestore';

const UniversalSearchInputSchema = z.object({
  query: z.string().describe('The search term.'),
});
type UniversalSearchInput = z.infer<typeof UniversalSearchInputSchema>;

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
type UniversalSearchOutput = z.infer<typeof UniversalSearchOutputSchema>;

async function searchLeads(searchTerm: string): Promise<z.infer<typeof SearchLeadResultSchema>[]> {
  if (!searchTerm) return [];
  const leadsRef = collection(firestore, 'leads');
  const q = query(
    leadsRef,
    where('companyName', '>=', searchTerm),
    where('companyName', '<=', searchTerm + '\uf8ff'),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    companyName: doc.data().companyName,
  }));
}

async function searchContacts(searchTerm: string): Promise<z.infer<typeof SearchContactResultSchema>[]> {
  if (!searchTerm) return [];
  const contactsRef = collectionGroup(firestore, 'contacts');
  
  // This is a simplified search. For production, you might need a more complex solution
  // like a dedicated search service (e.g., Algolia/Elasticsearch) for full-text search.
  const nameQuery = query(contactsRef, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'), limit(5));
  const emailQuery = query(contactsRef, where('email', '==', searchTerm), limit(5));
  const phoneQuery = query(contactsRef, where('phone', '==', searchTerm), limit(5));

  const [nameSnapshot, emailSnapshot, phoneSnapshot] = await Promise.all([
    getDocs(nameQuery),
    getDocs(emailQuery),
    getDocs(phoneQuery),
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

  await Promise.all([
    processSnapshot(nameSnapshot),
    processSnapshot(emailSnapshot),
    processSnapshot(phoneSnapshot),
  ]);

  return Array.from(results.values());
}


async function searchTranscripts(searchTerm: string): Promise<z.infer<typeof SearchTranscriptResultSchema>[]> {
    if (!searchTerm) return [];
    const transcriptsRef = collectionGroup(firestore, 'transcripts');
    const q = query(transcriptsRef, where('callId', '==', searchTerm), limit(5));
    const snapshot = await getDocs(q);

    const results: z.infer<typeof SearchTranscriptResultSchema>[] = [];
    for (const doc of snapshot.docs) {
        const leadRef = doc.ref.parent.parent;
        if (leadRef) {
            const leadDoc = await getDoc(leadRef);
            if (leadDoc.exists()) {
                results.push({
                    id: doc.id,
                    callId: doc.data().callId,
                    leadId: leadDoc.id,
                    leadName: leadDoc.data().companyName,
                });
            }
        }
    }
    return results;
}


export async function universalSearch(input: UniversalSearchInput): Promise<UniversalSearchOutput> {
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
