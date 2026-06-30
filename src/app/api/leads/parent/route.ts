import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, setDoc, doc, getDoc, serverTimestamp, getDocs, query, where, limit, addDoc } from 'firebase/firestore';
import { canAssignToAm } from '@/lib/leave-utils';

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
      leadId,
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

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
    }

    // Check if leadId already exists
    const leadRef = doc(firestore, 'leads', leadId);
    const leadSnap = await getDoc(leadRef);
    if (leadSnap.exists()) {
      return NextResponse.json({ error: `Lead with ID '${leadId}' already exists` }, { status: 409 });
    }

    // Support both flat fields and nested address object
    const finalZip = zip || address?.zip;
    const finalCity = city || address?.city;

    // --- Routing Logic: Franchisee & Account Manager ---
    let matchedFranchiseeIds: string[] = [];
    let matchedFranchiseeNames: string[] = [];
    let routingNote = '';
    
    if (finalZip && finalCity) {
      const zipTrimmed = finalZip.trim();
      const cityTrimmed = finalCity.trim().toUpperCase();
      
      const franchiseesRef = collection(firestore, 'franchisees');
      const franchiseesSnap = await getDocs(franchiseesRef);
      
      franchiseesSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const territories = data.territoryJson || [];
        const matches = territories.some((t: any) => t.post_code === zipTrimmed && (t.suburbs || '').toUpperCase() === cityTrimmed);
        if (matches) {
          matchedFranchiseeIds.push(data.internalId || docSnap.id);
          matchedFranchiseeNames.push(data.name || data.franchiseeName || docSnap.id);
        }
      });
    }

    let assignedFranchisee = 'MailPlus Pty Ltd'; // Fallback
    let assignedFranchiseeName = 'MailPlus Pty Ltd';
    let potentialFranchisees: string[] | undefined = undefined;
    let initialStatus = body.customerStatus || 'New';

    if (matchedFranchiseeIds.length === 1) {
      assignedFranchisee = matchedFranchiseeIds[0];
      assignedFranchiseeName = matchedFranchiseeNames[0];
      routingNote = `Routed to franchisee ${assignedFranchiseeName} based on territory match.`;
    } else if (matchedFranchiseeIds.length > 1) {
      potentialFranchisees = matchedFranchiseeIds;
      routingNote = `Multiple territories matched. Defaulted to MailPlus Pty Ltd.`;
    } else {
      initialStatus = 'Out of Territory';
      routingNote = `No territory matched. Defaulted to MailPlus Pty Ltd (Out of Territory).`;
    }

    // Assign Account Manager randomly (if not provided)
    let assignedAccountManager = body.accountManagerAssigned || null;
    let accountManagerName: string | null = null;
    let accountManagerCalendly: string | null = null;
    let accountManagerEmail: string | null = null;

    try {
      const usersRef = collection(firestore, 'users');
      if (!assignedAccountManager) {
        const amQuery = query(usersRef, where('assignedRoles', 'array-contains', 'Account Manager'));
        const amSnap = await getDocs(amQuery);
        if (!amSnap.empty) {
          const amUsers = amSnap.docs.map(docSnap => ({ id: docSnap.id, data: docSnap.data() })).filter(u => canAssignToAm(u.data as any));
          if (amUsers.length > 0) {
            const randomAm = amUsers[Math.floor(Math.random() * amUsers.length)];
            assignedAccountManager = randomAm.id;
            accountManagerName = randomAm.data.displayName || `${randomAm.data.firstName || ''} ${randomAm.data.lastName || ''}`.trim() || 'Unknown';
            accountManagerCalendly = randomAm.data.calendlyLink || randomAm.data.calendly || null;
            accountManagerEmail = randomAm.data.email || null;
            routingNote += ` Randomly assigned Account Manager: ${accountManagerName}.`;
          } else {
            routingNote += ` No active Account Managers found in system for assignment.`;
          }
        } else {
          routingNote += ` No Account Managers found in system for assignment.`;
        }
      } else {
        const amDoc = await getDoc(doc(firestore, 'users', assignedAccountManager));
        if (amDoc.exists()) {
          const data = amDoc.data();
          accountManagerName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
          accountManagerCalendly = data.calendlyLink || data.calendly || null;
          accountManagerEmail = data.email || null;
        } else {
          const nameQuery = query(usersRef, where('displayName', '==', assignedAccountManager), limit(1));
          const nameSnap = await getDocs(nameQuery);
          if (!nameSnap.empty) {
            const data = nameSnap.docs[0].data();
            assignedAccountManager = nameSnap.docs[0].id;
            accountManagerName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
            accountManagerCalendly = data.calendlyLink || data.calendly || null;
            accountManagerEmail = data.email || null;
          } else {
            accountManagerName = assignedAccountManager;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to assign or fetch account manager', err);
      if (!accountManagerName && assignedAccountManager) accountManagerName = assignedAccountManager;
    }

    // Build the lead data
    const leadData: any = {
      ...body,
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
      franchiseeName: assignedFranchiseeName,
      ...(potentialFranchisees && { potentialFranchisees }),
      ...(assignedAccountManager && { accountManagerAssigned: assignedAccountManager }),
      bucket: body.bucket || 'inbound',
      dateLeadEntered: new Date().toISOString(),
      createdAt: serverTimestamp(),
      syncedWithNetSuite: false,
      discoveryData: {
        interestedIn: interestedIn || null,
        weeklyParcels: weeklyParcels || null,
      },
      inboundDetails: {
        ...inboundDetails,
        submittedAt: inboundDetails?.submittedAt || new Date().toISOString()
      }
    };

    // Remove temporary/special parameters
    delete leadData.leadId;
    delete leadData.contacts;
    delete leadData.address;

    // Save lead document with the provided ID
    await setDoc(leadRef, leadData);

    // Save contacts if provided
    if (contacts && Array.isArray(contacts)) {
      const contactsSubRef = collection(firestore, 'leads', leadId, 'contacts');
      for (const contact of contacts) {
        if (contact.name) {
          await addDoc(contactsSubRef, {
            ...contact,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    // Log activity
    const activityRef = collection(firestore, 'leads', leadId, 'activity');
    await addDoc(activityRef, {
      type: 'Update',
      date: new Date().toISOString(),
      notes: `Parent lead created via external API with ID '${leadId}'. ${routingNote}`,
      author: 'System'
    });

    return NextResponse.json({
      success: true,
      leadId,
      lead: leadData
    });
  } catch (error: any) {
    console.error('Error creating parent lead:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
