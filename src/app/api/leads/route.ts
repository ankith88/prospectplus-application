import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendNewLeadToNetSuite } from '@/services/netsuite';
import * as crypto from 'crypto';
import { canAssignToAm } from '@/lib/leave-utils';
import { evaluateDuplicateScore, extractCoreBrandName } from '@/lib/duplicate-detector';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';
import { MULTISITE_ACCOUNT_MANAGER_UID, isMultisiteCampaign } from '@/lib/constants';

const API_KEY = process.env.PROSPECTPLUS_API_KEY || process.env.EXTERNAL_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

async function generateUniqueProspectPlusId(db: FirebaseFirestore.Firestore): Promise<string> {
  let unique = false;
  let candidate = '';
  let attempts = 0;
  while (!unique && attempts < 20) {
    attempts++;
    candidate = `MP${generateRandomAlphanumeric(6)}`;
    const leadsSnap = await db.collection('leads').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!leadsSnap.empty) continue;
    const companiesSnap = await db.collection('companies').where('prospectPlusId', '==', candidate).limit(1).get();
    if (!companiesSnap.empty) continue;
    unique = true;
  }
  return candidate;
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

function formatLeadFailureEmailHtml(leadData: any, errorDetails: { reason: string; details?: any }): string {
  const contacts = leadData.contacts || [];
  const contactName = contacts[0]?.name || `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim() || 'N/A';
  const contactEmail = leadData.customerServiceEmail || contacts[0]?.email || 'N/A';
  const contactPhone = leadData.customerPhone || contacts[0]?.phone || 'N/A';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1a202c; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #e53e3e; color: #ffffff; padding: 16px 24px;">
        <h2 style="margin: 0; font-size: 20px;">⚠️ Lead Creation / NetSuite Sync Alert</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Action required: A lead failed to sync automatically with NetSuite or ProspectPlus.</p>
      </div>
      
      <div style="padding: 24px; background-color: #ffffff;">
        <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px;">
          <strong style="color: #c53030;">Failure Reason:</strong> ${errorDetails.reason}
          ${errorDetails.details ? `<br/><span style="font-size: 13px; color: #742a2a;">${typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details)}</span>` : ''}
        </div>

        <h3 style="margin: 0 0 12px 0; color: #2d3748; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">Lead Details Entered in Form</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tbody>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; width: 38%; color: #4a5568;">Company Name:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.companyName || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Contact Name:</td><td style="padding: 8px 0; color: #1a202c;">${contactName}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Contact Email:</td><td style="padding: 8px 0; color: #1a202c;"><a href="mailto:${contactEmail}" style="color: #3182ce;">${contactEmail}</a></td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Contact Phone:</td><td style="padding: 8px 0; color: #1a202c;"><a href="tel:${contactPhone}" style="color: #3182ce;">${contactPhone}</a></td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Street Address:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.street || leadData.address1 || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Suburb / City:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.city || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">State:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.state || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Postcode:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.zip || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Interested In:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.interestedIn || leadData.discoveryData?.interestedIn || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Selected Service Option:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.selectedServiceOption || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Weekly Parcel Volume:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.weeklyParcels || leadData.discoveryData?.weeklyParcels || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">5 Free Collections Trial:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.isFiveFreeCollections ? 'Yes' : 'No'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Out of Territory:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.noFranchisees || leadData.status === 'Out of Territory' ? 'Yes' : 'No'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Source Page:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.sourcePage || leadData.inboundDetails?.sourcePage || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Page URL:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.pageUrl || leadData.inboundPageUrl || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Submitted At:</td><td style="padding: 8px 0; color: #1a202c;">${leadData.dateLeadEntered || new Date().toISOString()}</td></tr>
          </tbody>
        </table>

        <h3 style="margin: 0 0 12px 0; color: #2d3748; border-bottom: 2px solid #edf2f7; padding-bottom: 8px;">Raw Payload JSON</h3>
        <pre style="background-color: #f7fafc; padding: 12px; border-radius: 4px; font-size: 12px; color: #2d3748; overflow-x: auto;">${JSON.stringify(leadData, null, 2)}</pre>
      </div>

      <div style="background-color: #f7fafc; padding: 12px 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7;">
        Automated alert from MailPlus Lead Processing System
      </div>
    </div>
  `;
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
      isFiveFreeCollections,
      lpoLeadId,
      lpo_lead_id,
      selectedServiceOption,
      pageUrl,
      sourcePageUrl,
      url
    } = body;

    const finalPageUrl = body.inboundPageUrl || pageUrl || sourcePageUrl || url || inboundDetails?.landingPage || null;

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

    const isMultisite = isMultisiteCampaign(body.campaign) || Boolean(body.parentLeadId) || Boolean(body.parentProspectPlusId);

    // Assign Account Manager
    let assignedAccountManager = isMultisite ? MULTISITE_ACCOUNT_MANAGER_UID : (body.accountManagerAssigned || null);
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
    const prospectPlusId = await generateUniqueProspectPlusId(db);
    const leadData: any = {
      ...body,
      prospectPlusId,
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
      accountManagerAssigned: isMultisite ? (accountManagerName || MULTISITE_ACCOUNT_MANAGER_UID) : (accountManagerName || assignedAccountManager || undefined),
      salesRepAssigned: isMultisite ? (accountManagerName || MULTISITE_ACCOUNT_MANAGER_UID) : (body.salesRepAssigned || undefined),
      bucket: isMultisite ? 'account_manager' : (body.bucket || 'inbound'),
      fieldSales: body.fieldSales === true || body.fieldSales === 'true',
      dateLeadEntered: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      syncedWithNetSuite: false,
      lpoLeadId: lpoLeadId || lpo_lead_id || null,
      selectedServiceOption: selectedServiceOption || null,
      inboundPageUrl: finalPageUrl,
      pageUrl: finalPageUrl,
      discoveryData: {
        interestedIn: interestedIn || null,
        weeklyParcels: weeklyParcels || null,
      },
      inboundDetails: {
        ...inboundDetails,
        pageUrl: finalPageUrl,
        submittedAt: inboundDetails?.submittedAt || new Date().toISOString()
      }
    };

    // Remove fields that should not be in the root or are handled specifically
    delete leadData.contacts;
    delete leadData.address;

    // Check for potential duplicate leads & existing customers using multi-tiered matching criteria
    const coreBrand = extractCoreBrandName(companyName);
    const checkedCandidateIds = new Set<string>();

    const exactLeadsPromise = db.collection('leads').where('companyName', '==', companyName).limit(10).get();
    let prefixLeadsPromise = Promise.resolve({ docs: [] } as any);
    if (coreBrand && coreBrand.length >= 3) {
      const coreUpper = coreBrand.charAt(0).toUpperCase() + coreBrand.slice(1);
      prefixLeadsPromise = db.collection('leads')
        .where('companyName', '>=', coreUpper)
        .where('companyName', '<=', coreUpper + '\uf8ff')
        .limit(10)
        .get();
    }
    const companiesSnapPromise = db.collection('companies').where('companyName', '==', companyName).limit(5).get();

    const [exactSnap, prefixSnap, companiesSnap] = await Promise.all([
      exactLeadsPromise,
      prefixLeadsPromise,
      companiesSnapPromise
    ]);
    
    let isDuplicate = false;
    let isExistingCustomerMatch = false;
    let matchingCustomerId: string | null = null;
    const similarLeads: string[] = [];
    let topConfidence: 'High' | 'Medium' | 'Low' | 'None' = 'None';
    let topReasons: string[] = [];
    let topScore = 0;

    const allCandidateDocs = [...exactSnap.docs, ...prefixSnap.docs];
    for (const docSnap of allCandidateDocs) {
      if (checkedCandidateIds.has(docSnap.id)) continue;
      checkedCandidateIds.add(docSnap.id);
      const candidateLead = { id: docSnap.id, ...docSnap.data() };
      const evalResult = evaluateDuplicateScore(leadData, candidateLead);
      if (evalResult.isMatch) {
        isDuplicate = true;
        similarLeads.push(docSnap.id);
        if (evalResult.score > topScore) {
          topScore = evalResult.score;
          topConfidence = evalResult.confidence;
          topReasons = evalResult.matchedCriteria;
        }
      }
    }

    if (!companiesSnap.empty) {
      for (const compDoc of companiesSnap.docs) {
        const evalResult = evaluateDuplicateScore(leadData, compDoc.data());
        if (evalResult.isMatch) {
          isExistingCustomerMatch = true;
          matchingCustomerId = compDoc.id;
          break;
        }
      }
    }

    // Add duplicate info & match reasons
    leadData.isDuplicate = isDuplicate;
    leadData.similarLeads = similarLeads;
    if (isDuplicate) {
      leadData.duplicateConfidence = topConfidence;
      leadData.duplicateMatchReasons = topReasons;
    }
    if (isExistingCustomerMatch) {
      leadData.isExistingCustomerMatch = true;
      leadData.existingCustomerId = matchingCustomerId;
    }

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
      selectedServiceOption: leadData.selectedServiceOption || undefined,
      pageUrl: leadData.pageUrl || undefined,
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
    } catch (nsError: any) {
      console.error('NetSuite API error:', nsError);
      routingNote += ` NetSuite Sync Error: ${nsError?.message || nsError}.`;
    }

    if (!netSuiteSuccess) {
      try {
        const { sendPhysicalEmail } = await import('@/lib/email-dispatcher');
        const alertHtml = formatLeadFailureEmailHtml(leadData, {
          reason: 'NetSuite Lead Creation / Sync Failed',
          details: routingNote,
        });
        await sendPhysicalEmail({
          to: 'mailplusit@mailplus.com.au, ankith.ravindran@mailplus.com.au',
          cc: 'alexandra.bathman@mailplus.com.au',
          customFrom: 'customerservice@mailplus.com.au',
          subject: `[URGENT LEAD ALERT] NetSuite Sync Failed - ${leadData.companyName || 'Unknown'}`,
          html: alertHtml,
        });
        console.log(`[Lead Alert] Dispatched NetSuite failure email alert for ${leadData.companyName}`);
      } catch (emailErr) {
        console.error('Failed to send NetSuite failure email alert:', emailErr);
      }
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
          
          const updates: any = {};
          if (netSuiteLeadData.bookingUrlId) {
            bookingUrlId = netSuiteLeadData.bookingUrlId;
          } else {
            bookingUrlId = crypto.randomUUID();
            updates.bookingUrlId = bookingUrlId;
          }

          if (!netSuiteLeadData.generalBookingUrlId) {
            updates.generalBookingUrlId = crypto.randomUUID();
          }

          if (Object.keys(updates).length > 0) {
            await leadRef.set(updates, { merge: true });
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
      leadData.generalBookingUrlId = crypto.randomUUID();
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
            userName: accountManagerName || undefined,
            accountManagerName: accountManagerName || assignedAccountManager || undefined
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
              bucket: 'account_manager',
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

    // Link LPO Lead if lpoLeadId is present
    const finalLpoLeadId = lpoLeadId || lpo_lead_id || leadData.lpoLeadId;
    if (finalLpoLeadId) {
      const createdLeadId = docRef ? docRef.id : netSuiteId;
      if (createdLeadId) {
        await db.collection('lpo_leads').doc(finalLpoLeadId).update({
          linkedLeadId: createdLeadId,
          linkedLeadCompanyName: companyName,
          status: 'Lead Created',
          updatedAt: FieldValue.serverTimestamp()
        });

        // Add activity log to LPO Lead
        await db.collection('lpo_leads').doc(finalLpoLeadId).collection('activity').add({
          type: 'StatusChange',
          notes: `NetSuite sync: Created and linked Lead '${companyName}' (ID: ${createdLeadId}). Status updated to 'Lead Created'.`,
          author: 'NetSuite API',
          createdAt: FieldValue.serverTimestamp()
        });
      }
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
    try {
      const { sendPhysicalEmail } = await import('@/lib/email-dispatcher');
      const alertHtml = formatLeadFailureEmailHtml({}, {
        reason: 'Unhandled API Exception',
        details: error?.message || String(error),
      });
      await sendPhysicalEmail({
        to: 'mailplusit@mailplus.com.au, ankith.ravindran@mailplus.com.au',
        cc: 'alexandra.bathman@mailplus.com.au',
        customFrom: 'customerservice@mailplus.com.au',
        subject: `[URGENT LEAD ALERT] Lead Creation API Exception`,
        html: alertHtml,
      });
    } catch (emailErr) {
      console.error('Failed to send exception email alert:', emailErr);
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
