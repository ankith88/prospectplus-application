import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin for standalone CLI execution
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
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null) {
          return String(row[found]).trim();
        }
      }
      return '';
    };

    return {
      lpoInternalId: getVal(['Internal ID', 'lpoInternalId']),
      inactive: getVal(['Inactive'])?.toLowerCase() === 'yes',
      secondaryInternalId: getVal(['Internal ID_1']),
      lpoCreatedDate: getVal(['Date Created']),
      lpoLastModifiedDate: getVal(['Last Modified']),
      lpoName: getVal(['LPO Name']) || 'Unnamed LPO',
      linkedNcl: getVal(['Linked NCL']),
      rawCustomerName: getVal(['Customer']),
      linkedCustomerId: getVal(['ID', 'Customer ID', 'customerEntityId']), // Column I
      companyNameFranchise: getVal(['Company Name / Franchise']),
      lpoTier: getVal(['LPO Tier']),
      status: getVal(['Status*']) || 'New',
      poLevelTier: getVal(['PO Level / Tier']),
      address1: getVal(['Street No & Name']),
      city: getVal(['LPO Suburb']),
      state: getVal(['LPO State']),
      postcode: getVal(['LPO Postcode']),
      notes: getVal(['Notes']),
      lpoOwnerName: getVal(['Contact Name']),
      phone: getVal(['Contact Number']),
      email: getVal(['Email Address']),
      pageURL: getVal(['Page URL - S/O']),
      salesRep: getVal(['Sales Rep']),
      validationProvided: getVal(['Validation Provided']),
      leadGenerator: getVal(['Lead Generator']),
      faceToFace: getVal(['Face-to-face']),
      confAndCall: getVal(['Conf & Call']),
      acceptedTerms: getVal(['Accepted T&C']),
      dynamicScf: getVal(['Dynamic SCF']),
      adhocBooking: getVal(['Adhoc Booking']),
      defaultPassword: getVal(['Default Password']),
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

  // Step 3: Deduplication check against existing lpo_leads
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
      rawCustomerName: row.rawCustomerName,
      linkedCustomerId: rawCustId,
      companyNameFranchise: row.companyNameFranchise,
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
