
'use server';

import { getLeadsFromFirebase } from '@/services/firebase';
import type { Lead } from '@/lib/types';

/**
 * A server action to safely search leads from Firebase.
 */
export async function searchLeads(query: string): Promise<Pick<Lead, 'id' | 'companyName'>[]> {
  if (!query || query.length < 2) {
    return [];
  }
  
  try {
    const allLeads = await getLeadsFromFirebase({ summary: true });
    const lowercasedQuery = query.toLowerCase();
    
    const filteredLeads = allLeads
      .filter((lead: Lead) => 
        lead.companyName.toLowerCase().includes(lowercasedQuery)
      )
      .map(({ id, companyName }) => ({ id, companyName })) // Return only necessary fields
      .slice(0, 10); // Limit results

    return filteredLeads;
  } catch (error) {
    console.error("Error searching leads:", error);
    return [];
  }
}
