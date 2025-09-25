
import { notFound } from 'next/navigation'
import { getLeadFromFirebase, getLeadContacts, getLeadActivity, getLeadNotes, getLeadTranscripts, getLeadTasks, getLeadAppointments } from '@/services/firebase'
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

  // Fetch all sub-collection data on the server
  const [contacts, activity, notes, transcripts, tasks, appointments] = await Promise.all([
    getLeadContacts(id),
    getLeadActivity(id),
    getLeadNotes(id),
    getLeadTranscripts(id),
    getLeadTasks(id),
    getLeadAppointments(id),
  ]);
  
  lead.contacts = contacts;
  lead.activity = activity;
  
  return <LeadProfile 
            initialLead={lead} 
            initialNotes={notes}
            initialTranscripts={transcripts}
            initialTasks={tasks}
            initialAppointments={appointments}
        />;
}
