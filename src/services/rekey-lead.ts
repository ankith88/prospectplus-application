'use server';

import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendNewLeadToNetSuite } from '@/services/netsuite';
import type { Lead, Contact, Address } from '@/lib/types';

const db = getFirestore(adminApp);

export interface RekeyResult {
  success: boolean;
  newDocId?: string;
  error?: string;
  message?: string;
}

/**
 * Syncs a lead with NetSuite and re-keys its Firestore document ID from alphanumeric to the numeric NetSuite Internal ID.
 * If NetSuite fails, the temporary alphanumeric document is retained and updated with failure tracking metadata.
 */
export async function rekeyLeadToNetSuite(leadId: string): Promise<RekeyResult> {
  if (!leadId) {
    return { success: false, error: 'Lead ID is required.' };
  }

  // 1. Determine collection ('leads' or 'companies')
  let colName: 'leads' | 'companies' = 'leads';
  let sourceRef = db.collection('leads').doc(leadId);
  let docSnap = await sourceRef.get();

  if (!docSnap.exists) {
    colName = 'companies';
    sourceRef = db.collection('companies').doc(leadId);
    docSnap = await sourceRef.get();
  }

  if (!docSnap.exists) {
    return { success: false, error: `Document with ID ${leadId} not found.` };
  }

  const data = docSnap.data() as any;

  // Check if doc is already numeric
  const isAlreadyNumeric = /^\d+$/.test(leadId);
  if (isAlreadyNumeric) {
    return {
      success: true,
      newDocId: leadId,
      message: 'Lead document ID is already numeric and synced with NetSuite.',
    };
  }

  // 2. Fetch primary contact
  const contactsSnap = await db.collection(colName).doc(leadId).collection('contacts').get();
  let primaryContact: any = null;
  const contactsList: any[] = [];

  contactsSnap.docs.forEach((cDoc) => {
    const cData: any = { id: cDoc.id, ...cDoc.data() };
    contactsList.push(cData);
    if (cData.isPrimary || !primaryContact) {
      primaryContact = cData;
    }
  });

  const rawName = primaryContact?.name || data.contactName || data.lpoOwnerName || 'Primary Contact';
  const nameParts = rawName.trim().split(' ');

  const contactInfo = {
    firstName: primaryContact?.firstName || nameParts[0] || 'Primary',
    lastName: primaryContact?.lastName || nameParts.slice(1).join(' ') || 'Contact',
    title: primaryContact?.title || 'Primary Contact',
    email: primaryContact?.email || data.contactEmail || data.customerServiceEmail || data.email || '',
    phone: primaryContact?.phone || primaryContact?.mobile || data.contactPhone || data.customerPhone || data.phone || '',
  };

  // 3. Resolve parent NetSuite ID if child of multi-site or LPO lead
  let parentNetSuiteId: string | undefined = undefined;
  if (data.parentLeadId) {
    if (/^\d+$/.test(String(data.parentLeadId))) {
      parentNetSuiteId = String(data.parentLeadId);
    } else {
      try {
        const pSnapLeads = await db.collection('leads').doc(data.parentLeadId).get();
        if (pSnapLeads.exists) {
          const pData = pSnapLeads.data() || {};
          parentNetSuiteId = pData.internalid || pData.netsuiteId || (pData.id && /^\d+$/.test(String(pData.id)) ? String(pData.id) : undefined) || pData.prospectPlusId || pSnapLeads.id;
        } else {
          const pSnapCompanies = await db.collection('companies').doc(data.parentLeadId).get();
          if (pSnapCompanies.exists) {
            const pData = pSnapCompanies.data() || {};
            parentNetSuiteId = pData.internalid || pData.netsuiteId || (pData.id && /^\d+$/.test(String(pData.id)) ? String(pData.id) : undefined) || pData.prospectPlusId || pSnapCompanies.id;
          }
        }
      } catch (e) {
        console.warn('Failed to resolve parent NetSuite ID for re-keying:', e);
      }
    }
  }

  // 4. Construct NetSuite payload
  const address: Address = data.address || {
    street: (data as any).street || '',
    city: (data as any).city || '',
    state: (data as any).state || '',
    zip: (data as any).zip || '',
    country: 'Australia',
  };

  const netSuitePayload = {
    companyName: data.companyName || data.lpoName || 'Unknown Company',
    websiteUrl: data.websiteUrl,
    customerPhone: contactInfo.phone || data.customerPhone,
    customerServiceEmail: contactInfo.email || data.customerServiceEmail,
    abn: data.abn,
    address,
    contact: contactInfo,
    campaign: data.campaign || 'LPO Network Onboarding',
    bucket: data.bucket || 'lpo_network',
    dialerAssigned: data.dialerAssigned,
    salesRepAssigned: data.salesRepAssigned,
    fieldRepAssigned: data.fieldRepAssigned,
    accountManagerAssigned: data.accountManagerAssigned,
    franchiseeName: data.franchisee,
    franchiseeInternalId: data.franchisee_id || data.franchiseeInternalId,
    parentLeadId: parentNetSuiteId || data.parentLeadId,
    parentId: parentNetSuiteId || data.parentLeadId,
    leadType: data.leadType || 'Service',
    source: data.source || 'LPO Lead Conversion',
    leadSource: data.leadSource || 'LPO Expressions of Interest',
    isParentLead: Boolean(data.isParentLead),
    isChildLead: Boolean(data.isChildLead),
    lpoLeadId: data.lpoLeadId || '',
  };

  // 5. Call NetSuite Scriptlet 2194
  try {
    const nsResult = await sendNewLeadToNetSuite(netSuitePayload as any);

    if (!nsResult.success || !nsResult.leadId) {
      const errorMsg = nsResult.message || 'NetSuite API failed to create lead.';

      // Track failure on temporary alphanumeric document
      await sourceRef.update({
        syncedWithNetSuite: false,
        netSuiteSyncStatus: 'failed',
        netSuiteSyncError: errorMsg,
        netSuiteSyncAttemptedAt: new Date().toISOString(),
        netSuiteSyncAttemptCount: FieldValue.increment(1),
      });

      return {
        success: false,
        error: errorMsg,
      };
    }

    const newNumericId = String(nsResult.leadId);

    // 6. Re-keying: Copy document data to new numeric document ID
    const newRef = db.collection(colName).doc(newNumericId);

    const updatedData = {
      ...data,
      id: newNumericId,
      internalid: newNumericId,
      syncedWithNetSuite: true,
      netSuiteSyncStatus: 'synced',
      netSuiteSyncError: null,
      netSuiteSyncAttemptedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.prospectPlusId ? {} : { prospectPlusId: `MP${newNumericId}` }),
      ...(nsResult.salesRecordInternalId ? { salesRecordInternalId: nsResult.salesRecordInternalId } : {}),
    };

    const batch = db.batch();
    batch.set(newRef, updatedData, { merge: true });

    // Copy all subcollections dynamically
    const subcollections = await sourceRef.listCollections();
    for (const subRef of subcollections) {
      const subSnap = await subRef.get();
      subSnap.docs.forEach((sDoc) => {
        const destDocRef = newRef.collection(subRef.id).doc(sDoc.id);
        batch.set(destDocRef, sDoc.data());
      });
    }

    // Add re-keying activity log
    const rekeyActivityRef = newRef.collection('activity').doc();
    batch.set(rekeyActivityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead record successfully created in NetSuite (NetSuite ID: ${newNumericId}) and document re-keyed from temporary alphanumeric ID ${leadId}.`,
      author: 'NetSuite Sync Engine',
      source: 'netsuite_rekey',
    });

    // Commit new numeric document and subcollections
    await batch.commit();

    // Delete old alphanumeric document & subcollections
    try {
      const deleteBatch = db.batch();
      for (const subRef of subcollections) {
        const subSnap = await subRef.get();
        subSnap.docs.forEach((sDoc) => {
          deleteBatch.delete(sDoc.ref);
        });
      }
      deleteBatch.delete(sourceRef);
      await deleteBatch.commit();
    } catch (cleanupErr) {
      console.warn(`Original alphanumeric doc cleanup warning for ${leadId}:`, cleanupErr);
    }

    return {
      success: true,
      newDocId: newNumericId,
      message: `Lead successfully created in NetSuite (${newNumericId}) and document ID re-keyed.`,
    };
  } catch (error: any) {
    console.error(`Error during NetSuite re-keying for lead ${leadId}:`, error);

    const errorMsg = error.message || 'An unexpected error occurred during NetSuite re-keying.';

    await sourceRef.update({
      syncedWithNetSuite: false,
      netSuiteSyncStatus: 'failed',
      netSuiteSyncError: errorMsg,
      netSuiteSyncAttemptedAt: new Date().toISOString(),
      netSuiteSyncAttemptCount: FieldValue.increment(1),
    }).catch(() => {});

    return {
      success: false,
      error: errorMsg,
    };
  }
}

