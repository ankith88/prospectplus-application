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
    } else if (user) {
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
        // Batch get up to 500 at a time
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

        // Apply real lead names
        rawTasks.forEach(task => {
          if ((!task.leadName || task.leadName === 'Lead') && task.leadId && leadNameMap.has(task.leadId)) {
            task.leadName = leadNameMap.get(task.leadId)!;
          }
        });
      }

      tasks = rawTasks;
    } else {
      // General tasks query
      const snap = await db.collectionGroup('tasks').limit(500).get();
      tasks = snap.docs.map(d => ({
        id: d.id,
        leadId: d.ref.parent.parent?.id || '',
        leadName: d.data().leadName || 'Lead',
        ...d.data(),
      }));
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
