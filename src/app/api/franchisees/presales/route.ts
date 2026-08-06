import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { PresaleRecord } from '@/lib/presale-types';
import { decodePresaleId } from '@/lib/presale-token';

function formatToYYYYMMDD(val: any): string {
  if (!val) return '';
  if (typeof val === 'object' && val !== null) {
    if (typeof val.toDate === 'function') {
      val = val.toDate().toISOString();
    } else if (val._seconds) {
      val = new Date(val._seconds * 1000).toISOString();
    } else if (val.seconds) {
      val = new Date(val.seconds * 1000).toISOString();
    }
  }
  const s = String(val).trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(s)) {
    const parts = s.split(/[\/\-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return '';
}

function calculateFiveYearExpiry(dateStr: string): string {
  const formatted = formatToYYYYMMDD(dateStr);
  if (!formatted) return '';
  const parts = formatted.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10) + 5;
    return `${year}-${parts[1]}-${parts[2]}`;
  }
  return '';
}

function parseAustralianAddress(rawAddress: any): {
  streetNumberAndName: string;
  suburb: string;
  state: string;
  postcode: string;
  formattedAddress: string;
} {
  if (!rawAddress) {
    return { streetNumberAndName: '', suburb: '', state: '', postcode: '', formattedAddress: '' };
  }

  if (typeof rawAddress === 'object' && rawAddress !== null) {
    const street = rawAddress.streetNumberAndName || rawAddress.street || rawAddress.address1 || [rawAddress.address1, rawAddress.address2].filter(Boolean).join(' ') || '';
    const suburb = rawAddress.suburb || rawAddress.city || '';
    const state = rawAddress.state || '';
    const postcode = rawAddress.postcode || rawAddress.zip || rawAddress.postCode || '';
    const formattedAddress = [street, suburb, state, postcode].filter(Boolean).join(', ');
    return { streetNumberAndName: street, suburb, state, postcode, formattedAddress };
  }

  const str = String(rawAddress).trim();
  if (!str) {
    return { streetNumberAndName: '', suburb: '', state: '', postcode: '', formattedAddress: '' };
  }

  if (str.includes(',')) {
    const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
    let streetNumberAndName = '';
    let suburb = '';
    let state = '';
    let postcode = '';

    if (parts.length >= 4) {
      streetNumberAndName = parts[0];
      suburb = parts[1];
      state = parts[2];
      postcode = parts[3];
    } else if (parts.length === 3) {
      streetNumberAndName = parts[0];
      suburb = parts[1];
      const lastPart = parts[2];
      const pcMatch = lastPart.match(/\b(\d{4})\b/);
      if (pcMatch) postcode = pcMatch[1];
      const stMatch = lastPart.match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
      if (stMatch) state = stMatch[1].toUpperCase();
    } else if (parts.length === 2) {
      streetNumberAndName = parts[0];
      const lastPart = parts[1];
      const pcMatch = lastPart.match(/\b(\d{4})\b/);
      if (pcMatch) postcode = pcMatch[1];
      const stMatch = lastPart.match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
      if (stMatch) state = stMatch[1].toUpperCase();
      suburb = lastPart.replace(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/gi, '').replace(/\b\d{4}\b/g, '').trim();
    }

    return {
      streetNumberAndName: streetNumberAndName || parts[0] || '',
      suburb,
      state,
      postcode,
      formattedAddress: str,
    };
  }

  let postcode = '';
  let remaining = str;
  const pcMatch = remaining.match(/\b(\d{4})\b$/);
  if (pcMatch) {
    postcode = pcMatch[1];
    remaining = remaining.substring(0, pcMatch.index).trim();
  }

  let state = '';
  const stateMatch = remaining.match(/\b(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b/i);
  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
    const stateIndex = stateMatch.index || 0;
    const beforeState = remaining.substring(0, stateIndex).trim();
    const words = beforeState.split(/\s+/);
    if (words.length > 1) {
      const suburb = words.pop() || '';
      const streetNumberAndName = words.join(' ');
      return { streetNumberAndName, suburb, state, postcode, formattedAddress: str };
    }
  }

  return {
    streetNumberAndName: str,
    suburb: '',
    state: '',
    postcode,
    formattedAddress: str,
  };
}

async function findFranchiseeDoc(db: any, franchiseeId: string) {
  const cleanId = String(franchiseeId).trim();
  const numId = Number(cleanId);

  // 1. Direct doc by ID
  try {
    const docRef = await db.collection('franchisees').doc(cleanId).get();
    if (docRef.exists) return { id: docRef.id, ...docRef.data() };
  } catch (e) {}

  // 2. By internalId (string or number)
  try {
    let snap = await db.collection('franchisees').where('internalId', '==', cleanId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (!isNaN(numId)) {
      snap = await db.collection('franchisees').where('internalId', '==', numId).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } catch (e) {}

  // 3. By prospectPlusId (string or number)
  try {
    let snap = await db.collection('franchisees').where('prospectPlusId', '==', cleanId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (!isNaN(numId)) {
      snap = await db.collection('franchisees').where('prospectPlusId', '==', numId).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } catch (e) {}

  // 4. By id field (string or number)
  try {
    let snap = await db.collection('franchisees').where('id', '==', cleanId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (!isNaN(numId)) {
      snap = await db.collection('franchisees').where('id', '==', numId).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } catch (e) {}

  return null;
}

async function findUserDocForFranchisee(db: any, franchiseeId: string, email?: string, franData?: any) {
  const cleanId = String(franchiseeId).trim();
  const numId = Number(cleanId);

  // 1. By franchiseeId (string)
  let snap = await db.collection('users').where('franchiseeId', '==', cleanId).limit(1).get();
  if (!snap.empty) return snap.docs[0].data();

  // 2. By franchiseeId (number)
  if (!isNaN(numId)) {
    snap = await db.collection('users').where('franchiseeId', '==', numId).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  }

  // 3. By franchiseeInternalId (string)
  snap = await db.collection('users').where('franchiseeInternalId', '==', cleanId).limit(1).get();
  if (!snap.empty) return snap.docs[0].data();

  // 4. By franchiseeInternalId (number)
  if (!isNaN(numId)) {
    snap = await db.collection('users').where('franchiseeInternalId', '==', numId).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  }

  // 5. By linkedFranchiseeIds (array-contains string or number)
  snap = await db.collection('users').where('linkedFranchiseeIds', 'array-contains', cleanId).limit(1).get();
  if (!snap.empty) return snap.docs[0].data();
  if (!isNaN(numId)) {
    snap = await db.collection('users').where('linkedFranchiseeIds', 'array-contains', numId).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  }

  // 6. By email if provided
  const targetEmail = email || franData?.email;
  if (targetEmail) {
    snap = await db.collection('users').where('email', '==', String(targetEmail).trim().toLowerCase()).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  }

  return null;
}

async function resolveFranchiseeName(db: any, franchiseeId: string, email?: string, franData?: any, uData?: any): Promise<string> {
  const cleanId = String(franchiseeId).trim();
  const numId = Number(cleanId);

  let name = franData?.name || franData?.franchiseeName || franData?.title || franData?.franchisee || uData?.franchisee || uData?.franchiseeName || '';
  if (name && name !== cleanId) return name;

  // Search leads collection by franchisee_id or franchiseeId
  try {
    let lSnap = await db.collection('leads').where('franchisee_id', '==', cleanId).limit(1).get();
    if (lSnap.empty && !isNaN(numId)) {
      lSnap = await db.collection('leads').where('franchisee_id', '==', numId).limit(1).get();
    }
    if (lSnap.empty) {
      lSnap = await db.collection('leads').where('franchiseeId', '==', cleanId).limit(1).get();
    }
    if (!lSnap.empty && lSnap.docs[0].data().franchisee) {
      name = lSnap.docs[0].data().franchisee;
      if (name && name !== cleanId) return name;
    }
  } catch (e) {}

  // Search companies collection
  try {
    let cSnap = await db.collection('companies').where('franchisee_id', '==', cleanId).limit(1).get();
    if (cSnap.empty && !isNaN(numId)) {
      cSnap = await db.collection('companies').where('franchisee_id', '==', numId).limit(1).get();
    }
    if (!cSnap.empty && cSnap.docs[0].data().franchisee) {
      name = cSnap.docs[0].data().franchisee;
      if (name && name !== cleanId) return name;
    }
  } catch (e) {}

  return '';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('franchiseeId');
    const franchiseeId = decodePresaleId(rawId || '');
    const db = adminApp.firestore();

    if (franchiseeId) {
      const presaleDoc = await db.collection('franchisee_presales').doc(String(franchiseeId)).get();
      const franData = await findFranchiseeDoc(db, franchiseeId);

      if (presaleDoc.exists) {
        const data = presaleDoc.data() as PresaleRecord;
        let mainDetails = data.mainDetails || {};
        let dateBizStarted = formatToYYYYMMDD(mainDetails.dateBusinessStarted);

        const uData = await findUserDocForFranchisee(db, franchiseeId, mainDetails.email, franData);
        if (!dateBizStarted) {
          const rawBizDate = uData?.businessStartDate || uData?.dateBusinessStarted || franData?.dateBusinessStarted || franData?.businessStartDate;
          dateBizStarted = formatToYYYYMMDD(rawBizDate);
        }

        let expDate = formatToYYYYMMDD(mainDetails.expiryDate) || calculateFiveYearExpiry(dateBizStarted);

        const rawAddr = mainDetails.address || mainDetails.streetNumberAndName;
        const parsedAddr = parseAustralianAddress(rawAddr);

        const resolvedFranName = await resolveFranchiseeName(db, franchiseeId, mainDetails.email, franData, uData);
        let finalFranName = data.franchiseeName;
        if (!finalFranName || finalFranName === String(franchiseeId)) {
          finalFranName = resolvedFranName || mainDetails.franchiseeName || '';
        }

        data.franchiseeName = finalFranName;
        data.mainDetails = {
          ...mainDetails,
          franchiseeName: (mainDetails.franchiseeName && mainDetails.franchiseeName !== String(franchiseeId)) ? mainDetails.franchiseeName : finalFranName,
          streetNumberAndName: mainDetails.streetNumberAndName || parsedAddr.streetNumberAndName || '',
          suburb: mainDetails.suburb || parsedAddr.suburb || '',
          state: mainDetails.state || parsedAddr.state || '',
          postcode: mainDetails.postcode || parsedAddr.postcode || '',
          address: mainDetails.address || parsedAddr.formattedAddress || '',
          dateBusinessStarted: dateBizStarted || mainDetails.dateBusinessStarted || '',
          expiryDate: expDate || mainDetails.expiryDate || '',
        };

        return NextResponse.json({
          success: true,
          data: { ...data, id: presaleDoc.id },
        });
      }

      // Build prefilled record from franchisee & users collection
      const uData = await findUserDocForFranchisee(db, franchiseeId, franData?.email, franData);
      const franchiseeName = await resolveFranchiseeName(db, franchiseeId, franData?.email, franData, uData);

      const rawBizDate = uData?.businessStartDate || uData?.dateBusinessStarted || franData?.dateBusinessStarted || franData?.businessStartDate;
      const dateBusinessStarted = formatToYYYYMMDD(rawBizDate);
      const expiryDate = formatToYYYYMMDD(uData?.expiryDate || franData?.expiryDate) || calculateFiveYearExpiry(dateBusinessStarted);
      const ultimateExpiryDate = formatToYYYYMMDD(uData?.ultimateExpiryDate || franData?.ultimateExpiryDate);
      const unlimitedTermOffer = uData?.unlimitedTermOffer || franData?.unlimitedTermOffer || 'No';

      const rawAddr = uData?.address || franData?.address;
      const parsedAddr = parseAustralianAddress(rawAddr);

      const mainDetails = {
        franchiseeName,
        tradingEntity: franData?.tradingEntity || franData?.name || uData?.tradingEntity || '',
        mainContact: uData?.displayName || [uData?.firstName, uData?.lastName].filter(Boolean).join(' ') || franData?.mainContact || '',
        mobileNumber: uData?.mobileNumber || uData?.mobile || uData?.phone || franData?.mobile || '',
        email: uData?.email || franData?.email || '',
        abn: uData?.abn || franData?.abn || '',
        dateListedForSale: new Date().toISOString().split('T')[0],
        address: parsedAddr.formattedAddress || (typeof uData?.address === 'string' ? uData.address : (typeof franData?.address === 'string' ? franData.address : '')),
        streetNumberAndName: parsedAddr.streetNumberAndName || '',
        suburb: parsedAddr.suburb || '',
        state: parsedAddr.state || '',
        postcode: parsedAddr.postcode || '',
        dateBusinessStarted,
        expiryDate,
        ultimateExpiryDate,
        unlimitedTermOffer,
      };

      const defaultRecord: Partial<PresaleRecord> = {
        id: String(franchiseeId),
        franchiseeId: String(franchiseeId),
        franchiseeName,
        status: 'Step 1: Main Details',
        step1Status: 'Completed',
        step2Status: 'Not Started',
        step3Status: 'Not Started',
        step4Status: 'Not Started',
        mainDetails,
        deedOfVariation: {
          status: 'not_started',
          party1Name: mainDetails.mainContact || franchiseeName,
          party1Address: mainDetails.address || '',
          party2Name: mainDetails.mainContact || franchiseeName,
          party2Address: mainDetails.address || '',
          party3Name: 'Mail Plus Pty Ltd ACN 609 801 195 of Level 14, Suite 11, 175 Pitt Street, Sydney, NSW, 2000 (MailPlus)',
        },
        presalesDetails: {
          commencementDate: '',
          expiryDate,
          ultimateExpiryDate,
          unlimitedTermOffer,
          unlimitedTermFee: 0,
          renewalTermsYears: 0,
          termOnFranchiseeIM: '',
          dateBusinessStarted,
          totalDailyRunTime: '',
          lowPrice: 0,
          highPrice: 0,
          serviceRevenue: 0,
          serviceRevenueYear: '',
          mpexCommission: 0,
          mpexCommissionYear: '',
          sendleCommission: 0,
          sendleCommissionYear: '',
          salesCommissionPercent: 0,
          nabAccreditation: 'No',
          nabAccreditationFee: 0,
          salePrice: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist draft presale record so it appears on presales list right away
      try {
        const presaleRef = db.collection('franchisee_presales').doc(String(franchiseeId));
        await presaleRef.set(defaultRecord, { merge: true });

        const targetFranDoc = franData || (await findFranchiseeDoc(db, franchiseeId));
        const franUpdate = {
          isForSale: true,
          presaleStatus: 'Step 1: Main Details',
          presaleUpdatedAt: new Date().toISOString(),
        };
        if (targetFranDoc && targetFranDoc.id) {
          await db.collection('franchisees').doc(String(targetFranDoc.id)).set(franUpdate, { merge: true });
        } else {
          await db.collection('franchisees').doc(String(franchiseeId)).set(franUpdate, { merge: true });
        }
      } catch (saveErr) {
        console.error('Failed to auto-create draft presale doc:', saveErr);
      }

      return NextResponse.json({
        success: true,
        data: defaultRecord,
        isNew: true,
      });
    }

    let snapshot;
    try {
      snapshot = await db.collection('franchisee_presales').orderBy('updatedAt', 'desc').get();
    } catch (e) {
      snapshot = await db.collection('franchisee_presales').get();
    }

    const presales: PresaleRecord[] = [];
    snapshot.forEach(doc => {
      const dData = doc.data() || {};
      presales.push({ id: doc.id, franchiseeId: dData.franchiseeId || doc.id, ...dData } as PresaleRecord);
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
    const existingData = (existingDoc.exists ? existingDoc.data() : null) || {};
    const nowStr = new Date().toISOString();

    let step1Status: PresaleRecord['step1Status'] = mainDetails?.tradingEntity ? 'Completed' : 'In Progress';
    let step2Status: PresaleRecord['step2Status'] = existingData.step2Status || 'Not Started';
    let step3Status: PresaleRecord['step3Status'] = existingData.step3Status || 'Not Started';
    let step4Status: PresaleRecord['step4Status'] = existingData.step4Status || 'Not Started';

    if (deedOfVariation?.status === 'signed_online' || deedOfVariation?.status === 'pdf_uploaded') {
      step2Status = 'Completed';
      step3Status = 'Completed';
    } else if (deedOfVariation?.selectedOption || deedOfVariation?.status === 'sent') {
      step2Status = 'In Progress';
    }

    if (presalesDetails?.salePrice && Number(presalesDetails.salePrice) > 0) {
      step4Status = 'Completed';
    }

    let overallStatus: PresaleRecord['status'] = 'Step 1: Main Details';
    if (step3Status === 'Completed' && step4Status === 'Completed') {
      overallStatus = 'Active Presale';
    } else if (step3Status === 'Completed') {
      overallStatus = 'Step 4: Presales Details';
    } else if (deedOfVariation?.status === 'signed_online' || deedOfVariation?.status === 'pdf_uploaded') {
      overallStatus = 'Step 3: Verification Pending';
    } else if (mainDetails?.dateListedForSale) {
      overallStatus = 'Step 2: Deed Pending';
    }

    const isAdminOrOps = ['admin', 'superadmin', 'operations', 'Operations', 'Operations Manager', 'Sales Manager'].includes(userRole || '');
    let finalPresalesDetails = existingData.presalesDetails || presalesDetails || {};
    if (presalesDetails && isAdminOrOps) {
      finalPresalesDetails = presalesDetails;
    }

    const rawBiz = mainDetails?.dateBusinessStarted || finalPresalesDetails?.dateBusinessStarted;
    const bizStarted = formatToYYYYMMDD(rawBiz);
    let computedExpiryDate = formatToYYYYMMDD(mainDetails?.expiryDate || finalPresalesDetails?.expiryDate) || calculateFiveYearExpiry(bizStarted);

    const fullAddress = [
      mainDetails?.streetNumberAndName,
      mainDetails?.suburb,
      mainDetails?.state,
      mainDetails?.postcode,
    ].filter(Boolean).join(', ') || mainDetails?.address || '';

    const resolvedFranName = (franchiseeName && franchiseeName !== String(franchiseeId))
      ? franchiseeName
      : (mainDetails?.franchiseeName && mainDetails?.franchiseeName !== String(franchiseeId))
      ? mainDetails.franchiseeName
      : existingData.franchiseeName && existingData.franchiseeName !== String(franchiseeId)
      ? existingData.franchiseeName
      : '';

    const updatedMainDetails = {
      ...(existingData.mainDetails || {}),
      ...(mainDetails || {}),
      franchiseeName: resolvedFranName,
      address: fullAddress,
      dateBusinessStarted: bizStarted || mainDetails?.dateBusinessStarted || '',
      expiryDate: computedExpiryDate || mainDetails?.expiryDate || '',
    };

    const payload: Partial<PresaleRecord> = {
      franchiseeId: String(franchiseeId),
      franchiseeName: resolvedFranName,
      status: overallStatus,
      step1Status,
      step2Status,
      step3Status,
      step4Status,
      mainDetails: updatedMainDetails,
      deedOfVariation: deedOfVariation || existingData.deedOfVariation || { status: 'not_started' },
      presalesDetails: {
        ...finalPresalesDetails,
        dateBusinessStarted: bizStarted || finalPresalesDetails?.dateBusinessStarted || '',
        expiryDate: computedExpiryDate || finalPresalesDetails?.expiryDate || '',
        ultimateExpiryDate: formatToYYYYMMDD(mainDetails?.ultimateExpiryDate || finalPresalesDetails?.ultimateExpiryDate),
        unlimitedTermOffer: mainDetails?.unlimitedTermOffer || finalPresalesDetails?.unlimitedTermOffer || 'No',
      },
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

    // Update Franchisee document
    const franDocUpdate: Record<string, any> = {
      isForSale: true,
      presaleStatus: overallStatus,
      presaleUpdatedAt: nowStr,
      dateBusinessStarted: bizStarted || '',
      businessStartDate: bizStarted || '',
      expiryDate: computedExpiryDate || '',
      ultimateExpiryDate: formatToYYYYMMDD(mainDetails?.ultimateExpiryDate || finalPresalesDetails?.ultimateExpiryDate),
      unlimitedTermOffer: mainDetails?.unlimitedTermOffer || finalPresalesDetails?.unlimitedTermOffer || 'No',
      abn: mainDetails?.abn || '',
      address: fullAddress,
      mainContact: mainDetails?.mainContact || '',
      email: mainDetails?.email || '',
      mobile: mainDetails?.mobileNumber || '',
    };
    if (resolvedFranName) franDocUpdate.name = resolvedFranName;

    const targetFranDoc = await findFranchiseeDoc(db, franchiseeId);
    if (targetFranDoc && targetFranDoc.id) {
      await db.collection('franchisees').doc(String(targetFranDoc.id)).set(franDocUpdate, { merge: true });
    } else {
      await db.collection('franchisees').doc(String(franchiseeId)).set(franDocUpdate, { merge: true });
    }

    // Sync all user profile docs for this franchisee
    const userDocsSnap = await db.collection('users').where('franchiseeId', '==', String(franchiseeId)).get();
    const profileUpdates: Record<string, any> = {
      expiryDate: computedExpiryDate || '',
      ultimateExpiryDate: formatToYYYYMMDD(mainDetails?.ultimateExpiryDate || finalPresalesDetails?.ultimateExpiryDate),
      unlimitedTermOffer: mainDetails?.unlimitedTermOffer || finalPresalesDetails?.unlimitedTermOffer || 'No',
      dateBusinessStarted: bizStarted || '',
      businessStartDate: bizStarted || '',
      abn: mainDetails?.abn || '',
      address: fullAddress,
      presaleStatus: overallStatus,
      presaleUpdatedAt: nowStr,
    };
    if (mainDetails?.email) profileUpdates.presaleContactEmail = mainDetails.email;
    if (mainDetails?.mobileNumber) profileUpdates.mobileNumber = mainDetails.mobileNumber;

    const userPromises = userDocsSnap.docs.map((doc) => doc.ref.set(profileUpdates, { merge: true }));
    await Promise.all(userPromises);

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
