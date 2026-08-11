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

    // Step 1: Extract all unique Customer IDs (Column "I") from the payload
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
      
      // 2. Query 'leads' strictly by customerEntityId == number (if numeric)
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

    // Step 3: Fetch existing LPO records in Firestore for deduplication (by lpoInternalId or lpoName)
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

    // Step 4: Write in chunked batches (limit 400 per batch)
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

      // Check existing doc match
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

      // Check Customer Match via customerEntityId STRICTLY
      const customerMatch = rawCustId ? matchedCustomerMap.get(rawCustId) : undefined;

      const linkStatus = customerMatch ? 'Linked' : 'Unlinked';
      const linkedLeadId = customerMatch ? customerMatch.docId : null;
      const linkedLeadCompanyName = customerMatch ? customerMatch.companyName : null;

      if (customerMatch) {
        linkedCount++;
      } else {
        unlinkedCount++;
      }

      const lpoDocData: any = {
        prospectPlusId,
        lpoName,
        lpoOwnerName: row.lpoOwnerName ? String(row.lpoOwnerName).trim() : '',
        email: row.email ? String(row.email).trim() : '',
        phone: row.phone ? String(row.phone).trim() : '',
        address1: row.address1 ? String(row.address1).trim() : '',
        city: row.city ? String(row.city).trim() : '',
        state: row.state ? String(row.state).trim() : '',
        postcode: row.postcode ? String(row.postcode).trim() : '',
        notes: row.notes ? String(row.notes).trim() : '',
        status: row.status ? String(row.status).trim() : 'New',
        source: 'CSV Import',

        // 31 CSV Specific fields
        lpoInternalId,
        inactive: row.inactive === true || String(row.inactive).toLowerCase() === 'yes',
        secondaryInternalId: row.secondaryInternalId ? String(row.secondaryInternalId).trim() : '',
        lpoCreatedDate: row.lpoCreatedDate || null,
        lpoLastModifiedDate: row.lpoLastModifiedDate || null,
        linkedNcl: row.linkedNcl ? String(row.linkedNcl).trim() : '',
        rawCustomerName: row.rawCustomerName ? String(row.rawCustomerName).trim() : '',
        linkedCustomerId: rawCustId,
        companyNameFranchise: row.companyNameFranchise ? String(row.companyNameFranchise).trim() : '',
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

        // Linking
        linkedLeadId,
        linkedLeadCompanyName,
        linkStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!existing) {
        lpoDocData.createdAt = FieldValue.serverTimestamp();
      }

      batch.set(docRef, lpoDocData, { merge: true });
      opCount++;

      // If matched to a customer doc, also update customer record with parent LPO link
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
