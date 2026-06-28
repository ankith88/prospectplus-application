import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, getDocs, query, where, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';

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

    const parentCollection = parentType === 'companies' ? 'companies' : 'leads';
    const parentRef = doc(firestore, parentCollection, parentId);
    
    // Verify parent document exists
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) {
      return NextResponse.json({ error: `${parentType === 'companies' ? 'Company' : 'Lead'} not found` }, { status: 404 });
    }

    const contactRef = doc(firestore, parentCollection, parentId, 'contacts', contactId);
    const contactSnap = await getDoc(contactRef);
    if (!contactSnap.exists()) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Enforce single primary contact constraints
    if (updateFields.isPrimary === true || updateFields.isPrimary === 'true') {
      const contactsRef = collection(firestore, parentCollection, parentId, 'contacts');
      const q = query(contactsRef, where('isPrimary', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
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
    cleanedUpdates.updatedAt = serverTimestamp();
    cleanedUpdates.syncedWithNetSuite = true;

    // Perform update
    await updateDoc(contactRef, cleanedUpdates);

    // Log Activity
    const activityRef = collection(firestore, parentCollection, parentId, 'activity');
    await addDoc(activityRef, {
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
