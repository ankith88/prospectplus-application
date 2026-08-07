"use client";

import { firestore } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { Lead } from '@/lib/types';
import { logActivity } from '@/services/firebase';

/**
 * Converts a Parent Lead in the 'leads' collection into a Parent Signed Customer in the 'companies' collection,
 * and links existing and new child customers under this Parent Customer.
 */
export async function convertParentLeadToSignedCustomer(parentLeadId: string, childLeadOrCompanyIds?: string[]) {
    try {
        if (!parentLeadId) throw new Error("parentLeadId is required");

        // 1. Check leads collection
        const leadRef = doc(firestore, 'leads', parentLeadId);
        const leadSnap = await getDoc(leadRef);

        let parentData: any = null;
        let isExistingCompany = false;

        if (leadSnap.exists()) {
            parentData = leadSnap.data();
        } else {
            // Check companies collection if already converted
            const compRef = doc(firestore, 'companies', parentLeadId);
            const compSnap = await getDoc(compRef);
            if (compSnap.exists()) {
                parentData = compSnap.data();
                isExistingCompany = true;
            }
        }

        if (!parentData) {
            throw new Error(`Parent Lead record with ID '${parentLeadId}' not found.`);
        }

        const nowIso = new Date().toISOString();

        // 2. Ensure Parent Signed Customer exists in 'companies' collection
        const companyRef = doc(firestore, 'companies', parentLeadId);

        const parentCompanyPayload: any = {
            id: parentLeadId,
            companyName: parentData.companyName || parentData.company_name || 'Parent Corporate Account',
            customerStatus: 'Signed Customer',
            status: 'Signed Customer',
            isParent: true,
            accountType: 'parent',
            prospectPlusId: parentData.prospectPlusId || parentLeadId,
            accountManagerAssigned: parentData.accountManagerAssigned || 'MultiSite Account Manager',
            franchisee: parentData.franchisee || 'MailPlus Pty Ltd',
            franchiseeName: parentData.franchiseeName || 'MailPlus Pty Ltd',
            address: parentData.address || {
                street: parentData.street || parentData.address1 || '',
                city: parentData.city || '',
                state: parentData.state || '',
                zip: parentData.zip || ''
            },
            updatedAt: nowIso
        };

        await setDoc(companyRef, parentCompanyPayload, { merge: true });

        // Update leads collection status if lead document exists
        if (leadSnap.exists()) {
            await updateDoc(leadRef, {
                customerStatus: 'Signed Customer',
                status: 'Signed Customer',
                isParent: true,
                convertedToCompanyAt: nowIso,
                updatedAt: nowIso
            });
        }

        // 3. Link child leads / companies if specified
        if (childLeadOrCompanyIds && childLeadOrCompanyIds.length > 0) {
            for (const childId of childLeadOrCompanyIds) {
                if (!childId || childId === parentLeadId) continue;

                // Check companies
                const childCompRef = doc(firestore, 'companies', childId);
                const childCompSnap = await getDoc(childCompRef);
                if (childCompSnap.exists()) {
                    await updateDoc(childCompRef, {
                        parentLeadId: parentLeadId,
                        parentCompanyId: parentLeadId,
                        isChildSite: true,
                        updatedAt: nowIso
                    });
                }

                // Check leads
                const childLeadRef = doc(firestore, 'leads', childId);
                const childLeadSnap = await getDoc(childLeadRef);
                if (childLeadSnap.exists()) {
                    await updateDoc(childLeadRef, {
                        parentLeadId: parentLeadId,
                        parentCompanyId: parentLeadId,
                        isChildSite: true,
                        updatedAt: nowIso
                    });
                }

                await logActivity(childId, {
                    type: 'Update',
                    notes: `Linked as Child Site under Parent Account: ${parentCompanyPayload.companyName} (${parentLeadId}).`
                });
            }
        }

        await logActivity(parentLeadId, {
            type: 'Update',
            notes: `Parent Lead converted to Signed Customer (${parentCompanyPayload.companyName}) with linked child accounts.`
        });

        return {
            success: true,
            parentId: parentLeadId,
            companyName: parentCompanyPayload.companyName
        };
    } catch (error: any) {
        console.error("Failed to convert parent lead to signed customer:", error);
        return {
            success: false,
            error: error.message || "Failed to convert parent lead to signed customer."
        };
    }
}
