import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  const journeyId = searchParams.get('journeyId');
  const nodeId = searchParams.get('nodeId');
  const redirectUrl = searchParams.get('redirect') || '/';

  if (!leadId || !journeyId || !nodeId) {
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  try {
    // 1. Fetch Lead document
    const leadRef = db.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      console.error(`Lead not found: ${leadId}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    const leadData = leadDoc.data();

    // 2. Fetch Journey definition
    const journeyRef = db.collection('Journeys').doc(journeyId);
    const journeyDoc = await journeyRef.get();

    if (!journeyDoc.exists) {
      console.error(`Journey not found: ${journeyId}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    const journeyData = journeyDoc.data();
    const node = journeyData?.nodes?.find((n: any) => n.id === nodeId);

    if (!node || node.type !== 'action_button') {
      console.error(`Invalid node / node type: ${nodeId}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    const config = node.config || {};
    const { targetBucket, targetUser, targetRole } = config;

    // 3. Update the lead's journey state to stopped
    const stateRef = leadRef.collection('journey_states').doc(journeyId);
    const nowStr = new Date().toISOString();
    
    await stateRef.set({
      leadId,
      journeyId,
      status: 'stopped',
      currentNodeId: nodeId,
      lastExecutionTime: nowStr,
      stoppedReason: 'Action button clicked in email',
      executionHistory: [
        {
          nodeId,
          nodeType: 'action_button',
          executedAt: nowStr,
          actionResult: 'Action button clicked. Campaign stopped.'
        }
      ]
    }, { merge: true });

    // 4. Prepare Lead updates
    const updates: Record<string, any> = {};
    let activityNote = `Nurture Campaign '${journeyData.name}' stopped via email action button.`;

    if (targetBucket) {
      updates.bucket = targetBucket;
      activityNote += ` Bucket updated to '${targetBucket}'.`;
    }

    if (targetUser) {
      // Determine what field to update based on targetRole or fallback
      if (targetRole === 'Account Manager' || targetRole === 'account_manager') {
        updates.accountManagerAssigned = targetUser;
      } else if (targetRole === 'Sales Rep' || targetRole === 'sales_rep') {
        updates.salesRepAssigned = targetUser;
      } else if (targetRole === 'Dialer' || targetRole === 'dialer') {
        updates.dialerAssigned = targetUser;
      } else {
        // Fallback default
        updates.accountManagerAssigned = targetUser;
      }
      activityNote += ` Assigned user updated to '${targetUser}'.`;
    }

    // Apply updates to lead if there are any
    if (Object.keys(updates).length > 0) {
      await leadRef.update(updates);
    }

    // 5. Log Activity on the Lead
    await leadRef.collection('activity').add({
      type: 'Update',
      date: nowStr,
      notes: activityNote,
      author: 'Nurture Campaign Engine'
    });

    return NextResponse.redirect(new URL(redirectUrl));

  } catch (error) {
    console.error('Error handling nurture action link:', error);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
}
