import { getLocalMilePlusDb } from '@/lib/localmile-db';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { syncPmpoToLocalMileServer } from '@/services/localmile-sync-server';
import { resendLocalMileEmail, initiateLocalMileTrial } from '@/services/netsuite-localmile-proxy';

export interface LocalMileUserSummary {
  id: string;
  email: string;
  name: string;
  status: string;
  role?: string;
  disabled?: boolean;
}

export interface LocalMileCompanyStatusResponse {
  success: boolean;
  exists: boolean;
  companyId: string;
  companyName?: string;
  companyStatus: 'active' | 'cancelled' | 'no_status' | 'not_found' | string;
  isCompanyActive: boolean;
  isCompanyCancelled: boolean;
  deactivatedAt?: string | null;
  reactivatedAt?: string | null;
  users: LocalMileUserSummary[];
  totalUsers: number;
  activeUsersCount: number;
  pendingUsersCount: number;
  hasActiveUser: boolean;
  canReactivate: boolean;
  message?: string;
}

/**
 * Checks the LocalMile Plus Firestore database for the company and associated users.
 */
export async function getLocalMileCompanyStatus(
  companyId: string
): Promise<LocalMileCompanyStatusResponse> {
  if (!companyId) {
    return {
      success: false,
      exists: false,
      companyId: '',
      companyStatus: 'not_found',
      isCompanyActive: false,
      isCompanyCancelled: false,
      users: [],
      totalUsers: 0,
      activeUsersCount: 0,
      pendingUsersCount: 0,
      hasActiveUser: false,
      canReactivate: false,
      message: 'Company ID is required.',
    };
  }

  try {
    const db = getLocalMilePlusDb();

    // 1. Fetch Company document from localmile-plus
    const companyDoc = await db.collection('companies').doc(String(companyId)).get();

    if (!companyDoc.exists) {
      return {
        success: true,
        exists: false,
        companyId,
        companyStatus: 'not_found',
        isCompanyActive: false,
        isCompanyCancelled: false,
        users: [],
        totalUsers: 0,
        activeUsersCount: 0,
        pendingUsersCount: 0,
        hasActiveUser: false,
        canReactivate: false,
        message: `Company ${companyId} does not exist in LocalMile Plus database.`,
      };
    }

    const companyData = companyDoc.data() || {};
    const rawStatus = (companyData.status || '').toLowerCase().trim();
    const isCompanyCancelled = rawStatus === 'cancelled' || companyData.cancelled === true;
    const isCompanyActive = rawStatus === 'active' || (!isCompanyCancelled && !rawStatus);
    const resolvedStatus = isCompanyCancelled ? 'cancelled' : isCompanyActive ? 'active' : (rawStatus || 'no_status');

    // 2. Fetch associated users from localmile-plus
    const usersMap = new Map<string, LocalMileUserSummary>();

    const [byCompanyId, byCustomerId] = await Promise.all([
      db.collection('users').where('companyId', '==', String(companyId)).get().catch(() => null),
      db.collection('users').where('customer_id', '==', String(companyId)).get().catch(() => null),
    ]);

    const userDocs = [
      ...(byCompanyId?.docs || []),
      ...(byCustomerId?.docs || []),
    ];

    for (const doc of userDocs) {
      if (!usersMap.has(doc.id)) {
        const u = doc.data() || {};
        const firstName = u.first_name || '';
        const lastName = u.last_name === 'undefined' ? '' : (u.last_name || '');
        const fullName = `${firstName} ${lastName}`.trim() || u.name || 'User';
        const userStatus = u.status || (u.disabled ? 'Disabled' : 'Unknown');

        usersMap.set(doc.id, {
          id: doc.id,
          email: u.email || '',
          name: fullName,
          status: userStatus,
          role: u.role || 'customer',
          disabled: Boolean(u.disabled),
        });
      }
    }

    const users = Array.from(usersMap.values());
    const activeUsers = users.filter(
      (u) => (u.status === 'Active' || u.status === 'active') && !u.disabled
    );
    const pendingUsers = users.filter(
      (u) => u.status === 'Pending_Activation' && !u.disabled
    );

    const hasActiveUser = activeUsers.length > 0;
    // Can reactivate whenever company is cancelled or inactive in LocalMile Plus
    const canReactivate = isCompanyCancelled || (!isCompanyActive && companyDoc.exists);

    return {
      success: true,
      exists: true,
      companyId,
      companyName: companyData.companyName || companyData.name || '',
      companyStatus: resolvedStatus,
      isCompanyActive,
      isCompanyCancelled,
      deactivatedAt: companyData.deactivatedAt || null,
      reactivatedAt: companyData.reactivatedAt || null,
      users,
      totalUsers: users.length,
      activeUsersCount: activeUsers.length,
      pendingUsersCount: pendingUsers.length,
      hasActiveUser,
      canReactivate,
    };
  } catch (error: any) {
    console.error(`[LocalMile Company Status Error] Failed to get status for company ${companyId}:`, error);
    return {
      success: false,
      exists: false,
      companyId,
      companyStatus: 'error',
      isCompanyActive: false,
      isCompanyCancelled: false,
      users: [],
      totalUsers: 0,
      activeUsersCount: 0,
      pendingUsersCount: 0,
      hasActiveUser: false,
      canReactivate: false,
      message: error?.message || 'Failed to query LocalMile Plus database.',
    };
  }
}

export interface LocalMileReactivateContactItem {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface ReactivateLocalMileCompanyOptions {
  companyId: string;
  reactivatedBy?: string;
  contactId?: string;
  contactEmail?: string;
  contacts?: LocalMileReactivateContactItem[];
  reactivateScheduledJobs?: boolean;
}

/**
 * Reactivates a cancelled company in the LocalMile Plus database,
 * re-enables users, restores scheduled jobs (if selected),
 * and logs an activity record in ProspectPlus.
 */
export async function reactivateLocalMileCompany(
  options: ReactivateLocalMileCompanyOptions
): Promise<{ success: boolean; message: string; data?: any }> {
  const {
    companyId,
    reactivatedBy = 'ProspectPlus Staff',
    contactEmail,
    contactId,
    contacts,
    reactivateScheduledJobs = true,
  } = options;

  if (!companyId) {
    return { success: false, message: 'companyId is required.' };
  }

  try {
    const db = getLocalMilePlusDb();
    const adminDb = getFirestore(adminApp);
    const nowIso = new Date().toISOString();

    // 1. Verify and update Company document in localmile-plus
    const companyRef = db.collection('companies').doc(String(companyId));
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return { success: false, message: `Company ${companyId} does not exist in LocalMile Plus database.` };
    }

    await companyRef.update({
      status: 'active',
      reactivatedAt: nowIso,
      reactivatedBy,
      cancelled: false,
      updatedAt: nowIso,
    });

    console.log(`[LocalMile Reactivation] Successfully set company ${companyId} status to 'active' in localmile-plus.`);

    // 2. Re-enable existing users in localmile-plus
    const [byCompanyId, byCustomerId] = await Promise.all([
      db.collection('users').where('companyId', '==', String(companyId)).get().catch(() => null),
      db.collection('users').where('customer_id', '==', String(companyId)).get().catch(() => null),
    ]);

    const userDocs = [
      ...(byCompanyId?.docs || []),
      ...(byCustomerId?.docs || []),
    ];

    const updatedUserEmails: string[] = [];
    const seenUserIds = new Set<string>();

    for (const doc of userDocs) {
      if (!seenUserIds.has(doc.id)) {
        seenUserIds.add(doc.id);
        const u = doc.data() || {};
        const updates: any = {};

        if (u.disabled) {
          updates.disabled = false;
        }
        if (u.status === 'cancelled' || u.status === 'disabled') {
          updates.status = 'Pending_Activation';
        }
        updates.updatedAt = nowIso;

        await doc.ref.update(updates);
        if (u.email) updatedUserEmails.push(u.email);
      }
    }

    // 3. Reactivate scheduled jobs in localmile-plus if requested AND company has recurring PMPO
    let scheduledJobsReactivatedCount = 0;
    if (reactivateScheduledJobs) {
      let hasRecurringPmpo = false;
      try {
        const compDocSnap = await adminDb.collection('companies').doc(companyId).get();
        const lData = compDocSnap.exists ? compDocSnap.data() : (await adminDb.collection('leads').doc(companyId).get()).data();
        const services = lData?.services || [];
        const pmpo = services.find((s: any) => {
          const sName = String(s.name || s.service || '').toLowerCase();
          return sName.includes('pmpo') || sName.includes('outgoing mail lodgement');
        });
        const freq = pmpo?.frequency;
        hasRecurringPmpo = Boolean(
          pmpo && (
            (Array.isArray(freq) && freq.length > 0) ||
            (typeof freq === 'string' && freq.trim().toLowerCase() !== 'adhoc' && freq.trim().length > 0)
          ) &&
          (!pmpo.serviceType || String(pmpo.serviceType).toLowerCase() !== 'adhoc')
        );
      } catch (checkErr) {
        console.warn(`[LocalMile Reactivation] Could not check service recurrence:`, checkErr);
      }

      if (hasRecurringPmpo) {
        const scheduledJobsCol = db.collection('scheduled_jobs');
        const jobFields = ['company_id', 'companyId', 'customer_id', 'customerId'];
        const seenJobIds = new Set<string>();

        const jobUpdate = {
          status: 'active',
          isActive: true,
          is_active: true,
          cancelled: false,
          reactivatedAt: nowIso,
          reactivatedBy,
          updatedAt: nowIso,
        };

        // Direct doc
        try {
          const directJob = await scheduledJobsCol.doc(String(companyId)).get();
          if (directJob.exists) {
            await directJob.ref.update(jobUpdate);
            seenJobIds.add(directJob.id);
            scheduledJobsReactivatedCount++;
          }
        } catch (e) {}

        // Queries by company field
        await Promise.all(
          jobFields.map(async (field) => {
            try {
              const snap = await scheduledJobsCol.where(field, '==', String(companyId)).get();
              for (const docSnap of snap.docs) {
                if (!seenJobIds.has(docSnap.id)) {
                  await docSnap.ref.update(jobUpdate);
                  seenJobIds.add(docSnap.id);
                  scheduledJobsReactivatedCount++;
                }
              }
            } catch (queryErr) {}
          })
        );

        // Subcollection: companies/{companyId}/scheduled_jobs
        try {
          const subSnap = await db.collection('companies').doc(String(companyId)).collection('scheduled_jobs').get();
          for (const docSnap of subSnap.docs) {
            await docSnap.ref.update(jobUpdate);
            scheduledJobsReactivatedCount++;
          }
        } catch (subErr) {}

        // If ProspectPlus lead has PMPO recurring service, resync
        try {
          const compDocSnap = await adminDb.collection('companies').doc(companyId).get();
          const lData = compDocSnap.exists ? compDocSnap.data() : (await adminDb.collection('leads').doc(companyId).get()).data();
          if (lData && Array.isArray(lData.services)) {
            await syncPmpoToLocalMileServer(String(companyId), lData, lData.services);
          }
        } catch (syncErr) {
          console.warn(`[LocalMile Reactivation] PMPO resync warning:`, syncErr);
        }
      } else {
        console.log(`[LocalMile Reactivation] Company ${companyId} has Adhoc or no recurring PMPO service. Skipping scheduled jobs reactivation.`);
      }
    }

    // 4. Handle Contact Activation / Auth Link in ProspectPlus (supports multiple contacts)
    const targetContacts: LocalMileReactivateContactItem[] = [];
    if (Array.isArray(contacts) && contacts.length > 0) {
      targetContacts.push(...contacts.filter(c => c.email && typeof c.email === 'string' && c.email.includes('@')));
    } else if (contactEmail) {
      targetContacts.push({ id: contactId, email: contactEmail });
    }

    const provisionedEmails: string[] = [];
    const resentEmails: string[] = [];

    for (const target of targetContacts) {
      try {
        let contactData: any = null;
        if (target.id) {
          const compContactSnap = await adminDb.collection('companies').doc(companyId).collection('contacts').doc(target.id).get();
          if (compContactSnap.exists) {
            contactData = compContactSnap.data();
          } else {
            const leadContactSnap = await adminDb.collection('leads').doc(companyId).collection('contacts').doc(target.id).get();
            if (leadContactSnap.exists) contactData = leadContactSnap.data();
          }
        }

        if (contactData?.securityCode && contactData?.localMilePlusAuthLink) {
          const resendRes = await resendLocalMileEmail({
            contactEmail: target.email,
            contactFirstName: contactData.name || contactData.firstName || target.name || 'Valued Customer',
            securityCode: contactData.securityCode,
            localMilePlusAuthLink: contactData.localMilePlusAuthLink,
            userEmail: 'localmile@mailplus.com.au',
          });
          if (resendRes.success) {
            resentEmails.push(target.email);
          }
        } else {
          // Provision new access for this contact via NetSuite proxy
          const initRes = await initiateLocalMileTrial({
            leadId: String(companyId),
            contactFirstName: contactData?.name || contactData?.firstName || target.name || 'Valued Customer',
            contactEmail: target.email,
            contactPhone: contactData?.phone || target.phone,
            userEmail: 'localmile@mailplus.com.au',
            userName: reactivatedBy,
          });

          if (initRes.success && initRes.localMilePlusAuthLink && initRes.securityCode) {
            provisionedEmails.push(target.email);
            const contactUpdates = {
              accessToLocalMile: 'yes',
              localMilePlusAuthLink: initRes.localMilePlusAuthLink,
              securityCode: initRes.securityCode,
            };
            if (target.id) {
              await adminDb.collection('companies').doc(companyId).collection('contacts').doc(target.id).update(contactUpdates).catch(() => {});
              await adminDb.collection('leads').doc(companyId).collection('contacts').doc(target.id).update(contactUpdates).catch(() => {});
            }
          }
        }
      } catch (authErr) {
        console.warn(`[LocalMile Reactivation] Could not handle contact activation for ${target.email}:`, authErr);
      }
    }

    // 5. Log Activity in ProspectPlus Firestore
    try {
      const activityNotes = `Company account was reactivated in LocalMile Plus database by ${reactivatedBy}. ${
        scheduledJobsReactivatedCount > 0 ? `Restored ${scheduledJobsReactivatedCount} scheduled job(s). ` : ''
      }${updatedUserEmails.length > 0 ? `Re-enabled user(s): ${updatedUserEmails.join(', ')}. ` : ''}${
        provisionedEmails.length > 0
          ? `Provisioned new LocalMile Plus access for: ${provisionedEmails.join(', ')}. `
          : ''
      }${
        resentEmails.length > 0
          ? `Sent activation email to: ${resentEmails.join(', ')}.`
          : ''
      }`.trim();

      const activityPayload = {
        type: 'Update',
        notes: activityNotes,
        author: reactivatedBy,
        createdAt: nowIso,
        date: nowIso,
      };

      const compDocRef = adminDb.collection('companies').doc(companyId);
      const leadDocRef = adminDb.collection('leads').doc(companyId);

      const [compSnap, leadSnap] = await Promise.all([compDocRef.get(), leadDocRef.get()]);
      if (compSnap.exists) {
        await compDocRef.collection('activity').add(activityPayload);
      }
      if (leadSnap.exists) {
        await leadDocRef.collection('activity').add(activityPayload);
      }
    } catch (actErr) {
      console.warn(`[LocalMile Reactivation] Failed to log activity:`, actErr);
    }

    return {
      success: true,
      message: `Successfully reactivated company ${companyId} in LocalMile Plus database.`,
      data: {
        companyId,
        scheduledJobsReactivatedCount,
        reEnabledUsers: updatedUserEmails,
        provisionedEmails,
        resentEmails,
      },
    };
  } catch (error: any) {
    console.error(`[LocalMile Reactivation Error] Fatal error reactivating company ${companyId}:`, error);
    return {
      success: false,
      message: error?.message || 'Failed to reactivate company in LocalMile Plus database.',
    };
  }
}
