
import { getLeadsFromFirebase, getLastActivity } from '@/services/firebase';
import ArchivedLeadsClientPage from '@/components/archived-leads-client';
import type { Lead } from '@/lib/types';

// Revalidate the data for this page every 10 minutes (600 seconds)
export const revalidate = 600;

async function getArchivedLeadsData() {
    const allLeads = await getLeadsFromFirebase({ summary: true });
    const archivedLeads = allLeads.filter(lead => 
        ['Lost', 'Qualified', 'Won', 'LPO Review', 'Pre Qualified', 'Unqualified', 'Trialing ShipMate'].includes(lead.status)
    );

    // Fetch the last activity for each archived lead in parallel
    const leadsWithLastActivity = await Promise.all(
        archivedLeads.map(async (lead) => {
            const lastActivity = await getLastActivity(lead.id);
            return {
                ...lead,
                activity: lastActivity ? [lastActivity] : [], // Embed last activity
            };
        })
    );
    
    // Sort by last activity date, newest to oldest
    leadsWithLastActivity.sort((a, b) => {
        const dateA = a.activity?.[0]?.date ? new Date(a.activity[0].date).getTime() : 0;
        const dateB = b.activity?.[0]?.date ? new Date(b.activity[0].date).getTime() : 0;
        return dateB - dateA;
    });


    return leadsWithLastActivity;
}

export default async function ArchivedLeadsPage() {
  const initialLeads = await getArchivedLeadsData();

  return (
    <ArchivedLeadsClientPage initialLeads={initialLeads} />
  );
}
