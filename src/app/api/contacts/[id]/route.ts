import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore(adminApp);
const API_KEY = process.env.PROSPECTPLUS_API_KEY;

function unwrapValue(val: any): any {
  if (val && typeof val === 'object') {
    if ('stringValue' in val) return val.stringValue;
    if ('booleanValue' in val) return val.booleanValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('arrayValue' in val) return val.arrayValue.values?.map((v: any) => unwrapValue(v)) || [];
    if ('mapValue' in val) {
      const result: any = {};
      for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
        result[k] = unwrapValue(v);
      }
      return result;
    }
    return val;
  }
  return val;
}

async function resolveParentRef(db: any, parentId: string, parentType: string = 'leads') {
  const initialCollection = parentType === 'companies' ? 'companies' : 'leads';
  const initialRef = db.collection(initialCollection).doc(parentId);
  const initialSnap = await initialRef.get();

  if (initialSnap.exists) {
    return { parentRef: initialRef, parentSnap: initialSnap, parentCollection: initialCollection };
  }

  // Fallback 1: Check alternate collection (e.g. if lead was converted to company)
  const altCollection = initialCollection === 'leads' ? 'companies' : 'leads';
  const altRef = db.collection(altCollection).doc(parentId);
  const altSnap = await altRef.get();
  if (altSnap.exists) {
    return { parentRef: altRef, parentSnap: altSnap, parentCollection: altCollection };
  }

  // Fallback 2: Check by netsuiteId field in 'leads'
  const leadNsSnap = await db.collection('leads').where('netsuiteId', '==', String(parentId)).limit(1).get();
  if (!leadNsSnap.empty) {
    const docSnap = leadNsSnap.docs[0];
    return { parentRef: docSnap.ref, parentSnap: docSnap, parentCollection: 'leads' };
  }

  // Fallback 3: Check by netsuiteId field in 'companies'
  const compNsSnap = await db.collection('companies').where('netsuiteId', '==', String(parentId)).limit(1).get();
  if (!compNsSnap.empty) {
    const docSnap = compNsSnap.docs[0];
    return { parentRef: docSnap.ref, parentSnap: docSnap, parentCollection: 'companies' };
  }

  return { parentRef: null, parentSnap: null, parentCollection: initialCollection };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const resolvedParams = await params;
  const contactId = resolvedParams.id;

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    
    // Unwrap all values in the body
    const body: any = {};
    for (const [key, value] of Object.entries(rawBody)) {
      const unwrapped = unwrapValue(value);
      if (unwrapped !== undefined) {
        body[key] = unwrapped;
      } else {
        body[key] = null;
      }
    }

    const { parentId, parentType = 'leads', ...updateFields } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
    }

    const { parentRef, parentSnap, parentCollection } = await resolveParentRef(db, parentId, parentType);
    if (!parentRef || !parentSnap || !parentSnap.exists) {
      return NextResponse.json({ error: `${parentType === 'companies' ? 'Company' : 'Lead'} not found` }, { status: 404 });
    }

    const contactRef = db.collection(parentCollection).doc(parentId).collection('contacts').doc(contactId);
    const contactSnap = await contactRef.get();
    if (!contactSnap.exists) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Enforce single primary contact constraints
    if (updateFields.isPrimary === true || updateFields.isPrimary === 'true') {
      const contactsRef = db.collection(parentCollection).doc(parentId).collection('contacts');
      const snap = await contactsRef.where('isPrimary', '==', true).get();
      const batch = db.batch();
      snap.docs.forEach(docSnap => {
        if (docSnap.id !== contactId) {
          batch.update(docSnap.ref, { isPrimary: false });
        }
      });
      await batch.commit();
    }

    // Clean up updates data
    const cleanedUpdates: any = { ...updateFields };
    delete cleanedUpdates.id;
    delete cleanedUpdates.createdAt;
    cleanedUpdates.updatedAt = FieldValue.serverTimestamp();
    cleanedUpdates.syncedWithNetSuite = true;

    // Handle firstName / lastName param aliases
    const firstName = (cleanedUpdates.firstName || cleanedUpdates.firstname || cleanedUpdates.first_name || '').trim();
    const lastName = (cleanedUpdates.lastName || cleanedUpdates.lastname || cleanedUpdates.last_name || '').trim();
    if (firstName) cleanedUpdates.firstName = firstName;
    if (lastName) cleanedUpdates.lastName = lastName;
    delete cleanedUpdates.firstname;
    delete cleanedUpdates.first_name;
    delete cleanedUpdates.lastname;
    delete cleanedUpdates.last_name;

    if (!cleanedUpdates.name && (firstName || lastName)) {
      const existingData = contactSnap.data() || {};
      const fName = firstName || existingData.firstName || existingData.name?.split(' ')[0] || '';
      const lName = lastName || existingData.lastName || existingData.name?.split(' ').slice(1).join(' ') || '';
      cleanedUpdates.name = `${fName} ${lName}`.trim();
    }

    // Perform update
    await contactRef.update(cleanedUpdates);

    // Log Activity
    const activityRef = db.collection(parentCollection).doc(parentId).collection('activity');
    await activityRef.add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Contact '${contactSnap.data()?.name || contactId}' updated via NetSuite API.`,
      author: 'NetSuite API'
    });

    return NextResponse.json({
      success: true,
      id: contactId,
      message: 'Contact updated successfully.'
    });

  } catch (error: any) {
    console.error('Error updating contact via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

