import { firestore } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, getDoc, getDocs, query, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { AdminApprovalRequest, UserProfile, UserRole } from '@/lib/types';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export const ORIGINAL_ADMIN_UID = 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
export const SUPER_ADMIN_REQUIRING_APPROVAL_UID = 'a543AEr3TcaHyj4c1Gh0fJoQ6UB2';

/**
 * Creates an admin approval request when super admin `a543AEr3TcaHyj4c1Gh0fJoQ6UB2` grants admin access.
 */
export async function createAdminApprovalRequest(params: {
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  requestedByUid: string;
  requestedByName: string;
}): Promise<string> {
  const { targetUserId, targetUserEmail, targetUserName, requestedByUid, requestedByName } = params;
  
  const requestId = doc(collection(firestore, 'adminApprovalRequests')).id;
  const now = new Date().toISOString();

  const requestData: AdminApprovalRequest = {
    id: requestId,
    userId: targetUserId,
    userEmail: targetUserEmail,
    userName: targetUserName,
    requestedRole: 'admin',
    requestedByUid,
    requestedByName,
    status: 'pending',
    createdAt: now,
  };

  // Save approval request in Firestore
  await setDoc(doc(firestore, 'adminApprovalRequests', requestId), requestData);

  // Update target user profile with pending status
  await updateDoc(doc(firestore, 'users', targetUserId), {
    adminApprovalStatus: 'pending',
    pendingAdminRequestId: requestId,
  });

  // Fetch Original Admin's email
  let originalAdminEmail = 'ankith.ravindran@mailplus.com.au';
  try {
    const origDoc = await getDoc(doc(firestore, 'users', ORIGINAL_ADMIN_UID));
    if (origDoc.exists() && origDoc.data().email) {
      originalAdminEmail = origDoc.data().email;
    }
  } catch (err) {
    console.error('Error fetching Original Admin email:', err);
  }

  // Construct approval link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prospectplus.mailplus.com.au';
  const approveUrl = `${origin}/api/admin/admin-approval?action=approve&requestId=${requestId}`;
  const rejectUrl = `${origin}/api/admin/admin-approval?action=reject&requestId=${requestId}`;
  const userSettingsUrl = `${origin}/admin/settings`;

  const emailHtml = `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f8; padding: 20px 0; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
  <tr>
    <td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Banner Header -->
        <tr>
          <td align="center" style="background-color: #095c7b; padding: 25px 20px; text-align: center;">
            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus Logo" width="135" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none; max-height: 42px; width: auto;" />
          </td>
        </tr>

        <!-- Content Body -->
        <tr>
          <td style="padding: 32px 28px; color: #2d3748; line-height: 1.6;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #095c7b;">
              Admin Access Approval Requested
            </h2>
            <p style="margin: 0 0 20px; font-size: 14px; color: #4a5568;">
              Super Admin <strong>${requestedByName}</strong> has requested to grant <strong>Admin</strong> access to the following user:
            </p>

            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px;">
              <tr>
                <td style="padding: 12px 16px; font-size: 14px; color: #718096; width: 140px; font-weight: 600;">User Name:</td>
                <td style="padding: 12px 16px; font-size: 14px; color: #1a202c; font-weight: 600;">${targetUserName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-size: 14px; color: #718096; border-top: 1px solid #edf2f7; font-weight: 600;">Email Address:</td>
                <td style="padding: 12px 16px; font-size: 14px; color: #1a202c; border-top: 1px solid #edf2f7; font-family: monospace; font-weight: 600;">${targetUserEmail}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-size: 14px; color: #718096; border-top: 1px solid #edf2f7; font-weight: 600;">Requested Role:</td>
                <td style="padding: 12px 16px; font-size: 14px; color: #d97706; border-top: 1px solid #edf2f7; font-weight: 700;">Admin</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-size: 14px; color: #718096; border-top: 1px solid #edf2f7; font-weight: 600;">Requested By:</td>
                <td style="padding: 12px 16px; font-size: 14px; color: #1a202c; border-top: 1px solid #edf2f7;">${requestedByName} (${requestedByUid})</td>
              </tr>
            </table>

            <p style="margin: 0 0 24px; font-size: 14px; color: #4a5568;">
              As the Original Admin, your explicit authorization is required before this user will be granted Admin privileges.
            </p>

            <!-- Action Buttons -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
              <tr>
                <td align="center">
                  <a href="${approveUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 6px; margin-right: 12px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                    Approve Admin Access
                  </a>
                  <a href="${rejectUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);">
                    Reject Request
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin: 0; font-size: 13px; color: #718096; text-align: center;">
              You can also manage this request directly in the <a href="${userSettingsUrl}" style="color: #095c7b; text-decoration: underline;">User Settings Page</a>.
            </p>
          </td>
        </tr>

        <!-- Standard Footer -->
        <tr>
          <td align="center" style="background-color: #f8fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #718096; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
            <p style="margin: 0 0 6px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              <strong style="font-weight: 700; color: #4a5568;">MailPlus</strong> | Business logistics, made simple.
            </p>
            <p style="margin: 0 0 15px; font-size: 12px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
              Powered by MailPlus Australia
            </p>
            <p style="margin: 0; font-size: 11px; color: #a0aec0; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5;">
              &copy; 2026 MailPlus. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;

  try {
    await fetch('/api/campaigns/send-custom-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: originalAdminEmail,
        subject: `[Approval Required] Grant Admin Access to ${targetUserName}`,
        html: emailHtml,
        customFrom: 'Prospect+ CRM <no-reply@mailplus.com.au>',
      }),
    });
  } catch (err) {
    console.error('Failed to send admin approval request email:', err);
  }

  return requestId;
}

/**
 * Approves an admin approval request (callable by Original Admin `ncyhw...`)
 */
export async function approveAdminAccessRequest(params: {
  requestId: string;
  actionedByUid: string;
  actionedByName: string;
}): Promise<void> {
  const { requestId, actionedByUid, actionedByName } = params;

  if (actionedByUid !== ORIGINAL_ADMIN_UID) {
    throw new Error('Only the Original Admin has permission to approve admin access requests.');
  }

  const reqDocRef = doc(firestore, 'adminApprovalRequests', requestId);
  const reqSnap = await getDoc(reqDocRef);

  if (!reqSnap.exists()) {
    throw new Error('Approval request not found.');
  }

  const reqData = reqSnap.data() as AdminApprovalRequest;
  const targetUserRef = doc(firestore, 'users', reqData.userId);
  const userSnap = await getDoc(targetUserRef);

  if (!userSnap.exists()) {
    throw new Error('Target user profile not found.');
  }

  const userData = userSnap.data() as UserProfile;
  const currentAssignedRoles: UserRole[] = userData.assignedRoles || (userData.role ? [userData.role] : []);

  const updatedAssignedRoles = Array.from(new Set([...currentAssignedRoles, 'admin' as UserRole]));

  const now = new Date().toISOString();

  // Update approval request status
  await updateDoc(reqDocRef, {
    status: 'approved',
    updatedAt: now,
    actionedByUid,
    actionedByName,
  });

  // Grant admin role to target user
  await updateDoc(targetUserRef, {
    assignedRoles: updatedAssignedRoles,
    defaultRole: 'admin',
    role: 'admin',
    adminApprovalStatus: 'approved',
    pendingAdminRequestId: null,
  });
}

/**
 * Rejects an admin approval request (callable by Original Admin `ncyhw...`)
 */
export async function rejectAdminAccessRequest(params: {
  requestId: string;
  actionedByUid: string;
  actionedByName: string;
}): Promise<void> {
  const { requestId, actionedByUid, actionedByName } = params;

  if (actionedByUid !== ORIGINAL_ADMIN_UID) {
    throw new Error('Only the Original Admin has permission to reject admin access requests.');
  }

  const reqDocRef = doc(firestore, 'adminApprovalRequests', requestId);
  const reqSnap = await getDoc(reqDocRef);

  if (!reqSnap.exists()) {
    throw new Error('Approval request not found.');
  }

  const reqData = reqSnap.data() as AdminApprovalRequest;
  const now = new Date().toISOString();

  // Update approval request status
  await updateDoc(reqDocRef, {
    status: 'rejected',
    updatedAt: now,
    actionedByUid,
    actionedByName,
  });

  // Update user profile status
  await updateDoc(doc(firestore, 'users', reqData.userId), {
    adminApprovalStatus: 'rejected',
    pendingAdminRequestId: null,
  });
}

/**
 * Fetches all admin approval requests
 */
export async function getAllAdminApprovalRequests(): Promise<AdminApprovalRequest[]> {
  try {
    const q = query(collection(firestore, 'adminApprovalRequests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminApprovalRequest));
  } catch (error) {
    console.error('Error fetching admin approval requests:', error);
    return [];
  }
}
