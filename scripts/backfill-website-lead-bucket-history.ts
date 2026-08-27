import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function backfillWebsiteLeadBucketHistory() {
  console.log("Starting Website Lead Bucket History Backfill...");

  const [snapCustSource, snapSource, snapLeadSource] = await Promise.all([
    db.collection('leads').where('customerSource', '==', 'Website').get(),
    db.collection('leads').where('source', '==', 'Website').get(),
    db.collection('leads').where('leadSource', '==', 'Website').get(),
  ]);

  const docMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  snapCustSource.docs.forEach(d => docMap.set(d.id, d));
  snapSource.docs.forEach(d => docMap.set(d.id, d));
  snapLeadSource.docs.forEach(d => docMap.set(d.id, d));

  const allWebsiteLeads = Array.from(docMap.values());
  console.log(`Found ${allWebsiteLeads.length} total Website leads in Firestore.`);

  const amLeads = allWebsiteLeads.filter(doc => doc.data().bucket === 'account_manager');
  console.log(`Found ${amLeads.length} Website leads currently in 'account_manager' bucket.`);

  const updateTasks = amLeads.map(async (docSnap) => {
    const leadId = docSnap.id;
    const data = docSnap.data();

    const bhSubcollectionSnap = await docSnap.ref.collection('bucket_history').get();
    const hasSubcollDoc = !bhSubcollectionSnap.empty;
    const hasDocArray = Array.isArray(data.bucketHistory) && data.bucketHistory.length > 0;

    let hasAmTransition = false;
    if (hasSubcollDoc) {
      bhSubcollectionSnap.forEach(d => {
        const bhData = d.data();
        if (bhData.newBucket === 'account_manager' || bhData.toBucket === 'account_manager') {
          hasAmTransition = true;
        }
      });
    }
    if (!hasAmTransition && hasDocArray) {
      hasAmTransition = data.bucketHistory.some((h: any) => h.newBucket === 'account_manager' || h.toBucket === 'account_manager');
    }

    if (!hasAmTransition) {
      const entryDate = data.dateLeadEntered || data.createdAt || new Date().toISOString();
      const dateIso = typeof entryDate === 'string' ? entryDate : (entryDate?.toDate ? entryDate.toDate().toISOString() : new Date().toISOString());

      const bhEntry = {
        id: `bh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        oldBucket: 'inbound',
        newBucket: 'account_manager',
        date: dateIso,
        author: 'System (Backfill - Website Inbound)'
      };

      await docSnap.ref.collection('bucket_history').add(bhEntry);
      await docSnap.ref.set({
        originalBucket: 'inbound',
        bucketHistory: FieldValue.arrayUnion(bhEntry)
      }, { merge: true });

      console.log(`[Backfilled] Lead ID ${leadId} (${data.companyName || 'Unknown'}) - Inbound -> Account Manager history added.`);
      return leadId;
    }
    return null;
  });

  const results = await Promise.all(updateTasks);
  const updatedIds = results.filter((id): id is string => id !== null);

  console.log(`\nBackfill complete!`);
  console.log(`Total Website leads updated: ${updatedIds.length}`);
  console.log(`Updated Lead IDs:`, updatedIds);

  if (updatedIds.includes('2037339')) {
    console.log(`\nVerified: Example lead /leads/2037339 was successfully updated with bucket history.`);
  }
}

backfillWebsiteLeadBucketHistory().catch(console.error);
