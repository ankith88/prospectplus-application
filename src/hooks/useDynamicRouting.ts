import { useState, useEffect } from 'react';
import { Lead } from '../lib/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestore as db } from '../lib/firebase';

export function useDynamicRouting(userId: string) {
  const [routedLeads, setRoutedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndPrioritize() {
      if (!userId) return;
      setLoading(true);
      try {
        // Fetch leads assigned to user that are in field sales buckets
        const leadsRef = collection(db, 'leads');
        const q = query(
          leadsRef,
          where('fieldRepAssigned', '==', userId),
          where('status', 'in', ['Priority Field Lead', 'In Progress', 'Reschedule', 'Contacted', 'New'])
        );
        const snapshot = await getDocs(q);
        const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));

        // In a real app, this is where we'd hit external APIs for traffic or calendar events.
        // Here we'll dynamically sort by totalScore / urgency.
        const prioritized = leads.sort((a, b) => {
          // Prioritize by total score if available
          const scoreA = a.totalScore || 0;
          const scoreB = b.totalScore || 0;
          
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          // Fallback to status priority
          const statusPriority: Record<string, number> = {
            'Priority Field Lead': 4,
            'Reschedule': 3,
            'New': 2,
            'In Progress': 1,
            'Contacted': 0,
          };
          
          return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
        });

        setRoutedLeads(prioritized);
      } catch (error) {
        console.error('Failed to fetch and prioritize routes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAndPrioritize();
  }, [userId]);

  return { routedLeads, loading };
}
