import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';

const API_KEY = process.env.PROSPECTPLUS_API_KEY;

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    // If it's just a regular object, keep it (might be the address or inboundDetails)
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
      body[key] = unwrapValue(value);
    }

    const {
      companyName,
      customerPhone,
      customerServiceEmail,
      websiteUrl,
      industryCategory,
      address,
      contacts,
      inboundDetails
    } = body;

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
    }

    // Prepare lead data
    // Use || null to avoid 'undefined' which Firestore rejects
    const leadData: any = {
      ...body, // Spread all fields from the body (including the extra ones provided)
      companyName: companyName || null,
      customerPhone: customerPhone || null,
      customerServiceEmail: customerServiceEmail || null,
      websiteUrl: websiteUrl || null,
      industryCategory: industryCategory || null,
      address: address || {},
      status: 'New',
      customerStatus: body.customerStatus || 'New',
      bucket: 'inbound',
      fieldSales: body.fieldSales === true || body.fieldSales === 'true',
      dateLeadEntered: body.dateLeadEntered || new Date().toISOString(),
      createdAt: serverTimestamp(),
      inboundDetails: {
        ...inboundDetails,
        submittedAt: inboundDetails?.submittedAt || new Date().toISOString()
      }
    };

    // Remove fields that should not be in the root or are handled specifically
    delete leadData.contacts;

    // Check for duplicates (Company Name)
    const leadsRef = collection(firestore, 'leads');
    const qName = query(leadsRef, where('companyName', '==', companyName), limit(5));
    const querySnapshotName = await getDocs(qName);
    
    const similarLeads = querySnapshotName.docs.map(doc => doc.id);
    const isDuplicate = similarLeads.length > 0;

    // Add duplicate info
    leadData.isDuplicate = isDuplicate;
    leadData.similarLeads = similarLeads;

    // Create the lead
    const docRef = await addDoc(leadsRef, leadData);

    // Add contacts if provided as sub-collection
    if (contacts && Array.isArray(contacts)) {
      const contactsSubRef = collection(firestore, 'leads', docRef.id, 'contacts');
      for (const contact of contacts) {
        if (contact.name || contact.email) {
          await addDoc(contactsSubRef, {
            ...contact,
            createdAt: serverTimestamp()
          });
        }
      }
    }

    // Log initial activity
    const activityRef = collection(firestore, 'leads', docRef.id, 'activity');
    await addDoc(activityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead created via Inbound API. Bucket: Inbound.${isDuplicate ? ' [POTENTIAL DUPLICATE DETECTED]' : ''}`,
      author: 'System API'
    });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      isDuplicate,
      message: isDuplicate ? 'Lead created but flagged as potential duplicate.' : 'Lead created successfully.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating lead via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
