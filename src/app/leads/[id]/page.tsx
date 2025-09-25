
import { notFound } from 'next/navigation'
import { getLeadFromFirebase, getLeadContacts } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead } from '@/lib/types'

export default async function LeadProfilePage({
  params: { id },
}: {
  params: { id: string }
}) {
  const lead: Lead | null = await getLeadFromFirebase(id, false);

  if (!lead) {
    notFound();
    return;
  }

  // Fetch only essential data on the server
  const contacts = await getLeadContacts(id);
  lead.contacts = contacts;
  
  return <LeadProfile initialLead={lead} />;
}
