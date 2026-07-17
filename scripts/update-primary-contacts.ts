import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Helper to chunk an array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  console.log('Fetching leads for update...');
  const leadsSnap = await db.collection('leads').get();
  console.log(`Total leads: ${leadsSnap.size}`);

  const leadDocs = leadsSnap.docs;
  const chunkSize = 200;
  const chunks = chunkArray(leadDocs, chunkSize);

  const updates: { leadId: string; contactId: string; name: string }[] = [];

  console.log('Identifying target contacts to set as primary...');
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await Promise.all(
      chunk.map(async (leadDoc) => {
        const leadId = leadDoc.id;
        const contactsSnap = await db.collection('leads').doc(leadId).collection('contacts').get();
        if (contactsSnap.size === 1) {
          const contactDoc = contactsSnap.docs[0];
          const contactData = contactDoc.data();
          if (contactData.isPrimary !== true) {
            updates.push({
              leadId,
              contactId: contactDoc.id,
              name: contactData.name || 'Unknown'
            });
          }
        }
      })
    );
  }

  console.log(`Found ${updates.length} contacts to set as primary.`);

  if (updates.length === 0) {
    console.log('No updates needed.');
    return;
  }

  // Perform updates in batches of 400
  const updateChunks = chunkArray(updates, 400);
  let updatedCount = 0;

  console.log(`Applying updates in ${updateChunks.length} write batches...`);

  for (let i = 0; i < updateChunks.length; i++) {
    const batch = db.batch();
    const currentChunk = updateChunks[i];

    for (const update of currentChunk) {
      const contactRef = db
        .collection('leads')
        .doc(update.leadId)
        .collection('contacts')
        .doc(update.contactId);
      
      batch.update(contactRef, {
        isPrimary: true,
        updatedAt: FieldValue.serverTimestamp()
      });

      // Log activity
      const activityRef = db
        .collection('leads')
        .doc(update.leadId)
        .collection('activity')
        .doc();
      
      batch.set(activityRef, {
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Contact '${update.name}' set as primary automatically (only 1 contact exists on lead).`,
        author: 'System Backfill Script'
      });
    }

    await batch.commit();
    updatedCount += currentChunk.length;
    console.log(`Batch ${i + 1}/${updateChunks.length} committed. Updated ${updatedCount} records.`);
  }

  console.log('Update completed successfully.');
}

main().catch(console.error);
