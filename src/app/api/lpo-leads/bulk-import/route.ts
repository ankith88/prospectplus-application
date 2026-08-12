import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateRandomAlphanumeric } from '@/lib/prospect-plus-id';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No LPO rows provided in payload' }, { status: 400 });
    }

    const db = getFirestore(adminApp);

    // Step 1: Extract all unique Customer IDs (Column "I") from payload
    const rawCustomerIds = Array.from(
      new Set(
        rows
          .map((r: any) => (r.linkedCustomerId !== undefined && r.linkedCustomerId !== null ? String(r.linkedCustomerId).trim() : ''))
          .filter((id: string) => id.length > 0)
      )
    );

    // Step 2: Query 'leads' and 'companies' STRICTLY on customerEntityId field
    const matchedCustomerMap = new Map<string, { docId: string; companyName: string; collectionName: 'leads' | 'companies' }>();

    for (const custId of rawCustomerIds) {
      const numId = Number(custId);
      let matchedDoc: { docId: string; companyName: string; collectionName: 'leads' | 'companies' } | null = null;

      // 1. Query 'leads' strictly by customerEntityId == string
      let snap = await db.collection('leads').where('customerEntityId', '==', custId).limit(1).get();
      
      // 2. Query 'leads' strictly by customerEntityId == number
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
        // 3. Query 'companies' strictly by customerEntityId == string
        let compSnap = await db.collection('companies').where('customerEntityId', '==', custId).limit(1).get();
        
        // 4. Query 'companies' strictly by customerEntityId == number
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

    // Pre-fetch child customer services for matched parent companies
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

    // Step 3: Fetch existing LPOs for deduplication
    const lpoLeadsSnap = await db.collection('lpo_leads').get();
    const existingLposByInternalId = new Map<string, { id: string; prospectPlusId: string }>();
    const existingLposByName = new Map<string, { id: string; prospectPlusId: string }>();

    lpoLeadsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.lpoInternalId) {
        existingLposByInternalId.set(String(d.lpoInternalId).trim(), { id: docSnap.id, prospectPlusId: d.prospectPlusId });
      }
      if (d.lpoName) {
        existingLposByName.set(String(d.lpoName).trim().toLowerCase(), { id: docSnap.id, prospectPlusId: d.prospectPlusId });
      }
    });

    let createdCount = 0;
    let updatedCount = 0;
    let linkedCount = 0;
    let unlinkedCount = 0;
    const rowResults: any[] = [];

    // Step 4: Write in chunked batches
    let batch = db.batch();
    let opCount = 0;

    const commitBatchIfNeeded = async () => {
      if (opCount >= 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    };

    for (const row of rows) {
      const lpoName = row.lpoName ? String(row.lpoName).trim() : 'Unnamed LPO';
      const lpoInternalId = row.lpoInternalId ? String(row.lpoInternalId).trim() : '';
      const rawCustId = row.linkedCustomerId ? String(row.linkedCustomerId).trim() : '';

      let existing = lpoInternalId ? existingLposByInternalId.get(lpoInternalId) : undefined;
      if (!existing && lpoName) {
        existing = existingLposByName.get(lpoName.toLowerCase());
      }

      let docRef: FirebaseFirestore.DocumentReference;
      let prospectPlusId: string;

      if (existing) {
        docRef = db.collection('lpo_leads').doc(existing.id);
        prospectPlusId = existing.prospectPlusId || `MPxLPO${generateRandomAlphanumeric(6)}`;
        updatedCount++;
      } else {
        docRef = db.collection('lpo_leads').doc();
        prospectPlusId = `MPxLPO${generateRandomAlphanumeric(6)}`;
        createdCount++;
      }

      const customerMatch = rawCustId ? matchedCustomerMap.get(rawCustId) : undefined;

      const linkStatus = customerMatch ? 'Linked' : 'Unlinked';
      const linkedLeadId = customerMatch ? customerMatch.docId : null;
      const linkedLeadCompanyName = customerMatch ? customerMatch.companyName : null;

      if (customerMatch) linkedCount++;
      else unlinkedCount++;

      // Exact Column Mapping based on User Specification:
      // Col G: Linked Partner Location
      // Col K: Name of the Linked Franchisee
      // Col N: Address line 1
      // Col O: Address line 2
      // Col T: Contact Name
      // Col U: Contact Email
      // Col V: Contact Phone
      const linkedPartnerLocationName = row.linkedPartnerLocationName || row.linkedNcl || '';
      const linkedFranchiseeName = row.linkedFranchiseeName || row.companyNameFranchise || row.lpoTier || '';
      const address1 = row.address1 || '';
      const address2 = row.address2 || '';
      const lpoOwnerName = row.lpoOwnerName || row.contactName || '';
      const email = row.email || '';
      const phone = row.phone || '';

      const lpoDocData: any = {
        prospectPlusId,
        lpoName,
        lpoOwnerName,
        email,
        phone,
        address1,
        address2,
        city: row.city ? String(row.city).trim() : '',
        state: row.state ? String(row.state).trim() : '',
        postcode: row.postcode ? String(row.postcode).trim() : '',
        notes: row.notes ? String(row.notes).trim() : '',
        status: (row.status && (String(row.status).trim() === 'LPO.PLUS Sign In Email Sent' || String(row.status).trim() === 'LPO.Plus Sign In Email Sent')) ? 'LPO.Plus Logged In' : (row.status ? String(row.status).trim() : 'New'),
        source: 'CSV Import',

        lpoInternalId,
        inactive: row.inactive === true || String(row.inactive).toLowerCase() === 'yes',
        secondaryInternalId: row.secondaryInternalId ? String(row.secondaryInternalId).trim() : '',
        lpoCreatedDate: row.lpoCreatedDate || null,
        lpoLastModifiedDate: row.lpoLastModifiedDate || null,
        linkedNcl: row.linkedNcl ? String(row.linkedNcl).trim() : '',
        rawCustomerName: row.rawCustomerName ? String(row.rawCustomerName).trim() : '',
        linkedCustomerId: rawCustId,
        companyNameFranchise: linkedFranchiseeName,
        linkedFranchiseeName,
        linkedPartnerLocationName,
        lpoTier: row.lpoTier ? String(row.lpoTier).trim() : '',
        poLevelTier: row.poLevelTier ? String(row.poLevelTier).trim() : '',
        pageURL: row.pageURL ? String(row.pageURL).trim() : '',
        salesRep: row.salesRep ? String(row.salesRep).trim() : '',
        validationProvided: row.validationProvided ? String(row.validationProvided).trim() : '',
        leadGenerator: row.leadGenerator ? String(row.leadGenerator).trim() : '',
        faceToFace: row.faceToFace ? String(row.faceToFace).trim() : '',
        confAndCall: row.confAndCall ? String(row.confAndCall).trim() : '',
        acceptedTerms: row.acceptedTerms !== undefined ? String(row.acceptedTerms).trim() : '',
        dynamicScf: row.dynamicScf ? String(row.dynamicScf).trim() : '',
        adhocBooking: row.adhocBooking ? String(row.adhocBooking).trim() : '',
        defaultPassword: row.defaultPassword ? String(row.defaultPassword).trim() : '',

        linkedLeadId,
        linkedLeadCompanyName,
        linkStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Assign Child Customer Service Rates for Step 2 if linked to a company
      if (customerMatch && customerMatch.collectionName === 'companies') {
        const childRates = companyChildServicesMap.get(customerMatch.docId);
        if (childRates) {
          if (childRates.ampoRate) lpoDocData.ampoRate = childRates.ampoRate;
          if (childRates.pmpoRate) lpoDocData.pmpoRate = childRates.pmpoRate;
          if (childRates.packageRate) lpoDocData.packageRate = childRates.packageRate;
          if (childRates.additionalBagRate) lpoDocData.additionalBagRate = childRates.additionalBagRate;
          if (childRates.services && childRates.services.length > 0) lpoDocData.services = childRates.services;
        }
      }

      if (!existing) {
        lpoDocData.createdAt = FieldValue.serverTimestamp();
      }

      batch.set(docRef, lpoDocData, { merge: true });
      opCount++;

      if (customerMatch) {
        const targetRef = db.collection(customerMatch.collectionName).doc(customerMatch.docId);
        batch.set(
          targetRef,
          {
            parent_lpo_id: docRef.id,
            linkedLpoName: lpoName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        opCount++;
      }

      rowResults.push({
        lpoName,
        lpoInternalId,
        linkedCustomerId: rawCustId,
        linkStatus,
        linkedLeadId,
        linkedLeadCompanyName,
        isNew: !existing,
      });

      await commitBatchIfNeeded();
    }

    if (opCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${rows.length} LPOs. Created: ${createdCount}, Updated: ${updatedCount}, Linked: ${linkedCount}, Unlinked: ${unlinkedCount}.`,
      summary: {
        total: rows.length,
        created: createdCount,
        updated: updatedCount,
        linked: linkedCount,
        unlinked: unlinkedCount,
      },
      results: rowResults,
    });
  } catch (error: any) {
    console.error('Error executing LPO bulk import:', error);
    return NextResponse.json({ error: error.message || 'Failed to process LPO bulk import' }, { status: 500 });
  }
}
