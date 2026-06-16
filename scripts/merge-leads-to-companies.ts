import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const SUBCOLLECTIONS = [
  'contacts',
  'activity',
  'emails',
  'notes',
  'transcripts',
  'tasks',
  'appointments',
  'invoices',
  'company_insights'
];

async function mergeLeadsToCompanies(dryRun = true) {
  console.log(`Starting FAST merge process (Dry Run: ${dryRun})...`);

  try {
    // 1. Fetch ALL companies (much faster since there are fewer companies than leads)
    console.log("Fetching companies collection...");
    const companiesSnapshot = await db.collection('companies').get();
    
    // Create a Set of all company IDs for instant O(1) lookup
    const companyIds = new Set(companiesSnapshot.docs.map(doc => doc.id));
    console.log(`Loaded ${companyIds.size} company IDs into memory.`);

    // 2. Fetch ALL leads and filter locally
    console.log("Fetching leads collection...");
    const leadsRef = db.collection('leads');
    const snapshot = await leadsRef.get();
    
    console.log(`Found ${snapshot.size} total leads to evaluate.`);

    let mergedCount = 0;

    for (const leadDoc of snapshot.docs) {
      const leadId = leadDoc.id;

      // INSTANT LOOKUP
      if (companyIds.has(leadId)) {
        mergedCount++;
        console.log(`[MERGE] Found overlapping ID: ${leadId}`);

        const companyRef = db.collection('companies').doc(leadId);
        const companyDoc = await companyRef.get();

        const leadData = leadDoc.data();
        const companyData = companyDoc.data() || {};

        // Merge data (Company data takes precedence)
        const mergedData = { ...companyData };
        for (const key in leadData) {
            if (mergedData[key] === undefined || mergedData[key] === null || mergedData[key] === '') {
                mergedData[key] = leadData[key];
            }
        }

        if (!dryRun) {
            await companyRef.set(mergedData, { merge: true });
        }

        // Copy subcollections
        for (const subcol of SUBCOLLECTIONS) {
            const leadSubcolRef = leadDoc.ref.collection(subcol);
            const subcolSnapshot = await leadSubcolRef.get();
            
            if (!subcolSnapshot.empty) {
                console.log(`  - Copying ${subcolSnapshot.size} documents from subcollection '${subcol}'`);
                
                if (!dryRun) {
                    const batch = db.batch();
                    subcolSnapshot.docs.forEach(doc => {
                        const companySubcolRef = companyRef.collection(subcol).doc(doc.id);
                        batch.set(companySubcolRef, doc.data(), { merge: true });
                    });
                    await batch.commit();
                }
            }
        }

        console.log(`  - Marking Lead ${leadId} as duplicate`);
        if (!dryRun) {
            await leadDoc.ref.update({ isDuplicate: true });
        }
      }
    }

    console.log(`\nFinished evaluation. Overlapping Leads/Companies found: ${mergedCount}`);
    if (dryRun) {
        console.log("This was a DRY RUN. No changes were made. Set dryRun = false to execute.");
    } else {
        console.log("Migration completed successfully.");
    }
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

const isDryRun = !process.argv.includes('--execute');
mergeLeadsToCompanies(isDryRun);
