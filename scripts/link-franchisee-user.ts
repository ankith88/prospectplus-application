import { adminApp } from '../src/lib/firebase-admin';
import * as admin from 'firebase-admin';

async function linkFranchiseeUser() {
  const db = adminApp.firestore();
  
  const userEmail = 'alexandria@mailplus.com.au';
  const franchiseeId = '1818654';

  console.log(`Linking user ${userEmail} with franchisee doc ${franchiseeId}...`);

  // 1. Fetch user doc
  const userSnap = await db.collection('users').where('email', '==', userEmail).get();
  if (userSnap.empty) {
    throw new Error(`User with email ${userEmail} not found!`);
  }

  const userDoc = userSnap.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();

  console.log(`Found user ${userId} (${userData.firstName} ${userData.lastName})`);

  // 2. Fetch franchisee doc
  const franRef = db.collection('franchisees').doc(franchiseeId);
  const franDoc = await franRef.get();
  if (!franDoc.exists) {
    throw new Error(`Franchisee doc ${franchiseeId} not found!`);
  }

  const franData = franDoc.data() || {};
  const franchiseeName = franData.name || 'Alexandria';

  // 3. Update User profile with franchisee references
  await userDoc.ref.update({
    franchiseeId: franchiseeId,
    franchiseeInternalId: franchiseeId,
    franchisee: franchiseeName,
    updatedAt: new Date().toISOString(),
  });
  console.log(`Updated user profile ${userId}: franchiseeId=${franchiseeId}, franchisee=${franchiseeName}`);

  // 4. Update Franchisee document with user links
  const existingLinkedUsers: string[] = franData.linkedUserIds || [];
  const updatedLinkedUsers = Array.from(new Set([...existingLinkedUsers, userId]));

  await franRef.update({
    currentOwnerUserId: userId,
    linkedUserIds: updatedLinkedUsers,
    linkedUserEmail: userEmail,
    updatedAt: new Date().toISOString(),
  });
  console.log(`Updated franchisee doc ${franchiseeId}: currentOwnerUserId=${userId}, linkedUserIds=${JSON.stringify(updatedLinkedUsers)}`);

  console.log('✅ Linking successfully completed!');
}

linkFranchiseeUser().catch((err) => {
  console.error('❌ Link error:', err);
  process.exit(1);
});
