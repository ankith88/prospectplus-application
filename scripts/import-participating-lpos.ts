import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))),
    });
  } else {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'prospectplus-app',
    });
  }
}

const db = getFirestore();

function generateRandomAlphanumeric(length = 6): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function runCliImport() {
  const fileArgIdx = process.argv.indexOf('--file');
  let filePath = fileArgIdx !== -1 ? process.argv[fileArgIdx + 1] : '';

  if (!filePath) {
    console.error('Error: Please specify CSV file path using --file <path-to-csv>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found at path ${absolutePath}`);
    process.exit(1);
  }

  console.log(`[CLI LPO Import] Reading CSV file: ${absolutePath}`);
  const csvText = fs.readFileSync(absolutePath, 'utf8');

  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rawRows = parsed.data as Record<string, any>[];

  if (!rawRows || rawRows.length === 0) {
    console.error('Error: No records found in CSV file.');
    process.exit(1);
  }

  console.log(`[CLI LPO Import] Parsed ${rawRows.length} rows from CSV.`);

  const mapRowToLpo = (row: Record<string, any>) => {
    const keys = Object.keys(row);
    const getVal = (possibleHeaders: string[], colIdx?: number) => {
      for (const k of possibleHeaders) {
        const found = keys.find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
          return String(row[found]).trim();
        }
      }
      if (colIdx !== undefined && keys[colIdx] && row[keys[colIdx]] !== undefined && row[keys[colIdx]] !== null) {
        return String(row[keys[colIdx]]).trim();
      }
      return '';
    };

    // User Column Letters:
    // Col G: Linked Partner Location
    // Col I: Customer ID (customerEntityId)
    // Col K: Name of the Linked Franchisee
    // Col N: Address Line 1
    // Col O: Address Line 2
    // Col T: Contact Name
    // Col U: Contact Email
    // Col V: Contact Phone
    const linkedPartnerLocationName = getVal(['Linked NCL', 'Linked Partner Location'], 6);
    const linkedCustomerId = getVal(['ID', 'Customer ID', 'customerEntityId'], 8);
    const linkedFranchiseeName = getVal(['LPO Tier', 'Company Name / Franchise', 'Linked Franchisee'], 10);
    const address1 = getVal(['Street No & Name', 'Address Line 1'], 13);
    const address2 = getVal(['LPO Suburb', 'Address Line 2'], 14);
    const lpoOwnerName = getVal(['Contact Name'], 19);
    const email = getVal(['Email Address'], 20);
    const phone = getVal(['Contact Number'], 21);

    return {
      lpoInternalId: getVal(['Internal ID'], 0),
      inactive: getVal(['Inactive'], 1)?.toLowerCase() === 'yes',
      secondaryInternalId: getVal(['Internal ID_1'], 2),
      lpoCreatedDate: getVal(['Date Created'], 3),
      lpoLastModifiedDate: getVal(['Last Modified'], 4),
      lpoName: getVal(['LPO Name'], 5) || 'Unnamed LPO',
      linkedNcl: linkedPartnerLocationName,
      linkedPartnerLocationName,
      rawCustomerName: getVal(['Customer'], 7),
      linkedCustomerId,
      companyNameFranchise: linkedFranchiseeName,
      linkedFranchiseeName,
      lpoTier: getVal(['LPO Tier'], 10),
      status: getVal(['Status*'], 11) || 'New',
      poLevelTier: getVal(['PO Level / Tier'], 12),
      address1,
      address2,
      city: getVal(['LPO Suburb'], 14),
      state: getVal(['LPO State'], 15),
      postcode: getVal(['LPO Postcode'], 16),
      notes: getVal(['Notes'], 17),
      lpoOwnerName,
      phone,
      email,
      pageURL: getVal(['Page URL - S/O'], 22),
      salesRep: getVal(['Sales Rep'], 23),
      validationProvided: getVal(['Validation Provided'], 24),
      leadGenerator: getVal(['Lead Generator'], 25),
      faceToFace: getVal(['Face-to-face'], 26),
      confAndCall: getVal(['Conf & Call'], 27),
      acceptedTerms: getVal(['Accepted T&C'], 28),
      dynamicScf: getVal(['Dynamic SCF'], 29),
      adhocBooking: getVal(['Adhoc Booking'], 30),
      defaultPassword: getVal(['Default Password'], 31),
    };
  };

  const rows = rawRows.map(mapRowToLpo);

  // Step 1: Collect unique Customer IDs from Column I
  const customerIds = Array.from(new Set(rows.map((r) => r.linkedCustomerId).filter((id) => id && id.length > 0)));
  console.log(`[CLI LPO Import] Found ${customerIds.length} unique Customer IDs in Column "I". Querying customerEntityId...`);

  // Step 2: Strictly query leads and companies on customerEntityId
  const matchedCustomerMap = new Map<string, { docId: string; companyName: string; collectionName: 'leads' | 'companies' }>();

  for (const custId of customerIds) {
    const numId = Number(custId);
    let matchedDoc: { docId: string; companyName: string; collectionName: 'leads' | 'companies' } | null = null;

    let snap = await db.collection('leads').where('customerEntityId', '==', custId).limit(1).get();
    if (snap.empty && !isNaN(numId)) {
      snap = await db.collection('leads').where('customerEntityId', '==', numId).limit(1).get();
    }

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      matchedDoc = {
        docId: doc.id,
        companyName: data.companyName || data.company_name || data.name || 'Customer',
        collectionName: 'leads',
      };
    } else {
      let compSnap = await db.collection('companies').where('customerEntityId', '==', custId).limit(1).get();
      if (compSnap.empty && !isNaN(numId)) {
        compSnap = await db.collection('companies').where('customerEntityId', '==', numId).limit(1).get();
      }

      if (!compSnap.empty) {
        const doc = compSnap.docs[0];
        const data = doc.data();
        matchedDoc = {
          docId: doc.id,
          companyName: data.companyName || data.company_name || data.name || 'Customer',
          collectionName: 'companies',
        };
      }
    }

    if (matchedDoc) {
      matchedCustomerMap.set(custId, matchedDoc);
    }
  }

  console.log(`[CLI LPO Import] Matched ${matchedCustomerMap.size} of ${customerIds.length} customer IDs strictly on customerEntityId.`);

  // Extract services from child customers for matched companies
  const companyChildServicesMap = new Map<string, { ampoRate: number; pmpoRate: number; packageRate: number; additionalBagRate: number; services: any[] }>();

  for (const [_, match] of matchedCustomerMap.entries()) {
    if (match.collectionName === 'companies') {
      let childSnap = await db.collection('leads').where('parentCompanyId', '==', match.docId).get();
      if (childSnap.empty) {
        childSnap = await db.collection('leads').where('parentLeadId', '==', match.docId).get();
      }
      if (childSnap.empty) {
        childSnap = await db.collection('companies').where('parentCompanyId', '==', match.docId).get();
      }

      let ampoRate = 0;
      let pmpoRate = 0;
      let packageRate = 0;
      let additionalBagRate = 0;
      let servicesList: any[] = [];

      childSnap.forEach((cDoc) => {
        const cData = cDoc.data();
        if (cData.services && Array.isArray(cData.services)) {
          servicesList.push(...cData.services);
          for (const s of cData.services) {
            const sName = (s.name || s.serviceName || s.title || '').toLowerCase();
            const sRate = typeof s.rate === 'number' ? s.rate : parseFloat(String(s.rate || 0).replace(/[^0-9.]/g, '')) || 0;

            if (sName.includes('am') || sName.includes('morning')) ampoRate = sRate;
            else if (sName.includes('pm') || sName.includes('afternoon')) pmpoRate = sRate;
            else if (sName.includes('package') || sName.includes('parcel')) packageRate = sRate;
            else if (sName.includes('bag') || sName.includes('additional')) additionalBagRate = sRate;
          }
        }
        if (cData.ampoRate) ampoRate = parseFloat(cData.ampoRate) || ampoRate;
        if (cData.pmpoRate) pmpoRate = parseFloat(cData.pmpoRate) || pmpoRate;
        if (cData.packageRate) packageRate = parseFloat(cData.packageRate) || packageRate;
        if (cData.additionalBagRate) additionalBagRate = parseFloat(cData.additionalBagRate) || additionalBagRate;
      });

      companyChildServicesMap.set(match.docId, { ampoRate, pmpoRate, packageRate, additionalBagRate, services: servicesList });
    }
  }

  // Deduplication check
  const existingLposSnap = await db.collection('lpo_leads').get();
  const existingByInternalId = new Map<string, string>();
  const existingByName = new Map<string, string>();

  existingLposSnap.forEach((docSnap) => {
    const d = docSnap.data();
    if (d.lpoInternalId) existingByInternalId.set(String(d.lpoInternalId).trim(), docSnap.id);
    if (d.lpoName) existingByName.set(String(d.lpoName).trim().toLowerCase(), docSnap.id);
  });

  let createdCount = 0;
  let updatedCount = 0;
  let linkedCount = 0;
  let unlinkedCount = 0;

  let batch = db.batch();
  let opCount = 0;

  const commitIfNeeded = async () => {
    if (opCount >= 400) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  };

  for (const row of rows) {
    const lpoName = row.lpoName;
    const lpoInternalId = row.lpoInternalId;
    const rawCustId = row.linkedCustomerId;

    let existingId = lpoInternalId ? existingByInternalId.get(lpoInternalId) : undefined;
    if (!existingId && lpoName) {
      existingId = existingByName.get(lpoName.toLowerCase());
    }

    let docRef: FirebaseFirestore.DocumentReference;
    if (existingId) {
      docRef = db.collection('lpo_leads').doc(existingId);
      updatedCount++;
    } else {
      docRef = db.collection('lpo_leads').doc();
      createdCount++;
    }

    const custMatch = rawCustId ? matchedCustomerMap.get(rawCustId) : undefined;
    const linkStatus = custMatch ? 'Linked' : 'Unlinked';
    const linkedLeadId = custMatch ? custMatch.docId : null;
    const linkedLeadCompanyName = custMatch ? custMatch.companyName : null;

    if (custMatch) linkedCount++;
    else unlinkedCount++;

    const payload: any = {
      prospectPlusId: `MPxLPO${generateRandomAlphanumeric(6)}`,
      lpoName,
      lpoOwnerName: row.lpoOwnerName,
      email: row.email,
      phone: row.phone,
      address1: row.address1,
      address2: row.address2,
      city: row.city,
      state: row.state,
      postcode: row.postcode,
      notes: row.notes,
      status: row.status,
      source: 'CLI Import',

      lpoInternalId,
      inactive: row.inactive,
      secondaryInternalId: row.secondaryInternalId,
      lpoCreatedDate: row.lpoCreatedDate,
      lpoLastModifiedDate: row.lpoLastModifiedDate,
      linkedNcl: row.linkedNcl,
      linkedPartnerLocationName: row.linkedPartnerLocationName,
      rawCustomerName: row.rawCustomerName,
      linkedCustomerId: rawCustId,
      companyNameFranchise: row.companyNameFranchise,
      linkedFranchiseeName: row.linkedFranchiseeName,
      lpoTier: row.lpoTier,
      poLevelTier: row.poLevelTier,
      pageURL: row.pageURL,
      salesRep: row.salesRep,
      validationProvided: row.validationProvided,
      leadGenerator: row.leadGenerator,
      faceToFace: row.faceToFace,
      confAndCall: row.confAndCall,
      acceptedTerms: row.acceptedTerms,
      dynamicScf: row.dynamicScf,
      adhocBooking: row.adhocBooking,
      defaultPassword: row.defaultPassword,

      linkedLeadId,
      linkedLeadCompanyName,
      linkStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Assign Step 2 rates from child services if linked to a company
    if (custMatch && custMatch.collectionName === 'companies') {
      const childRates = companyChildServicesMap.get(custMatch.docId);
      if (childRates) {
        if (childRates.ampoRate) payload.ampoRate = childRates.ampoRate;
        if (childRates.pmpoRate) payload.pmpoRate = childRates.pmpoRate;
        if (childRates.packageRate) payload.packageRate = childRates.packageRate;
        if (childRates.additionalBagRate) payload.additionalBagRate = childRates.additionalBagRate;
        if (childRates.services && childRates.services.length > 0) payload.services = childRates.services;
      }
    }

    if (!existingId) {
      payload.createdAt = FieldValue.serverTimestamp();
    }

    batch.set(docRef, payload, { merge: true });
    opCount++;

    if (custMatch) {
      batch.set(
        db.collection(custMatch.collectionName).doc(custMatch.docId),
        {
          parent_lpo_id: docRef.id,
          linkedLpoName: lpoName,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      opCount++;
    }

    await commitIfNeeded();
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`\n==============================================`);
  console.log(`[CLI LPO Import] COMPLETED SUCCESSFULLY`);
  console.log(`Total Rows Processed: ${rows.length}`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Linked (customerEntityId matched): ${linkedCount}`);
  console.log(`Unlinked (customerEntityId not found): ${unlinkedCount}`);
  console.log(`==============================================\n`);
}

runCliImport().catch((err) => {
  console.error('[CLI LPO Import] Unhandled Error:', err);
  process.exit(1);
});
