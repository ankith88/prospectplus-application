
import { getLeadsFromFirebase } from '@/services/firebase';
import ArchivedLeadsClientPage from '@/components/archived-leads-client';
import type { Lead } from '@/lib/types';

// Revalidate the data for this page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getArchivedLeadsData() {
    const allLeads = await getLeadsFromFirebase({ summary: true });
    const archivedLeads = allLeads.filter(lead => 
        ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified'].includes(lead.status)
    );
    return archivedLeads;
}

export default async function ArchivedLeadsPage() {
  const initialLeads = await getArchivedLeadsData();

  return (
    <ArchivedLeadsClientPage initialLeads={initialLeads} />
  );
}
