

import { notFound } from 'next/navigation'
import { getLeadFromFirebase } from '@/services/firebase'
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
  
  return <LeadProfile initialLead={lead} />;
}
