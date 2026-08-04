import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { ServiceSelection } from '@/lib/types';

export const dynamic = 'force-dynamic';

const db = getFirestore(adminApp);

function validateApiKey(req: NextRequest): boolean {
  const apiKeyHeader = req.headers.get('x-api-key');
  const { searchParams } = new URL(req.url);
  const apiKeyQuery = searchParams.get('api_key');
  const providedKey = apiKeyHeader || apiKeyQuery;

  const validApiKeys = [
    process.env.PROSPECTPLUS_API_KEY,
    process.env.NETSUITE_API_KEY,
    process.env.EXTERNAL_API_KEY,
    '454e75f843954875ccff72537d7702ba1ab6f65c'
  ].filter(Boolean);

  if (validApiKeys.length > 0) {
    return validApiKeys.includes(providedKey as string);
  }

  // Fallback if no env keys set
  return providedKey === '454e75f843954875ccff72537d7702ba1ab6f65c';
}

function normalizeService(s: any): ServiceSelection {
  if (!s || typeof s !== 'object' || !s.name || typeof s.name !== 'string') {
    throw new Error('Each service item must be an object with a valid "name" property.');
  }

  let frequency: any = s.frequency;
  if (typeof frequency === 'string') {
    if (['adhoc', 'ad-hoc', 'ad hoc'].includes(frequency.trim().toLowerCase())) {
      frequency = 'Adhoc';
    } else {
      frequency = [frequency];
    }
  } else if (Array.isArray(frequency)) {
    if (frequency.length === 1 && typeof frequency[0] === 'string' && ['adhoc', 'ad-hoc', 'ad hoc'].includes(frequency[0].trim().toLowerCase())) {
      frequency = 'Adhoc';
    }
  } else {
    frequency = [];
  }

  const normalized: ServiceSelection = {
    name: s.name.trim(),
    frequency: frequency,
  };

  if (s.id !== undefined) normalized.id = String(s.id);
  if (s.rate !== undefined && !isNaN(Number(s.rate))) normalized.rate = Number(s.rate);
  if (s.quantity !== undefined && !isNaN(Number(s.quantity))) normalized.quantity = Number(s.quantity);
  if (s.startDate !== undefined) normalized.startDate = String(s.startDate);
  if (s.trialStartDate !== undefined) normalized.trialStartDate = String(s.trialStartDate);
  if (s.trialEndDate !== undefined) normalized.trialEndDate = String(s.trialEndDate);

  return normalized;
}

async function handleUpdateServices(
  req: NextRequest,
  rawCompanyId: string,
  defaultMode: 'merge' | 'replace'
) {
  if (!validateApiKey(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized. Please provide a valid X-API-KEY or api_key parameter.' },
      { status: 401 }
    );
  }

  if (!rawCompanyId) {
    return NextResponse.json(
      { success: false, message: 'Missing required parameter: companyId' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body payload provided.' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, message: 'Empty or non-object payload provided.' },
      { status: 400 }
    );
  }

  const rawServices = body.services || body.service;
  if (!rawServices) {
    return NextResponse.json(
      { success: false, message: 'Missing required "services" array or "service" object in payload.' },
      { status: 400 }
    );
  }

  const servicesArray = Array.isArray(rawServices) ? rawServices : [rawServices];
  if (servicesArray.length === 0) {
    return NextResponse.json(
      { success: false, message: '"services" array cannot be empty.' },
      { status: 400 }
    );
  }

  let incomingServices: ServiceSelection[];
  try {
    incomingServices = servicesArray.map(normalizeService);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Invalid service format provided.' },
      { status: 400 }
    );
  }

  const mode = (body.mode === 'replace' || body.mode === 'overwrite')
    ? 'replace'
    : (body.mode === 'merge' || body.mode === 'update')
      ? 'merge'
      : defaultMode;

  // Resolve company document ID (supports doc ID, internalid, internalId, prospectPlusId)
  let companyDocId = rawCompanyId;
  let companyRef = db.collection('companies').doc(companyDocId);
  let companySnap = await companyRef.get();

  if (!companySnap.exists) {
    let querySnap = await db.collection('companies').where('internalid', '==', rawCompanyId).limit(1).get();
    if (querySnap.empty && !isNaN(Number(rawCompanyId))) {
      querySnap = await db.collection('companies').where('internalid', '==', Number(rawCompanyId)).limit(1).get();
    }
    if (querySnap.empty) {
      querySnap = await db.collection('companies').where('internalId', '==', rawCompanyId).limit(1).get();
    }
    if (querySnap.empty) {
      querySnap = await db.collection('companies').where('prospectPlusId', '==', rawCompanyId).limit(1).get();
    }

    if (!querySnap.empty) {
      companyDocId = querySnap.docs[0].id;
      companyRef = db.collection('companies').doc(companyDocId);
      companySnap = querySnap.docs[0];
    } else {
      // Try searching leads collection if company doc is not found
      let leadRef = db.collection('leads').doc(rawCompanyId);
      let leadSnap = await leadRef.get();
      if (!leadSnap.exists) {
        let leadQuerySnap = await db.collection('leads').where('internalid', '==', rawCompanyId).limit(1).get();
        if (leadQuerySnap.empty && !isNaN(Number(rawCompanyId))) {
          leadQuerySnap = await db.collection('leads').where('internalid', '==', Number(rawCompanyId)).limit(1).get();
        }
        if (leadQuerySnap.empty) {
          leadQuerySnap = await db.collection('leads').where('internalId', '==', rawCompanyId).limit(1).get();
        }
        if (!leadQuerySnap.empty) {
          companyDocId = leadQuerySnap.docs[0].id;
          companyRef = db.collection('companies').doc(companyDocId);
          companySnap = await companyRef.get();
          if (!companySnap.exists) {
            // Document is in leads, use leads ref as target
            companyRef = db.collection('leads').doc(companyDocId);
            companySnap = leadQuerySnap.docs[0];
          }
        }
      } else {
        companyDocId = leadSnap.id;
        companyRef = db.collection('companies').doc(companyDocId);
        companySnap = await companyRef.get();
        if (!companySnap.exists) {
          companyRef = db.collection('leads').doc(companyDocId);
          companySnap = leadSnap;
        }
      }

      if (!companySnap.exists) {
        return NextResponse.json(
          { success: false, message: `Company document not found for ID: ${rawCompanyId}` },
          { status: 404 }
        );
      }
    }
  }

  const existingData = companySnap.data() || {};
  const currentServices: ServiceSelection[] = Array.isArray(existingData.services) ? existingData.services : [];

  let finalServices: ServiceSelection[];

  if (mode === 'replace') {
    finalServices = incomingServices;
  } else {
    // Merge mode: Update matching service or append
    finalServices = [...currentServices];

    for (const newService of incomingServices) {
      const matchIndex = finalServices.findIndex(existing => {
        if (newService.id && existing.id) {
          return newService.id === existing.id;
        }
        return existing.name.trim().toLowerCase() === newService.name.trim().toLowerCase();
      });

      if (matchIndex >= 0) {
        finalServices[matchIndex] = {
          ...finalServices[matchIndex],
          ...newService
        };
      } else {
        finalServices.push(newService);
      }
    }
  }

  const now = new Date().toISOString();

  // Update target company document
  await companyRef.update({
    services: finalServices,
    updatedAt: FieldValue.serverTimestamp()
  });

  // If doc also exists in companies collection (when target was leads), sync to companies collection as well
  if (companyRef.path.startsWith('leads/')) {
    const matchingCompanyRef = db.collection('companies').doc(companyDocId);
    const matchingCompanySnap = await matchingCompanyRef.get();
    if (matchingCompanySnap.exists) {
      await matchingCompanyRef.update({
        services: finalServices,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } else {
    // If target was companies collection, also check and sync to leads doc if present
    const matchingLeadRef = db.collection('leads').doc(companyDocId);
    const matchingLeadSnap = await matchingLeadRef.get();
    if (matchingLeadSnap.exists) {
      await matchingLeadRef.update({
        services: finalServices,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }

  // Log activity
  try {
    await companyRef.collection('activity').add({
      type: 'Update',
      date: now,
      notes: `Services updated via API (${incomingServices.length} service(s) ${mode === 'replace' ? 'replaced' : 'merged'}).`,
      author: 'External API'
    });
  } catch (actErr) {
    console.error('Failed to write activity log for service update:', actErr);
  }

  return NextResponse.json({
    success: true,
    message: 'Services updated successfully.',
    companyId: companyDocId,
    mode,
    services: finalServices
  }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return handleUpdateServices(req, resolvedParams.id, 'merge');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return handleUpdateServices(req, resolvedParams.id, 'replace');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return handleUpdateServices(req, resolvedParams.id, 'merge');
}
