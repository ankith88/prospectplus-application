import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore as getProspectPlusDb, FieldValue } from 'firebase-admin/firestore';
import { getLpoConnectDb } from '@/lib/lpo-connect-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetLeadId = body.lpoLeadId || body.leadId || null;

    const prospectDb = getProspectPlusDb(adminApp);
    
    // Connect to mp-lpo-connect project, lpoconnect database
    const lpoConnectDb = getLpoConnectDb();

    // 1. Fetch LPO leads from ProspectPlus
    let lpoLeadsQuery: FirebaseFirestore.Query = prospectDb.collection('lpo_leads');
    if (targetLeadId) {
      lpoLeadsQuery = prospectDb.collection('lpo_leads').where('__name__', '==', targetLeadId);
    }
    const lpoLeadsSnap = await lpoLeadsQuery.get();

    if (lpoLeadsSnap.empty) {
      return NextResponse.json({
        success: true,
        message: 'No LPO leads found to sync.',
        updatedCount: 0,
        loggedInCount: 0,
        accessSentCount: 0,
      });
    }

    // 2. Fetch reference collections from lpoconnect DB
    const lpoDocsSnap = await lpoConnectDb.collection('lpo').get();
    const customersSnap = await lpoConnectDb.collectionGroup('customers').get();
    const usersSnap = await lpoConnectDb.collection('users').get();

    // Index customers in lpoconnect DB
    const custByLpoAndEntity = new Map<string, any>();
    const custByEntityId = new Map<string, any>();
    const custByCompanyId = new Map<string, any>();
    const custByEmail = new Map<string, any>();

    customersSnap.forEach((cDoc) => {
      const d = cDoc.data();
      const entityId = d.customerEntityId ? String(d.customerEntityId).trim() : '';
      const companyId = d.companyId ? String(d.companyId).trim() : '';
      const parentLpoId = d.lpoParentInternalID ? String(d.lpoParentInternalID).trim() : '';
      const email = d.customerEmail ? String(d.customerEmail).trim().toLowerCase() : '';

      if (parentLpoId && entityId) custByLpoAndEntity.set(`${parentLpoId}_${entityId}`, d);
      if (entityId) custByEntityId.set(entityId, d);
      if (companyId) custByCompanyId.set(companyId, d);
      if (email) custByEmail.set(email, d);
    });

    // Index users by lpo_id and email in lpoconnect DB
    const usersByLpoId = new Map<string, any[]>();
    const usersByEmail = new Map<string, any>();

    usersSnap.forEach((uDoc) => {
      const d = uDoc.data();
      const lpoId = d.lpo_id ? String(d.lpo_id).trim() : '';
      const email = d.email ? String(d.email).trim().toLowerCase() : '';

      if (lpoId) {
        const arr = usersByLpoId.get(lpoId) || [];
        arr.push(d);
        usersByLpoId.set(lpoId, arr);
      }
      if (email) usersByEmail.set(email, d);
    });

    let updatedCount = 0;
    let loggedInCount = 0;
    let accessSentCount = 0;
    const updatesLog: Array<{ id: string; name: string; oldStatus: string; newStatus: string; reason: string }> = [];

    const batch = prospectDb.batch();

    lpoLeadsSnap.forEach((leadDoc) => {
      const lead = leadDoc.data();
      const leadId = leadDoc.id;
      const lpoName = lead.lpoName || 'Unnamed LPO';
      const currentStatus = lead.status;

      const linkedCustId = lead.linkedCustomerId ? String(lead.linkedCustomerId).trim() : '';
      const linkedLeadId = lead.linkedLeadId ? String(lead.linkedLeadId).trim() : '';
      const lpoInternalId = lead.lpoInternalId ? String(lead.lpoInternalId).trim() : '';
      const email = lead.email ? String(lead.email).trim().toLowerCase() : '';

      // Match logic
      let matchedCust = linkedCustId ? (custByLpoAndEntity.get(`${linkedLeadId}_${linkedCustId}`) || custByEntityId.get(linkedCustId) || custByCompanyId.get(linkedCustId)) : undefined;
      const targetLpoId = linkedLeadId || lpoInternalId;
      const lpoUsers = targetLpoId ? usersByLpoId.get(targetLpoId) : undefined;
      const matchedUser = email ? usersByEmail.get(email) : undefined;

      let calculatedStatus: string | null = null;
      let reason = '';

      if (matchedCust) {
        const isCustomerLoggedIn = matchedCust.status === 'Active' || Boolean(matchedCust.customerTokens?.length > 0 || matchedCust.lastLogin);
        if (isCustomerLoggedIn) {
          calculatedStatus = 'LPO.Plus Logged In';
          reason = `Customer doc status '${matchedCust.status}'`;
        } else {
          calculatedStatus = 'LPO.Plus Access Sent';
          reason = `Customer doc status '${matchedCust.status}'`;
        }
      } else if (lpoUsers && lpoUsers.length > 0) {
        const userHasLoggedIn = lpoUsers.some((u) => u.hasCompletedTour || u.fcmTokens?.length > 0 || u.lastLogin);
        if (userHasLoggedIn) {
          calculatedStatus = 'LPO.Plus Logged In';
          reason = `LPO user for LPO ID '${targetLpoId}' logged in`;
        } else {
          calculatedStatus = 'LPO.Plus Access Sent';
          reason = `LPO user for LPO ID '${targetLpoId}' exists but not logged in`;
        }
      } else if (matchedUser) {
        const userHasLoggedIn = Boolean(matchedUser.hasCompletedTour || matchedUser.fcmTokens?.length > 0 || matchedUser.lastLogin);
        if (userHasLoggedIn) {
          calculatedStatus = 'LPO.Plus Logged In';
          reason = `User email '${email}' logged in`;
        } else {
          calculatedStatus = 'LPO.Plus Access Sent';
          reason = `User email '${email}' exists but not logged in`;
        }
      }

      if (calculatedStatus) {
        if (calculatedStatus === 'LPO.Plus Logged In') loggedInCount++;
        if (calculatedStatus === 'LPO.Plus Access Sent') accessSentCount++;

        // Only write update if status changed or lastPortalSyncAt missing
        if (currentStatus !== calculatedStatus) {
          batch.update(leadDoc.ref, {
            status: calculatedStatus,
            lastPortalSyncAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          updatedCount++;
          updatesLog.push({
            id: leadId,
            name: lpoName,
            oldStatus: currentStatus,
            newStatus: calculatedStatus,
            reason,
          });
        } else {
          batch.update(leadDoc.ref, {
            lastPortalSyncAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      totalChecked: lpoLeadsSnap.size,
      updatedCount,
      loggedInCount,
      accessSentCount,
      updatesLog,
    });
  } catch (error: any) {
    console.error('[LPO Portal Sync Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
