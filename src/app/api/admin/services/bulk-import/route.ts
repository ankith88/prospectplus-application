import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

function categorizeService(code: string, name: string): string {
  const c = (code || '').toLowerCase();
  const n = (name || '').toLowerCase();

  // Mail & PO
  if (
    c.includes('ampo') ||
    c.includes('pmpo') ||
    c.includes('amstreet') ||
    n.includes('mail processing') ||
    n.includes('redirection')
  ) {
    return 'Mail & PO';
  }

  // Banking
  if (
    c === 'cb' ||
    c === 'eb' ||
    c.includes('billpay') ||
    c === 'mb'
  ) {
    return 'Banking';
  }

  // Hand to Hand & Delivery
  if (
    c.includes('h2h') ||
    n.includes('goods delivery') ||
    n.includes('on demand')
  ) {
    return 'Hand to Hand & Delivery';
  }

  // Bundled Packages
  if (n.startsWith('package:') || n.startsWith('neopost package:')) {
    return 'Bundled Packages';
  }

  return 'Other';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { services, requestorUid } = body;

    if (!services || !Array.isArray(services)) {
      return NextResponse.json(
        { success: false, message: "The request payload must contain a 'services' array." },
        { status: 400 }
      );
    }

    const db = getFirestore(adminApp);

    // Strict Authorization Check: Only Super Admins and exact 'admin' role users can upload
    let isAuthorized = false;

    if (requestorUid) {
      if (SUPER_ADMIN_UIDS.includes(requestorUid)) {
        isAuthorized = true;
      } else {
        const userDoc = await db.collection('users').doc(requestorUid).get();
        if (userDoc.exists) {
          const uData = userDoc.data() || {};
          const role = String(uData.role || uData.activeRole || uData.defaultRole || '').trim().toLowerCase();
          const assignedRoles = Array.isArray(uData.assignedRoles)
            ? uData.assignedRoles.map((r: any) => String(r).trim().toLowerCase())
            : [];

          const allowedRoles = ['admin', 'super_admin', 'super admin', 'super user'];

          if (
            uData.isSuperAdmin === true ||
            allowedRoles.includes(role) ||
            assignedRoles.some((r) => allowedRoles.includes(r))
          ) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Only Super Admins and Admins can upload services.' },
        { status: 403 }
      );
    }

    const batchSize = 400;
    const batches: FirebaseFirestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentBatchCount = 0;
    const errors: any[] = [];
    const importedIds = new Set<string>();

    for (const service of services) {
      if (!service.id || !service.code || !service.netsuiteItemName) {
        errors.push({ service, error: 'Missing required fields (id, code, or netsuiteItemName)' });
        continue;
      }

      const idStr = String(service.id).trim();
      importedIds.add(idStr);

      const docRef = db.collection('services').doc(idStr);
      const category = service.category || categorizeService(service.code, service.netsuiteItemName);

      const partnerCommissionAccount = service.partnerCommissionAccount ?? null;
      const partnerCommissionModel = service.partnerCommissionModel ?? null;
      const partnerCommissionRate = service.partnerCommissionRate !== undefined && service.partnerCommissionRate !== '' ? service.partnerCommissionRate : null;
      const basePrice = service.basePrice !== undefined && service.basePrice !== '' ? (isNaN(Number(service.basePrice)) ? service.basePrice : Number(service.basePrice)) : null;
      const gstApplicable = service.gstApplicable ?? null;

      currentBatch.set(docRef, {
        id: idStr,
        code: service.code,
        netsuiteItemName: service.netsuiteItemName,
        netsuiteItemId: service.netsuiteItemId ? String(service.netsuiteItemId) : null,
        category,
        partnerCommissionAccount,
        partnerCommissionModel,
        partnerCommissionRate,
        basePrice,
        gstApplicable,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      currentBatchCount++;

      if (currentBatchCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentBatchCount = 0;
      }
    }

    if (currentBatchCount > 0) {
      batches.push(currentBatch);
    }

    for (const batch of batches) {
      await batch.commit();
    }

    // Soft delete any existing services not in the imported list
    try {
      const existingServicesSnapshot = await db.collection('services').where('isActive', '==', true).get();
      let deleteBatch = db.batch();
      let deleteBatchCount = 0;
      const deleteBatches: FirebaseFirestore.WriteBatch[] = [];

      for (const doc of existingServicesSnapshot.docs) {
        if (!importedIds.has(doc.id)) {
          deleteBatch.update(doc.ref, {
            isActive: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          deleteBatchCount++;

          if (deleteBatchCount === batchSize) {
            deleteBatches.push(deleteBatch);
            deleteBatch = db.batch();
            deleteBatchCount = 0;
          }
        }
      }

      if (deleteBatchCount > 0) {
        deleteBatches.push(deleteBatch);
      }

      for (const batch of deleteBatches) {
        await batch.commit();
      }
    } catch (softDeleteErr: any) {
      console.warn('Warning during soft-deleting missing services:', softDeleteErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${importedIds.size} services.`,
      errors,
    });
  } catch (error: any) {
    console.error('Error in bulk import services API:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to import services' },
      { status: 500 }
    );
  }
}
