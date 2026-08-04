import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.PROSPECTPLUS_API_KEY;

    if (validApiKey && apiKey !== validApiKey) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();
    const uid = searchParams.get('uid')?.trim();
    const franchiseeId = searchParams.get('franchiseeId')?.trim();

    if (!email && !uid) {
      return NextResponse.json({
        success: false,
        message: 'Query parameter "email" or "uid" is required. E.g. /api/users/check?email=user@mailplus.com.au'
      }, { status: 400 });
    }

    const auth = adminApp.auth();
    const db = adminApp.firestore();

    let authUser: any = null;
    let targetUid = uid || '';

    // 1. Check Firebase Auth
    if (email) {
      try {
        authUser = await auth.getUserByEmail(email);
        targetUid = authUser.uid;
      } catch (err) {
        // User not found in Firebase Auth
      }
    } else if (uid) {
      try {
        authUser = await auth.getUser(uid);
        targetUid = authUser.uid;
      } catch (err) {
        // User not found in Firebase Auth
      }
    }

    // 2. Check Firestore users collection
    let userDocData: any = null;
    if (targetUid) {
      const docSnap = await db.collection('users').doc(targetUid).get();
      if (docSnap.exists) {
        userDocData = docSnap.data();
      }
    }

    // Fallback: search Firestore by email if UID was not obtained from Auth
    if (!userDocData && email) {
      const querySnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!querySnap.empty) {
        userDocData = querySnap.docs[0].data();
        if (!targetUid) targetUid = querySnap.docs[0].id;
      }
    }

    const exists = !!(authUser || userDocData);

    // If franchiseeId is provided for verification, check if linked to that franchisee
    let isLinkedToFranchisee = undefined;
    if (userDocData && franchiseeId) {
      isLinkedToFranchisee =
        String(userDocData.franchiseeId) === franchiseeId ||
        String(userDocData.franchiseeInternalId) === franchiseeId;
    }

    if (!exists) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: `No user profile found for ${email || uid}`,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      inAuth: !!authUser,
      inFirestore: !!userDocData,
      isLinkedToFranchisee,
      user: {
        uid: targetUid,
        email: email || authUser?.email || userDocData?.email,
        personalEmail: userDocData?.personalEmail || null,
        displayName: authUser?.displayName || userDocData?.displayName || null,
        firstName: userDocData?.firstName || null,
        lastName: userDocData?.lastName || null,
        activeRole: userDocData?.activeRole || null,
        franchiseeId: userDocData?.franchiseeId || null,
        franchiseeInternalId: userDocData?.franchiseeInternalId || null,
        franchisee: userDocData?.franchisee || null,
        typeOfOwner: userDocData?.typeOfOwner || null,
        abn: userDocData?.abn || null,
        businessStartDate: userDocData?.businessStartDate || null,
        dateOfBirth: userDocData?.dateOfBirth || null,
        nextOfKin: userDocData?.nextOfKin || null,
        address: userDocData?.address || null,
        bankAccountName: userDocData?.bankAccountName || userDocData?.bankAccount?.bankAccountName || null,
        bsbNumber: userDocData?.bsbNumber || userDocData?.bankAccount?.bsbNumber || null,
        bankAccountNumber: userDocData?.bankAccountNumber || userDocData?.bankAccount?.bankAccountNumber || null,
        bankAccount: userDocData?.bankAccount || (userDocData?.bankAccountName ? {
          bankAccountName: userDocData.bankAccountName,
          bsbNumber: userDocData.bsbNumber,
          bankAccountNumber: userDocData.bankAccountNumber,
        } : null),
        createdAt: userDocData?.createdAt || authUser?.metadata?.creationTime || null,
        updatedAt: userDocData?.updatedAt || null,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /users/check GET] error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
