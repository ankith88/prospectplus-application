import { adminDb } from '@/services/firebase-server';
import { disableLpoPlusAccount } from '@/services/lpo-plus-service';

export interface LpoCancellationCascadeOptions {
  leadId: string;
  companyName?: string;
  cancellationReason?: string;
  cancelledBy?: string;
}

/**
 * Handles cascading cancellation for LPO Network customers:
 * 1. Cancels all child leads and companies linked to the parent.
 * 2. Marks linked lpo_leads documents as 'Lost' / 'Disabled'.
 * 3. Disables LPO.Plus application user access (Auth & lpoconnect DB).
 */
export async function processLpoCancellationCascade(options: LpoCancellationCascadeOptions): Promise<{ success: boolean; updatedChildCount: number; updatedLpoCount: number }> {
  const { leadId, cancellationReason = 'Customer Cancelled', cancelledBy = 'System' } = options;
  const nowIso = new Date().toISOString();

  try {
    // 1. Fetch lead and company data
    const leadRef = adminDb.collection('leads').doc(leadId);
    const compRef = adminDb.collection('companies').doc(leadId);
    const [leadSnap, compSnap] = await Promise.all([leadRef.get(), compRef.get()]);

    const data = { ...(compSnap.exists ? compSnap.data() : {}), ...(leadSnap.exists ? leadSnap.data() : {}) };
    const companyName = options.companyName || data.companyName || 'Company';

    const isLpoContext = 
      data.bucket === 'lpo_network' || 
      data.isLpoLead || 
      Boolean(data.lpoLeadId) || 
      Boolean(data.linkedLpoLeadId) || 
      Boolean(data.createdParentLeadId) || 
      Boolean(data.isParentLead) ||
      Boolean(data.parentLeadId);

    const childLeadIds = new Set<string>();
    const childCompIds = new Set<string>();
    const lpoLeadIdsToUpdate = new Set<string>();

    if (data.lpoLeadId) lpoLeadIdsToUpdate.add(data.lpoLeadId);
    if (data.linkedLpoLeadId) lpoLeadIdsToUpdate.add(data.linkedLpoLeadId);
    if (data.createdParentLeadId) lpoLeadIdsToUpdate.add(data.createdParentLeadId);

    // Query child leads and companies
    const parentIdToSearch = data.parentLeadId || leadId;
    const [qChildLeads, qChildComps] = await Promise.all([
      adminDb.collection('leads').where('parentLeadId', '==', parentIdToSearch).get(),
      adminDb.collection('companies').where('parentLeadId', '==', parentIdToSearch).get()
    ]);

    qChildLeads.docs.forEach(d => { if (d.id !== leadId) childLeadIds.add(d.id); });
    qChildComps.docs.forEach(d => { if (d.id !== leadId) childCompIds.add(d.id); });

    // Also search for child leads where parentLeadId == leadId
    if (parentIdToSearch !== leadId) {
      const [qChildLeads2, qChildComps2] = await Promise.all([
        adminDb.collection('leads').where('parentLeadId', '==', leadId).get(),
        adminDb.collection('companies').where('parentLeadId', '==', leadId).get()
      ]);
      qChildLeads2.docs.forEach(d => { if (d.id !== leadId) childLeadIds.add(d.id); });
      qChildComps2.docs.forEach(d => { if (d.id !== leadId) childCompIds.add(d.id); });
    }

    // Find linked lpo_leads docs
    const [qLpo1, qLpo2, qLpo3] = await Promise.all([
      adminDb.collection('lpo_leads').where('createdParentLeadId', '==', parentIdToSearch).get(),
      adminDb.collection('lpo_leads').where('linkedLeadId', '==', leadId).get(),
      adminDb.collection('lpo_leads').where('createdChildLeadIds', 'array-contains', leadId).get()
    ]);

    qLpo1.docs.forEach(d => lpoLeadIdsToUpdate.add(d.id));
    qLpo2.docs.forEach(d => lpoLeadIdsToUpdate.add(d.id));
    qLpo3.docs.forEach(d => lpoLeadIdsToUpdate.add(d.id));

    let childCount = 0;

    // Update child leads
    for (const childId of Array.from(childLeadIds)) {
      childCount++;
      const cRef = adminDb.collection('leads').doc(childId);
      await cRef.update({
        status: 'Lost Customer',
        customerStatus: 'Lost Customer',
        scfStatus: 'Cancelled',
        lpoPlusStatus: 'Disabled',
        updatedAt: nowIso
      });
      await cRef.collection('activity').add({
        type: 'Update',
        notes: `Child lead marked as Lost Customer automatically (Parent customer "${companyName}" was cancelled).`,
        author: cancelledBy,
        date: nowIso
      });
    }

    // Update child companies
    for (const childId of Array.from(childCompIds)) {
      childCount++;
      const cRef = adminDb.collection('companies').doc(childId);
      await cRef.update({
        status: 'Lost Customer',
        customerStatus: 'Lost Customer',
        lpoPlusStatus: 'Disabled',
        updatedAt: nowIso
      });
      await cRef.collection('activity').add({
        type: 'Update',
        notes: `Child company marked as Lost Customer automatically (Parent customer "${companyName}" was cancelled).`,
        author: cancelledBy,
        date: nowIso
      });
    }

    let lpoCount = 0;

    // Update lpo_leads documents and disable LPO.Plus accounts
    for (const lpoId of Array.from(lpoLeadIdsToUpdate)) {
      lpoCount++;
      const lpoRef = adminDb.collection('lpo_leads').doc(lpoId);
      const lpoSnap = await lpoRef.get();
      if (lpoSnap.exists) {
        const lpoData = lpoSnap.data() || {};
        await lpoRef.update({
          status: 'Lost',
          lpoPlusStatus: 'Disabled',
          lossReason: `Customer Cancelled: ${cancellationReason}`,
          updatedAt: nowIso
        });
        await lpoRef.collection('activity').add({
          type: 'StatusChange',
          notes: `LPO lead status updated to Lost (Linked customer "${companyName}" was cancelled).`,
          author: cancelledBy,
          createdAt: nowIso
        });

        const netSuiteId = lpoData.netsuiteId || lpoData.lpoId || lpoData.createdParentLeadId || lpoId;
        const contactEmail = lpoData.contactEmail || lpoData.email || lpoData.customerEmail || data.customerServiceEmail || '';
        await disableLpoPlusAccount(netSuiteId, contactEmail);
      }
    }

    // Disable LPO.Plus account directly for main customer if LPO context
    if (isLpoContext) {
      const mainNetsuiteId = data.netsuiteId || data.lpoId || data.lpoLeadId || leadId;
      const mainEmail = data.customerServiceEmail || data.email || data.contactEmail || '';
      await disableLpoPlusAccount(mainNetsuiteId, mainEmail);
    }

    return { success: true, updatedChildCount: childCount, updatedLpoCount: lpoCount };
  } catch (error) {
    console.error('[processLpoCancellationCascade] Error processing cascade:', error);
    return { success: false, updatedChildCount: 0, updatedLpoCount: 0 };
  }
}
