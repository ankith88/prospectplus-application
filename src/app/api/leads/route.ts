import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { sendNewLeadToNetSuite } from '@/services/netsuite';

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
      address1,
      street,
      city,
      state,
      zip,
      latitude,
      longitude,
      contacts,
      inboundDetails,
      interestedIn,
      weeklyParcels
    } = body;

    // Support both flat fields and nested address object
    const finalZip = zip || address?.zip;
    const finalCity = city || address?.city;

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
    }

    // --- Routing Logic: Franchisee & Account Manager ---
    let matchedFranchiseeIds: string[] = [];
    let routingNote = '';
    
    if (finalZip && finalCity) {
      const zipTrimmed = finalZip.trim();
      const cityTrimmed = finalCity.trim().toUpperCase();
      
      const franchiseesRef = collection(firestore, 'franchisees');
      const franchiseesSnap = await getDocs(franchiseesRef);
      
      franchiseesSnap.docs.forEach(doc => {
        const data = doc.data();
        const territories = data.territoryJson || [];
        const matches = territories.some((t: any) => t.post_code === zipTrimmed && (t.suburbs || '').toUpperCase() === cityTrimmed);
        if (matches) {
          matchedFranchiseeIds.push(data.internalId || doc.id);
        }
      });
    }

    let assignedFranchisee = 'MailPlus Pty Ltd'; // Fallback
    let potentialFranchisees: string[] | undefined = undefined;
    let initialStatus = body.customerStatus || 'New';

    if (matchedFranchiseeIds.length === 1) {
      assignedFranchisee = matchedFranchiseeIds[0];
      routingNote = `Routed to franchisee ${assignedFranchisee} based on territory match.`;
    } else if (matchedFranchiseeIds.length > 1) {
      potentialFranchisees = matchedFranchiseeIds;
      routingNote = `Multiple territories matched. Defaulted to MailPlus Pty Ltd.`;
    } else {
      initialStatus = 'Out of Territory';
      routingNote = `No territory matched. Defaulted to MailPlus Pty Ltd (Out of Territory).`;
    }

    // Assign Account Manager randomly (if not provided)
    let assignedAccountManager = body.accountManagerAssigned || null;
    if (!assignedAccountManager) {
    try {
      const usersRef = collection(firestore, 'users');
      // Using 'Account Manager' as the canonical role string.
      const amQuery = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'));
      const amSnap = await getDocs(amQuery);
      if (!amSnap.empty) {
        const amUsers = amSnap.docs.map(doc => doc.id); // Usually doc.id is the UID
        assignedAccountManager = amUsers[Math.floor(Math.random() * amUsers.length)];
        routingNote += ` Randomly assigned Account Manager: ${assignedAccountManager}.`;
      } else {
        routingNote += ` No Account Managers found in system for assignment.`;
      }
    } catch (err) {
      console.warn('Failed to assign account manager', err);
    }
    }
    // ---------------------------------------------------

    // Prepare lead data
    // Use || null to avoid 'undefined' which Firestore rejects
    const leadData: any = {
      ...body, // Spread all fields from the body (including the extra ones provided)
      companyName: companyName || null,
      customerPhone: customerPhone || null,
      customerServiceEmail: customerServiceEmail || null,
      websiteUrl: websiteUrl || null,
      industryCategory: industryCategory || null,
      address1: address1 || address?.address1 || null,
      street: street || address?.street || null,
      city: city || address?.city || null,
      state: state || address?.state || null,
      zip: zip || address?.zip || null,
      latitude: latitude || address?.latitude || null,
      longitude: longitude || address?.longitude || null,
      status: initialStatus,
      customerStatus: body.customerStatus || 'New',
      franchisee: assignedFranchisee,
      ...(potentialFranchisees && { potentialFranchisees }),
      ...(assignedAccountManager && { accountManagerAssigned: assignedAccountManager }),
      bucket: body.bucket || 'inbound',
      fieldSales: body.fieldSales === true || body.fieldSales === 'true',
      dateLeadEntered: new Date().toISOString(),
      createdAt: serverTimestamp(),
      syncedWithNetSuite: false, // Default to false, will update if NetSuite succeeds
      discoveryData: {
        interestedIn: interestedIn || null,
        weeklyParcels: weeklyParcels || null,
      },
      inboundDetails: {
        ...inboundDetails,
        submittedAt: inboundDetails?.submittedAt || new Date().toISOString()
      }
    };

    // Remove fields that should not be in the root or are handled specifically
    delete leadData.contacts;
    delete leadData.address;

    // Check for duplicates (Company Name)
    const leadsRef = collection(firestore, 'leads');
    const qName = query(leadsRef, where('companyName', '==', companyName), limit(5));
    const querySnapshotName = await getDocs(qName);
    
    const similarLeads = querySnapshotName.docs.map(doc => doc.id);
    const isDuplicate = similarLeads.length > 0;

    // Add duplicate info
    leadData.isDuplicate = isDuplicate;
    leadData.similarLeads = similarLeads;

    // Prepare payload for NetSuite
    const netSuitePayload = {
      companyName: leadData.companyName || 'Unknown',
      customerPhone: leadData.customerPhone || undefined,
      customerServiceEmail: leadData.customerServiceEmail || undefined,
      websiteUrl: leadData.websiteUrl || undefined,
      industryCategory: leadData.industryCategory || undefined,
      campaign: 'Inbound',
      address: {
        address1: leadData.address1 || undefined,
        street: leadData.street || '',
        city: leadData.city || '',
        state: leadData.state || '',
        zip: leadData.zip || '',
        country: 'Australia',
        lat: leadData.latitude || undefined,
        lng: leadData.longitude || undefined,
      },
      contact: {
        firstName: contacts && contacts[0] ? (contacts[0].name?.split(' ')[0] || '') : '',
        lastName: contacts && contacts[0] ? (contacts[0].name?.split(' ').slice(1).join(' ') || '') : '',
        email: contacts && contacts[0] ? contacts[0].email : '',
        phone: contacts && contacts[0] ? contacts[0].phone : '',
      },
      discoveryData: leadData.discoveryData,
      franchiseeInternalId: leadData.franchisee,
      franchiseeName: leadData.franchisee,
      bucket: leadData.bucket,
    };

    let docRef: any;
    let netSuiteSuccess = false;
    let netSuiteId: string | null = null;

    try {
      // Call NetSuite API
      const nsResult = await sendNewLeadToNetSuite(netSuitePayload as any);
      if (nsResult.success && nsResult.leadId) {
        netSuiteSuccess = true;
        netSuiteId = nsResult.leadId;
      } else {
        routingNote += ` NetSuite Sync Failed: ${nsResult.message}.`;
      }
    } catch (nsError) {
      console.error('NetSuite API error:', nsError);
      routingNote += ` NetSuite Sync Error.`;
    }

    if (netSuiteSuccess && netSuiteId) {
      // If NetSuite succeeds, use its ID
      leadData.syncedWithNetSuite = true;
      docRef = doc(firestore, 'leads', netSuiteId);
      await setDoc(docRef, leadData);
    } else {
      // If NetSuite fails, create with auto-generated ID
      leadData.syncedWithNetSuite = false;
      docRef = await addDoc(leadsRef, leadData);
    }

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
      notes: `Lead created via Inbound API. Bucket: Inbound. ${routingNote}${isDuplicate ? ' [POTENTIAL DUPLICATE DETECTED]' : ''}`,
      author: 'System API'
    });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      isDuplicate,
      syncedWithNetSuite: netSuiteSuccess,
      outOfTerritory: initialStatus === 'Out of Territory',
      message: isDuplicate ? 'Lead created but flagged as potential duplicate.' : 'Lead created successfully.'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating lead via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
