import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  try {
    // 1. Fetch all Journeys
    const journeysSnap = await db.collection('Journeys').get();
    if (journeysSnap.empty) {
      return NextResponse.json({ success: true, report: [] });
    }

    const report: any[] = [];

    // For batching lead document fetches to avoid N+1 queries
    const leadIdsSet = new Set<string>();
    
    // First pass: collect all state documents to find what leads we need
    const journeyStatesMap: Record<string, any[]> = {};
    
    for (const journeyDoc of journeysSnap.docs) {
      const journeyId = journeyDoc.id;
      const statesSnap = await db.collectionGroup('journey_states')
        .where('journeyId', '==', journeyId)
        .get();
      
      const states = statesSnap.docs.map(d => {
        const data = d.data();
        if (data.leadId) leadIdsSet.add(data.leadId);
        return {
          id: d.id,
          refPath: d.ref.path,
          ...data
        };
      });
      journeyStatesMap[journeyId] = states;
    }

    // Batch fetch all required leads
    const leadsMap: Record<string, any> = {};
    const leadIdsArray = Array.from(leadIdsSet);
    
    if (leadIdsArray.length > 0) {
      // Firestore `in` query supports up to 30 items per batch
      const batches: any[] = [];
      for (let i = 0; i < leadIdsArray.length; i += 30) {
        const batchIds = leadIdsArray.slice(i, i + 30);
        batches.push(
          db.collection('leads')
            .where('__name__', 'in', batchIds)
            .get()
        );
      }
      
      const batchesResults = await Promise.all(batches);
      batchesResults.forEach(snap => {
        snap.docs.forEach((doc: any) => {
          leadsMap[doc.id] = doc.data();
        });
      });
    }

    // Second pass: compile reporting metrics and details
    for (const journeyDoc of journeysSnap.docs) {
      const journeyId = journeyDoc.id;
      const journeyData = journeyDoc.data();
      const states = journeyStatesMap[journeyId] || [];

      let activeCount = 0;
      let completedCount = 0;
      let stoppedCount = 0;
      let interactionCount = 0;

      const leadsList: any[] = [];

      for (const state of states) {
        if (state.status === 'active') activeCount++;
        if (state.status === 'completed') completedCount++;
        if (state.status === 'stopped') stoppedCount++;

        const leadInfo = leadsMap[state.leadId] || {};
        
        // Find if they clicked any action button node
        const actionBtnClick = state.executionHistory?.find((h: any) => h.nodeType === 'action_button');
        const clickedActionButton = !!actionBtnClick;
        if (clickedActionButton) {
          interactionCount++;
        }

        // Get node label
        const node = journeyData.nodes?.find((n: any) => n.id === state.currentNodeId);
        let nodeLabel = node ? `${node.type} step` : 'Unknown';
        if (node?.type === 'action' && node.config?.actionType) {
          nodeLabel = `Send ${node.config.actionType}`;
        } else if (node?.type === 'wait') {
          nodeLabel = `Wait ${node.config?.duration} ${node.config?.unit}`;
        } else if (node?.type === 'trigger') {
          nodeLabel = 'Enrolled';
        }

        leadsList.push({
          leadId: state.leadId,
          companyName: leadInfo.companyName || 'Unknown Company',
          leadStatus: leadInfo.status || 'New',
          currentNodeId: state.currentNodeId,
          currentNodeLabel: nodeLabel,
          status: state.status,
          entryTime: state.entryTime || null,
          lastExecutionTime: state.lastExecutionTime || null,
          clickedActionButton,
          clickedTime: actionBtnClick ? actionBtnClick.executedAt : null
        });
      }

      report.push({
        id: journeyId,
        name: journeyData.name || 'Unnamed Journey',
        status: journeyData.status || 'draft',
        metrics: {
          active: activeCount,
          completed: completedCount,
          stopped: stoppedCount,
          totalEnrolled: states.length,
          interactions: interactionCount
        },
        leads: leadsList
      });
    }

    return NextResponse.json({ success: true, report });

  } catch (error: any) {
    console.error('Error generating nurture report:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
