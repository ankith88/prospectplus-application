import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user') || searchParams.get('displayName');
    const leadId = searchParams.get('leadId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let tasks: any[] = [];

    if (leadId) {
      // Fetch tasks for a specific lead
      const snap = await db.collection('leads').doc(leadId).collection('tasks').get();
      const leadSnap = await db.collection('leads').doc(leadId).get();
      const leadData = leadSnap.data();
      const leadName = leadData?.companyName || leadData?.name || 'Lead';

      tasks = snap.docs.map(d => ({
        id: d.id,
        leadId,
        leadName,
        ...d.data(),
      }));
    } else if (user && user !== 'all') {
      // Query collectionGroup 'tasks' for assigned user
      const q = db.collectionGroup('tasks').where('dialerAssigned', '==', user);
      const snap = await q.get();

      // Collect parent lead IDs to resolve company/lead names in a single batch
      const leadIdsToFetch = new Set<string>();
      const rawTasks: any[] = [];

      snap.docs.forEach(d => {
        const data = d.data();
        const parentLeadId = d.ref.parent.parent?.id || '';
        const currentLeadName = data.leadName;

        if (parentLeadId && (!currentLeadName || currentLeadName === 'Lead')) {
          leadIdsToFetch.add(parentLeadId);
        }

        rawTasks.push({
          id: d.id,
          leadId: parentLeadId,
          leadName: currentLeadName || 'Lead',
          ...data,
        });
      });

      // Batch resolve lead names if needed
      if (leadIdsToFetch.size > 0) {
        const leadRefs = Array.from(leadIdsToFetch).map(id => db.collection('leads').doc(id));
        const chunks: any[][] = [];
        for (let i = 0; i < leadRefs.length; i += 300) {
          chunks.push(leadRefs.slice(i, i + 300));
        }

        const leadNameMap = new Map<string, string>();
        for (const chunk of chunks) {
          const docSnaps = await db.getAll(...chunk);
          docSnaps.forEach(docSnap => {
            if (docSnap.exists) {
              const d = docSnap.data();
              const name = d?.companyName || d?.name || 'Lead';
              leadNameMap.set(docSnap.id, name);
            }
          });
        }

        rawTasks.forEach(task => {
          if ((!task.leadName || task.leadName === 'Lead') && task.leadId && leadNameMap.has(task.leadId)) {
            task.leadName = leadNameMap.get(task.leadId)!;
          }
        });
      }

      tasks = rawTasks;
    } else {
      // General tasks query across all users
      const snap = await db.collectionGroup('tasks').get();
      const leadIdsToFetch = new Set<string>();
      const rawTasks: any[] = [];

      snap.docs.forEach(d => {
        const data = d.data();
        const parentLeadId = d.ref.parent.parent?.id || '';
        const currentLeadName = data.leadName;

        if (parentLeadId && (!currentLeadName || currentLeadName === 'Lead')) {
          leadIdsToFetch.add(parentLeadId);
        }

        rawTasks.push({
          id: d.id,
          leadId: parentLeadId,
          leadName: currentLeadName || 'Lead',
          ...data,
        });
      });

      // Batch resolve lead names
      if (leadIdsToFetch.size > 0) {
        const leadRefs = Array.from(leadIdsToFetch).map(id => db.collection('leads').doc(id));
        const chunks: any[][] = [];
        for (let i = 0; i < leadRefs.length; i += 300) {
          chunks.push(leadRefs.slice(i, i + 300));
        }

        const leadNameMap = new Map<string, string>();
        for (const chunk of chunks) {
          const docSnaps = await db.getAll(...chunk);
          docSnaps.forEach(docSnap => {
            if (docSnap.exists) {
              const d = docSnap.data();
              const name = d?.companyName || d?.name || 'Lead';
              leadNameMap.set(docSnap.id, name);
            }
          });
        }

        rawTasks.forEach(task => {
          if ((!task.leadName || task.leadName === 'Lead') && task.leadId && leadNameMap.has(task.leadId)) {
            task.leadName = leadNameMap.get(task.leadId)!;
          }
        });
      }

      tasks = rawTasks;
    }

    // Apply time frame filter by dueDate if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate ? new Date(endDate).getTime() : Infinity;

      tasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskTime = new Date(task.dueDate).getTime();
        if (isNaN(taskTime)) return true;
        return taskTime >= start && taskTime <= end;
      });
    }

    return NextResponse.json(
      { success: true, tasks },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching tasks via API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
