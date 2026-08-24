import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore as getProspectPlusDb } from 'firebase-admin/firestore';
import { getLpoConnectDb } from '@/lib/lpo-connect-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const prospectDb = getProspectPlusDb(adminApp);
    
    // Connect to mp-lpo-connect project, lpoconnect database
    const lpoConnectDb = getLpoConnectDb();

    // 1. Fetch all LPO leads from ProspectPlus
    const lpoLeadsSnap = await prospectDb.collection('lpo_leads').get();

    // 2. Fetch reference collections from lpoconnect DB
    const lposSnap = await lpoConnectDb.collection('lpo').get();
    const customersGroupSnap = await lpoConnectDb.collectionGroup('customers').get();
    const usersSnap = await lpoConnectDb.collection('users').get();
    
    // Fetch jobs, requests, and scheduled_jobs from lpoconnect DB
    const jobsSnap = await lpoConnectDb.collection('jobs').get();
    const requestsSnap = await lpoConnectDb.collection('requests').get();
    const scheduledJobsSnap = await lpoConnectDb.collection('scheduled_jobs').get();

    // Index LPO docs in lpoconnect DB
    const lpoDocIds = new Set<string>();
    const lpoDataMap = new Map<string, any>();
    lposSnap.docs.forEach(doc => {
      lpoDocIds.add(doc.id);
      lpoDataMap.set(doc.id, doc.data());
    });

    // Index users in lpoconnect DB by lpo_id
    const usersByLpoId = new Map<string, any[]>();
    usersSnap.docs.forEach(uDoc => {
      const u = uDoc.data();
      const lpoId = u.lpo_id ? String(u.lpo_id).trim() : '';
      if (lpoId) {
        const arr = usersByLpoId.get(lpoId) || [];
        arr.push({
          id: uDoc.id,
          email: u.email || '',
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          role: u.role || 'user',
          hasCompletedTour: Boolean(u.hasCompletedTour),
          lastLogin: u.lastLogin || null,
        });
        usersByLpoId.set(lpoId, arr);
      }
    });

    // Structure & index customers from lpoconnect DB
    const subcustomersByLpoId = new Map<string, any[]>();
    const subcustomerLookup = new Map<string, any>();

    customersGroupSnap.docs.forEach(cDoc => {
      const c = cDoc.data();
      const parentLpoId = c.lpoParentInternalID ? String(c.lpoParentInternalID).trim() : '';
      const companyId = c.companyId ? String(c.companyId).trim() : cDoc.id;
      const entityId = c.customerEntityId ? String(c.customerEntityId).trim() : '';

      const subcustObj = {
        id: cDoc.id,
        companyId: companyId,
        customerEntityId: entityId,
        companyName: c.companyName || c.company || 'Unnamed Subcustomer',
        status: c.status || 'Active',
        customerEmail: c.customerEmail || c.customerServiceEmail || c.email || '',
        customerPhone: c.customerPhone || c.phone || '',
        jobtype: c.jobtype || c.jobType || 'one-off',
        billing: c.billing || 'lpo',
        address: `${c.address1 || c.address || ''} ${c.city || c.suburb || ''} ${c.state || ''} ${c.zip || c.postcode || ''}`.trim(),
        ampoRate: String(c.lpoServiceAMPORate ?? '0'),
        pmpoRate: String(c.lpoServicePMPORate ?? '0'),
        packageRate: String(c.lpoServiceAMPOPMPORate ?? '0'),
        additionalBagRate: String(c.lpoServiceAdditionalBagRate ?? '0'),
        cancellationReason: c.cancellationReason || c.cancellationNotes || null,
        cancelledAt: c.cancelledAt ? (c.cancelledAt.seconds ? new Date(c.cancelledAt.seconds * 1000).toISOString() : String(c.cancelledAt)) : null,
        jobsCount: 0,
      };

      if (parentLpoId) {
        const arr = subcustomersByLpoId.get(parentLpoId) || [];
        arr.push(subcustObj);
        subcustomersByLpoId.set(parentLpoId, arr);

        subcustomerLookup.set(`${parentLpoId}_${companyId}`, subcustObj);
        if (entityId) subcustomerLookup.set(`${parentLpoId}_${entityId}`, subcustObj);
      }

      subcustomerLookup.set(companyId, subcustObj);
      if (entityId) subcustomerLookup.set(entityId, subcustObj);
    });

    // Map & index jobs/requests across subcustomers and LPOs
    const allJobDocs = [...jobsSnap.docs, ...requestsSnap.docs, ...scheduledJobsSnap.docs];
    const jobsByLpoId = new Map<string, number>();

    let totalJobsCount = 0;
    let scheduledJobsTotal = 0;
    let oneOffJobsTotal = 0;
    let lpoBilledJobsTotal = 0;
    let customerBilledJobsTotal = 0;

    allJobDocs.forEach(jDoc => {
      const j = jDoc.data();
      const jLpoId = j.lpo_id ? String(j.lpo_id).trim() : '';
      const custId = j.jobAcceptedCustInternalId ? String(j.jobAcceptedCustInternalId).trim() : (j.netsuiteCustomerId ? String(j.netsuiteCustomerId).trim() : '');

      if (jLpoId) {
        jobsByLpoId.set(jLpoId, (jobsByLpoId.get(jLpoId) || 0) + 1);
      }

      totalJobsCount++;

      const jobTypeStr = String(j.jobType || j.service || '').toLowerCase();
      if (jobTypeStr.includes('scheduled')) {
        scheduledJobsTotal++;
      } else {
        oneOffJobsTotal++;
      }

      const billingStr = String(j.billing || '').toLowerCase();
      if (billingStr === 'lpo') {
        lpoBilledJobsTotal++;
      } else {
        customerBilledJobsTotal++;
      }

      // Match with subcustomer
      let matchedSubcust: any = null;
      if (jLpoId && custId) {
        matchedSubcust = subcustomerLookup.get(`${jLpoId}_${custId}`);
      }
      if (!matchedSubcust && custId) {
        matchedSubcust = subcustomerLookup.get(custId);
      }

      if (matchedSubcust) {
        matchedSubcust.jobsCount++;
      }
    });

    // 3. Process LPO leads linked to a company
    const reportData: any[] = [];
    const allSubcustomersFlat: any[] = [];

    let totalLinkedLpos = 0;
    let lposWithLpoPlusAccess = 0;
    let totalSubcustomers = 0;
    let activeSubcustomers = 0;
    let cancelledSubcustomers = 0;
    let awaitingTncSubcustomers = 0;

    lpoLeadsSnap.docs.forEach(docSnap => {
      const lead = docSnap.data();
      const leadId = docSnap.id;

      const linkedLeadId = lead.linkedLeadId ? String(lead.linkedLeadId).trim() : '';
      const linkedCustomerId = lead.linkedCustomerId ? String(lead.linkedCustomerId).trim() : '';
      const lpoInternalId = lead.lpoInternalId ? String(lead.lpoInternalId).trim() : '';
      const linkedCompanyName = lead.linkedLeadCompanyName || lead.rawCustomerName || null;

      const hasLinkedCompany = Boolean(linkedLeadId || linkedCustomerId || linkedCompanyName);
      
      // Only include LPO leads that are linked with a company
      if (!hasLinkedCompany) return;

      totalLinkedLpos++;

      const targetLpoId = linkedLeadId || lpoInternalId;
      const hasAccess = Boolean(
        (targetLpoId && lpoDocIds.has(targetLpoId)) ||
        lead.status === 'LPO.Plus Logged In' ||
        lead.status === 'LPO.Plus Access Sent'
      );

      if (hasAccess) lposWithLpoPlusAccess++;

      const subcustomers = targetLpoId ? (subcustomersByLpoId.get(targetLpoId) || []) : [];
      const portalUsers = targetLpoId ? (usersByLpoId.get(targetLpoId) || []) : [];
      const lpoJobsCount = targetLpoId ? (jobsByLpoId.get(targetLpoId) || 0) : 0;

      let lpoActiveSubs = 0;
      let lpoCancelledSubs = 0;
      let lpoAwaitingTncSubs = 0;

      subcustomers.forEach((sub) => {
        totalSubcustomers++;
        const st = (sub.status || '').toLowerCase();
        if (st === 'active') {
          activeSubcustomers++;
          lpoActiveSubs++;
        } else if (st === 'cancelled') {
          cancelledSubcustomers++;
          lpoCancelledSubs++;
        } else {
          awaitingTncSubcustomers++;
          lpoAwaitingTncSubs++;
        }

        allSubcustomersFlat.push({
          ...sub,
          parentLpoLeadId: leadId,
          parentLpoName: lead.lpoName || 'Unnamed LPO',
          parentLpoInternalId: targetLpoId,
          parentLinkedCompanyName: linkedCompanyName,
        });
      });

      reportData.push({
        leadId,
        prospectPlusId: lead.prospectPlusId || '',
        lpoName: lead.lpoName || 'Unnamed LPO',
        lpoOwnerName: lead.lpoOwnerName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status || 'New',
        linkedLeadId,
        linkedCustomerId,
        linkedCompanyName,
        targetLpoId,
        hasAccess,
        portalUsersCount: portalUsers.length,
        portalUsers,
        subcustomersCount: subcustomers.length,
        activeSubcustomersCount: lpoActiveSubs,
        cancelledSubcustomersCount: lpoCancelledSubs,
        awaitingTncSubcustomersCount: lpoAwaitingTncSubs,
        totalJobsCount: lpoJobsCount,
        subcustomers,
        lpoDetails: targetLpoId ? lpoDataMap.get(targetLpoId) || null : null,
      });
    });

    // Sort report by subcustomersCount descending, then totalJobsCount descending
    reportData.sort((a, b) => b.subcustomersCount - a.subcustomersCount || b.totalJobsCount - a.totalJobsCount);
    allSubcustomersFlat.sort((a, b) => b.jobsCount - a.jobsCount);

    return NextResponse.json({
      success: true,
      summary: {
        totalLinkedLpos,
        lposWithLpoPlusAccess,
        totalSubcustomers,
        activeSubcustomers,
        cancelledSubcustomers,
        awaitingTncSubcustomers,
        totalJobsCreated: totalJobsCount,
        jobsByJobType: {
          scheduled: scheduledJobsTotal,
          oneOff: oneOffJobsTotal,
        },
        jobsByBilling: {
          lpoBilled: lpoBilledJobsTotal,
          customerBilled: customerBilledJobsTotal,
        },
      },
      lpoLeadsReport: reportData,
      allSubcustomers: allSubcustomersFlat,
    });
  } catch (error: any) {
    console.error('[LPO Reporting API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
