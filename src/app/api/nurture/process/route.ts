import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';

const db = getFirestore(adminApp);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    // For local development or cron triggers
    // In production, you'd verify a secret token or App Check token
    console.log('[Nurture Process Engine] Triggered execution run.');

    const now = new Date();
    const nowStr = now.toISOString();

    // 1. Fetch leads with active journeys
    const leadsSnap = await db.collection('leads')
      .where('activeJourneys', '!=', [])
      .get();

    if (leadsSnap.empty) {
      return NextResponse.json({ success: true, message: 'No leads in active nurture campaigns.' });
    }

    let leadsProcessed = 0;
    let actionsExecuted = 0;

    for (const leadDoc of leadsSnap.docs) {
      const leadId = leadDoc.id;
      const leadData = leadDoc.data();
      const activeJourneys: string[] = leadData.activeJourneys || [];

      for (const journeyId of activeJourneys) {
        // Fetch state document
        const stateRef = leadDoc.ref.collection('journey_states').doc(journeyId);
        const stateDoc = await stateRef.get();
        let state = stateDoc.data();

        // Fetch Journey definition
        const journeySnap = await db.collection('Journeys').doc(journeyId).get();
        if (!journeySnap.exists) {
          console.warn(`[Nurture] Journey ${journeyId} not found. Skipping.`);
          continue;
        }

        const journey = journeySnap.data();
        if (!journey || journey.status !== 'active') {
          continue;
        }

        // If no state, initialize at the start node (usually the trigger node)
        if (!state) {
          const startNode = journey.nodes?.find((n: any) => n.type === 'trigger');
          if (!startNode) {
            console.error(`[Nurture] Journey ${journeyId} has no trigger node.`);
            continue;
          }

          // Find first step after trigger
          const firstEdge = journey.edges?.find((e: any) => e.source === startNode.id);
          const initialNodeId = firstEdge ? firstEdge.target : startNode.id;

          state = {
            leadId,
            journeyId,
            status: 'active',
            currentNodeId: initialNodeId,
            entryTime: nowStr,
            lastExecutionTime: nowStr,
            executionHistory: [
              {
                nodeId: startNode.id,
                nodeType: 'trigger',
                executedAt: nowStr,
                actionResult: 'Journey initialized.'
              }
            ]
          };
          await stateRef.set(state);
        }

        if (state.status !== 'active') {
          continue;
        }

        leadsProcessed++;
        let currentNode = journey.nodes?.find((n: any) => n.id === state.currentNodeId);
        if (!currentNode) {
          console.error(`[Nurture] Current node ${state.currentNodeId} not found in Journey.`);
          continue;
        }

        // Process loop to handle immediate node traversals (like conditions)
        let traversalCount = 0;
        const maxTraversals = 5; // Prevent infinite loops
        let stateUpdated = false;

        while (currentNode && traversalCount < maxTraversals) {
          traversalCount++;

          if (currentNode.type === 'wait') {
            const config = currentNode.config || {};
            const duration = parseFloat(config.duration || '0');
            const unit = config.unit || 'days'; // 'hours' or 'days'

            const lastExec = new Date(state.lastExecutionTime).getTime();
            const delayMs = unit === 'hours' ? duration * 3600000 : duration * 86400000;

            if (now.getTime() - lastExec >= delayMs) {
              // Time elapsed! Find next node
              const nextEdge = journey.edges?.find((e: any) => e.source === currentNode.id);
              if (nextEdge) {
                state.currentNodeId = nextEdge.target;
                state.lastExecutionTime = nowStr;
                state.executionHistory.push({
                  nodeId: currentNode.id,
                  nodeType: 'wait',
                  executedAt: nowStr,
                  actionResult: `Wait of ${duration} ${unit} completed.`
                });
                stateUpdated = true;
                currentNode = journey.nodes?.find((n: any) => n.id === state.currentNodeId);
                continue; // Evaluate next node immediately
              } else {
                // End of journey path
                state.status = 'completed';
                state.executionHistory.push({
                  nodeId: currentNode.id,
                  nodeType: 'wait',
                  executedAt: nowStr,
                  actionResult: 'End of path reached after wait.'
                });
                stateUpdated = true;
                break;
              }
            } else {
              // Still waiting
              break;
            }
          }

          if (currentNode.type === 'condition') {
            const config = currentNode.config || {};
            const conditionField = config.field || 'bucket';
            const conditionValue = config.value;

            // Evaluate condition
            const leadVal = leadData[conditionField];
            const isMatch = String(leadVal).toLowerCase().trim() === String(conditionValue).toLowerCase().trim();

            // Find matching edge
            const matchingEdge = journey.edges?.find((e: any) => {
              if (e.source !== currentNode!.id) return false;
              // If condition matches, look for edge labeled 'true' or 'match'. Otherwise 'false' or 'no-match'
              const cond = e.condition || 'true';
              return isMatch ? (cond === 'true' || cond === 'match') : (cond === 'false' || cond === 'no-match');
            });

            if (matchingEdge) {
              state.currentNodeId = matchingEdge.target;
              state.executionHistory.push({
                nodeId: currentNode.id,
                nodeType: 'condition',
                executedAt: nowStr,
                actionResult: `Condition evaluated: ${conditionField} == ${conditionValue} (${isMatch ? 'Match' : 'No Match'})`
              });
              stateUpdated = true;
              currentNode = journey.nodes?.find((n: any) => n.id === state.currentNodeId);
              continue; // Move immediately to next node
            } else {
              // Fallback default edge
              const defaultEdge = journey.edges?.find((e: any) => e.source === currentNode!.id);
              if (defaultEdge) {
                state.currentNodeId = defaultEdge.target;
                stateUpdated = true;
                currentNode = journey.nodes?.find((n: any) => n.id === state.currentNodeId);
                continue;
              }
              break;
            }
          }

          if (currentNode.type === 'action') {
            const config = currentNode.config || {};
            const actionType = config.actionType; // 'email' | 'sms'

            if (actionType === 'email') {
              const templateId = config.templateId;
              const templateDoc = await db.collection('marketing_templates').doc(templateId).get();

              if (!templateDoc.exists) {
                console.error(`[Nurture] Template ${templateId} not found.`);
                break;
              }

              const templateData = templateDoc.data();
              let bodyHtml = templateData?.body || '';
              const subject = templateData?.subject || 'Outbound Drip';

              // 1. Personalize general variables
              bodyHtml = bodyHtml.replace(/\{\{Contact\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
              bodyHtml = bodyHtml.replace(/\{\{Company\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
              bodyHtml = bodyHtml.replace(/\{\{SalesRep\.Name\}\}/gi, leadData.salesRepAssigned || 'MailPlus Team');

              // 2. Personalize and inject any Action Buttons
              // We search for action buttons defined in the journey to resolve them
              const actionNodes = journey.nodes?.filter((n: any) => n.type === 'action_button') || [];
              const urlObj = new URL(request.url);
              const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

              for (const actNode of actionNodes) {
                const actConfig = actNode.config || {};
                const buttonTag = `{{Journey.${actNode.id}}}`;
                const triggerUrl = `${baseUrl}/api/nurture/action-trigger?leadId=${leadId}&journeyId=${journeyId}&nodeId=${actNode.id}&redirect=${encodeURIComponent(actConfig.redirectUrl || baseUrl)}`;
                
                bodyHtml = bodyHtml.replace(new RegExp(buttonTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), triggerUrl);
              }

              // Route SMTP
              const fallbackSender = 'info@mailplus.com.au';
              const repAssigned = (leadData.salesRepAssigned || '').trim().toLowerCase();
              let sender = fallbackSender;
              if (repAssigned === 'lee russell') {
                sender = 'lee.russell@mailplus.com.au';
              } else if (repAssigned === 'kerina helliwell') {
                sender = 'kerina.helliwell@mailplus.com.au';
              } else if (repAssigned === 'luke forbes') {
                sender = 'luke.forbes@mailplus.com.au';
              }

              const recipientEmail = leadData.customerServiceEmail;
              if (!recipientEmail) {
                console.warn(`[Nurture] Lead ${leadId} has no customerServiceEmail. Skipping email step.`);
                break;
              }

              const sendResult = await sendPhysicalEmail({
                to: recipientEmail,
                subject,
                html: bodyHtml,
                customFrom: sender
              });

              // Log delivery record
              await db.collection('campaign_deliveries').add({
                campaignId: journeyId,
                leadId,
                leadEmail: recipientEmail,
                companyName: leadData.companyName || 'Unknown',
                sentAt: nowStr,
                status: sendResult.success ? (sendResult.simulated ? 'simulated' : 'delivered') : 'failed',
                subject,
                isNurture: true
              });

              // Log Activity on the Lead
              await leadDoc.ref.collection('activity').add({
                type: 'Email',
                date: nowStr,
                notes: `Nurture email dispatched: '${subject}'. Status: ${sendResult.success ? 'Delivered' : 'Failed'}.`,
                author: 'Nurture Campaign Engine'
              });

              actionsExecuted++;
            } else if (actionType === 'sms') {
              const smsMessage = config.smsMessage || '';
              // Log simulated SMS sending
              await leadDoc.ref.collection('activity').add({
                type: 'Update',
                date: nowStr,
                notes: `Nurture SMS dispatched: '${smsMessage.substring(0, 50)}...'`,
                author: 'Nurture Campaign Engine'
              });
              actionsExecuted++;
            }

            // Move to next step
            const nextEdge = journey.edges?.find((e: any) => e.source === currentNode!.id);
            if (nextEdge) {
              state.currentNodeId = nextEdge.target;
              state.lastExecutionTime = nowStr;
              state.executionHistory.push({
                nodeId: currentNode.id,
                nodeType: 'action',
                executedAt: nowStr,
                actionResult: `Action '${actionType}' completed.`
              });
              stateUpdated = true;
              currentNode = journey.nodes?.find((n: any) => n.id === state.currentNodeId);
              continue;
            } else {
              state.status = 'completed';
              state.executionHistory.push({
                nodeId: currentNode.id,
                nodeType: 'action',
                executedAt: nowStr,
                actionResult: `Action '${actionType}' completed. End of journey.`
              });
              stateUpdated = true;
              break;
            }
          }

          if (currentNode.type === 'end_action') {
            const config = currentNode.config || {};
            const { newStatus, newBucket, reassignUser, reassignRole } = config;

            const updates: Record<string, any> = {};
            let logs = `Nurture Campaign completed.`;

            if (newStatus) {
              updates.status = newStatus;
              logs += ` Status updated to '${newStatus}'.`;
            }
            if (newBucket) {
              updates.bucket = newBucket;
              logs += ` Bucket updated to '${newBucket}'.`;
            }
            if (reassignUser) {
              if (reassignRole === 'Sales Rep') {
                updates.salesRepAssigned = reassignUser;
              } else if (reassignRole === 'Account Manager') {
                updates.accountManagerAssigned = reassignUser;
              } else if (reassignRole === 'Dialer') {
                updates.dialerAssigned = reassignUser;
              } else {
                updates.accountManagerAssigned = reassignUser;
              }
              logs += ` Reassigned to ${reassignRole} '${reassignUser}'.`;
            }

            if (Object.keys(updates).length > 0) {
              await leadDoc.ref.update(updates);
            }

            // Log completion activity
            await leadDoc.ref.collection('activity').add({
              type: 'Update',
              date: nowStr,
              notes: logs,
              author: 'Nurture Campaign Engine'
            });

            state.status = 'completed';
            state.executionHistory.push({
              nodeId: currentNode.id,
              nodeType: 'end_action',
              executedAt: nowStr,
              actionResult: `Campaign rules executed: ${logs}`
            });

            stateUpdated = true;
            break;
          }

          // If node doesn't match any known types, exit
          break;
        }

        // If journey complete, clean up lead's activeJourneys array
        if (state.status === 'completed' || state.status === 'stopped') {
          await leadDoc.ref.update({
            activeJourneys: FieldValue.arrayRemove(journeyId)
          });
        }

        if (stateUpdated) {
          await stateRef.set(state, { merge: true });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Nurture run completed. Processed ${leadsProcessed} lead journey evaluations. Executed ${actionsExecuted} actions.`
    });

  } catch (error: any) {
    console.error('[Nurture Process Engine] Failure:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
