

import { notFound } from 'next/navigation'
import { getLeadFromFirebase, getLeadSubCollection, getLeadNotes } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead, Contact, Activity, Note } from '@/lib/types'

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

  // Fetch sub-collections on the server to pass as initial data
  const [contacts, activity, notes] = await Promise.all([
    getLeadSubCollection<Contact>(id, 'contacts'),
    getLeadSubCollection<Activity>(id, 'activity'),
    getLeadNotes(id),
  ]);

  lead.contacts = contacts;
  lead.activity = activity;
  
  return <LeadProfile initialLead={lead} initialNotes={notes} />;
}
