import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPhysicalEmail } from '@/lib/email-dispatcher';
import { sendSms } from '@/services/sms-service';

const db = getFirestore(adminApp);

function isSendTimeReached(lastExecTimeStr: string, sendTimeConfig: string): boolean {
  if (!sendTimeConfig || sendTimeConfig === 'any') return true;
  
  const [targetHour, targetMin] = sendTimeConfig.split(':').map(Number);
  const now = new Date();
  
  // Get current date/time in Sydney timezone
  const sydneyNow = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const sydneyTarget = new Date(sydneyNow);
  sydneyTarget.setHours(targetHour, targetMin, 0, 0);
  
  const lastExecSydney = new Date(new Date(lastExecTimeStr).toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  
  // If the last execution (when we arrived at this step) was after today's target time,
  // then wait until tomorrow.
  if (lastExecSydney.getTime() > sydneyTarget.getTime()) {
    sydneyTarget.setDate(sydneyTarget.getDate() + 1);
  }
  
  return sydneyNow.getTime() >= sydneyTarget.getTime();
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    // For local development or cron triggers
    // In production, you'd verify a secret token or App Check token
    console.log('[Nurture Process Engine] Triggered execution run.');

    const now = new Date();
    const nowStr = now.toISOString();

    let targetLeadId: string | null = null;
    let forceExecute = false;
    let targetJourneyId: string | null = null;
    try {
      const body = await request.json();
      targetLeadId = body?.leadId || null;
      forceExecute = !!body?.forceExecute;
      targetJourneyId = body?.journeyId || null;
    } catch (e) {}

    // 1. Fetch leads with active journeys
    let docs: any[] = [];
    if (targetLeadId) {
      const leadDoc = await db.collection('leads').doc(targetLeadId).get();
      if (leadDoc.exists && (leadDoc.data()?.activeJourneys?.length || 0) > 0) {
        docs = [leadDoc];
      }
    } else {
      const leadsSnap = await db.collection('leads')
        .where('activeJourneys', '!=', [])
        .get();
      docs = leadsSnap.docs;
    }

    if (docs.length === 0) {
      return NextResponse.json({ success: true, message: 'No leads in active nurture campaigns.' });
    }

    let leadsProcessed = 0;
    let actionsExecuted = 0;

    for (const leadDoc of docs) {
      const leadId = leadDoc.id;
      const leadData = leadDoc.data();
      const activeJourneys: string[] = leadData.activeJourneys || [];

      for (const journeyId of activeJourneys) {
        if (targetJourneyId && journeyId !== targetJourneyId) {
          continue;
        }

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

            if (now.getTime() - lastExec >= delayMs || forceExecute) {
              // Time elapsed! Find next node
              const nextEdge = journey.edges?.find((e: any) => e.source === currentNode.id);
              if (nextEdge) {
                state.currentNodeId = nextEdge.target;
                state.lastExecutionTime = nowStr;
                state.executionHistory.push({
                  nodeId: currentNode.id,
                  nodeType: 'wait',
                  executedAt: nowStr,
                  actionResult: `Wait of ${duration} ${unit} completed.${forceExecute ? ' (Manually Bypassed)' : ''}`
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

            // Weekdays-only constraint (Sydney Timezone)
            if (config.weekdaysOnly && !forceExecute) {
              const sydneyNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
              const day = sydneyNow.getDay(); // 0 = Sunday, 6 = Saturday
              if (day === 0 || day === 6) {
                // Skip execution for now, evaluate on next run
                break;
              }
            }

            const sendTime = config.sendTime;

            if (sendTime && sendTime !== 'any') {
              if (!isSendTimeReached(state.lastExecutionTime, sendTime) && !forceExecute) {
                // Not the right time to send yet. Keep on this node and break.
                break;
              }
            }

            const actionType = config.actionType; // 'email' | 'sms'

            // 1. Personalize general variables
            let contactName = 'Valued Customer';
            let contactFirstName = 'Valued Customer';
            let localMilePlusAuthLink = '';
            let contactPhone = leadData.customerPhone || leadData.mobile || '';
            let recipientEmail = leadData.customerServiceEmail;
            
            try {
              const contactsSnap = await leadDoc.ref.collection('contacts').limit(1).get();
              if (!contactsSnap.empty) {
                const firstContact = contactsSnap.docs[0].data();
                if (firstContact.name) {
                  contactName = firstContact.name;
                  contactFirstName = firstContact.name.split(' ')[0];
                }
                if (firstContact.localMilePlusAuthLink) {
                  localMilePlusAuthLink = firstContact.localMilePlusAuthLink;
                }
                if (firstContact.phone || firstContact.mobile) {
                  contactPhone = firstContact.phone || firstContact.mobile;
                }
                if (firstContact.email) {
                  recipientEmail = firstContact.email;
                }
              }
            } catch (e) {
              console.error('Error fetching contact for nurture action:', e);
            }

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

              bodyHtml = bodyHtml.replace(/\{\{Contact\.Name\}\}/gi, contactName !== 'Valued Customer' ? contactName : (leadData.companyName || 'Valued Customer'));
              bodyHtml = bodyHtml.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
              bodyHtml = bodyHtml.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/gi, localMilePlusAuthLink);
              bodyHtml = bodyHtml.replace(/\{\{Company\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
              bodyHtml = bodyHtml.replace(/\{\{SalesRep\.Name\}\}/gi, leadData.salesRepAssigned || 'MailPlus Team');

              // 2. Personalize and inject any Action Buttons
              // We search for action buttons defined in the journey to resolve them
              const actionNodes = journey.nodes?.filter((n: any) => n.type === 'action_button') || [];
              let baseUrl = 'https://prospectplus.com.au';
              try {
                const urlObj = new URL(request.url || '', baseUrl);
                baseUrl = `${urlObj.protocol}//${urlObj.host}`;
              } catch(e) {}

              for (const actNode of actionNodes) {
                const actConfig = actNode.config || {};
                const buttonTag = `{{Journey.${actNode.id}}}`;
                const triggerUrl = `${baseUrl}/api/nurture/action-trigger?leadId=${leadId}&journeyId=${journeyId}&nodeId=${actNode.id}&redirect=${encodeURIComponent(actConfig.redirectUrl || baseUrl)}`;
                
                bodyHtml = bodyHtml.replace(new RegExp(buttonTag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), triggerUrl);
              }

              // Route SMTP dynamically or use custom static email
              let sender = 'info@mailplus.com.au';
              const fromEmailMode = config.fromEmailMode || 'dynamic';
              if (fromEmailMode === 'static') {
                sender = config.customFromEmail || 'info@mailplus.com.au';
              } else {
                const fallbackSender = config.fallbackFromEmail || 'info@mailplus.com.au';
                const manager = (leadData.accountManagerAssigned || leadData.salesRepAssigned || '').trim().toLowerCase();
                sender = fallbackSender;
                if (manager === 'lee russell') {
                  sender = 'lee.russell@mailplus.com.au';
                } else if (manager === 'kerina helliwell') {
                  sender = 'kerina.helliwell@mailplus.com.au';
                } else if (manager === 'luke forbes') {
                  sender = 'luke.forbes@mailplus.com.au';
                } else if (manager) {
                  sender = `${manager.replace(/\s+/g, '.')}@mailplus.com.au`;
                }
              }

              if (!recipientEmail) {
                console.warn(`[Nurture] Lead ${leadId} has no recipient email. Skipping email step.`);
                break;
              }

              bodyHtml = bodyHtml.replace(/\{\{sender\.email\}\}/gi, sender);

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
              let smsMessage = config.smsMessage || '';
              
              if (config.smsTemplateId && config.smsTemplateId !== 'custom') {
                try {
                  const smsTemplateDoc = await db.collection('marketing_sms_templates').doc(config.smsTemplateId).get();
                  if (smsTemplateDoc.exists) {
                    const templateData = smsTemplateDoc.data();
                    if (templateData?.body) {
                      smsMessage = templateData.body;
                    }
                  }
                } catch (err) {
                  console.error(`[Nurture] Failed to fetch SMS template ${config.smsTemplateId}`, err);
                }
              }
              
              smsMessage = smsMessage.replace(/\{\{Contact\.Name\}\}/gi, contactName !== 'Valued Customer' ? contactName : (leadData.companyName || 'Valued Customer'));
              smsMessage = smsMessage.replace(/\{\{Contact\.FirstName\}\}/gi, contactFirstName);
              smsMessage = smsMessage.replace(/\{\{Contact\.LocalMilePlusAuthLink\}\}/gi, localMilePlusAuthLink);
              smsMessage = smsMessage.replace(/\{\{Company\.Name\}\}/gi, leadData.companyName || 'Valued Customer');
              smsMessage = smsMessage.replace(/\{\{SalesRep\.Name\}\}/gi, leadData.salesRepAssigned || 'MailPlus Team');

              if (!contactPhone) {
                console.warn(`[Nurture] Lead ${leadId} has no phone number. Skipping SMS step.`);
                break;
              }

              const sendResult = await sendSms(contactPhone, smsMessage);

              // Log delivery record
              await db.collection('campaign_deliveries').add({
                campaignId: journeyId,
                leadId,
                leadPhone: contactPhone,
                companyName: leadData.companyName || 'Unknown',
                sentAt: nowStr,
                status: sendResult.success ? 'delivered' : 'failed',
                errorMessage: sendResult.success ? null : sendResult.message,
                type: 'sms',
                isNurture: true
              });

              // Log Activity on the Lead
              await leadDoc.ref.collection('activity').add({
                type: 'SMS',
                date: nowStr,
                notes: `Nurture SMS dispatched: '${smsMessage.substring(0, 50)}...'. Status: ${sendResult.success ? 'Delivered' : 'Failed'}.`,
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

            if (config.deactivateLocalMilePlus) {
              try {
                const contactsSnap = await leadDoc.ref.collection('contacts').where('accessToLocalMile', '==', 'yes').limit(1).get();
                if (!contactsSnap.empty) {
                  const localMileContact = contactsSnap.docs[0].data();
                  if (localMileContact.email) {
                    const response = await fetch("https://us-central1-localmile-plus.cloudfunctions.net/deactivateExternalUserAccount", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-api-key": "f7d8c2e1b0a943ef8215d6c7b8a90123fe456789abcd0123456789abcdef0123"
                      },
                      body: JSON.stringify({
                        email: localMileContact.email,
                        customer_id: leadId
                      })
                    });
                    if (!response.ok) {
                      console.error("[Nurture] Failed to deactivate LocalMile user account", await response.text());
                      logs += ` Failed to deactivate LocalMile Plus account.`;
                    } else {
                      logs += ` Deactivated LocalMile Plus account for ${localMileContact.email}.`;
                    }
                  }
                }
              } catch (apiError) {
                console.error("[Nurture] Error calling deactivateExternalUserAccount", apiError);
                logs += ` Error deactivating LocalMile Plus account.`;
              }
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
