"use client"

import { firestore } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { Lead } from '@/lib/types'
import { logActivity } from '@/services/firebase'

export interface BulkLinkResult {
  success: boolean
  linkedCount: number
  parentName?: string
  error?: string
}

export interface CsvRowValidation {
  rowNumber: number
  childInput: string
  parentInput: string
  status: 'valid' | 'conflict' | 'error'
  childLead?: Lead
  parentLead?: Lead
  message: string
}

/**
 * Bulk links a set of child accounts (leads or companies) to a designated Parent Customer account.
 */
export async function bulkLinkLeadsToParent(
  parentLeadId: string,
  childIds: string[],
  userEmail?: string
): Promise<BulkLinkResult> {
  try {
    if (!parentLeadId) {
      return { success: false, linkedCount: 0, error: 'Parent Customer ID is required.' }
    }
    if (!childIds || childIds.length === 0) {
      return { success: false, linkedCount: 0, error: 'At least one child customer must be selected.' }
    }

    // 1. Resolve Parent Record (check leads first, then companies)
    const parentLeadRef = doc(firestore, 'leads', parentLeadId)
    const parentLeadSnap = await getDoc(parentLeadRef)

    let parentData: any = null
    if (parentLeadSnap.exists()) {
      parentData = parentLeadSnap.data()
    } else {
      const parentCompRef = doc(firestore, 'companies', parentLeadId)
      const parentCompSnap = await getDoc(parentCompRef)
      if (parentCompSnap.exists()) {
        parentData = parentCompSnap.data()
      }
    }

    if (!parentData) {
      return { success: false, linkedCount: 0, error: `Parent Customer with ID '${parentLeadId}' was not found.` }
    }

    const parentName = parentData.companyName || parentData.company_name || 'Parent Account'
    const nowIso = new Date().toISOString()

    // 2. Ensure Parent Record has parent flags set
    const parentCompanyRef = doc(firestore, 'companies', parentLeadId)
    await setDoc(
      parentCompanyRef,
      {
        id: parentLeadId,
        companyName: parentName,
        isParent: true,
        isParentLead: true,
        isMultisite: true,
        accountType: 'parent',
        bucket: 'multisite',
        campaign: 'MultiSite',
        updatedAt: nowIso,
      },
      { merge: true }
    )

    if (parentLeadSnap.exists()) {
      await updateDoc(parentLeadRef, {
        isParent: true,
        isParentLead: true,
        isMultisite: true,
        accountType: 'parent',
        bucket: 'multisite',
        campaign: 'MultiSite',
        updatedAt: nowIso,
      })
    }

    // 3. Process children in batches of 400 (Firestore limit is 500 writes per batch)
    const validChildIds = Array.from(new Set(childIds)).filter((id) => id && id !== parentLeadId)
    let processedCount = 0

    const BATCH_SIZE = 400
    for (let i = 0; i < validChildIds.length; i += BATCH_SIZE) {
      const chunk = validChildIds.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(firestore)

      for (const childId of chunk) {
        const childCompRef = doc(firestore, 'companies', childId)
        const childCompSnap = await getDoc(childCompRef)
        if (childCompSnap.exists()) {
          batch.update(childCompRef, {
            parentLeadId: parentLeadId,
            parentCompanyId: parentLeadId,
            isChildSite: true,
            bucket: 'multisite',
            campaign: 'MultiSite',
            linkedByName: userEmail || 'Superadmin',
            updatedAt: nowIso,
          })
        }

        const childLeadRef = doc(firestore, 'leads', childId)
        const childLeadSnap = await getDoc(childLeadRef)
        if (childLeadSnap.exists()) {
          batch.update(childLeadRef, {
            parentLeadId: parentLeadId,
            parentCompanyId: parentLeadId,
            isChildSite: true,
            bucket: 'multisite',
            campaign: 'MultiSite',
            linkedByName: userEmail || 'Superadmin',
            updatedAt: nowIso,
          })
        }
      }

      await batch.commit()
      processedCount += chunk.length

      // Log activity note for each child
      for (const childId of chunk) {
        await logActivity(childId, {
          type: 'Update',
          notes: `Mass-linked as Child Account under Parent Account: ${parentName} (${parentLeadId}) by Superadmin ${userEmail || ''}.`.trim(),
        })
      }
    }

    // 4. Log summary activity on Parent Account
    await logActivity(parentLeadId, {
      type: 'Update',
      notes: `Mass-linked ${processedCount} child accounts under this Parent Account by Superadmin ${userEmail || ''}.`.trim(),
    })

    return {
      success: true,
      linkedCount: processedCount,
      parentName,
    }
  } catch (err: any) {
    console.error('Error executing mass link:', err)
    return {
      success: false,
      linkedCount: 0,
      error: err.message || 'Failed to mass link customers.',
    }
  }
}

/**
 * Bulk unlinks child accounts from any parent customer.
 */
export async function bulkUnlinkLeads(
  childIds: string[],
  userEmail?: string
): Promise<BulkLinkResult> {
  try {
    if (!childIds || childIds.length === 0) {
      return { success: false, linkedCount: 0, error: 'No child accounts specified for unlinking.' }
    }

    const uniqueIds = Array.from(new Set(childIds)).filter(Boolean)
    const nowIso = new Date().toISOString()

    const BATCH_SIZE = 400
    let unlinkedCount = 0

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + BATCH_SIZE)
      const batch = writeBatch(firestore)

      for (const childId of chunk) {
        const childCompRef = doc(firestore, 'companies', childId)
        const childCompSnap = await getDoc(childCompRef)
        if (childCompSnap.exists()) {
          batch.update(childCompRef, {
            parentLeadId: '',
            parentCompanyId: '',
            isChildSite: false,
            updatedAt: nowIso,
          })
        }

        const childLeadRef = doc(firestore, 'leads', childId)
        const childLeadSnap = await getDoc(childLeadRef)
        if (childLeadSnap.exists()) {
          batch.update(childLeadRef, {
            parentLeadId: '',
            parentCompanyId: '',
            isChildSite: false,
            updatedAt: nowIso,
          })
        }
      }

      await batch.commit()
      unlinkedCount += chunk.length

      for (const childId of chunk) {
        await logActivity(childId, {
          type: 'Update',
          notes: `Unlinked from Parent Account by Superadmin ${userEmail || ''}.`.trim(),
        })
      }
    }

    return {
      success: true,
      linkedCount: unlinkedCount,
    }
  } catch (err: any) {
    console.error('Error unlinking accounts:', err)
    return {
      success: false,
      linkedCount: 0,
      error: err.message || 'Failed to unlink accounts.',
    }
  }
}

/**
 * Validates parsed CSV rows against all available leads in system.
 */
export function validateCsvRows(
  rows: Array<{ childIdentifier: string; parentIdentifier: string }>,
  allLeads: Lead[]
): CsvRowValidation[] {
  const leadLookupMap = new Map<string, Lead>()

  allLeads.forEach((lead) => {
    if (lead.id) leadLookupMap.set(lead.id.toLowerCase(), lead)
    if (lead.prospectPlusId) leadLookupMap.set(lead.prospectPlusId.toLowerCase(), lead)
    if (lead.companyName) leadLookupMap.set(lead.companyName.toLowerCase().trim(), lead)
    if ((lead as any).email) leadLookupMap.set((lead as any).email.toLowerCase().trim(), lead)
  })

  return rows.map((row, index) => {
    const rowNumber = index + 1
    const childInput = (row.childIdentifier || '').trim()
    const parentInput = (row.parentIdentifier || '').trim()

    if (!childInput || !parentInput) {
      return {
        rowNumber,
        childInput,
        parentInput,
        status: 'error',
        message: 'Missing child or parent identifier.',
      }
    }

    const childLead = leadLookupMap.get(childInput.toLowerCase())
    const parentLead = leadLookupMap.get(parentInput.toLowerCase())

    if (!childLead) {
      return {
        rowNumber,
        childInput,
        parentInput,
        status: 'error',
        message: `Child customer '${childInput}' not found in CRM.`,
      }
    }

    if (!parentLead) {
      return {
        rowNumber,
        childInput,
        parentInput,
        status: 'error',
        message: `Parent customer '${parentInput}' not found in CRM.`,
      }
    }

    if (childLead.id === parentLead.id) {
      return {
        rowNumber,
        childInput,
        parentInput,
        status: 'error',
        childLead,
        parentLead,
        message: 'Account cannot be linked to itself as a parent.',
      }
    }

    if (childLead.parentLeadId && childLead.parentLeadId !== parentLead.id) {
      return {
        rowNumber,
        childInput,
        parentInput,
        status: 'conflict',
        childLead,
        parentLead,
        message: `Currently linked to parent ID '${childLead.parentLeadId}'. Will be reassigned.`,
      }
    }

    return {
      rowNumber,
      childInput,
      parentInput,
      status: 'valid',
      childLead,
      parentLead,
      message: `Ready to link '${childLead.companyName}' under '${parentLead.companyName}'.`,
    }
  })
}
