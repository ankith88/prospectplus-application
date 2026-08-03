import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { franchiseeId, newOwnerEmail, newOwnerName, oldOwnerPersonalEmail } = body;

    if (!franchiseeId || !newOwnerEmail) {
      return NextResponse.json({ success: false, message: 'franchiseeId and newOwnerEmail are required' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const auth = adminApp.auth();

    const franRef = db.collection('franchisees').doc(String(franchiseeId));
    const franDoc = await franRef.get();

    if (!franDoc.exists) {
      return NextResponse.json({ success: false, message: `Franchisee document ${franchiseeId} not found` }, { status: 404 });
    }

    const franData = franDoc.data() || {};
    const franchiseeName = franData.name || 'Franchisee';
    const nowStr = new Date().toISOString();

    let currentOwnerUid = franData.currentOwnerUserId;
    let currentOwnerDoc: admin.firestore.DocumentSnapshot | null = null;

    if (currentOwnerUid) {
      currentOwnerDoc = await db.collection('users').doc(currentOwnerUid).get();
    }
    if (!currentOwnerDoc || !currentOwnerDoc.exists) {
      const userQuery = await db.collection('users').where('email', '==', newOwnerEmail).get();
      if (!userQuery.empty) {
        currentOwnerDoc = userQuery.docs[0];
        currentOwnerUid = currentOwnerDoc.id;
      }
    }

    // 1. Migrate Old Owner Account if personal email provided
    if (oldOwnerPersonalEmail && currentOwnerDoc && currentOwnerDoc.exists) {
      const oldUserData = currentOwnerDoc.data() || {};
      
      try {
        await auth.updateUser(currentOwnerUid, { email: oldOwnerPersonalEmail });
      } catch (authErr: any) {
        console.warn(`[Transfer API] Auth update warning: ${authErr.message}`);
      }

      const existingHistory = oldUserData.historicalFranchiseeIds || [];
      const updatedHistory = Array.from(new Set([...existingHistory, String(franchiseeId)]));

      await currentOwnerDoc.ref.update({
        email: oldOwnerPersonalEmail,
        historicalFranchiseeIds: updatedHistory,
        franchiseeId: admin.firestore.FieldValue.delete(),
        franchiseeInternalId: admin.firestore.FieldValue.delete(),
        updatedAt: nowStr,
      });
    }

    // 2. Fetch or create New Owner Auth User
    let newOwnerUid = '';
    try {
      const existingAuthUser = await auth.getUserByEmail(newOwnerEmail);
      newOwnerUid = existingAuthUser.uid;
    } catch (err: any) {
      const newAuthUser = await auth.createUser({
        email: newOwnerEmail,
        displayName: newOwnerName || franchiseeName,
      });
      newOwnerUid = newAuthUser.uid;
    }

    // 3. Update New Owner User Profile
    const newOwnerUserRef = db.collection('users').doc(newOwnerUid);
    await newOwnerUserRef.set({
      uid: newOwnerUid,
      email: newOwnerEmail,
      displayName: newOwnerName || franData.mainContact || franchiseeName,
      firstName: (newOwnerName || '').split(' ')[0] || franchiseeName,
      lastName: (newOwnerName || '').split(' ').slice(1).join(' ') || '',
      activeRole: 'Franchisee',
      assignedRoles: ['Franchisee'],
      defaultRole: 'Franchisee',
      franchiseeId: String(franchiseeId),
      franchiseeInternalId: String(franchiseeId),
      franchisee: franchiseeName,
      updatedAt: nowStr,
    }, { merge: true });

    // 4. Update Franchisee Document
    const currentHistory = franData.ownershipHistory || [];
    const newHistoryRecord = {
      userId: currentOwnerUid || 'unknown',
      ownerName: franData.mainContact || 'Former Owner',
      sharedEmail: newOwnerEmail,
      personalEmail: oldOwnerPersonalEmail || '',
      startDate: franData.updatedAt || nowStr,
      endDate: nowStr,
    };

    const existingLinked: string[] = franData.linkedUserIds || [];
    const updatedLinked = Array.from(new Set([...existingLinked, newOwnerUid]));

    await franRef.update({
      currentOwnerUserId: newOwnerUid,
      linkedUserIds: updatedLinked,
      linkedUserEmail: newOwnerEmail,
      mainContact: newOwnerName || franData.mainContact || franchiseeName,
      ownershipHistory: oldOwnerPersonalEmail ? [...currentHistory, newHistoryRecord] : currentHistory,
      updatedAt: nowStr,
    });

    return NextResponse.json({
      success: true,
      message: `Franchisee ownership transfer completed for franchise ${franchiseeId}`,
      newOwnerUid,
      oldOwnerUid: currentOwnerUid || null,
    });

  } catch (error: any) {
    console.error('[API /admin/transfer-franchisee-ownership] error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
