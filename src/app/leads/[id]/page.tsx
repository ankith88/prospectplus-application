
import { notFound } from 'next/navigation'
import { getLeadFromFirebase } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'

export default async function LeadProfilePage({
  params: { id },
}: {
  params: { id: string }
}) {
  // Add a guard to ensure the ID is valid before fetching
  if (!id || typeof id !== 'string') {
    notFound();
    return;
  }

  // Fetch the lead and all its sub-collections on the server.
  const lead: Lead | null = await getLeadFromFirebase(id, true);

  if (!lead) {
    notFound();
    return;
  }
  
  return <LeadProfile 
            initialLead={lead} 
        />;
}
