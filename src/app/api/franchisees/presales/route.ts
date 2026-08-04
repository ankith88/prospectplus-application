import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { PresaleRecord } from '@/lib/presale-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const franchiseeId = searchParams.get('franchiseeId');
    const db = adminApp.firestore();

    if (franchiseeId) {
      const presaleDoc = await db.collection('franchisee_presales').doc(String(franchiseeId)).get();
      
      if (presaleDoc.exists) {
        return NextResponse.json({
          success: true,
          data: { id: presaleDoc.id, ...presaleDoc.data() } as PresaleRecord,
        });
      }

      // If document doesn't exist, build prefilled MainDetails from franchisee & user collections
      const franDoc = await db.collection('franchisees').doc(String(franchiseeId)).get();
      let mainDetails = {
        tradingEntity: '',
        mainContact: '',
        mobileNumber: '',
        email: '',
        abn: '',
        dateListedForSale: new Date().toISOString().split('T')[0],
        address: '',
      };
      let franchiseeName = '';

      if (franDoc.exists) {
        const franData = franDoc.data() || {};
        franchiseeName = franData.name || '';
        mainDetails.tradingEntity = franData.name || '';
        mainDetails.mainContact = franData.mainContact || '';
        mainDetails.mobileNumber = franData.mobile || '';
        mainDetails.email = franData.email || '';
      }

      // Query users collection linked to this franchiseeId for extra fields (ABN, address, trading entity)
      const userQuery = await db.collection('users').where('franchiseeId', '==', String(franchiseeId)).limit(1).get();
      if (!userQuery.empty) {
        const uData = userQuery.docs[0].data();
        if (uData.displayName || uData.firstName) {
          mainDetails.mainContact = uData.displayName || [uData.firstName, uData.lastName].filter(Boolean).join(' ') || mainDetails.mainContact;
        }
        if (uData.email) mainDetails.email = uData.email;
        if (uData.mobileNumber || uData.mobile || uData.phone) {
          mainDetails.mobileNumber = uData.mobileNumber || uData.mobile || uData.phone || mainDetails.mobileNumber;
        }
        if (uData.abn) mainDetails.abn = uData.abn;
        if (uData.address) {
          if (typeof uData.address === 'string') {
            mainDetails.address = uData.address;
          } else if (typeof uData.address === 'object') {
            const addrObj = uData.address;
            mainDetails.address = [addrObj.address1, addrObj.address2, addrObj.suburb, addrObj.state, addrObj.postcode].filter(Boolean).join(' ');
          }
        }
      }

      const defaultRecord: Partial<PresaleRecord> = {
        id: String(franchiseeId),
        franchiseeId: String(franchiseeId),
        franchiseeName,
        status: 'Draft',
        mainDetails,
        deedOfVariation: {
          status: 'not_started',
        },
        presalesDetails: {
          commencementDate: '',
          expiryDate: '',
          ultimateExpiryDate: '',
          unlimitedTermOffer: 'No',
          unlimitedTermFee: 25000,
          renewalTermsYears: 5,
          termOnFranchiseeIM: 'Unlimited',
          dateBusinessStarted: '',
          totalDailyRunTime: '5 - 6 hrs',
          lowPrice: 50000,
          highPrice: 75000,
          serviceRevenue: 0,
          serviceRevenueYear: '',
          mpexCommission: 0,
          mpexCommissionYear: '',
          sendleCommission: 0,
          sendleCommissionYear: '',
          salesCommissionPercent: 10,
          nabAccreditation: 'No',
          nabAccreditationFee: 0,
          salePrice: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: defaultRecord,
        isNew: true,
      });
    }

    // Fetch all presale records
    const snapshot = await db.collection('franchisee_presales').orderBy('updatedAt', 'desc').get();
    const presales: PresaleRecord[] = [];
    snapshot.forEach(doc => {
      presales.push({ id: doc.id, ...doc.data() } as PresaleRecord);
    });

    return NextResponse.json({
      success: true,
      data: presales,
    });
  } catch (error: any) {
    console.error('Error fetching presale records:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { franchiseeId, franchiseeName, mainDetails, deedOfVariation, presalesDetails, userRole, userUid, userName } = body;

    if (!franchiseeId) {
      return NextResponse.json({ success: false, message: 'franchiseeId is required' }, { status: 400 });
    }

    const db = adminApp.firestore();
    const presaleRef = db.collection('franchisee_presales').doc(String(franchiseeId));
    const existingDoc = await presaleRef.get();
    const nowStr = new Date().toISOString();

    let updatedStatus: PresaleRecord['status'] = 'Draft';
    if (deedOfVariation?.status === 'signed_online' || deedOfVariation?.status === 'pdf_uploaded') {
      updatedStatus = 'Deed Signed';
    } else if (deedOfVariation?.status === 'not_started' && mainDetails?.dateListedForSale) {
      updatedStatus = 'Deed Pending';
    }

    const existingData = (existingDoc.exists ? existingDoc.data() : null) || {};
    
    // Server-side check for Step 4 (Presales Details editing)
    const isAdminOrOps = ['admin', 'superadmin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(userRole || '');
    let finalPresalesDetails = existingData.presalesDetails || presalesDetails || {};
    if (presalesDetails && isAdminOrOps) {
      finalPresalesDetails = presalesDetails;
    }

    const payload: Partial<PresaleRecord> = {
      franchiseeId: String(franchiseeId),
      franchiseeName: franchiseeName || existingData.franchiseeName || '',
      status: updatedStatus,
      mainDetails: mainDetails || existingData.mainDetails || {},
      deedOfVariation: deedOfVariation || existingData.deedOfVariation || { status: 'not_started' },
      presalesDetails: finalPresalesDetails,
      updatedAt: nowStr,
      updatedByUid: userUid || '',
      updatedByName: userName || '',
    };

    if (!existingDoc.exists) {
      payload.createdAt = nowStr;
      payload.createdByUid = userUid || '';
      payload.createdByName = userName || '';
    }

    await presaleRef.set(payload, { merge: true });

    // Also update franchisee document to mark territory presale status
    await db.collection('franchisees').doc(String(franchiseeId)).set({
      isForSale: true,
      presaleStatus: updatedStatus,
      presaleUpdatedAt: nowStr,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Presale record updated successfully',
      data: { id: String(franchiseeId), ...payload },
    });
  } catch (error: any) {
    console.error('Error saving presale record:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
