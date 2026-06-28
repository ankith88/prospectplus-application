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

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

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

    const { parentId, parentType = 'leads', name, email, phone, title, isPrimary, isAccountsPayable, accessToLocalMile, accessToShipMate } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const parentCollection = parentType === 'companies' ? 'companies' : 'leads';
    const parentRef = doc(firestore, parentCollection, parentId);
    
    // Verify parent document exists
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) {
      return NextResponse.json({ error: `${parentType === 'companies' ? 'Company' : 'Lead'} not found` }, { status: 404 });
    }

    // Enforce single primary contact constraints
    if (isPrimary) {
      const contactsRef = collection(firestore, parentCollection, parentId, 'contacts');
      const q = query(contactsRef, where('isPrimary', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(firestore);
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { isPrimary: false });
      });
      await batch.commit();
    }

    // Write contact document to subcollection
    const contactData = {
      name,
      email: email || '',
      phone: phone || '',
      title: title || '',
      isPrimary: !!isPrimary,
      isAccountsPayable: !!isAccountsPayable,
      accessToLocalMile: accessToLocalMile || 'no',
      accessToShipMate: accessToShipMate || 'no',
      syncedWithNetSuite: true, // Since NetSuite created it
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const newContactRef = await addDoc(collection(firestore, parentCollection, parentId, 'contacts'), contactData);
    
    // Update contact count on parent
    const currentCount = parentSnap.data()?.contactCount || 0;
    await updateDoc(parentRef, { 
      contactCount: currentCount + 1,
      updatedAt: serverTimestamp()
    });

    // Log Activity
    const activityRef = collection(firestore, parentCollection, parentId, 'activity');
    await addDoc(activityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `New contact '${name}' added via NetSuite API.${isPrimary ? ' (Primary Contact)' : ''}`,
      author: 'NetSuite API'
    });

    return NextResponse.json({
      success: true,
      id: newContactRef.id,
      message: 'Contact created successfully.'
    });

  } catch (error: any) {
    console.error('Error creating contact via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
