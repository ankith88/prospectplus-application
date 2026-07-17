import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
  console.log('Fetching leads...');
  const leadsSnap = await db.collection('leads').get();
  console.log(`Total leads: ${leadsSnap.size}`);

  let leadsWithNoPrimaryContact = 0;
  let leadsToUpdateCount = 0;
  const leadsToUpdateDetails: any[] = [];

  const leadDocs = leadsSnap.docs;
  const chunkSize = 200; // Let's run 200 Firestore subcollection reads in parallel per chunk
  const chunks = chunkArray(leadDocs, chunkSize);

  console.log(`Processing in ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);

    await Promise.all(
      chunk.map(async (leadDoc) => {
        const leadId = leadDoc.id;
        const leadData = leadDoc.data();
        const companyName = leadData.companyName || 'Unknown';

        // Get contacts subcollection
        const contactsSnap = await db.collection('leads').doc(leadId).collection('contacts').get();
        
        if (contactsSnap.empty) {
          return;
        }

        const contacts = contactsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        const hasPrimary = contacts.some(c => c.isPrimary === true);

        if (!hasPrimary) {
          leadsWithNoPrimaryContact++;
          if (contacts.length === 1) {
            leadsToUpdateCount++;
            leadsToUpdateDetails.push({
              leadId,
              companyName,
              contactsCount: contacts.length,
              contact: {
                id: contacts[0].id,
                name: contacts[0].name,
                email: contacts[0].email,
                phone: contacts[0].phone,
                isPrimary: contacts[0].isPrimary
              }
            });
          }
        }
      })
    );
  }

  console.log('--- RESULTS ---');
  console.log(`Leads with no primary contact: ${leadsWithNoPrimaryContact}`);
  console.log(`Leads that will be updated (having exactly 1 contact): ${leadsToUpdateCount}`);
  
  if (leadsToUpdateDetails.length > 0) {
    console.log('--- EXAMPLE RECORD ---');
    console.log(JSON.stringify(leadsToUpdateDetails[0], null, 2));
  } else {
    console.log('No records found that match the criteria.');
  }
}

main().catch(console.error);
