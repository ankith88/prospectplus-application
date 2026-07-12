import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { sendAutomatedEmail } from './services/emailDispatcher';

export const onLeadUpdated = functions
  .region('australia-southeast1')
  .firestore.document('leads/{leadId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const db = admin.firestore();

    try {
      // Generate generalBookingUrlId if missing and AM/Sales Rep is assigned
      if (!afterData.generalBookingUrlId) {
        const amName = afterData.accountManagerAssigned || afterData.salesRepAssigned;
        if (amName) {
          const { v4: uuidv4 } = require('uuid');
          const updates: any = {
            generalBookingUrlId: uuidv4()
          };
          if (!afterData.accountManagerAssigned && afterData.salesRepAssigned) {
            updates.accountManagerAssigned = afterData.salesRepAssigned;
            updates.bucket = 'account_manager';
          }
          await change.after.ref.update(updates);
          Object.assign(afterData, updates);
        }
      }

      // If a lead is marked as 'Lost', stop all active nurture journeys
      if ((afterData.status === 'Lost' || afterData.status === 'Lost Customer') && beforeData.status !== afterData.status) {
        const currentActive: string[] = afterData.activeJourneys || [];
        if (currentActive.length > 0) {
          for (const oldJourneyId of currentActive) {
            try {
              await db.collection('leads')
                .doc(context.params.leadId)
                .collection('journey_states')
                .doc(oldJourneyId)
                .update({
                  status: 'stopped',
                  lastExecutionTime: new Date().toISOString()
                });
            } catch (e) {
              // Document might not exist
            }
          }
          
          await change.after.ref.update({
            activeJourneys: [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          await db.collection('leads').doc(context.params.leadId).collection('activity').add({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `All active nurture journeys were stopped because the lead was marked as ${afterData.status}.`,
            author: 'System Automation'
          });
          
          functions.logger.info(`Stopped all nurture journeys for lead ${context.params.leadId} as it was marked as ${afterData.status}`);
        }
        
        return null; // Stop further processing for enrollment
      }

      // Fetch all active nurture journeys
      const journeysSnapshot = await db.collection('Journeys').where('status', '==', 'active').get();
      
      let newJourneyId: string | null = null;
      let newJourneyName: string | null = null;
      let cancelOtherJourneys = false;
      let matchedGroupDetails: any = null;

      const evaluateCondition = (cond: any, leadData: any) => {
        if (!cond.field || cond.value === undefined) return false;
        
        if (cond.field === 'localMileJobCount') {
          return Number(cond.value) === Number(leadData.jobCount || 0);
        }

        if (cond.field === 'localMileTermsAccepted') {
          const isAccepted = leadData.localMileTermsAccepted === true || String(leadData.localMileTermsAccepted).toLowerCase() === 'true';
          const targetValue = cond.value === true || String(cond.value).toLowerCase() === 'true';
          return isAccepted === targetValue;
        }
        
        return String(cond.value).toLowerCase().trim() === String(leadData[cond.field] || '').toLowerCase().trim();
      };

      for (const journeyDoc of journeysSnapshot.docs) {
        if (newJourneyId) break; // Only trigger one new journey enrollment per update

        const journeyData = journeyDoc.data();
        const triggerNode = journeyData.nodes?.find((n: any) => n.type === 'trigger');
        
        if (triggerNode?.config?.autoEnroll) {
          let groups = triggerNode.config.enrollConditionGroups;
          
          // Fallback for older single condition format
          if (!groups && triggerNode.config.enrollField && triggerNode.config.enrollValue) {
            groups = [{
              conditions: [{
                field: triggerNode.config.enrollField,
                value: triggerNode.config.enrollValue
              }]
            }];
          }

          if (groups && groups.length > 0) {
            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              if (!group.conditions || group.conditions.length === 0) continue;

              let allConditionsMetNow = true;
              let wasMetBefore = true;
              let hasChangedCondition = false;
              
              for (const cond of group.conditions) {
                const metNow = evaluateCondition(cond, afterData);
                const metBefore = evaluateCondition(cond, beforeData);
                
                if (!metNow) {
                  allConditionsMetNow = false;
                }
                if (!metBefore) {
                  wasMetBefore = false;
                }
                
                // Did the field value change in this update?
                if (String(beforeData[cond.field] || '') !== String(afterData[cond.field] || '')) {
                  hasChangedCondition = true;
                }
              }
              
              // Only enroll if conditions are met now, and they either weren't met before,
              // OR one of the condition fields just changed (triggering the enrollment rule).
              if (allConditionsMetNow && (!wasMetBefore || hasChangedCondition)) {
                newJourneyId = journeyDoc.id;
                newJourneyName = journeyData.name || 'Unnamed Journey';
                cancelOtherJourneys = !!triggerNode.config.cancelOtherJourneys;
                matchedGroupDetails = group;
                break; // Found a matching group
              }
            }
          }
        }
      }
      
      if (newJourneyId) {
        const currentActive: string[] = afterData.activeJourneys || [];
        
        // Prevent re-enrolling if already actively enrolled in this exact journey
        if (!currentActive.includes(newJourneyId)) {
          let journeysToKeep = [...currentActive];
          
          if (cancelOtherJourneys) {
            journeysToKeep = [newJourneyId];
            
            // Mark previously active journey states as stopped
            for (const oldJourneyId of currentActive) {
              if (oldJourneyId !== newJourneyId) {
                try {
                  await db.collection('leads')
                    .doc(context.params.leadId)
                    .collection('journey_states')
                    .doc(oldJourneyId)
                    .update({
                      status: 'stopped',
                      lastExecutionTime: new Date().toISOString()
                    });
                } catch (e) {
                  // Document might not exist if it was just pending
                }
              }
            }
          } else {
            journeysToKeep.push(newJourneyId);
          }
          
          await change.after.ref.update({
            activeJourneys: journeysToKeep,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Log activity
          const conditionNotes = matchedGroupDetails.conditions.map((c: any) => `${c.field} = ${c.value}`).join(' AND ');

          await db.collection('leads').doc(context.params.leadId).collection('activity').add({
            type: 'Update',
            date: new Date().toISOString(),
            notes: `Lead automatically enrolled in journey: ${newJourneyName} due to matching conditions: [${conditionNotes}].${cancelOtherJourneys ? ' Other active journeys were cancelled.' : ''}`,
            author: 'System Automation'
          });

          functions.logger.info(`Lead ${context.params.leadId} enrolled in Nurture Journey: ${newJourneyName}`);
        }
      }
    } catch (error) {
      functions.logger.error(`Error processing dynamic auto-enrollment for lead ${context.params.leadId}:`, error);
    }
    
    return null;
  });

function generateRandomAlphanumeric(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getUniqueProspectPlusId(db: admin.firestore.Firestore): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `MP${generateRandomAlphanumeric(6)}`;
    const leadsSnap = await db.collection('leads').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!leadsSnap.empty) continue;
    const companiesSnap = await db.collection('companies').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!companiesSnap.empty) continue;
    unique = true;
  }
  return candidate;
}

export const onLeadCreated = functions
  .region('australia-southeast1')
  .firestore.document('leads/{leadId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const db = admin.firestore();
    const updates: any = {};
    
    if (!data.prospectPlusId) {
      const uniqueId = await getUniqueProspectPlusId(db);
      updates.prospectPlusId = uniqueId;
      functions.logger.info(`Assigned Prospect+ ID ${uniqueId} to lead ${context.params.leadId}`);
    }

    let am = data.accountManagerAssigned;
    if (!am) {
      am = Math.random() < 0.5 ? 'Lee Russell' : 'Kerina Helliwell';
      updates.accountManagerAssigned = am;
      updates.salesRepAssigned = am;
      functions.logger.info(`Assigned AM/SalesRep ${am} to new lead ${context.params.leadId}`);
    }

    if (!data.generalBookingUrlId) {
      const { v4: uuidv4 } = require('uuid');
      updates.generalBookingUrlId = uuidv4();
      functions.logger.info(`Generated generalBookingUrlId for new lead ${context.params.leadId}`);
    }

    if (Object.keys(updates).length > 0) {
      await snap.ref.update(updates);
    }
    return null;
  });

export const onCompanyCreated = functions
  .region('australia-southeast1')
  .firestore.document('companies/{companyId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.prospectPlusId) return null;
    
    const db = admin.firestore();
    // Check if there is an existing lead with the same document ID that already has a Prospect+ ID
    const leadDoc = await db.collection('leads').doc(context.params.companyId).get();
    let uniqueId = '';
    if (leadDoc.exists && leadDoc.data()?.prospectPlusId) {
      uniqueId = leadDoc.data()?.prospectPlusId;
    } else {
      uniqueId = await getUniqueProspectPlusId(db);
    }
    
    await snap.ref.update({ prospectPlusId: uniqueId });
    functions.logger.info(`Assigned Prospect+ ID ${uniqueId} to company ${context.params.companyId}`);
    return null;
  });

export const assignProspectPlusIdsFallback = functions
  .region('australia-southeast1')
  .pubsub.schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Check leads
    try {
      const leadsSnap1 = await db.collection('leads').orderBy('createdAt', 'desc').limit(100).get();
      const leadsSnap2 = await db.collection('leads').orderBy('dateCreated', 'desc').limit(100).get();
      
      const seenLeads = new Set<string>();
      const combinedDocs = [];
      
      for (const doc of [...leadsSnap1.docs, ...leadsSnap2.docs]) {
        if (!seenLeads.has(doc.id)) {
          seenLeads.add(doc.id);
          combinedDocs.push(doc);
        }
      }

      for (const doc of combinedDocs) {
        const data = doc.data();
        if (!data.prospectPlusId) {
          const uniqueId = await getUniqueProspectPlusId(db);
          await doc.ref.update({ prospectPlusId: uniqueId });
          functions.logger.info(`Fallback: Assigned Prospect+ ID ${uniqueId} to lead ${doc.id}`);
        }
      }
    } catch (e) {
      functions.logger.error('Fallback sync failed for leads:', e);
    }
    
    // Check companies
    try {
      const companiesSnap = await db.collection('companies').orderBy('createdAt', 'desc').limit(100).get();
      for (const doc of companiesSnap.docs) {
        const data = doc.data();
        if (!data.prospectPlusId) {
          const leadDoc = await db.collection('leads').doc(doc.id).get();
          let uniqueId = '';
          if (leadDoc.exists && leadDoc.data()?.prospectPlusId) {
            uniqueId = leadDoc.data()?.prospectPlusId;
          } else {
            uniqueId = await getUniqueProspectPlusId(db);
          }
          await doc.ref.update({ prospectPlusId: uniqueId });
          functions.logger.info(`Fallback: Assigned Prospect+ ID ${uniqueId} to company ${doc.id}`);
        }
      }
    } catch (e) {
      functions.logger.error('Fallback sync failed for companies:', e);
    }
    return null;
  });

/**
 * Core logic to generate daily website leads report, build email, and dispatch it.
 */
export async function runWebsiteLeadsReport(dateString: string, recipients: string[]): Promise<any> {
  const db = admin.firestore();
  functions.logger.info(`Generating website leads report for date: ${dateString}`);

  // Parse target date (yesterday)
  // dateString is DD-MM-YYYY
  const [day, month, year] = dateString.split("-").map(Number);
  
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const dateCreatedString = `${dayStr}/${monthStr}/${year}`;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // 1. Query by dateCreated (DD/MM/YYYY exact match)
  const q1 = await db.collection("leads").where("dateCreated", "==", dateCreatedString).get();

  // 2. Query by createdAt (ISO string range)
  const q2 = await db.collection("leads").where("createdAt", ">=", threeDaysAgo.toISOString()).get();

  // 3. Query by createdAt (Timestamp range)
  const q3 = await db.collection("leads").where("createdAt", ">=", admin.firestore.Timestamp.fromDate(threeDaysAgo)).get();

  // Combine and deduplicate
  const allLeadsMap = new Map();
  q1.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
  q2.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
  q3.docs.forEach(doc => allLeadsMap.set(doc.id, doc.data()));
  const allLeads = Array.from(allLeadsMap.values());

  // Filter yesterday's website leads
  const targetStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const targetEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  const filteredLeads = allLeads.filter(lead => {
    // 1. Check Source (Website)
    const source = (lead.source || lead.leadSource || lead.customerSource || "").toLowerCase();
    if (!source.includes("website")) return false;

    // 2. Check Date Match
    // Case A: dateCreated matches DD/MM/YYYY exactly
    if (lead.dateCreated === dateCreatedString) return true;

    // Case B: createdAt falls within the target Date range
    if (lead.createdAt) {
      let createdDate: Date;
      if (typeof lead.createdAt.toDate === "function") {
        createdDate = lead.createdAt.toDate();
      } else {
        createdDate = new Date(lead.createdAt);
      }
      if (createdDate >= targetStart && createdDate <= targetEnd) {
        return true;
      }
    }

    // Case C: dateLeadEntered matches target date range or is in DD/MM/YYYY
    if (lead.dateLeadEntered) {
      if (lead.dateLeadEntered.includes("/")) {
        const [d, m, y] = lead.dateLeadEntered.split("/");
        if (d && m && y) {
          const enteredDate = new Date(Number(y), Number(m) - 1, Number(d));
          if (enteredDate.getDate() === day && (enteredDate.getMonth() + 1) === month && enteredDate.getFullYear() === year) {
            return true;
          }
        }
      } else {
        const enteredDate = new Date(lead.dateLeadEntered);
        if (!isNaN(enteredDate.getTime()) && enteredDate >= targetStart && enteredDate <= targetEnd) {
          return true;
        }
      }
    }

    return false;
  });

  // Aggregate counts by accountManagerAssigned and franchisee
  const amCounts: Record<string, number> = {};
  const franchiseeCounts: Record<string, number> = {};

  filteredLeads.forEach(l => {
    const am = l.accountManagerAssigned || "Unassigned AM";
    amCounts[am] = (amCounts[am] || 0) + 1;

    const fran = l.franchisee || "Unassigned Franchisee";
    franchiseeCounts[fran] = (franchiseeCounts[fran] || 0) + 1;
  });

  const amReport = Object.entries(amCounts)
    .map(([am, count]) => ({ am, count }))
    .sort((a, b) => b.count - a.count);

  const franReport = Object.entries(franchiseeCounts)
    .map(([fran, count]) => ({ fran, count }))
    .sort((a, b) => b.count - a.count);

  // Construct Email HTML template adhering to outbound email templates rules
  const leadRowsHtml = filteredLeads.length > 0
    ? filteredLeads.map(l => {
        const addressParts = [
          (l.street || "").trim(),
          (l.city || "").trim(),
          (l.state || "").trim(),
          (l.zip || "").trim()
        ].filter(Boolean);
        const address = addressParts.join(", ") || "N/A";

        return `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${l.companyName || 'Unknown Company'}</strong></td>
          <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${address}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #4a5568; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${l.franchisee || 'Unassigned'}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No website leads were created yesterday.</td></tr>`;

  const amRowsHtml = amReport.length > 0
    ? amReport.map(r => `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.am}</strong></td>
          <td align="right" style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No AM data.</td></tr>`;

  const franRowsHtml = franReport.length > 0
    ? franReport.map(r => `
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><strong>${r.fran}</strong></td>
          <td align="right" style="padding: 8px 12px; font-size: 13px; color: #2d3748; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: bold;">${r.count}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif;">No Franchisee data.</td></tr>`;

  const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Daily Website Leads Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f8; -webkit-text-size-adjust: 100%;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <tr>
      <td align="center">
        <table align="center" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; border-collapse: separate;">
          <!-- Banner Logo -->
          <tr>
            <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 25px; background-color: #ffffff;">
              <h2 style="margin: 0 0 10px; font-size: 20px; color: #095c7b; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700;">Daily Website Leads Report</h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568; line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Here is the daily summary of leads created with source <strong>Website</strong> yesterday (<strong>${dateString}</strong>).
              </p>
              
              <div style="margin-bottom: 25px; padding: 15px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #475569; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                  Total Website Leads Created: <strong style="color: #095c7b; font-size: 15px;">${filteredLeads.length}</strong>
                </p>
              </div>

              <!-- List of leads -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads List</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Company</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Address</th>
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                  </tr>
                </thead>
                <tbody>
                  ${leadRowsHtml}
                </tbody>
              </table>

              <!-- AM Breakdown -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads by Assigned Account Manager</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Account Manager</th>
                    <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold; width: 80px;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${amRowsHtml}
                </tbody>
              </table>

              <!-- Franchisee Breakdown -->
              <h3 style="margin: 25px 0 10px; font-size: 16px; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 6px; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 600;">Leads by Assigned Franchisee</h3>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f7fafc; border-bottom: 2px solid #edf2f7;">
                    <th align="left" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold;">Franchisee</th>
                    <th align="right" style="padding: 8px 12px; font-size: 11px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; text-transform: uppercase; font-weight: bold; width: 80px;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${franRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
              </p>
              <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                Powered by MailPlus Australia
              </p>
              <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
                &copy; 2026 MailPlus. All rights reserved. <br />
                If you no longer wish to receive marketing communications, you can&nbsp;
                <a href="{{unsubscribe_link}}" style="color: #095c7b; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const toStr = recipients.join(", ");
  const result = await sendAutomatedEmail({
    to: toStr,
    subject: `Daily Website Leads Report - ${dateString}`,
    html: emailHtml
  });

  return {
    success: result.success,
    simulated: result.simulated,
    totalLeads: filteredLeads.length,
    emailHtml
  };
}

/**
 * Scheduled Cloud Function that runs daily at 6:15 AM Sydney time.
 */
export const sendDailyWebsiteLeadsReport = functions
  .region("australia-southeast1")
  .pubsub.schedule("0 * * * *")
  .timeZone("Australia/Sydney")
  .onRun(async (context) => {
    functions.logger.info("Executing scheduled sendDailyWebsiteLeadsReport function...");

    const db = admin.firestore();
    let recipients = ["ankith.ravindran@mailplus.com.au", "alexandra.bathman@mailplus.com.au"];
    let frequency = "06:00"; // Default to 6 AM Sydney Time

    try {
      const configDoc = await db.collection("settings").doc("daily_website_leads_report").get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data) {
          if (Array.isArray(data.recipients) && data.recipients.length > 0) {
            recipients = data.recipients;
          }
          if (data.frequency) {
            frequency = data.frequency;
          }
        }
      }
    } catch (err) {
      functions.logger.error("Failed to load recipients list", err);
    }

    if (frequency === "disabled") {
      functions.logger.info("Daily website leads report is disabled. Skipping execution.");
      return;
    }

    // Check current hour in Sydney
    const sydneyHourStr = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hour12: false
    }).format(new Date());

    const currentHour = parseInt(sydneyHourStr, 10);
    const targetHour = parseInt(frequency.split(":")[0], 10);

    if (currentHour !== targetHour) {
      functions.logger.info(`Current Sydney hour is ${currentHour}, target hour is ${targetHour}. Skipping execution.`);
      return;
    }

    const sydneyFormatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const now = new Date();
    now.setDate(now.getDate() - 1); // Yesterday

    const parts = sydneyFormatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;

    const dateString = `${day}-${month}-${year}`;

    try {
      await runWebsiteLeadsReport(dateString, recipients);
    } catch (err) {
      functions.logger.error("Error executing daily website leads report:", err);
    }
  });

