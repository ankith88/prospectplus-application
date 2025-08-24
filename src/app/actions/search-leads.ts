
'use server';

import { getLeadsTool } from '@/ai/flows/get-leads-tool';

/**
 * A server action to safely expose the getLeadsTool to client components.
 */
export async function searchLeads(query: string) {
  if (!query || query.length < 2) {
    return [];
  }
  
  try {
    const allLeads = await getLeadsTool({ summary: true });
    const lowercasedQuery = query.toLowerCase();
    
    const filteredLeads = allLeads.filter((lead: any) => 
      lead.companyName.toLowerCase().includes(lowercasedQuery)
    ).slice(0, 10); // Limit results

    return filteredLeads;
  } catch (error) {
    console.error("Error searching leads:", error);
    return [];
  }
}
