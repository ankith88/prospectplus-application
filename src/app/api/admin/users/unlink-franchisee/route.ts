import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, franchiseeId, requestorUid } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, message: 'Target user ID (uid) is required.' },
        { status: 400 }
      );
    }

    const db = adminApp.firestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, message: `User document ${uid} not found.` },
        { status: 404 }
      );
    }

    const userData = userSnap.data() || {};
    const linkedFranchiseeIds: string[] = userData.linkedFranchiseeIds || [];
    const primaryFranchiseeId = userData.franchiseeId || userData.franchiseeInternalId;

    // Collect franchisee IDs to unlink
    let targetFranchiseeIds: string[] = [];
    if (franchiseeId) {
      targetFranchiseeIds = [String(franchiseeId)];
    } else {
      // Find all franchisees associated with this user
      targetFranchiseeIds = Array.from(
        new Set([...linkedFranchiseeIds, ...(primaryFranchiseeId ? [String(primaryFranchiseeId)] : [])])
      );

      // Query franchisees collection where linkedUserIds array-contains uid or currentOwnerUserId == uid
      const franSnap = await db.collection('franchisees').get();
      franSnap.forEach((doc) => {
        const d = doc.data();
        const lUsers: string[] = d.linkedUserIds || [];
        if (lUsers.includes(uid) || d.currentOwnerUserId === uid) {
          targetFranchiseeIds.push(doc.id);
        }
      });
      targetFranchiseeIds = Array.from(new Set(targetFranchiseeIds));
    }

    // 1. Remove user UID from franchisee collection records
    for (const fId of targetFranchiseeIds) {
      const fRef = db.collection('franchisees').doc(fId);
      const fDoc = await fRef.get();
      if (fDoc.exists) {
        const fData = fDoc.data() || {};
        const fUpdate: Record<string, any> = {
          linkedUserIds: admin.firestore.FieldValue.arrayRemove(uid),
          updatedAt: new Date().toISOString(),
        };

        if (fData.currentOwnerUserId === uid) {
          fUpdate.currentOwnerUserId = admin.firestore.FieldValue.delete();
        }

        await fRef.update(fUpdate);
      }
    }

    // 2. Remove franchisee link fields from user document
    const nowStr = new Date().toISOString();
    const userUpdate: Record<string, any> = {
      updatedAt: nowStr,
    };

    if (!franchiseeId || franchiseeId === primaryFranchiseeId) {
      userUpdate.franchisee = admin.firestore.FieldValue.delete();
      userUpdate.franchiseeId = admin.firestore.FieldValue.delete();
      userUpdate.franchiseeInternalId = admin.firestore.FieldValue.delete();
      userUpdate.linkedFranchisees = admin.firestore.FieldValue.delete();
      userUpdate.activeFranchiseeId = admin.firestore.FieldValue.delete();
      userUpdate.franchiseeRole = admin.firestore.FieldValue.delete();
    }

    if (franchiseeId) {
      userUpdate.linkedFranchiseeIds = admin.firestore.FieldValue.arrayRemove(String(franchiseeId));
    } else {
      userUpdate.linkedFranchiseeIds = admin.firestore.FieldValue.delete();
    }

    // Archive unlinked IDs into historicalFranchiseeIds
    if (targetFranchiseeIds.length > 0) {
      const existingHistory: string[] = userData.historicalFranchiseeIds || [];
      const updatedHistory = Array.from(new Set([...existingHistory, ...targetFranchiseeIds]));
      userUpdate.historicalFranchiseeIds = updatedHistory;
    }

    await userRef.update(userUpdate);

    return NextResponse.json({
      success: true,
      message: `User ${uid} successfully unlinked from franchisee collection(s).`,
      unlinkedFranchiseeIds: targetFranchiseeIds,
    });
  } catch (error: any) {
    console.error('[Unlink Franchisee API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
