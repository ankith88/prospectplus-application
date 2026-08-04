import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, requestorUid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Target user ID (uid) is required.' },
        { status: 400 }
      );
    }

    if (!requestorUid || !SUPER_ADMIN_UIDS.includes(requestorUid)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Only Super Admins can delete users.' },
        { status: 403 }
      );
    }

    if (SUPER_ADMIN_UIDS.includes(uid)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Super Admin accounts cannot be deleted.' },
        { status: 403 }
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.firestore();

    // 1. Delete user from Firebase Authentication
    try {
      await auth.deleteUser(uid);
    } catch (authError: any) {
      console.warn(`[Delete User API] Auth deletion warning for ${uid}:`, authError.message);
    }

    // 2. Delete subcollections under users/{uid}
    const userRef = db.collection('users').doc(uid);
    const subcollections = await userRef.listCollections();
    for (const subcol of subcollections) {
      const snap = await subcol.get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // 3. Delete user document from Firestore 'users' collection
    await userRef.delete();

    // 4. Cleanup pending admin approval requests associated with target user
    const pendingReqsSnap = await db
      .collection('adminApprovalRequests')
      .where('userId', '==', uid)
      .get();
    if (!pendingReqsSnap.empty) {
      const batch = db.batch();
      pendingReqsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    const targetReqsSnap = await db
      .collection('adminApprovalRequests')
      .where('targetUserId', '==', uid)
      .get();
    if (!targetReqsSnap.empty) {
      const batch = db.batch();
      targetReqsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `User ${uid} successfully deleted from Authentication and Firestore.`,
    });
  } catch (error: any) {
    console.error('[Delete User API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
