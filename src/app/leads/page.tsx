
import { getLeadsFromFirebase, getAllUsers } from '@/services/firebase';
import LeadsClientPage from '@/components/leads-client';
import type { UserProfile } from '@/lib/types';

// This page is now dynamically rendered to ensure fresh data on load.
export const dynamic = 'force-dynamic';

async function getLeadsData() {
  const [fetchedLeads, fetchedUsers] = await Promise.all([
    getLeadsFromFirebase({ summary: true }),
    getAllUsers()
  ]);

  const activeDialers = fetchedUsers
    .filter(u => u.role !== 'admin' && u.firstName && u.lastName)
    .map(u => ({ ...u, displayName: `${u.firstName} ${u.lastName}`.trim() }));

  return { initialLeads: fetchedLeads, initialDialers: activeDialers };
}

export default async function LeadsPage() {
  const { initialLeads, initialDialers } = await getLeadsData();

  return (
    <LeadsClientPage
      initialLeads={initialLeads}
      initialDialers={initialDialers}
    />
  );
}
