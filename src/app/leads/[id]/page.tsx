

import { notFound } from 'next/navigation'
import { getLeadFromFirebase, getLeadSubCollection, getLeadNotes, getLeadTranscripts, getLeadContacts, getLeadAppointments } from '@/services/firebase'
import { LeadProfile } from '@/components/lead-profile'
import type { Lead, Contact, Activity, Note, Transcript, Appointment } from '@/lib/types'

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
  const [contacts, activity, notes, transcripts, appointments] = await Promise.all([
    getLeadContacts(id),
    getLeadSubCollection<Activity>(id, 'activity'),
    getLeadNotes(id),
    getLeadTranscripts(id),
    getLeadAppointments(id),
  ]);

  lead.contacts = contacts;
  lead.activity = activity;
  
  return <LeadProfile initialLead={lead} initialNotes={notes} initialTranscripts={transcripts} initialAppointments={appointments} />;
}
