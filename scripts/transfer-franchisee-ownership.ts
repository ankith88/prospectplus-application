import { adminApp } from '../src/lib/firebase-admin';
import * as admin from 'firebase-admin';

interface TransferOptions {
  franchiseeId: string;
  oldOwnerPersonalEmail: string;
  newOwnerName: string;
  newOwnerEmail: string; // shared mailbox email, e.g., alexandria@mailplus.com.au
}

/**
 * Utility to execute a Franchisee Ownership Transfer when a franchise is sold.
 * 
 * 1. Preserves old franchisee's account & historic activity by migrating their Auth/Firestore email 
 *    to their personal address (e.g., tanvi.hegde@mailplus.com.au) and recording the franchise ID in `historicalFranchiseeIds`.
 * 2. Re-assigns the shared mailbox (e.g., alexandria@mailplus.com.au) to the new owner's user account linked to the franchise.
 * 3. Updates the franchisee document's `currentOwnerUserId`, `linkedUserIds`, and `ownershipHistory`.
 */
export async function transferFranchiseeOwnership(options: TransferOptions) {
  const db = adminApp.firestore();
  const auth = adminApp.auth();
  const { franchiseeId, oldOwnerPersonalEmail, newOwnerName, newOwnerEmail } = options;

  console.log(`\n--- Starting Franchisee Ownership Transfer for Franchise ${franchiseeId} ---`);

  // 1. Load Franchisee document
  const franRef = db.collection('franchisees').doc(franchiseeId);
  const franDoc = await franRef.get();
  if (!franDoc.exists) {
    throw new Error(`Franchisee document ${franchiseeId} does not exist!`);
  }
  const franData = franDoc.data() || {};
  const franchiseeName = franData.name || 'Franchisee';

  // 2. Find Current Owner User
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

  const nowStr = new Date().toISOString();

  // 3. Handle Old Owner Account Migration
  if (currentOwnerDoc && currentOwnerDoc.exists) {
    const oldUserData = currentOwnerDoc.data() || {};
    console.log(`Migrating old owner account (${currentOwnerUid} / ${oldUserData.email}) -> ${oldOwnerPersonalEmail}`);

    // Update Firebase Auth Email for Old Owner so they can continue signing in with personal email & same credentials
    try {
      await auth.updateUser(currentOwnerUid, { email: oldOwnerPersonalEmail });
      console.log(`Updated Firebase Auth email for UID ${currentOwnerUid} to ${oldOwnerPersonalEmail}`);
    } catch (authErr: any) {
      console.warn(`Auth update warning: ${authErr.message}`);
    }

    // Update Firestore User profile for Old Owner
    const existingHistory = oldUserData.historicalFranchiseeIds || [];
    const updatedHistory = Array.from(new Set([...existingHistory, franchiseeId]));

    await currentOwnerDoc.ref.update({
      email: oldOwnerPersonalEmail,
      historicalFranchiseeIds: updatedHistory,
      franchiseeId: admin.firestore.FieldValue.delete(), // Unlink active franchise
      updatedAt: nowStr,
    });
    console.log(`Updated Firestore user doc for old owner ${currentOwnerUid}`);
  } else {
    console.log(`No active user doc found currently linked to franchise ${franchiseeId}. Proceeding to provision new owner...`);
  }

  // 4. Provision / Link New Owner Account
  let newOwnerUid: string = '';
  try {
    const existingAuthUser = await auth.getUserByEmail(newOwnerEmail);
    newOwnerUid = existingAuthUser.uid;
    console.log(`Found existing Auth user for ${newOwnerEmail} (UID: ${newOwnerUid})`);
  } catch (err: any) {
    // Create new Auth user if not existing
    console.log(`Creating new Auth user for ${newOwnerEmail}...`);
    const newAuthUser = await auth.createUser({
      email: newOwnerEmail,
      displayName: newOwnerName,
    });
    newOwnerUid = newAuthUser.uid;
  }

  // Update or create user profile for New Owner in Firestore
  const newOwnerUserRef = db.collection('users').doc(newOwnerUid);
  await newOwnerUserRef.set({
    uid: newOwnerUid,
    email: newOwnerEmail,
    displayName: newOwnerName,
    firstName: newOwnerName.split(' ')[0] || newOwnerName,
    lastName: newOwnerName.split(' ').slice(1).join(' ') || '',
    activeRole: 'Franchisee',
    assignedRoles: ['Franchisee'],
    defaultRole: 'Franchisee',
    franchiseeId: franchiseeId,
    franchiseeInternalId: franchiseeId,
    franchisee: franchiseeName,
    updatedAt: nowStr,
  }, { merge: true });
  console.log(`Set user profile for new owner ${newOwnerUid} (${newOwnerEmail})`);

  // 5. Update Franchisee Document
  const currentHistory = franData.ownershipHistory || [];
  const newHistoryRecord = {
    userId: currentOwnerUid || 'unknown',
    ownerName: franData.mainContact || 'Former Owner',
    sharedEmail: newOwnerEmail,
    personalEmail: oldOwnerPersonalEmail,
    startDate: franData.updatedAt || nowStr,
    endDate: nowStr,
  };

  await franRef.update({
    currentOwnerUserId: newOwnerUid,
    linkedUserIds: [newOwnerUid],
    linkedUserEmail: newOwnerEmail,
    mainContact: newOwnerName,
    ownershipHistory: [...currentHistory, newHistoryRecord],
    updatedAt: nowStr,
  });

  console.log(`✅ Successfully completed ownership transfer for Franchise ${franchiseeId}!`);
  console.log(`Old owner preserved under: ${oldOwnerPersonalEmail} (UID: ${currentOwnerUid})`);
  console.log(`New owner active under: ${newOwnerEmail} (UID: ${newOwnerUid})`);
}
