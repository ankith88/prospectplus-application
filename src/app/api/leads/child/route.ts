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

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');

  if (!API_KEY || apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    
    // Unwrap values
    const body: any = {};
    for (const [key, value] of Object.entries(rawBody)) {
      body[key] = unwrapValue(value);
    }

    const {
      parentLeadId,
      companyName,
      address,
      localManager
    } = body;

    if (!parentLeadId) {
      return NextResponse.json({ error: 'parentLeadId is required' }, { status: 400 });
    }

    if (!address || !address.city || !address.state || !address.zip) {
      return NextResponse.json({ error: 'Valid address (city, state, zip) is required' }, { status: 400 });
    }

    // 1. Verify parent lead exists
    const parentLeadRef = db.collection('leads').doc(parentLeadId);
    const parentLeadSnap = await parentLeadRef.get();
    if (!parentLeadSnap.exists) {
      return NextResponse.json({ error: `Parent lead with ID '${parentLeadId}' not found` }, { status: 404 });
    }
    const parentLeadData = parentLeadSnap.data()!;

    // 2. Resolve Franchisee based on child address
    let matchedFranchiseeIds: string[] = [];
    let matchedFranchiseeNames: string[] = [];
    
    const zipTrimmed = address.zip.trim();
    const cityTrimmed = address.city.trim().toUpperCase();
    
    const franchiseesRef = db.collection('franchisees');
    const franchiseesSnap = await franchiseesRef.get();
    
    franchiseesSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const territories = data.territoryJson || [];
      const matches = territories.some((t: any) => t.post_code === zipTrimmed && (t.suburbs || '').toUpperCase() === cityTrimmed);
      if (matches) {
        matchedFranchiseeIds.push(data.internalId || docSnap.id);
        matchedFranchiseeNames.push(data.name || data.franchiseeName || docSnap.id);
      }
    });

    let assignedFranchisee = 'MailPlus Pty Ltd';
    let assignedFranchiseeName = 'MailPlus Pty Ltd';
    if (matchedFranchiseeIds.length === 1) {
      assignedFranchisee = matchedFranchiseeIds[0];
      assignedFranchiseeName = matchedFranchiseeNames[0];
    }

    // Determine child company name
    const finalCompanyName = companyName || `${parentLeadData.companyName || 'Lead'} - ${address.city}`;

    // 3. Build child lead data based on parent and custom payload fields
    const childLeadData: any = {
      // Start with copied parent lead data
      websiteUrl: parentLeadData.websiteUrl || '',
      customerPhone: localManager?.phone || parentLeadData.customerPhone || '',
      customerServiceEmail: localManager?.email || parentLeadData.customerServiceEmail || '',
      abn: parentLeadData.abn || '',
      industryCategory: parentLeadData.industryCategory || '',
      campaign: 'Multi-Site Child',
      dialerAssigned: parentLeadData.dialerAssigned || '',
      accountManagerAssigned: parentLeadData.accountManagerAssigned || null,
      bucket: parentLeadData.bucket || 'inbound',
      
      // Override with custom fields from body
      ...body,
      
      // Ensure key child-specific attributes
      companyName: finalCompanyName,
      parentLeadId: parentLeadId,
      address1: address.address1 || null,
      street: address.street || null,
      city: address.city,
      state: address.state,
      zip: address.zip,
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      franchisee: assignedFranchisee,
      franchiseeName: assignedFranchiseeName,
      status: 'New',
      customerStatus: 'New',
      dateLeadEntered: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      syncedWithNetSuite: false
    };

    // Remove localManager and address helper objects from parent properties
    delete childLeadData.localManager;
    delete childLeadData.address;

    // 4. Create child lead document in Firestore
    const leadsCollectionRef = db.collection('leads');
    const childLeadDocRef = await leadsCollectionRef.add(childLeadData);
    const childLeadId = childLeadDocRef.id;

    // Set self-reference id if applicable
    await childLeadDocRef.update({ id: childLeadId });

    // 5. Add local manager contact to child
    const childContactsRef = db.collection('leads').doc(childLeadId).collection('contacts');
    if (localManager && localManager.name) {
      await childContactsRef.add({
        ...localManager,
        createdAt: new Date().toISOString()
      });
    }

    // 6. Copy Parent Contacts to child
    const parentContactsRef = db.collection('leads').doc(parentLeadId).collection('contacts');
    const parentContactsSnap = await parentContactsRef.get();
    for (const contactDoc of parentContactsSnap.docs) {
      const contactData = contactDoc.data();
      await childContactsRef.add({
        ...contactData,
        createdAt: new Date().toISOString()
      });
    }

    // 7. Update parent lead's multiSiteLocations array
    await parentLeadRef.update({
      multiSiteLocations: FieldValue.arrayUnion({
        street: address.street || '',
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: 'Australia'
      })
    });

    // 8. Log activities
    const childActivityRef = db.collection('leads').doc(childLeadId).collection('activity');
    await childActivityRef.add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Lead created as a multi-site child from parent lead ${parentLeadId} via external API.`,
      author: 'System'
    });

    const parentActivityRef = db.collection('leads').doc(parentLeadId).collection('activity');
    await parentActivityRef.add({
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Created child lead '${finalCompanyName}' (${childLeadId}) via external API.`,
      author: 'System'
    });

    return NextResponse.json({
      success: true,
      childLeadId,
      lead: { id: childLeadId, ...childLeadData }
    });
  } catch (error: any) {
    console.error('Error creating child lead:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
