
import { getAllTasks, getLeadsFromFirebase } from '@/services/firebase';
import TasksClientPage from '@/components/tasks-client';
import type { Task } from '@/lib/types';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { adminApp } from '@/lib/firebase-admin';

// Revalidate the data for this page every 5 minutes (300 seconds)
export const revalidate = 300; 

async function getTasksData() {
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return { initialTasks: [] };
  }
  
  try {
    const decodedToken = await getAuth(adminApp).verifySessionCookie(sessionCookie, true);
    const user = await getAuth(adminApp).getUser(decodedToken.uid);
    
    if (!user.displayName) {
        return { initialTasks: [] };
    }
    
    const [allTasks, allLeads] = await Promise.all([
        getAllTasks(),
        getLeadsFromFirebase({ summary: true })
    ]);
    
    const leadsMap = new Map(allLeads.map(l => [l.id, l]));

    const myTasks = allTasks
        .map(task => {
            const lead = leadsMap.get(task.leadId);
            if (lead && lead.dialerAssigned === user.displayName) {
                return {
                    ...task,
                    leadName: lead.companyName || 'Unknown Lead'
                };
            }
            return null;
        })
        .filter((task): task is Task & { leadId: string; leadName: string } => task !== null);

    return { initialTasks: myTasks };

  } catch (error) {
      console.error("Error fetching tasks data on server:", error);
      return { initialTasks: [] };
  }
}

export default async function TasksPage() {
  const { initialTasks } = await getTasksData();
  return <TasksClientPage initialTasks={initialTasks} />;
}
