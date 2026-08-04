import { adminApp } from '@/lib/firebase-admin';
import { FranchiseeUserSchema } from '@/lib/franchisee-schema';
import { z } from 'zod';

export type FranchiseeUserInput = z.infer<typeof FranchiseeUserSchema>;

/**
 * Creates or updates Firebase Auth users, updates Firestore `users/{uid}` documents,
 * and returns the list of linked user UIDs.
 */
export async function syncFranchiseeUsers(
  franchiseeId: string,
  franchiseeName: string,
  users: FranchiseeUserInput[]
): Promise<string[]> {
  if (!users || users.length === 0) return [];

  const auth = adminApp.auth();
  const db = adminApp.firestore();
  const linkedUserIds: string[] = [];
  const nowStr = new Date().toISOString();

  for (const userInput of users) {
    const email = userInput.email.trim().toLowerCase();
    let uid = userInput.uid || '';

    let existingAuthUser = null;
    try {
      existingAuthUser = await auth.getUserByEmail(email);
      uid = existingAuthUser.uid;
    } catch (err: any) {
      // User not found in Auth
    }

    if (!existingAuthUser) {
      // Mandatory check: password required for new user creation
      if (!userInput.password || userInput.password.trim().length === 0) {
        throw new Error(`Password is required when creating a new user account for ${email}`);
      }

      const displayName =
        userInput.displayName ||
        [userInput.firstName, userInput.lastName].filter(Boolean).join(' ') ||
        franchiseeName;

      const createdAuthUser = await auth.createUser({
        email,
        password: userInput.password,
        displayName,
      });

      uid = createdAuthUser.uid;
    } else {
      // User exists: update password and/or display name if provided
      const updateData: { password?: string; displayName?: string } = {};
      if (userInput.password && userInput.password.trim().length > 0) {
        updateData.password = userInput.password;
      }
      const displayName =
        userInput.displayName ||
        [userInput.firstName, userInput.lastName].filter(Boolean).join(' ');
      if (displayName) {
        updateData.displayName = displayName;
      }

      if (Object.keys(updateData).length > 0) {
        await auth.updateUser(uid, updateData);
      }
    }

    // Sync Firestore `users/{uid}` document
    const userDocRef = db.collection('users').doc(uid);
    const existingDoc = await userDocRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() || {} : {};

    const firstName =
      userInput.firstName !== undefined
        ? userInput.firstName
        : existingData.firstName || '';
    const lastName =
      userInput.lastName !== undefined
        ? userInput.lastName
        : existingData.lastName || '';
    const displayName =
      userInput.displayName !== undefined
        ? userInput.displayName
        : existingData.displayName ||
          [firstName, lastName].filter(Boolean).join(' ') ||
          franchiseeName;

    // Accumulate all linked franchisee IDs (existing linked IDs + payload linked IDs + current franchiseeId)
    const existingLinkedFranchisees: string[] = existingData.linkedFranchiseeIds || (existingData.franchiseeId ? [String(existingData.franchiseeId)] : []);
    const payloadLinkedFranchisees: string[] = (userInput.linkedFranchiseeIds || []).map(String);
    const accumulatedLinkedFranchiseeIds = Array.from(
      new Set([...existingLinkedFranchisees, ...payloadLinkedFranchisees, String(franchiseeId)])
    ).filter(Boolean);

    const updatedUserObj: Record<string, any> = {
      uid,
      email,
      displayName,
      firstName,
      lastName,
      activeRole: userInput.role || existingData.activeRole || 'Franchisee',
      assignedRoles: existingData.assignedRoles || [userInput.role || 'Franchisee'],
      defaultRole: existingData.defaultRole || userInput.role || 'Franchisee',
      franchiseeId: existingData.franchiseeId || String(franchiseeId),
      franchiseeInternalId: existingData.franchiseeInternalId || String(franchiseeId),
      franchisee: existingData.franchisee || franchiseeName,
      linkedFranchiseeIds: accumulatedLinkedFranchiseeIds,
      updatedAt: nowStr,
    };

    if (userInput.personalEmail !== undefined) {
      updatedUserObj.personalEmail = userInput.personalEmail;
    }
    if (userInput.dateOfBirth !== undefined) {
      updatedUserObj.dateOfBirth = userInput.dateOfBirth;
    }
    if (userInput.businessStartDate !== undefined) {
      updatedUserObj.businessStartDate = userInput.businessStartDate;
    }
    if (userInput.abn !== undefined) {
      updatedUserObj.abn = userInput.abn;
    }
    if (userInput.typeOfOwner !== undefined) {
      updatedUserObj.typeOfOwner = userInput.typeOfOwner;
    }

    if (userInput.nextOfKin !== undefined) {
      updatedUserObj.nextOfKin = {
        name: userInput.nextOfKin.name ?? existingData.nextOfKin?.name ?? '',
        mobile: userInput.nextOfKin.mobile ?? existingData.nextOfKin?.mobile ?? '',
        relationship: userInput.nextOfKin.relationship ?? existingData.nextOfKin?.relationship ?? '',
      };
    }

    if (userInput.address !== undefined) {
      updatedUserObj.address = {
        address1: userInput.address.address1 ?? existingData.address?.address1 ?? '',
        address2: userInput.address.address2 ?? existingData.address?.address2 ?? '',
        suburb: userInput.address.suburb ?? existingData.address?.suburb ?? '',
        state: userInput.address.state ?? existingData.address?.state ?? '',
        postcode: userInput.address.postcode ?? existingData.address?.postcode ?? '',
      };
    }

    if (
      userInput.bankAccountName !== undefined ||
      userInput.bsbNumber !== undefined ||
      userInput.bankAccountNumber !== undefined ||
      userInput.bankAccount !== undefined
    ) {
      const bankAccountName =
        userInput.bankAccount?.bankAccountName ??
        userInput.bankAccountName ??
        existingData.bankAccountName ??
        existingData.bankAccount?.bankAccountName ??
        '';
      const bsbNumber =
        userInput.bankAccount?.bsbNumber ??
        userInput.bsbNumber ??
        existingData.bsbNumber ??
        existingData.bankAccount?.bsbNumber ??
        '';
      const bankAccountNumber =
        userInput.bankAccount?.bankAccountNumber ??
        userInput.bankAccountNumber ??
        existingData.bankAccountNumber ??
        existingData.bankAccount?.bankAccountNumber ??
        '';

      updatedUserObj.bankAccountName = bankAccountName;
      updatedUserObj.bsbNumber = bsbNumber;
      updatedUserObj.bankAccountNumber = bankAccountNumber;
      updatedUserObj.bankAccount = {
        bankAccountName,
        bsbNumber,
        bankAccountNumber,
      };
    }

    if (!existingDoc.exists) {
      updatedUserObj.createdAt = nowStr;
    }

    await userDocRef.set(updatedUserObj, { merge: true });
    linkedUserIds.push(uid);
  }

  return linkedUserIds;
}
