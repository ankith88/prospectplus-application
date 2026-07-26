import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);
const ORIGINAL_ADMIN_UID = 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const requestId = searchParams.get('requestId');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prospectplus.mailplus.com.au';

  if (!action || !requestId) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?approvalError=Invalid+request+parameters`);
  }

  try {
    const reqRef = db.collection('adminApprovalRequests').doc(requestId);
    const reqSnap = await reqRef.get();

    if (!reqSnap.exists) {
      return NextResponse.redirect(`${baseUrl}/admin/settings?approvalError=Approval+request+not+found`);
    }

    const reqData = reqSnap.data()!;
    const now = new Date().toISOString();

    if (action === 'approve') {
      await reqRef.update({
        status: 'approved',
        updatedAt: now,
        actionedByUid: ORIGINAL_ADMIN_UID,
        actionedByName: 'Ankith Ravindran (Original Admin)',
      });

      const userRef = db.collection('users').doc(reqData.userId);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const userData = userSnap.data()!;
        const currentAssignedRoles: string[] = userData.assignedRoles || (userData.role ? [userData.role] : []);
        const updatedRoles = Array.from(new Set([...currentAssignedRoles, 'admin']));

        await userRef.update({
          assignedRoles: updatedRoles,
          defaultRole: 'admin',
          role: 'admin',
          adminApprovalStatus: 'approved',
          pendingAdminRequestId: null,
        });
      }

      return NextResponse.redirect(`${baseUrl}/admin/settings?approvalSuccess=Admin+access+granted+for+${encodeURIComponent(reqData.userEmail || reqData.userName)}`);
    } else if (action === 'reject') {
      await reqRef.update({
        status: 'rejected',
        updatedAt: now,
        actionedByUid: ORIGINAL_ADMIN_UID,
        actionedByName: 'Ankith Ravindran (Original Admin)',
      });

      await db.collection('users').doc(reqData.userId).update({
        adminApprovalStatus: 'rejected',
        pendingAdminRequestId: null,
      });

      return NextResponse.redirect(`${baseUrl}/admin/settings?approvalMessage=Admin+access+request+rejected+for+${encodeURIComponent(reqData.userEmail || reqData.userName)}`);
    } else {
      return NextResponse.redirect(`${baseUrl}/admin/settings?approvalError=Unknown+action`);
    }
  } catch (error: any) {
    console.error('Error processing admin approval:', error);
    return NextResponse.redirect(`${baseUrl}/admin/settings?approvalError=${encodeURIComponent(error.message || 'Server error')}`);
  }
}
