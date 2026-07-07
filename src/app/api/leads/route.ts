import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendNewLeadToNetSuite } from '@/services/netsuite';
import * as crypto from 'crypto';
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
      weeklyParcels,
      isFiveFreeCollections
    } = body;

    // Support both flat fields and nested address object
    const finalZip = zip || address?.zip;
    const finalCity = city || address?.city;

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 });
    }

    const db = getFirestore(adminApp);

    // --- Routing Logic: Franchisee & Account Manager ---
    let matchedFranchiseeIds: string[] = [];
    let matchedFranchiseeNames: string[] = [];
    let routingNote = '';
    
    if (finalZip && finalCity) {
      const zipTrimmed = finalZip.trim();
      const cityTrimmed = finalCity.trim().toUpperCase();
      
      const franchiseesSnap = await db.collection('franchisees').get();
      
      franchiseesSnap.forEach(doc => {
        const data = doc.data();
        const territories = data.territoryJson || [];
        const matches = territories.some((t: any) => t.post_code === zipTrimmed && (t.suburbs || '').toUpperCase() === cityTrimmed);
        if (matches) {
          matchedFranchiseeIds.push(data.internalId || doc.id);
          matchedFranchiseeNames.push(data.name || data.franchiseeName || doc.id);
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
      const usersRef = db.collection('users');
      if (!assignedAccountManager) {
        // Using 'Account Manager' as the canonical role string.
        const amSnap = await usersRef.where('assignedRoles', 'array-contains', 'Account Manager').get();
        if (!amSnap.empty) {
          const amUsers = amSnap.docs.map(doc => ({ id: doc.id, data: doc.data() })).filter(u => canAssignToAm(u.data as any));
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
        // Try to fetch provided AM details by UID first
        const amDoc = await usersRef.doc(assignedAccountManager).get();
        if (amDoc.exists && amDoc.data()) {
          const data = amDoc.data()!;
          accountManagerName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
          accountManagerCalendly = data.calendlyLink || data.calendly || null;
          accountManagerEmail = data.email || null;
        } else {
          // If not a UID, try searching by displayName
          const nameSnap = await usersRef.where('displayName', '==', assignedAccountManager).limit(1).get();
          if (!nameSnap.empty) {
            const data = nameSnap.docs[0].data();
            assignedAccountManager = nameSnap.docs[0].id;
            accountManagerName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown';
            accountManagerCalendly = data.calendlyLink || data.calendly || null;
            accountManagerEmail = data.email || null;
          } else {
            // Unrecognized name/ID, just keep it as is
            accountManagerName = assignedAccountManager;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to assign or fetch account manager', err);
      if (!accountManagerName && assignedAccountManager) accountManagerName = assignedAccountManager;
    }
    // ---------------------------------------------------

    // Prepare lead data
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
      fieldSales: body.fieldSales === true || body.fieldSales === 'true',
      dateLeadEntered: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
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

    // Remove fields that should not be in the root or are handled specifically
    delete leadData.contacts;
    delete leadData.address;

    // Check for duplicates (Company Name)
    const querySnapshotName = await db.collection('leads').where('companyName', '==', companyName).limit(5).get();
    
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
      franchiseeInternalId: leadData.franchisee === 'MailPlus Pty Ltd' ? '435' : leadData.franchisee,
      franchiseeName: leadData.franchiseeName,
      bucket: leadData.bucket === '5-free-trial' ? 'inbound' : leadData.bucket,
      noFranchisees: leadData.noFranchisees,
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

    let internalid: string | undefined;
    let customerEntityId: string | undefined;
    let bookingUrlId: string | undefined;

    if (netSuiteSuccess && netSuiteId) {
      leadData.syncedWithNetSuite = true;
      internalid = netSuiteId;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const leadRef = db.collection('leads').doc(netSuiteId);
        const leadDoc = await leadRef.get();
        if (leadDoc.exists && leadDoc.data()) {
          const netSuiteLeadData = leadDoc.data()!;
          if (netSuiteLeadData.salesRepAssignedCalendlyLink) {
             accountManagerCalendly = netSuiteLeadData.salesRepAssignedCalendlyLink;
          }
          if (netSuiteLeadData.internalid) internalid = netSuiteLeadData.internalid;
          if (netSuiteLeadData.customerEntityId) customerEntityId = netSuiteLeadData.customerEntityId;
          
          if (netSuiteLeadData.bookingUrlId) {
            bookingUrlId = netSuiteLeadData.bookingUrlId;
          } else {
            bookingUrlId = crypto.randomUUID();
            await leadRef.set({ bookingUrlId }, { merge: true });
          }
        }
      } catch (e) {
        console.error('Failed to fetch lead from Firestore after NetSuite creation:', e);
      }
    } else {
      // If NetSuite fails, create with auto-generated ID in Firestore immediately
      leadData.syncedWithNetSuite = false;
      bookingUrlId = crypto.randomUUID();
      leadData.bookingUrlId = bookingUrlId;
      docRef = await db.collection('leads').add(leadData);
    }

    let localMilePlusAuthLink: string | undefined;

    if (isFiveFreeCollections && netSuiteSuccess && netSuiteId && initialStatus !== 'Out of Territory') {
      if (assignedFranchisee === 'MailPlus Pty Ltd') {
        if (accountManagerEmail) {
          try {
            const { sendPhysicalEmail } = await import('@/lib/email-dispatcher');
            const emailHtml = `
              <p>Hi ${accountManagerName || 'Account Manager'},</p>
              <p>A new lead (<strong>${companyName}</strong>) has submitted the 5 Free Collections form.</p>
              <p>However, because multiple franchisees can service this territory, the lead has been assigned to <strong>MailPlus Pty Ltd</strong>.</p>
              <p>Please manually select the correct franchisee for this lead in the system and initiate the LocalMile free trial process.</p>
              <br/>
              <p>Kind regards,</p>
              <p>System Auto-Notifier</p>
            `;
            await sendPhysicalEmail({
              to: accountManagerEmail,
              subject: `5 Free Collections Lead - Manual Franchisee Selection Required for ${companyName}`,
              html: emailHtml,
              customFrom: 'customersucess@mailplus.com.au'
            });
            console.log(`[5 Free Trial] Dispatched AM notification email to ${accountManagerEmail}`);
          } catch (emailErr) {
            console.error('Failed to send multi-franchisee email to Account Manager:', emailErr);
          }
        }
      } else {
        try {
          const { initiateLocalMileTrial } = await import('@/services/netsuite-localmile-proxy');
          const contact = contacts && contacts[0] ? contacts[0] : {};
          const contactFirstName = contact.name?.split(' ')[0] || '';
          const contactLastName = contact.name?.split(' ').slice(1).join(' ') || '';
          const contactEmail = contact.email || '';
          const contactPhone = contact.phone || '';

          const trialResult = await initiateLocalMileTrial({
            leadId: netSuiteId,
            serviceType: 'Adhoc',
            rate: 15,
            contactFirstName,
            contactLastName,
            contactEmail,
            contactPhone,
            userEmail: accountManagerEmail || 'info@mailplus.com.au',
            userName: accountManagerName || 'System API'
          });

          if (trialResult.success && trialResult.localMilePlusAuthLink) {
            localMilePlusAuthLink = trialResult.localMilePlusAuthLink;

            // Update Lead fields in Firestore
            const leadRef = db.collection('leads').doc(netSuiteId);
            await leadRef.set({
              status: 'LocalMile Opportunity',
              customerStatus: 'LocalMile Opportunity',
              serviceType: 'Adhoc',
              rate: 15,
              bucket: 'customer_success',
              localMileTrialsRemaining: 5
            }, { merge: true });

            // Update primary contact document with registration details
            const contactsRef = db.collection('leads').doc(netSuiteId).collection('contacts');
            const contactsSnap = await contactsRef.get();
            if (!contactsSnap.empty) {
              const firstContactDoc = contactsSnap.docs[0];
              await firstContactDoc.ref.set({
                localMilePlusAuthLink,
                securityCode: trialResult.securityCode
              }, { merge: true });
            } else {
              await contactsRef.add({
                name: `${contactFirstName} ${contactLastName}`.trim(),
                email: contactEmail,
                phone: contactPhone,
                localMilePlusAuthLink,
                securityCode: trialResult.securityCode,
                createdAt: FieldValue.serverTimestamp()
              });
            }

            // Log activity in Firestore
            const activityRef = db.collection('leads').doc(netSuiteId).collection('activity');
            await activityRef.add({
              type: 'Update',
              date: new Date().toISOString(),
              notes: 'Initiated LocalMile Trial (Adhoc at $15)',
              author: 'System API'
            });
          }
        } catch (trialErr) {
          console.error('Failed to initiate automatic LocalMile trial:', trialErr);
        }
      }
    }

    // Only add subcollections if we actually created the document in Firestore
    if (docRef) {
      // Add contacts if provided as sub-collection
      if (contacts && Array.isArray(contacts)) {
        const contactsSubRef = db.collection('leads').doc(docRef.id).collection('contacts');
        let firstContactId: string | undefined;
        for (const contact of contacts) {
          if (contact.name || contact.email) {
            const contactRef = await contactsSubRef.add({
              ...contact,
              createdAt: FieldValue.serverTimestamp()
            });
            if (!firstContactId) {
              firstContactId = contactRef.id;
            }
          }
        }
        if (firstContactId) {
          await db.collection('leads').doc(docRef.id).set({ bookingContactId: firstContactId }, { merge: true });
        }
      }

      // Log initial activity
      const activityRef = db.collection('leads').doc(docRef.id).collection('activity');
      await activityRef.add({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Lead created via Inbound API. Bucket: Inbound. ${routingNote}${isDuplicate ? ' [POTENTIAL DUPLICATE DETECTED]' : ''}`,
        author: 'System API'
      });
    }

    return NextResponse.json({ 
      success: true, 
      id: docRef ? docRef.id : netSuiteId,
      isDuplicate,
      syncedWithNetSuite: netSuiteSuccess,
      outOfTerritory: initialStatus === 'Out of Territory',
      message: isDuplicate ? 'Lead processed but flagged as potential duplicate.' : 'Lead processed successfully.',
      accountManagerName: accountManagerName || undefined,
      accountManagerCalendly: accountManagerCalendly || undefined,
      internalid,
      customerEntityId,
      bookingUrlId,
      franchiseeName: assignedFranchiseeName,
      localMilePlusAuthLink
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating lead via API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
