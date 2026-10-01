import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SUPER_ADMIN_UIDS } from '@/lib/constants';
import { ServiceLineItemDoc, CommissionModelType } from '@/lib/services-types';

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

// GET: Fetch all services (with option to include inactive)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const db = getFirestore(adminApp);
    let query: FirebaseFirestore.Query = db.collection('services');

    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.get();
    const services: ServiceLineItemDoc[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const rawCat = String(data.category || '').trim();
      const isExtra = data.itemType === 'extra' || rawCat.toLowerCase().includes('extra');
      const basePrice = data.basePrice != null && !isNaN(Number(data.basePrice))
        ? Number(data.basePrice)
        : (data.defaultRate != null && !isNaN(Number(data.defaultRate)) ? Number(data.defaultRate) : 0);

      return {
        id: doc.id,
        code: data.code || doc.id,
        netsuiteItemName: data.netsuiteItemName || data.name || data.code || doc.id,
        netsuiteItemId: data.netsuiteItemId ? String(data.netsuiteItemId) : undefined,
        itemType: (data.itemType || (isExtra ? 'extra' : 'service')) as 'service' | 'extra',
        category: data.category || (isExtra ? 'Extras' : 'Services'),
        basePrice,
        defaultRate: basePrice,
        isFixedRate: data.isFixedRate === true,
        defaultFrequency: data.defaultFrequency || (isExtra ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri'),
        gstApplicable: data.gstApplicable ?? 'Yes',
        partnerCommissionAccount: data.partnerCommissionAccount || 'Franchise Commissions',
        partnerCommissionModel: (data.partnerCommissionModel || 'Percentage of Sales - Franchisee Defined') as CommissionModelType,
        partnerCommissionRate: data.partnerCommissionRate ?? '',
        description: data.description || '',
        isActive: data.isActive !== false, // default true
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
        franchiseeCommissions: data.franchiseeCommissions || {},
      };
    });

    // Sort alphabetically by code / name
    services.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ success: true, services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST: Create a new Service or Extra line item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestorUid, service } = body;

    const isAuthorized = await checkAdminAuth(requestorUid);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    if (!service || (!service.code && !service.netsuiteItemName)) {
      return NextResponse.json(
        { success: false, message: 'Item Code and NetSuite Item Name are required.' },
        { status: 400 }
      );
    }

    const db = getFirestore(adminApp);

    // Generate clean document ID
    const rawId = (service.id || service.code || service.netsuiteItemId || '').trim();
    const docId = rawId ? rawId.replace(/[^a-zA-Z0-9_-]/g, '_') : db.collection('services').doc().id;

    const basePriceNum = service.basePrice != null && !isNaN(Number(service.basePrice))
      ? Number(service.basePrice)
      : 0;

    const partnerCommRate = service.partnerCommissionRate !== undefined && service.partnerCommissionRate !== ''
      ? (isNaN(Number(service.partnerCommissionRate)) ? service.partnerCommissionRate : Number(service.partnerCommissionRate))
      : null;

    const serviceDoc: Record<string, any> = {
      id: docId,
      code: String(service.code || docId).trim(),
      netsuiteItemName: String(service.netsuiteItemName || service.code || docId).trim(),
      netsuiteItemId: service.netsuiteItemId ? String(service.netsuiteItemId).trim() : null,
      itemType: service.itemType === 'extra' ? 'extra' : 'service',
      category: service.category || (service.itemType === 'extra' ? 'Extras' : 'Services'),
      basePrice: basePriceNum,
      defaultRate: basePriceNum,
      isFixedRate: Boolean(service.isFixedRate),
      defaultFrequency: service.defaultFrequency || (service.itemType === 'extra' ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri'),
      gstApplicable: service.gstApplicable ?? 'Yes',
      partnerCommissionAccount: service.partnerCommissionAccount || 'Franchise Commissions',
      partnerCommissionModel: service.partnerCommissionModel || 'Percentage of Sales - Franchisee Defined',
      partnerCommissionRate: partnerCommRate,
      description: service.description || '',
      isActive: service.isActive !== false,
      franchiseeCommissions: service.franchiseeCommissions || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: requestorUid || 'admin',
    };

    await db.collection('services').doc(docId).set(serviceDoc, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Service '${serviceDoc.code}' created successfully.`,
      service: { ...serviceDoc, id: docId }
    });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
