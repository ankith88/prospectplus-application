import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';

async function checkAdminAuth(requestorUid?: string): Promise<boolean> {
  if (!requestorUid) return false;
  if (SUPER_ADMIN_UIDS.includes(requestorUid)) return true;

  const db = getFirestore(adminApp);
  const userDoc = await db.collection('users').doc(requestorUid).get();
  if (!userDoc.exists) return false;

  const uData = userDoc.data() || {};
  if (uData.isSuperAdmin === true) return true;

  const role = String(uData.role || uData.activeRole || uData.defaultRole || '').trim().toLowerCase();
  const assignedRoles = Array.isArray(uData.assignedRoles)
    ? uData.assignedRoles.map((r: any) => String(r).trim().toLowerCase())
    : [];

  const allowedRoles = [
    'admin',
    'super_admin',
    'super admin',
    'super user',
    'outbound admin',
    'data admin',
    'operations manager',
    'operations',
    'sales manager',
    'finance',
    'finance manager',
    'finanace manager'
  ];

  return allowedRoles.includes(role) || assignedRoles.some((r) => allowedRoles.includes(r));
}

// GET /api/admin/services/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getFirestore(adminApp);
    const docSnap = await db.collection('services').doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    const data = docSnap.data() || {};
    return NextResponse.json({
      success: true,
      service: {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT / PATCH: Update service line item, rates, commission models, or franchisee overrides
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { requestorUid, updates } = body;

    const isAuthorized = await checkAdminAuth(requestorUid);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Updates payload must be an object.' },
        { status: 400 }
      );
    }

    const db = getFirestore(adminApp);
    const docRef = db.collection('services').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    const payload: Record<string, any> = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: requestorUid || 'admin',
    };

    // If basePrice is updated, sync defaultRate as well
    if (updates.basePrice !== undefined) {
      const num = Number(updates.basePrice);
      payload.basePrice = isNaN(num) ? 0 : num;
      payload.defaultRate = payload.basePrice;
    }

    if (updates.defaultRate !== undefined && updates.basePrice === undefined) {
      const num = Number(updates.defaultRate);
      payload.basePrice = isNaN(num) ? 0 : num;
      payload.defaultRate = payload.basePrice;
    }

    if (updates.isFixedRate !== undefined) {
      payload.isFixedRate = Boolean(updates.isFixedRate);
    }

    if (updates.partnerCommissionRate !== undefined) {
      payload.partnerCommissionRate = updates.partnerCommissionRate !== '' && !isNaN(Number(updates.partnerCommissionRate))
        ? Number(updates.partnerCommissionRate)
        : updates.partnerCommissionRate;
    }

    // Merge franchisee commissions if provided
    if (updates.franchiseeCommissions) {
      payload.franchiseeCommissions = updates.franchiseeCommissions;
    }

    await docRef.set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Service updated successfully.',
      service: { id, ...docSnap.data(), ...payload }
    });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE: Inactivate service (soft-delete) or toggle active
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const requestorUid = searchParams.get('requestorUid') || undefined;
    const permanent = searchParams.get('permanent') === 'true';

    const isAuthorized = await checkAdminAuth(requestorUid);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const db = getFirestore(adminApp);
    const docRef = db.collection('services').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
    }

    if (permanent) {
      await docRef.delete();
      return NextResponse.json({ success: true, message: 'Service permanently deleted.' });
    } else {
      // Toggle or set isActive to false
      const currentActive = docSnap.data()?.isActive !== false;
      await docRef.update({
        isActive: !currentActive,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: requestorUid || 'admin',
      });
      return NextResponse.json({
        success: true,
        message: currentActive ? 'Service inactivated.' : 'Service reactivated.',
        isActive: !currentActive,
      });
    }
  } catch (error: any) {
    console.error('Error inactivating service:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to update service status' },
      { status: 500 }
    );
  }
}
