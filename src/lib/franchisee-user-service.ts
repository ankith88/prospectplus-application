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

    // Build/accumulate linkedFranchisees array of objects for UI header switcher
    const existingLinkedObjects: Array<{ franchiseeId: string; franchiseeName: string; relationship: 'owner' | 'investor'; isDefault?: boolean }> = existingData.linkedFranchisees || [];
    const currentRelationship: 'owner' | 'investor' = (userInput.typeOfOwner === 'investor' || (userInput as any).relationship === 'investor' || (userInput as any).franchiseeRole === 'investor') ? 'investor' : 'owner';

    let mergedLinkedObjects = [...existingLinkedObjects];
    const existingObjIdx = mergedLinkedObjects.findIndex(f => String(f.franchiseeId) === String(franchiseeId));
    if (existingObjIdx >= 0) {
      mergedLinkedObjects[existingObjIdx] = {
        ...mergedLinkedObjects[existingObjIdx],
        franchiseeName: franchiseeName || mergedLinkedObjects[existingObjIdx].franchiseeName,
        relationship: currentRelationship,
      };
    } else {
      mergedLinkedObjects.push({
        franchiseeId: String(franchiseeId),
        franchiseeName: franchiseeName,
        relationship: currentRelationship,
        isDefault: mergedLinkedObjects.length === 0,
      });
    }

    // Ensure all accumulated linked franchisee IDs have corresponding metadata objects
    for (const fId of accumulatedLinkedFranchiseeIds) {
      if (!mergedLinkedObjects.some(o => String(o.franchiseeId) === String(fId))) {
        try {
          const franSnap = await db.collection('franchisees').doc(String(fId)).get();
          const fName = franSnap.exists ? (franSnap.data()?.name || String(fId)) : String(fId);
          mergedLinkedObjects.push({
            franchiseeId: String(fId),
            franchiseeName: fName,
            relationship: 'owner',
            isDefault: mergedLinkedObjects.length === 0,
          });
        } catch (e) {
          mergedLinkedObjects.push({
            franchiseeId: String(fId),
            franchiseeName: String(fId),
            relationship: 'owner',
            isDefault: mergedLinkedObjects.length === 0,
          });
        }
      }
    }

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
      linkedFranchisees: mergedLinkedObjects,
      activeFranchiseeId: existingData.activeFranchiseeId || (mergedLinkedObjects[0] ? mergedLinkedObjects[0].franchiseeId : String(franchiseeId)),
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

    // Merge any unknown/custom fields provided in userInput into updatedUserObj
    const knownKeys = new Set([
      'uid', 'email', 'password', 'firstName', 'lastName', 'displayName',
      'personalEmail', 'dateOfBirth', 'nextOfKin', 'businessStartDate',
      'address', 'abn', 'typeOfOwner', 'bankAccountName', 'bsbNumber',
      'bankAccountNumber', 'bankAccount', 'linkedFranchiseeIds', 'role'
    ]);
    for (const [key, value] of Object.entries(userInput)) {
      if (!knownKeys.has(key) && value !== undefined) {
        updatedUserObj[key] = value;
      }
    }

    if (!existingDoc.exists) {
      updatedUserObj.createdAt = nowStr;
    }

    await userDocRef.set(updatedUserObj, { merge: true });
    linkedUserIds.push(uid);
  }

  return linkedUserIds;
}
